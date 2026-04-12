'use client'

import { useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { usePathname } from 'next/navigation'
import { DefaultChatTransport } from 'ai'
import {
  Bot, Send, StopCircle, X, Loader2,
  BarChart2, Flame, Search, Star, Zap, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  { icon: BarChart2, text: 'Dame un resumen estadístico del sistema' },
  { icon: Flame,     text: 'Muéstrame los 10 leads más calientes (hot)' },
  { icon: Search,    text: 'Busca lugares sin teléfono ni web para investigar' },
  { icon: Star,      text: 'Crea una lista con los 20 mejores prospectos' },
  { icon: Zap,       text: 'Califica como warm todos los lugares con rating > 4' },
  { icon: FileText,  text: 'Investiga y completa la info del lugar que estoy viendo' },
]

export function MasterAgentChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput]   = useState('')
  const bottomRef           = useRef<HTMLDivElement>(null)
  const pathname            = usePathname()

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api:     '/api/agent/master',
      headers: { 'x-current-path': pathname },
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const handleQuickPrompt = (text: string) => {
    if (isLoading) return
    sendMessage({ text })
    setIsOpen(true)
  }

  return (
    <>
      {/* Panel de chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[540px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">Agente Maestro</span>
              {isLoading && (
                <span className="flex items-center gap-1 text-xs text-brand-200">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Procesando...
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-brand-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 text-center font-medium uppercase tracking-wide">
                  Acciones rápidas
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map(({ icon: Icon, text }) => (
                    <button
                      key={text}
                      onClick={() => handleQuickPrompt(text)}
                      disabled={isLoading}
                      className="flex items-center gap-2.5 text-left text-sm px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 transition-colors disabled:opacity-50"
                    >
                      <Icon className="w-4 h-4 text-brand-500 shrink-0" />
                      <span>{text}</span>
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
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-900',
                  )}
                >
                  {message.parts.map((part, i) =>
                    part.type === 'text' ? (
                      <span key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </span>
                    ) : null,
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

          {/* Input */}
          <div className="border-t border-gray-100 p-3 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                disabled={isLoading}
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 bg-white"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  title="Detener"
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors shrink-0"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  title="Enviar"
                  className="p-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {isLoading && (
          <span className="absolute inset-0 rounded-full bg-brand-400 animate-ping opacity-60" />
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all',
            isOpen
              ? 'bg-brand-700 hover:bg-brand-800'
              : 'bg-brand-600 hover:bg-brand-700',
          )}
          title="Agente Maestro"
        >
          {isOpen ? (
            <X   className="w-6 h-6 text-white" />
          ) : (
            <Bot className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
    </>
  )
}
