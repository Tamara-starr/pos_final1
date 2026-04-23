'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

interface TopProductsChartProps {
  data: { name: string; sold: number; revenue: number }[]
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'var(--chart-2)',
  },
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    shortName: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
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
        <BarChart
          data={formattedData}
          layout="vertical"
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatPrice}
            className="text-xs fill-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="shortName"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={100}
            className="text-xs fill-muted-foreground"
          />
          <Tooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => [
                  `₦${Number(value).toLocaleString()} (${item.payload.sold} units)`,
                  'Revenue',
                ]}
              />
            }
          />
          <Bar dataKey="revenue" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
