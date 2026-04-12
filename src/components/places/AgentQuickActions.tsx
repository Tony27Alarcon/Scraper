'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, ThermometerSun, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'

interface AgentQuickActionsProps {
  placeId: string
}

const QUICK_PROMPTS = [
  {
    label:  'Investigar información',
    prompt: 'Investiga este lugar en internet y completa la información que falte',
    icon:   Search,
  },
  {
    label:  'Evaluar prioridad',
    prompt: 'Evalúa la prioridad de este lead y actualiza score y temperatura',
    icon:   ThermometerSun,
  },
  {
    label:  'Generar resumen como nota',
    prompt: 'Haz un resumen del lugar y añádelo como nota',
    icon:   FileText,
  },
]

export function AgentQuickActions({ placeId }: AgentQuickActionsProps) {
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null)
  const router  = useRouter()
  const { toast } = useToast()

  async function handleAction(prompt: string) {
    if (loadingPrompt) return
    setLoadingPrompt(prompt)
    try {
      const res = await fetch(`/api/agent/chat/${placeId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: [{
            id:    Date.now().toString(),
            role:  'user',
            parts: [{ type: 'text', text: prompt }],
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
    } catch {
      toast({ type: 'error', message: 'Error al ejecutar la acción del agente' })
    } finally {
      setLoadingPrompt(null)
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {QUICK_PROMPTS.map((action) => {
        const Icon      = action.icon
        const isLoading = loadingPrompt === action.prompt
        return (
          <button
            key={action.prompt}
            onClick={() => handleAction(action.prompt)}
            disabled={loadingPrompt !== null}
            title={action.label}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isLoading
                ? 'text-brand-600 bg-brand-50'
                : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40',
            )}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Icon    className="w-4 h-4" />
            }
          </button>
        )
      })}
    </div>
  )
}
