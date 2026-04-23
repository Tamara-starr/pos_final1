'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, ShoppingCart, TrendingUp, Package, Sparkles } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type DateRange = '7d' | '30d' | '90d'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [transactions, setTransactions] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
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
      setTransactions(txnData || [])

      const { data: itemData } = await supabase
        .from('transaction_items')
        .select('product_name, quantity, unit_price')

      const productMap: Record<string, { sold: number; revenue: number }> = {}
      for (const item of itemData || []) {
        if (!productMap[item.product_name]) productMap[item.product_name] = { sold: 0, revenue: 0 }
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
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)

  
  const generateAISummary = async () => {
    setAiLoading(true)
    setAiSummary('')

    try {
      const topList = topProducts.map(p => `${p.name}: ${p.sold} units, ${formatPrice(p.revenue)} revenue`).join(', ')
      const prompt = `You are a business analyst for Resort Shopping Mart in Nigeria.
Analyze this sales data for the last ${dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}:
- Total Revenue: ${formatPrice(stats.totalSales)}
- Total Transactions: ${stats.totalTransactions}
- Average Order Value: ${formatPrice(stats.avgOrderValue)}
- Top Products: ${topList || 'No sales yet'}

Write a detailed 5-7 sentence business summary for the resort manager.
Cover total revenue performance, the best and worst selling products, 
payment method breakdown if available, and give two specific actionable 
recommendations for improving sales at the resort mart.`

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    })
  }
)
const data = await response.json()
console.log('Gemini response:', data)
const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary at this time.'

 
      setAiSummary(reply)
    } catch {
      setAiSummary('Unable to connect to AI. Please check your Gemini API key.')
    }

    setAiLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Live sales data from your database</p>
        </div>
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading reports...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" />Total Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{formatPrice(stats.totalSales)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Transactions</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalTransactions}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" />Avg Order Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatPrice(stats.avgOrderValue)}</p></CardContent></Card>
          </div>

          {/* AI Summary — Step 7 from capstone guide */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" /> AI Sales Summary
              </CardTitle>
              <CardDescription>Powered by Google Gemini — click to generate an AI analysis of your sales data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiSummary ? (
                <p className="text-sm leading-relaxed">{aiSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Click the button below to generate an AI summary of your sales performance.</p>
              )}
              <Button onClick={generateAISummary} disabled={aiLoading} className="w-full sm:w-auto">
                {aiLoading ? <><Spinner className="mr-2" />Generating AI Summary...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate AI Summary</>}
              </Button>
            </CardContent>
          </Card>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Top Selling Products</CardTitle>
                <CardDescription>Best performers by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-7 h-7 flex items-center justify-center rounded-full">{i + 1}</Badge>
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
                <p className="text-muted-foreground text-center py-8">No transactions found for this period</p>
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
                        <Badge variant="outline" className="text-xs capitalize">{t.pay_method}</Badge>
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
