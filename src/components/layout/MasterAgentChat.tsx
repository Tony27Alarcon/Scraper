'use client'

import { useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { usePathname } from 'next/navigation'
import { DefaultChatTransport } from 'ai'
import {
  Bot, Send, StopCircle, X, Loader2, RotateCcw,
  BarChart2, Flame, Search, Target, Zap, FileText,
  TrendingUp, AlertCircle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  { icon: BarChart2,  text: 'Dame un diagnóstico completo del CRM: estadísticas, gaps de datos y oportunidades que veas' },
  { icon: Flame,      text: 'Muéstrame los leads hot que aún no tienen notas de investigación — son oportunidades sin trabajar' },
  { icon: Search,     text: 'Encuentra los 10 negocios con mejor rating que no tienen teléfono ni web, e investiga los top 3' },
  { icon: Target,     text: 'Investiga a fondo el lugar que estoy viendo: busca todo en internet, llena campos vacíos, califica y deja nota' },
  { icon: TrendingUp, text: 'Crea una lista con los 30 mejores prospectos listos para contactar esta semana' },
  { icon: Zap,        text: 'Busca los registros nuevos sin evaluar y clasifícalos con score y temperatura según los datos disponibles' },
  { icon: FileText,   text: 'Redacta un mensaje de acercamiento profesional para el prospecto que estoy viendo' },
  { icon: AlertCircle,text: 'Identifica registros duplicados o negocios cerrados y márcalos para limpieza' },
]

export function MasterAgentChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [input,  setInput]  = useState('')
  const bottomRef           = useRef<HTMLDivElement>(null)
  const pathname            = usePathname()

  const { messages, sendMessage, status, stop, setMessages } = useChat({
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

  // Escape key closes the panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

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
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/20"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel lateral */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[440px] z-50 bg-white shadow-2xl flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span className="font-semibold text-sm">Atlas — Analista de Inteligencia</span>
            {isLoading && (
              <span className="flex items-center gap-1 text-xs text-brand-200">
                <Loader2 className="w-3 h-3 animate-spin" />
                Procesando...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && !isLoading && (
              <button
                onClick={() => setMessages([])}
                title="Nueva conversación"
                className="p-1 rounded-lg hover:bg-brand-700 transition-colors opacity-80 hover:opacity-100"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-brand-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
                    message.role === 'user' ? (
                      <span key={i} className="whitespace-pre-wrap">{part.text}</span>
                    ) : (
                      <ReactMarkdown
                        key={i}
                        components={{
                          p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          ul:     ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                          ol:     ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                          li:     ({ children }) => <li className="leading-snug">{children}</li>,
                          h1:     ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
                          h2:     ({ children }) => <p className="font-semibold text-sm mb-1 text-gray-800">{children}</p>,
                          h3:     ({ children }) => <p className="font-medium text-sm mb-0.5 text-gray-700">{children}</p>,
                          code:   ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          hr:     () => <hr className="my-2 border-gray-300" />,
                        }}
                      >
                        {part.text}
                      </ReactMarkdown>
                    )
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

      {/* FAB Button — se desplaza cuando el panel está abierto */}
      <div
        className={cn(
          'fixed bottom-6 z-[70] transition-all duration-300',
          isOpen ? 'right-[452px]' : 'right-6',
        )}
      >
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
          title="Atlas — Analista de Inteligencia"
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
