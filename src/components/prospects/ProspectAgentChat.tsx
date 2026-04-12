'use client'

import { useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Bot, Send, StopCircle, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  'Analiza los mejores candidatos y crea una lista con los 50 prospectos más relevantes para mi empresa',
  'Crea una lista de los 50 negocios con mayor puntaje y temperatura hot/warm',
  'Selecciona los 50 mejores prospectos que tengan sitio web y buen rating',
]

export function ProspectAgentChat() {
  const [open, setOpen]   = useState(true)
  const [input, setInput] = useState('')
  const bottomRef         = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent/prospects' }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span className="font-medium text-gray-900">Agente de Prospectos</span>
          {isLoading && (
            <span className="flex items-center gap-1 text-xs text-brand-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analizando...
            </span>
          )}
        </div>
        {open
          ? <ChevronUp   className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </button>

      {open && (
        <div className="border-t border-gray-100 flex flex-col h-[480px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">
                  El agente analizará tus lugares y seleccionará los 50 mejores prospectos según el perfil de tu empresa.
                </p>
                <div className="flex flex-col gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { sendMessage({ text: prompt }); }}
                      disabled={isLoading}
                      className="text-left text-sm px-3 py-2.5 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 transition-colors disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div className={cn(
                  'max-w-[90%] rounded-xl px-3 py-2 text-sm',
                  message.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-900',
                )}>
                  {message.parts.map((part, i) =>
                    part.type === 'text'
                      ? <span key={i} className="whitespace-pre-wrap">{part.text}</span>
                      : null
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe instrucciones para el agente..."
                disabled={isLoading}
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 bg-white"
              />
              {isLoading ? (
                <button type="button" onClick={stop} title="Detener"
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                  <StopCircle className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} title="Enviar"
                  className="p-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
