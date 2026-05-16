'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ProductGrid } from '@/components/pos/product-grid'
import { Cart } from '@/components/pos/cart'
import { CategoryFilter } from '@/components/pos/category-filter'
import { SearchBar } from '@/components/pos/search-bar'
import { PaymentModal } from '@/components/pos/payment-modal'
import { AIAssistant } from '@/components/pos/ai-assistant'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import type { CartItem, Product} from '@/lib/types'

export default function POSDashboard() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [categories, setCategories] = useState<{ category_id: number; name: string }[]>([])
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // ── Load products ─────────────────────────────────────────────────
  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('category_id, name')
      .eq('is_active', true)
      .order('name')
    if (data) setCategories(data)
  }

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('prod_id, name, price, stock_qty, barcode, category_id, categories(name)')
      .order('name')

    if (error) {
      console.error('Error loading products:', error.message)
      setLoading(false)
      return
    }

    const mapped: Product[] = (data || []).map((row: any) => ({
      id: String(row.prod_id),
      name: row.name,
      description: '',
      price: row.price,
      category: row.categories?.name ?? 'Other',
      stock: row.stock_qty,
      barcode: row.barcode ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    setProducts(mapped)
    setLoading(false)
  }

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  // ── Cart actions ──────────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      toast.error('Out of stock', { description: `${product.name} is not available` })
      return
    }
    setCart((prev: CartItem[]) => {
      const existing = prev.find((item: CartItem) => item.product.id === product.id)
      if (existing) {
        return prev.map((item: CartItem) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  // ── Barcode scanner ───────────────────────────────────────────────
  useEffect(() => {
    console.log('Barcode scanner ready. Products loaded:', products.length)

    let barcodeBuffer = ''
    let lastKeyTime = Date.now()

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const activeElement = document.activeElement
      const isTypingInInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement

      if (now - lastKeyTime > 500) {
        barcodeBuffer = ''
      }

      lastKeyTime = now

      if (e.key === 'Enter') {
        console.log('Barcode captured:', barcodeBuffer)

        if (barcodeBuffer.length > 2) {
          const found = products.find(
            (p: Product) =>
              p.barcode?.toLowerCase() === barcodeBuffer.toLowerCase()
          )

          if (found) {
            addToCart(found)
            setSearchQuery('')
            toast.success(`Added: ${found.name}`, {
              description: `NGN ${found.price.toLocaleString()}`,
            })
          } else {
            toast.error('Product not found', {
              description: `No product with barcode: ${barcodeBuffer}`,
            })
          }
        }

        barcodeBuffer = ''
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key
        console.log('Buffer now:', barcodeBuffer)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [products, addToCart])

  // ── Filter products ───────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products.filter((product: Product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.includes(searchQuery)
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  // ── Quantity and cart management ──────────────────────────────────
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return }
    setCart((prev: CartItem[]) =>
      prev.map((item: CartItem) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }

  const removeFromCart = (productId: string) =>
    setCart((prev: CartItem[]) =>
      prev.filter((item: CartItem) => item.product.id !== productId)
    )

  const clearCart = () => setCart([])

  // ── Totals ────────────────────────────────────────────────────────
  const subtotal = cart.reduce(
    (sum: number, item: CartItem) => sum + item.product.price * item.quantity, 0
  )
  const tax = subtotal * 0.075
  const total = subtotal + tax

  // ── Save transaction ──────────────────────────────────────────────
  const handlePaymentSuccess = async (paymentMethod: string) => {
    if (!user) return

    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        cashier_id: Number(user.id),
        guest_name: null,
        total: total,
        pay_method: paymentMethod,
      })
      .select('trans_id')
      .single()

    if (txnError || !txn) {
      console.error('Transaction save failed:', txnError?.message)
      clearCart()
      setPaymentModalOpen(false)
      return
    }

    const itemRows = cart.map((item: CartItem) => ({
      trans_id: txn.trans_id,
      product_id: Number(item.product.id),
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price,
    }))

    await supabase.from('transaction_items').insert(itemRows)

    for (const item of cart) {
      await supabase
        .from('products')
        .update({ stock_qty: item.product.stock - item.quantity })
        .eq('prod_id', Number(item.product.id))
    }

    clearCart()
    setPaymentModalOpen(false)
    loadProducts()
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-7rem)]">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search products or scan barcode..."
          />
          <CategoryFilter
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            categories={categories}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              No products found. Add products in Inventory first.
            </div>
          ) : (
            <ProductGrid products={filteredProducts} onAddToCart={addToCart} />
          )}
        </div>
      </div>

      <div className="w-full lg:w-96 flex-shrink-0">
        <Cart
          items={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          onCheckout={() => setPaymentModalOpen(true)}
        />
      </div>

      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        total={total}
        cart={cart}
        cashierName={user?.name || 'Cashier'}
        onSuccess={handlePaymentSuccess}
      />

      <AIAssistant />
    </div>
  )
}
