'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Banknote, CreditCard, Smartphone, Check, QrCode, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CartItem } from '@/lib/types'
import { supabase } from '@/lib/supabase'

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  cart: CartItem[]
  cashierName: string
  onSuccess: (paymentMethod: string) => void
}

type PaymentMethod = 'cash' | 'card' | 'transfer'

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'transfer', label: 'Transfer', icon: Smartphone} ,
]

export function PaymentModal({ open, onOpenChange, total, cart, cashierName, onSuccess }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [qrData, setQrData] = useState<string>('')
  const [showQR, setShowQR] = useState(false)
  const [transRef, setTransRef] = useState('')

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price)

  const change = selectedMethod === 'cash'
    ? Math.max(0, parseFloat(amountReceived || '0') - total)
    : 0

  const canProcess =
    selectedMethod !== 'cash' || parseFloat(amountReceived || '0') >= total

  const generateReceiptData = (ref: string) => {
    const items = cart.map(i => `${i.product.name} x${i.quantity} = ${formatPrice(i.product.price * i.quantity)}`).join('|')
    const tax = total - (total / 1.075)
    return JSON.stringify({
      ref,
      date: new Date().toLocaleString('en-NG'),
      cashier: cashierName,
      items,
      subtotal: formatPrice(total / 1.075),
      vat: formatPrice(tax),
      total: formatPrice(total),
      method: selectedMethod,
    })
  }

  const handleProcess = async () => {
  setIsProcessing(true)
  await new Promise(resolve => setTimeout(resolve, 1500))

  const ref = `TRN-${Date.now()}`
  setTransRef(ref)

  // Save receipt to Supabase and get a unique ID
const { data: receipt, error: receiptError } = await supabase
  .from('receipts')
  .insert({
    ref,
    cashier: cashierName,
    items: cart.map(i => ({
      name: i.product.name,
      quantity: i.quantity,
      price: i.product.price,
      total: i.product.price * i.quantity
    })),
    subtotal: Number((total / 1.075).toFixed(2)),
    vat: Number((total - total / 1.075).toFixed(2)),
    total,
    pay_method: selectedMethod
  })
  .select('receipt_id')
  .single()

if (!receiptError && receipt) {
  setQrData(`https://benevolent-praline-d7c090.netlify.app/receipt?id=${receipt.receipt_id}`)
  setTransRef(ref)
}


  setIsProcessing(false)
  setIsComplete(true)

  toast.success('Payment successful!', {
    description: `Transaction completed - ${formatPrice(total)}`,
  })
}

const handleClose = () => {
  if (!isProcessing) {
    const method = selectedMethod
    if (isComplete) onSuccess(method)
    setAmountReceived('')
    setSelectedMethod('cash')
    setIsComplete(false)
    setShowQR(false)
    setQrData('')
    setTransRef('')
    onOpenChange(false)
  }
}

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {isComplete ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-300">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-1">Payment Complete!</h3>
              <p className="text-muted-foreground text-sm">Ref: {transRef}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Guest Receipt Options</p>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                {showQR ? 'Hide QR Code' : 'Show QR Receipt for Guest'}
              </Button>

              {showQR && qrData && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground text-center">
                    Guest scans this to view their receipt
                  </p>
                  <div className="flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
                      alt="Receipt QR Code"
                      className="rounded-md"
                      width={180}
                      height={180}
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <Badge variant="outline" className="text-xs">
                      {formatPrice(total)} · {selectedMethod}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{transRef}</p>
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={handleClose}>
                Done — Start New Sale
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>Select payment method and complete the transaction</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-primary">{formatPrice(total)}</p>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.id}
                      type="button"
                      variant={selectedMethod === method.id ? 'default' : 'outline'}
                      className={cn('h-16 flex-col gap-1', selectedMethod === method.id && 'ring-2 ring-primary ring-offset-2')}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      <method.icon className="w-5 h-5" />
                      <span className="text-xs">{method.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {selectedMethod === 'cash' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount Received</Label>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter amount"
                      value={amountReceived}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '')
                        setAmountReceived(val)
                      }}
                      className="h-12 text-lg"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000].map((amount, i) => (
                      <Button key={i} type="button" variant="outline" size="sm"
                        onClick={() => setAmountReceived(amount.toString())} className="text-xs">
                        {formatPrice(amount)}
                      </Button>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Change</span>
                    <span className="text-xl font-semibold text-accent">{formatPrice(change)}</span>
                  </div>
                </div>
              )}

              <Button className="w-full h-12 text-base" onClick={handleProcess} disabled={!canProcess || isProcessing}>
                {isProcessing ? <><Spinner className="mr-2" />Processing...</> : 'Complete Payment'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
