'use client'

import type { Product } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Plus, Package, AlertTriangle } from 'lucide-react'

interface ProductGridProps {
  products: Product[]
  onAddToCart: (product: Product) => void
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <Empty
        icon={Package}
        title="No products found"
        description="Try adjusting your search or filter criteria"
      />
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
      {products.map((product) => {
        const isLowStock = product.stock < 10
        const isOutOfStock = product.stock === 0

        return (
          <Card
            key={product.id}
            className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md ${
              isOutOfStock ? 'opacity-60' : 'cursor-pointer'
            }`}
          >
            <CardContent className="p-3">
              {/* Product Image Placeholder */}
              <div className="aspect-square bg-secondary/50 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                <Package className="w-8 h-8 text-muted-foreground/50" />
                
                {/* Category Badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5"
                >
                  {product.category}
                </Badge>

                {/* Stock Warning */}
                {isLowStock && !isOutOfStock && (
                  <div className="absolute bottom-2 right-2">
                    <AlertTriangle className="w-4 h-4 text-accent" />
                  </div>
                )}

                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Badge variant="destructive">Out of Stock</Badge>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-1">
                <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                  {product.name}
                </h3>
                <p className="text-lg font-semibold text-primary">
                  {formatPrice(product.price)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Stock: {product.stock}
                </p>
              </div>

              {/* Add Button */}
              <Button
                size="sm"
                className="w-full mt-3 h-8"
                onClick={() => onAddToCart(product)}
                disabled={isOutOfStock}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
