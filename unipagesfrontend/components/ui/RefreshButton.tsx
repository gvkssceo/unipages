'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { showToast } from '@/utils/toast'

interface RefreshButtonProps {
  endpoint: string
  onData: (data: any) => void
  className?: string
  disabled?: boolean
}

export function RefreshButton({ endpoint, onData, className, disabled }: RefreshButtonProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    const toastId = showToast.loading('Refreshing data...')
    setRefreshing(true)
    try {
      const url = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      url.searchParams.set('refresh', '1')
      url.searchParams.set('_ts', Date.now().toString())
      const res = await fetch(url.toString(), { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      onData(data)
      showToast.success('Data refreshed')
    } catch (e) {
      showToast.error('Refresh failed')
    } finally {
      setRefreshing(false)
      showToast.dismiss(toastId)
    }
  }

  return (
    <Button onClick={handleRefresh} disabled={disabled || refreshing} className={className || 'h-9 px-3'}>
      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
    </Button>
  )
}


