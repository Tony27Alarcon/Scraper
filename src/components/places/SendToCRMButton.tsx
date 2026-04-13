'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'

interface SendToCRMButtonProps {
  placeId?:  string
  placeIds?: string[]
  size?:     'sm' | 'md'
}

export function SendToCRMButton({ placeId, placeIds, size = 'md' }: SendToCRMButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const ids = placeIds ?? (placeId ? [placeId] : [])
  const isBulk = ids.length > 1
  const isSm = size === 'sm'

  async function handleSend() {
    if (ids.length === 0) return

    if (isBulk && !confirm(`¿Enviar ${ids.length} contactos al CRM de Bruno Lab?`)) return

    setLoading(true)
    try {
      if (isBulk) {
        const res  = await fetch('/api/places/bulk-send-to-crm', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ids }),
        })
        const data = await res.json()

        if (!res.ok) {
          toast({ type: 'error', message: data.error ?? 'Error al enviar al CRM' })
          return
        }

        const parts: string[] = []
        if (data.sent > 0)    parts.push(`${data.sent} creados`)
        if (data.updated > 0) parts.push(`${data.updated} actualizados`)
        if (data.skipped > 0) parts.push(`${data.skipped} sin teléfono`)
        if (data.failed > 0)  parts.push(`${data.failed} fallidos`)

        toast({
          type:    data.failed > 0 ? 'error' : 'success',
          message: `CRM: ${parts.join(', ')}`,
        })
      } else {
        const res  = await fetch(`/api/places/${ids[0]}/send-to-crm`, { method: 'POST' })
        const data = await res.json()

        if (res.status === 400) {
          toast({ type: 'error', message: data.error ?? 'Este lugar no tiene teléfono registrado' })
          return
        }
        if (!res.ok) {
          toast({ type: 'error', message: data.error ?? 'Error al conectar con el CRM' })
          return
        }

        toast({
          type:    'success',
          message: data.status === 'created'
            ? 'Contacto creado en el CRM'
            : 'Contacto actualizado en el CRM',
        })
      }
    } catch {
      toast({ type: 'error', message: 'Error al enviar al CRM' })
    } finally {
      setLoading(false)
    }
  }

  if (ids.length === 0) return null

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleSend() }}
      disabled={loading}
      title="Enviar al CRM"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg transition-colors',
        isSm
          ? 'p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
          : 'px-2.5 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
        loading && 'opacity-50 cursor-not-allowed',
      )}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin', isSm ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      ) : (
        <Send className={cn(isSm ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      )}
      {!isSm && <span>Enviar al CRM</span>}
    </button>
  )
}
