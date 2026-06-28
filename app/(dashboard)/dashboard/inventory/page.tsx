'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { type Product } from '@/lib/types'
import { ProductTable } from '@/components/inventory/product-table'
import { ProductForm } from '@/components/inventory/product-form'
import { SearchBar } from '@/components/pos/search-bar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Package, AlertTriangle, TrendingUp, Filter, Sparkles, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

interface Category {
  category_id: number
  name: string
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [aiAlert, setAiAlert] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Load categories from Supabase
  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('category_id, name')
      .eq('is_active', true)
      .order('name')
    if (data) setCategories(data)
  }

  // Load products and join with categories
  async function loadProducts() {
    setLoading(true)
       
  const { data, error } = await supabase
  .from('products')
  .select('prod_id, name, price, stock_qty, barcode, reorder_lvl, category_id, categories(name)')
  .eq('is_active', true)
  .order('name')

    if (error) { toast.error('Failed to load products'); setLoading(false); return }
    console.log('First product row:', data?.[0])
          const mapped: Product[] = (data || []).map((row: any) => ({
  id: String(row.prod_id),
  name: row.name,
  description: '',
  price: row.price,
  category: row.categories?.name ?? 'Other',
  stock: row.stock_qty,
  reorderLevel: row.reorder_lvl ?? 10,
  barcode: row.barcode ?? undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
}))
    
    setProducts(mapped)
    console.log('All products:', JSON.stringify(mapped.map(p => ({ name: p.name, stock: p.stock, reorderLevel: p.reorderLevel })), null, 2))
    setLoading(false)
  }

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  const stats = useMemo(() => ({
    totalProducts: products.length,
    totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0),
    lowStockCount: products.filter((p) => p.stock <= (p.reorderLevel ?? 10) && p.stock > 0).length,    outOfStockCount: products.filter((p) => p.stock === 0).length,
  }), [products])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price)

  // Helper — convert category name to category_id
  const getCategoryId = (categoryName: string): number => {
    const found = categories.find((c) => c.name === categoryName)
    return found ? found.category_id : 1
  }

  // AI Low Stock Alert
  const generateAIStockAlert = async () => {
    setAiLoading(true)
    setAiAlert('')
  const lowItems = products
  .filter(p => p.stock <= (p.reorderLevel ?? 10))
  .map(p => `${p.name}: ${p.stock} units remaining (reorder level: ${p.reorderLevel ?? 10})`)
  .join(', ')

    if (!lowItems) {
      setAiAlert('All products are well-stocked. No reorder action needed at this time.')
      setAiLoading(false)
      return
    }

    try {
      const prompt = `You are a stock management assistant for Resort Shopping Mart in Nigeria.
These products are running low on stock: ${lowItems}

Write a numbered and simple reorder alert for the store manager covering all low stock items.
For each item mention the current stock level, how urgent the restock is, 
and a suggested reorder quantity based on typical resort mart demand.
Rank them from most critical to least critical.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
          })
        }
      )
      const data = await response.json()
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary at this time.'
      setAiAlert(reply)
    } catch {
      setAiAlert('Unable to connect to AI. Please check your Gemini API key.')
    }

    setAiLoading(false)
  }

  // Add product — uses real category_id
  const handleAddProduct = async (data: Partial<Product>) => {
    const { error } = await supabase.from('products').insert({
      name: data.name,
      category_id: getCategoryId(data.category ?? 'Other'),
      price: data.price,
      stock_qty: data.stock ?? 0,
      barcode: data.barcode ?? null,
      reorder_lvl: 10,
    })
    if (error) { toast.error('Failed to add product: ' + error.message); return }
    toast.success('Product added successfully')
    setIsFormOpen(false)
    loadProducts()
  }

  // Edit product — now also saves category_id
  const handleEditProduct = async (data: Partial<Product>) => {
    if (!editingProduct) return
    const { error } = await supabase
      .from('products')
      .update({
        name: data.name,
        category_id: getCategoryId(data.category ?? 'Other'),
        price: data.price,
        stock_qty: data.stock,
        barcode: data.barcode ?? null,
      })
      .eq('prod_id', Number(editingProduct.id))
    if (error) { toast.error('Failed to update: ' + error.message); return }
    toast.success('Product updated')
    setEditingProduct(null)
    setIsFormOpen(false)
    loadProducts()
  }

  const handleDeleteProduct = async (id: string) => {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('prod_id', Number(id))
  if (error) { toast.error('Failed to remove product'); return }
  toast.success('Product deactivated successfully')
  loadProducts()
}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-muted-foreground">Manage products and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateAIStockAlert} disabled={aiLoading}>
            {aiLoading ? <><Spinner className="mr-2" />Checking...</> : <><Sparkles className="w-4 h-4 mr-2" />AI Stock Alert</>}
          </Button>
          <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {/* AI Stock Alert Banner */}
      {aiAlert && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" />AI Restock Recommendation</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAiAlert('')}><X className="w-3 h-3" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">{aiAlert}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />Total Products</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalProducts}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" />Inventory Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{formatPrice(stats.totalValue)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Low Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-500">{stats.lowStockCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Out of Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{stats.outOfStockCount}</p></CardContent></Card>
      </div>

      {/* Search and category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search products by name or barcode..." />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px] h-11">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.category_id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading inventory...</div>
      ) : (
        <ProductTable
          products={filteredProducts}
          onEdit={(p) => { setEditingProduct(p); setIsFormOpen(true) }}
          onDelete={handleDeleteProduct}
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>{editingProduct ? 'Update product details' : 'Fill in product information'}</DialogDescription>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}