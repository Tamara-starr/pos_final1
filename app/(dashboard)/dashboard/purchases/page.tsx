'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Shield, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  prod_id: number
  name: string
}

interface Purchase {
  id: number
  supplier_name: string
  product_name: string
  quantity_received: number
  unit_cost: number
  total_cost: number
  purchase_date: string
  recorded_by: string
  notes: string | null
  created_at: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n)

const today = () => new Date().toISOString().split('T')[0]

export default function PurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [supplierName, setSupplierName] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductName, setSelectedProductName] = useState('')
  const [quantityReceived, setQuantityReceived] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [notes, setNotes] = useState('')

  const hasAccess = user?.role === 'admin' || user?.role === 'manager'

  // Load purchases and products
  useEffect(() => {
    if (!hasAccess) return
    loadData()
  }, [hasAccess])

  const loadData = async () => {
    setLoading(true)

    const [{ data: purchaseData }, { data: productData }] = await Promise.all([
      supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('prod_id, name')
        .order('name'),
    ])

    if (purchaseData) setPurchases(purchaseData)
    if (productData) setProducts(productData)
    setLoading(false)
  }

  // When product is selected, auto-fill product name
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedProductId(id)
    const found = products.find((p) => p.prod_id === Number(id))
    if (found) setSelectedProductName(found.name)
  }

  // Reset form
  const resetForm = () => {
    setSupplierName('')
    setSelectedProductId('')
    setSelectedProductName('')
    setQuantityReceived('')
    setUnitCost('')
    setPurchaseDate(today())
    setNotes('')
  }

  // Save purchase
  const handleSave = async () => {
    if (!supplierName || !selectedProductId || !quantityReceived || !unitCost || !purchaseDate) {
      toast.error('Please fill in all required fields.')
      return
    }

    setSaving(true)

    const qty = Number(quantityReceived)
    const cost = Number(unitCost)

    // Insert purchase record
    const { error: purchaseError } = await supabase.from('purchases').insert({
      supplier_name: supplierName,
      product_id: Number(selectedProductId),
      product_name: selectedProductName,
      quantity_received: qty,
      unit_cost: cost,
      purchase_date: purchaseDate,
      recorded_by: user?.name || 'Unknown',
      notes: notes || null,
    })

    if (purchaseError) {
      toast.error('Failed to save purchase. Please try again.')
      setSaving(false)
      return
    }

    // Update stock quantity in products table
    const { data: currentProduct } = await supabase
      .from('products')
      .select('stock_qty')
      .eq('prod_id', Number(selectedProductId))
      .single()

    if (currentProduct) {
      await supabase
        .from('products')
        .update({ stock_qty: currentProduct.stock_qty + qty })
        .eq('prod_id', Number(selectedProductId))
    }

    toast.success(`Purchase recorded. Stock updated for ${selectedProductName}.`)
    resetForm()
    setDialogOpen(false)
    loadData()
    setSaving(false)
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Only admins and managers can access purchase records.
        </p>
      </div>
    )
  }

  const totalSpend = purchases.reduce((s, p) => s + Number(p.total_cost), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Records</h1>
          <p className="text-muted-foreground">
            Track stock replenishments and supplier deliveries
          </p>
        </div>

        {/* Add Purchase button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Record Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record New Purchase</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">

              {/* Supplier */}
              <div className="space-y-1.5">
                <Label>Supplier Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Lagos Wholesale Ltd"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>

              {/* Product */}
              <div className="space-y-1.5">
                <Label>Product <span className="text-red-500">*</span></Label>
                <select
                  value={selectedProductId}
                  onChange={handleProductChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.prod_id} value={p.prod_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity and Unit Cost side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity Received <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={quantityReceived}
                    onChange={(e) => setQuantityReceived(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Cost (₦) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                  />
                </div>
              </div>

              {/* Total cost preview */}
              {quantityReceived && unitCost && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-bold">
                    {fmt(Number(quantityReceived) * Number(unitCost))}
                  </p>
                </div>
              )}

              {/* Date */}
              <div className="space-y-1.5">
                <Label>Purchase Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  max={today()}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="e.g. Delivered in good condition"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { resetForm(); setDialogOpen(false) }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Purchase'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Purchases', value: purchases.length, color: 'text-blue-600' },
          { label: 'Total Spend', value: fmt(totalSpend), color: 'text-red-600' },
          { label: 'Unique Suppliers', value: new Set(purchases.map((p) => p.supplier_name)).size, color: 'text-purple-600' },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading purchase records…
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ShoppingBag className="w-12 h-12 opacity-30" />
              <p className="font-medium">No purchase records yet</p>
              <p className="text-sm">Click Record Purchase to add your first entry.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty Received</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.purchase_date).toLocaleDateString('en-NG', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{p.supplier_name}</TableCell>
                    <TableCell>{p.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">+{p.quantity_received} units</Badge>
                    </TableCell>
                    <TableCell>{fmt(Number(p.unit_cost))}</TableCell>
                    <TableCell className="font-semibold">{fmt(Number(p.total_cost))}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.recorded_by}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}