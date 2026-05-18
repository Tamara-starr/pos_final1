'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function GuestDisplayContent() {
  const searchParams = useSearchParams()
  const [receiptUrl, setReceiptUrl] = useState('')
  const [total, setTotal] = useState('')
  const [ref, setRef] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id) { setLoading(false); return }

   supabase
      .from('receipts')
      .select('receipt_id, ref, total, pay_method')
      .eq('receipt_id', id)
      .single()
      .then(({ data, error }) => {
        console.log('Receipt data:', data)
        console.log('Receipt error:', error)
        if (data) {
          setReceiptUrl(`https://benevolent-praline-d7c090.netlify.app/receipt?id=${data.receipt_id}`)
          setTotal(new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(data.total))
          setRef(data.ref)
        }
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-teal-800 flex items-center justify-center">
      <p className="text-white text-xl">Loading...</p>
    </div>
  )

  if (!receiptUrl) return (
    <div className="min-h-screen bg-teal-800 flex items-center justify-center">
      <p className="text-white text-xl">Receipt not found.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-teal-800 flex flex-col items-center justify-center gap-8 p-6">
      {/* Resort branding */}
      <div className="text-center text-white">
        <h1 className="text-3xl font-bold">Resort Shopping Mart</h1>
        <p className="text-teal-200 mt-1 text-lg">Scan to view your digital receipt</p>
      </div>

      {/* QR Code — large and centered */}
      <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(receiptUrl)}`}
          alt="Receipt QR Code"
          width={300}
          height={300}
          className="rounded-xl"
        />
        <div className="text-center">
          <p className="text-2xl font-bold text-teal-700">{total}</p>
          <p className="text-gray-400 text-sm mt-1">{ref}</p>
        </div>
      </div>

      {/* Instruction */}
      <div className="text-center text-teal-200 max-w-sm">
        <p className="text-lg">Point your phone camera at the QR code to receive your receipt instantly</p>
        <p className="text-sm mt-2 text-teal-300">No app needed — opens in your browser</p>
      </div>

      {/* Auto-refresh every 30 seconds for next transaction */}
      <p className="text-teal-400 text-xs">This display updates automatically</p>
    </div>
  )
}

export default function GuestDisplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-teal-800 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    }>
      <GuestDisplayContent />
    </Suspense>
  )
}