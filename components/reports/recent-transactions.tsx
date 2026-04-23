'use client'

import type { Transaction } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import { Receipt, Banknote, CreditCard, Smartphone } from 'lucide-react'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPaymentIcon = (method: Transaction['paymentMethod']) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4" />
      case 'card':
        return <CreditCard className="w-4 h-4" />
      case 'transfer':
        return <Smartphone className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-primary/10 text-primary">Completed</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-accent/10 text-accent">Pending</Badge>
      case 'voided':
        return <Badge variant="destructive">Voided</Badge>
    }
  }

  if (transactions.length === 0) {
    return (
      <Empty
        icon={Receipt}
        title="No transactions yet"
        description="Transactions will appear here once sales are made"
      />
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction ID</TableHead>
            <TableHead className="hidden sm:table-cell">Cashier</TableHead>
            <TableHead className="hidden md:table-cell">Items</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="hidden lg:table-cell">Status</TableHead>
            <TableHead className="hidden sm:table-cell text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <code className="text-sm font-medium">{transaction.id}</code>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {transaction.cashierName}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {transaction.items.length} items
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getPaymentIcon(transaction.paymentMethod)}
                  <span className="capitalize hidden sm:inline">
                    {transaction.paymentMethod}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(transaction.total)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {getStatusBadge(transaction.status)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-right text-muted-foreground">
                {formatTime(transaction.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
