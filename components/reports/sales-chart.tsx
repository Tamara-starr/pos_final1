'use client'

import type { SalesReport } from '@/lib/types'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

interface SalesChartProps {
  data: SalesReport[]
}

const chartConfig = {
  totalSales: {
    label: 'Sales',
    color: 'var(--chart-1)',
  },
}

export function SalesChart({ data }: SalesChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `₦${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `₦${(value / 1000).toFixed(0)}K`
    }
    return `₦${value}`
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs fill-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatPrice}
            className="text-xs fill-muted-foreground"
          />
          <Tooltip
            content={
              <ChartTooltipContent
                formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Sales']}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="totalSales"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#salesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
