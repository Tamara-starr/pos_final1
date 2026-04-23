'use client'

import { useSearchParams, useParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function ReceiptContent() {
  const searchParams = useSearchParams()
  const [receipt, setReceipt] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id) { setLoading(false); return }

    supabase
      .from('receipts')
      .select('*')
      .eq('receipt_id', id)
      .single()
      .then(({ data }) => {
        setReceipt(data)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading receipt...</p>
    </div>
  )

  if (!receipt) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Receipt not found.</p>
    </div>
  )

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full overflow-hidden">

        {/* Header */}
        <div className="bg-teal-700 px-6 py-5 text-center text-white">
          <h1 className="text-xl font-bold">Resort Shopping Mart</h1>
          <p className="text-teal-200 text-sm mt-1">Official Digital Receipt</p>
        </div>

        <div className="px-6 py-4 space-y-4">

          {/* Meta info */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="font-semibold">{receipt.ref}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">{new Date(receipt.created_at).toLocaleString('en-NG')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cashier</span>
              <span className="font-medium">{receipt.cashier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment</span>
              <span className="font-semibold capitalize text-teal-700">{receipt.pay_method}</span>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items Purchased</p>
            <div className="space-y-2">
              {receipt.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-gray-400 text-xs">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <p className="font-semibold text-gray-800">{formatPrice(item.total)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>VAT (7.5%)</span>
              <span>{formatPrice(receipt.vat)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-teal-700 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatPrice(receipt.total)}</span>
            </div>
          </div>

          {/* Payment badge */}
          <div className="text-center">
            <span className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold px-4 py-2 rounded-full uppercase tracking-wide">
              {receipt.pay_method} payment confirmed
            </span>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pb-2">
            <p>Thank you for shopping at Resort Mart</p>
            <p>Please keep this receipt for any queries</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <ReceiptContent />
    </Suspense>
  )
}