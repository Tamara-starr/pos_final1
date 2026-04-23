'use client'

import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter } from 'lucide-react'

interface CategoryFilterProps {
  selected: ProductCategory | 'All'
  onSelect: (category: ProductCategory | 'All') => void
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <Select value={selected} onValueChange={(value) => onSelect(value as ProductCategory | 'All')}>
      <SelectTrigger className="w-full sm:w-[180px] h-11">
        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All Categories</SelectItem>
        {PRODUCT_CATEGORIES.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
