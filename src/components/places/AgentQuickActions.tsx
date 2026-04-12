'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Loader2, Search, ThermometerSun, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentQuickActionsProps {
  placeId: string
}

const QUICK_PROMPTS = [
  {
    label: 'Investigar información',
    prompt: 'Investiga este lugar en internet y completa la información que falte',
    icon: Search
  },
  {
    label: 'Evaluar prioridad',
    prompt: 'Evalúa la prioridad de este lead y actualiza score y temperatura',
    icon: ThermometerSun
  },
  {
    label: 'Generar resumen',
    prompt: 'Haz un resumen del lugar y añádelo como nota',
    icon: FileText
  }
]

export function AgentQuickActions({ placeId }: AgentQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  async function handleAction(prompt: string) {
    setLoadingPrompt(prompt)
    setIsOpen(false)
    try {
      const res = await fetch(`/api/agent/chat/${placeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            id:   Date.now().toString(),
            role: 'user',
            parts: [{ type: 'text', text: prompt }],
          }],
        }),
      })
      
      if (!res.ok) throw new Error('Error en la petición')
      
      // Consume the stream so the agent finishes executing
      const reader = res.body?.getReader()
      if (reader) {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      }
      
      // Refresh the route to show updated data
      router.refresh()
    } catch (error) {
      console.error('Error executing agent action:', error)
      alert('Error al ejecutar la acción del agente')
    } finally {
      setLoadingPrompt(null)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loadingPrompt !== null}
        className={cn(
          "p-1.5 rounded-lg transition-colors flex items-center gap-1",
          loadingPrompt ? "text-brand-600 bg-brand-50" : "text-gray-400 hover:text-brand-600 hover:bg-brand-50"
        )}
        title="Acciones de IA"
      >
        {loadingPrompt ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden py-1">
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Asistente IA
            </span>
          </div>
          {QUICK_PROMPTS.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={i}
                onClick={() => handleAction(action.prompt)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
              >
                <Icon className="w-4 h-4 opacity-70" />
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
