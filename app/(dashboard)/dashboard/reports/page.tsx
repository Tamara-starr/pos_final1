'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, ShoppingCart, TrendingUp, Package, Sparkles, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Spinner } from '@/components/ui/spinner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

type DateRange = '7d' | '30d' | '90d'

const CHART_COLORS = [
  '#0E7C7B', '#1B3A5C', '#D97706', '#15803D',
  '#6D28D9', '#DC2626', '#0891B2', '#B45309'
]

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [transactions, setTransactions] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [dailySales, setDailySales] = useState<any[]>([])
  const [paymentBreakdown, setPaymentBreakdown] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    async function loadReports() {
      setLoading(true)
      setAiSummary('')

      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const since = new Date()
      since.setDate(since.getDate() - days)

      const { data: txnData, error: txnError } = await supabase
        .from('transactions')
        .select('trans_id, total, pay_method, created_at, users ( first_name, last_name )')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })

      if (txnError) console.error('Reports error:', txnError.message)
      const txns = txnData || []
      setTransactions(txns)

      // ── Daily sales for Bar Chart ─────────────────────────────────
      const dayMap: Record<string, number> = {}
      const dayLabels: Record<string, string> = {}

      // Initialise all days in range to 0
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        const label = d.toLocaleDateString('en-NG', {
          weekday: days <= 7 ? 'short' : undefined,
          month: 'short',
          day: 'numeric'
        })
        dayMap[key] = 0
        dayLabels[key] = label
      }

      // Sum totals per day
      for (const t of txns) {
        const key = new Date(t.created_at).toISOString().split('T')[0]
        if (dayMap[key] !== undefined) {
          dayMap[key] += t.total || 0
        }
      }

      const barData = Object.entries(dayMap).map(([key, value]) => ({
        day: dayLabels[key],
        revenue: Math.round(value),
      }))

      setDailySales(barData)

      // ── Payment method breakdown for Pie Chart ─────────────────────
      const payMap: Record<string, number> = {}
      for (const t of txns) {
        const method = t.pay_method || 'unknown'
        payMap[method] = (payMap[method] || 0) + 1
      }

      const pieData = Object.entries(payMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))

      setPaymentBreakdown(pieData)

      // ── Top products ──────────────────────────────────────────────
      const { data: itemData } = await supabase
        .from('transaction_items')
        .select('product_name, quantity, unit_price')

      const productMap: Record<string, { sold: number; revenue: number }> = {}
      for (const item of itemData || []) {
        if (!productMap[item.product_name]) {
          productMap[item.product_name] = { sold: 0, revenue: 0 }
        }
        productMap[item.product_name].sold += item.quantity
        productMap[item.product_name].revenue += item.unit_price * item.quantity
      }

      const sorted = Object.entries(productMap)
        .map(([name, vals]) => ({ name, sold: vals.sold, revenue: vals.revenue }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5)

      setTopProducts(sorted)
      setLoading(false)
    }

    loadReports()
  }, [dateRange])

  const stats = useMemo(() => {
    const totalSales = transactions.reduce((sum, t) => sum + (t.total || 0), 0)
    const totalTransactions = transactions.length
    const avgOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0
    return { totalSales, totalTransactions, avgOrderValue }
  }, [transactions])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(price)

  const formatPriceShort = (value: number) => {
    if (value >= 1000000) return `₦${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `₦${(value / 1000).toFixed(1)}K`
    return `₦${value}`
  }

  const generateAISummary = async () => {
    setAiLoading(true)
    setAiSummary('')

    try {
      const topList = topProducts
        .map(p => `${p.name}: ${p.sold} units, ${formatPrice(p.revenue)} revenue`)
        .join(', ')

      const paymentInfo = paymentBreakdown
        .map(p => `${p.name}: ${p.value} transactions`)
        .join(', ')

      const prompt = `You are a business analyst for Resort Shopping Mart in Nigeria.
Analyze this sales data for the last ${dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}:
- Total Revenue: ${formatPrice(stats.totalSales)}
- Total Transactions: ${stats.totalTransactions}
- Average Order Value: ${formatPrice(stats.avgOrderValue)}
- Top Products: ${topList || 'No sales yet'}
- Payment Methods: ${paymentInfo || 'No data'}

Write a detailed 5-7 sentence business summary for the resort manager.
Cover total revenue performance, the best and worst selling products,
payment method breakdown, and give two specific actionable recommendations
for improving sales at the resort mart.`

      const response = await fetch(
        
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
          })
        }
      )

      const data = await response.json()
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
        || data?.error?.message
        || 'Unable to generate summary at this time.'
      setAiSummary(reply)
    } catch {
      setAiSummary('Unable to connect to AI. Please check your Gemini API key.')
    }

    setAiLoading(false)
  }

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-primary font-bold">{formatPrice(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm">{payload[0].name}</p>
          <p className="text-primary">{payload[0].value} transactions</p>
          <p className="text-muted-foreground text-xs">
            {((payload[0].value / stats.totalTransactions) * 100).toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }
// ── Export to PDF ─────────────────────────────────────────────────
  const handleExportPDF = () => {
    window.print()
  }

  // ── Export to Excel ───────────────────────────────────────────────
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1 — Summary
    const summaryData = [
      ['Resort Shopping Mart — Sales Report'],
      ['Period', dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'Last 90 days'],
      ['Generated', new Date().toLocaleString('en-NG')],
      [],
      ['SUMMARY'],
      ['Total Revenue', stats.totalSales],
      ['Total Transactions', stats.totalTransactions],
      ['Average Order Value', stats.avgOrderValue],
    ]
    if (aiSummary) {
      summaryData.push([])
      summaryData.push(['AI SALES SUMMARY'])
      summaryData.push([aiSummary])
    }
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    ws1['!cols'] = [{ wch: 30 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

    // Sheet 2 — Daily Revenue
    const revenueRows = [
      ['Date', 'Revenue (NGN)'],
      ...dailySales.map(d => [d.day, d.revenue])
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(revenueRows)
    ws2['!cols'] = [{ wch: 20 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Daily Revenue')

    // Sheet 3 — Top Products
    const productRows = [
      ['Rank', 'Product Name', 'Units Sold', 'Revenue (NGN)'],
      ...topProducts.map((p, i) => [i + 1, p.name, p.sold, p.revenue])
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(productRows)
    ws3['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Top Products')

    // Sheet 4 — Payment Methods
    const paymentRows = [
      ['Payment Method', 'Transactions'],
      ...paymentBreakdown.map(p => [p.name, p.value])
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(paymentRows)
    ws4['!cols'] = [{ wch: 20 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Payment Methods')

    // Sheet 5 — Recent Transactions
    const txnRows = [
      ['Transaction ID', 'Cashier', 'Total (NGN)', 'Payment Method', 'Date'],
      ...transactions.map(t => [
        `TRN-${t.trans_id}`,
        `${t.users?.first_name || ''} ${t.users?.last_name || ''}`.trim(),
        t.total,
        t.pay_method,
        new Date(t.created_at).toLocaleString('en-NG')
      ])
    ]
    const ws5 = XLSX.utils.aoa_to_sheet(txnRows)
    ws5['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }]
    XLSX.utils.book_append_sheet(wb, ws5, 'Transactions')

    // Download
    const fileName = `ResortMart_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="space-y-6">
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          header { display: none !important; }
          nav { display: none !important; }
          [data-sidebar] { display: none !important; }
          body { background: white !important; }
          .space-y-6 { padding: 0 !important; }
          button { display: none !important; }
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Live sales data from your database</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportExcel} disabled={loading}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          Loading reports...
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{formatPrice(stats.totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />Avg Order Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatPrice(stats.avgOrderValue)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Bar Chart — Daily Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Daily Revenue
                </CardTitle>
                <CardDescription>
                  Revenue breakdown for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailySales.length === 0 || dailySales.every(d => d.revenue === 0) ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    No sales data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailySales} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatPriceShort}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar
                        dataKey="revenue"
                        fill="#0E7C7B"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart — Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Breakdown of how customers paid
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    No payment data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={paymentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend
                        formatter={(value) => (
                          <span style={{ fontSize: '12px', color: 'hsl(var(--foreground))' }}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" />AI Sales Summary
              </CardTitle>
              <CardDescription>
                Powered by Google Gemini — AI analysis of your sales data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiSummary ? (
                <p className="text-sm leading-relaxed">{aiSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Click the button below to generate an AI summary of your sales performance.
                </p>
              )}
              <Button onClick={generateAISummary} disabled={aiLoading} className="w-full sm:w-auto">
                {aiLoading
                  ? <><Spinner className="mr-2" />Generating...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Generate AI Summary</>
                }
              </Button>
            </CardContent>
          </Card>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />Top Selling Products
                </CardTitle>
                <CardDescription>Best performers by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="w-7 h-7 flex items-center justify-center rounded-full"
                          style={{ borderColor: CHART_COLORS[i], color: CHART_COLORS[i] }}
                        >
                          {i + 1}
                        </Badge>
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{formatPrice(p.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{p.sold} units sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest sales from your database</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No transactions found for this period
                </p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 10).map((t) => (
                    <div key={t.trans_id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">TRN-{t.trans_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.users?.first_name} {t.users?.last_name} · {new Date(t.created_at).toLocaleDateString('en-NG')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(t.total)}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {t.pay_method}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
