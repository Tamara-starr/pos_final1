'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

interface ShiftSummary {
  cashier_id: number
  cashier_name: string
  shift_start: string | null
  shift_end: string | null
  total_transactions: number
  total_revenue: number
  cash_revenue: number
  card_revenue: number
  transfer_revenue: number
  expected_cash: number
  actual_cash: number | null
  discrepancy: number | null
  status: 'open' | 'reconciled' | 'discrepancy'
  transactions: TransactionRow[]
}

interface TransactionRow {
  trans_id: number
  guest_name: string
  total: number
  pay_method: string
  created_at: string
}

interface User {
  user_id: number
  first_name: string
  last_name: string
  role: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const today = () => new Date().toISOString().split('T')[0]

export default function ShiftReconciliation() {
  const [selectedDate, setSelectedDate] = useState(today())
  const [cashiers, setCashiers] = useState<User[]>([])
  const [shifts, setShifts] = useState<ShiftSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedCashier, setExpandedCashier] = useState<number | null>(null)
  const [actualCashInputs, setActualCashInputs] = useState<Record<number, string>>({})
  const [manualShiftOpen, setManualShiftOpen] = useState<Record<number, boolean>>({})
  const [manualShiftTimes, setManualShiftTimes] = useState<Record<number, { start: string; end: string }>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  // Load all cashiers once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, role')
        .in('role', ['cashier', 'admin', 'manager'])
      if (data) setCashiers(data)
    })()
  }, [])

  // Load shift data whenever date or cashiers change
  const loadShifts = useCallback(async () => {
    if (!cashiers.length) return
    setLoading(true)

    const dayStart = `${selectedDate}T00:00:00`
    const dayEnd = `${selectedDate}T23:59:59`

    const { data: txns } = await supabase
      .from('transactions')
      .select('trans_id, cashier_id, guest_name, total, pay_method, created_at')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true })

    // Group transactions by cashier
    const grouped: Record<number, TransactionRow[]> = {}
    ;(txns ?? []).forEach((t: any) => {
      if (!grouped[t.cashier_id]) grouped[t.cashier_id] = []
      grouped[t.cashier_id].push(t)
    })

    const summaries: ShiftSummary[] = cashiers
      .filter((c) => grouped[c.user_id]?.length > 0)
      .map((c) => {
        const rows = grouped[c.user_id] ?? []

        const cash = rows
          .filter((r) => r.pay_method?.toLowerCase() === 'cash')
          .reduce((s, r) => s + Number(r.total), 0)

        const card = rows
          .filter((r) => ['card', 'pos', 'debit', 'credit'].includes(r.pay_method?.toLowerCase()))
          .reduce((s, r) => s + Number(r.total), 0)

        const transfer = rows
          .filter((r) => ['transfer', 'bank transfer', 'bank'].includes(r.pay_method?.toLowerCase()))
          .reduce((s, r) => s + Number(r.total), 0)

        const total = rows.reduce((s, r) => s + Number(r.total), 0)

        const manualTimes = manualShiftTimes[c.user_id]
        const shift_start = manualTimes?.start || rows[0]?.created_at || null
        const shift_end = manualTimes?.end || rows[rows.length - 1]?.created_at || null

        const actual = null
        const discrepancy = null
        const status: ShiftSummary['status'] = 'open'

        return {
          cashier_id: c.user_id,
          cashier_name: `${c.first_name} ${c.last_name}`,
          shift_start,
          shift_end,
          total_transactions: rows.length,
          total_revenue: total,
          cash_revenue: cash,
          card_revenue: card,
          transfer_revenue: transfer,
          expected_cash: cash,
          actual_cash: actual,
          discrepancy,
          status,
          transactions: rows,
        }
      })

    setShifts(summaries)
    setLoading(false)
  }, [cashiers, selectedDate, manualShiftTimes])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  // Save reconciliation record
  const handleReconcile = async (shift: ShiftSummary) => {
    const inputVal = actualCashInputs[shift.cashier_id]
    if (!inputVal || inputVal === '') {
      toast.error('Enter the actual cash amount first.')
      return
    }
    const actualCash = Number(inputVal)
    const discrepancy = actualCash - shift.expected_cash

    setSavingId(shift.cashier_id)

    const record = {
      cashier_id: shift.cashier_id,
      cashier_name: shift.cashier_name,
      shift_date: selectedDate,
      shift_start: shift.shift_start,
      shift_end: shift.shift_end,
      total_transactions: shift.total_transactions,
      total_revenue: shift.total_revenue,
      expected_cash: shift.expected_cash,
      actual_cash: actualCash,
      discrepancy: discrepancy,
      reconciled_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('reconciliations').insert(record)

    if (error) {
      // Fallback: save to localStorage until Supabase table is created
      const existing = JSON.parse(localStorage.getItem('reconciliations') || '[]')
      existing.push(record)
      localStorage.setItem('reconciliations', JSON.stringify(existing))
      toast.success(`Saved locally. Run the SQL in Supabase to persist to database.`)
    } else {
      toast.success(`${shift.cashier_name}'s shift reconciled successfully.`)
    }

    setSavingId(null)
  }

  const StatusBadge = ({ status }: { status: ShiftSummary['status'] }) => {
    if (status === 'reconciled') return <Badge className="bg-green-100 text-green-800">Reconciled</Badge>
    if (status === 'discrepancy') return <Badge variant="destructive">Discrepancy</Badge>
    return <Badge variant="outline">Open</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header + date picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Shift Reconciliation</h3>
          <p className="text-sm text-muted-foreground">
            Compare expected vs actual cash per cashier and log shift records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Date:</label>
          <Input
            type="date"
            value={selectedDate}
            max={today()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(today())}>
            Today
          </Button>
        </div>
      </div>

      {/* Day summary cards */}
      {shifts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Cashiers on shift', value: shifts.length, color: 'text-blue-600' },
            { label: 'Total revenue', value: fmt(shifts.reduce((s, sh) => s + sh.total_revenue, 0)), color: 'text-green-600' },
            { label: 'Reconciled', value: shifts.filter((s) => s.status === 'reconciled').length, color: 'text-green-600' },
            { label: 'Discrepancies', value: shifts.filter((s) => s.status === 'discrepancy').length, color: 'text-red-600' },
          ].map((card) => (
            <Card key={card.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Loading shift data…
        </div>
      )}

      {/* Empty state */}
      {!loading && shifts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <p className="font-medium">No transactions found for {selectedDate}</p>
          <p className="text-sm">Try selecting a different date.</p>
        </div>
      )}

      {/* One card per cashier */}
      {!loading && shifts.map((shift) => (
        <Card key={shift.cashier_id}>
          <CardContent className="pt-4 space-y-4">

            {/* Cashier header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {shift.cashier_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{shift.cashier_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.shift_start ? fmtDate(shift.shift_start) : '—'} → {shift.shift_end ? fmtDate(shift.shift_end) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={shift.status} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedCashier(expandedCashier === shift.cashier_id ? null : shift.cashier_id)}
                >
                  {expandedCashier === shift.cashier_id ? 'Hide transactions' : 'View transactions'}
                </Button>
              </div>
            </div>

            {/* Revenue breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y">
              {[
                { label: 'Total Sales', value: fmt(shift.total_revenue), sub: `${shift.total_transactions} transactions` },
                { label: 'Cash Sales', value: fmt(shift.cash_revenue), sub: 'Expected in drawer' },
                { label: 'Card / Transfer', value: fmt(shift.card_revenue + shift.transfer_revenue), sub: 'Non-cash' },
                { label: 'Expected Cash', value: fmt(shift.expected_cash), sub: 'To count in drawer' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-bold mt-0.5">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Manual shift time override */}
            <div>
              <button
                onClick={() => setManualShiftOpen((prev) => ({ ...prev, [shift.cashier_id]: !prev[shift.cashier_id] }))}
                className="text-xs text-muted-foreground underline"
              >
                {manualShiftOpen[shift.cashier_id] ? 'Hide' : 'Override shift times manually'}
              </button>
              {manualShiftOpen[shift.cashier_id] && (
                <div className="flex gap-4 mt-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Shift Start</label>
                    <Input
                      type="datetime-local"
                      className="w-52 text-sm"
                      value={manualShiftTimes[shift.cashier_id]?.start?.slice(0, 16) || ''}
                      onChange={(e) => setManualShiftTimes((prev) => ({
                        ...prev,
                        [shift.cashier_id]: { ...prev[shift.cashier_id], start: e.target.value + ':00' }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Shift End</label>
                    <Input
                      type="datetime-local"
                      className="w-52 text-sm"
                      value={manualShiftTimes[shift.cashier_id]?.end?.slice(0, 16) || ''}
                      onChange={(e) => setManualShiftTimes((prev) => ({
                        ...prev,
                        [shift.cashier_id]: { ...prev[shift.cashier_id], end: e.target.value + ':00' }
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actual cash input + reconcile button */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Actual Cash in Drawer (₦)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={actualCashInputs[shift.cashier_id] ?? ''}
                  onChange={(e) => setActualCashInputs((prev) => ({ ...prev, [shift.cashier_id]: e.target.value }))}
                  className="w-48"
                />
              </div>

              {/* Live discrepancy indicator */}
              {actualCashInputs[shift.cashier_id] !== undefined && actualCashInputs[shift.cashier_id] !== '' && (() => {
                const actual = Number(actualCashInputs[shift.cashier_id])
                const discrepancy = actual - shift.expected_cash
                return (
                  <div className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                    Math.abs(discrepancy) < 1
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : discrepancy > 0
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {Math.abs(discrepancy) < 1
                      ? '✓ Balanced'
                      : discrepancy > 0
                      ? `+${fmt(discrepancy)} over`
                      : `${fmt(Math.abs(discrepancy))} short`}
                  </div>
                )
              })()}

              <Button
                onClick={() => handleReconcile(shift)}
                disabled={savingId === shift.cashier_id}
              >
                {savingId === shift.cashier_id ? 'Saving…' : 'Reconcile Shift'}
              </Button>
            </div>

            {/* Expanded transaction list */}
            {expandedCashier === shift.cashier_id && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">All transactions — {shift.cashier_name}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Txn ID</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shift.transactions.map((txn) => (
                      <TableRow key={txn.trans_id}>
                        <TableCell className="text-muted-foreground font-mono text-xs">#{txn.trans_id}</TableCell>
                        <TableCell>{txn.guest_name || '—'}</TableCell>
                        <TableCell className="font-semibold">{fmt(Number(txn.total))}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{txn.pay_method}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-xs">{fmtDate(txn.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      
    </div>
  )
}