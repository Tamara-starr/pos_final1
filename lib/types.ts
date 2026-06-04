// User types
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'cashier'
  avatar?: string
}

// Product types
export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  reorderLevel?: number
  image?: string
  barcode?: string
  createdAt: Date
  updatedAt: Date
}

// Cart types
export interface CartItem {
  product: Product
  quantity: number
}

// Transaction types
export interface Transaction {
  id: string
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer'
  status: 'completed' | 'pending' | 'voided'
  cashierId: string
  cashierName: string
  createdAt: Date
}

// Report types
export interface SalesReport {
  date: string
  totalSales: number
  totalTransactions: number
  averageOrderValue: number
}

export interface ProductReport {
  productId: string
  productName: string
  totalSold: number
  revenue: number
}

// Category types
export type ProductCategory = 
  | 'Beverages'
  | 'Snacks'
  | 'Toiletries'
  | 'Groceries'
  | 'Souvenirs'
  | 'Electronics'
  | 'Clothing'
  | 'Other'

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Beverages',
  'Snacks',
  'Toiletries',
  'Groceries',
  'Souvenirs',
  'Electronics',
  'Clothing',
  'Other'
]
