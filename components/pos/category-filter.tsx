'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter } from 'lucide-react'

interface Category {
  category_id: number
  name: string
}

interface CategoryFilterProps {
  selected: string
  onSelect: (category: string) => void
  categories: Category[]
}

export function CategoryFilter({ selected, onSelect, categories }: CategoryFilterProps) {
  return (
    <Select value={selected} onValueChange={onSelect}>
      <SelectTrigger className="w-full sm:w-[180px] h-11">
        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All Categories</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.category_id} value={cat.name}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}