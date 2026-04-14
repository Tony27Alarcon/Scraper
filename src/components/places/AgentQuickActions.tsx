'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Radar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'

interface AgentQuickActionsProps {
  placeId: string
}

const DEEP_RESEARCH_PROMPT =
  'Investigacion profunda: diagnostica campos vacios, busca contexto e email como prioridad, revisa la web oficial con extraccion estructurada, busca tomadores de decision, llena todos los campos, califica el lead, y documenta hallazgos en una nota de contexto no redundante.'

export function AgentQuickActions({ placeId }: AgentQuickActionsProps) {
  const [loading, setLoading] = useState(false)
  const router  = useRouter()
  const { toast } = useToast()

  async function handleAction() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/agent/chat/${placeId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: [{
            id:    Date.now().toString(),
            role:  'user',
            parts: [{ type: 'text', text: DEEP_RESEARCH_PROMPT }],
          }],
        }),
      })

      if (!res.ok) throw new Error()

      // Consume stream so the agent finishes
      const reader = res.body?.getReader()
      if (reader) {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      }

      router.refresh()
      toast({ type: 'success', message: 'Investigación completada' })
    } catch {
      toast({ type: 'error', message: 'Error al ejecutar la investigación' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      title="Investigar a fondo"
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        loading
          ? 'text-brand-600 bg-brand-50'
          : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40',
      )}
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Radar   className="w-4 h-4" />
      }
    </button>
  )
}
