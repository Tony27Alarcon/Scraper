'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  Bot, Send, StopCircle, X, Minus, Loader2, RotateCcw,
  Megaphone, Target, Wand2, BarChart2, Mail, MessageSquare,
  Flame, Lightbulb, FileText,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { useCloserContext } from './useCloserContext'

type WidgetState = 'closed' | 'open' | 'minimized'
const STORAGE_KEY = 'closer-widget-state'

type QuickPrompt = { icon: typeof Bot; text: string }

function getQuickPrompts(view: string | null): QuickPrompt[] {
  if (view === 'lead' || view === 'lead-in-campaign') {
    return [
      { icon: Target,   text: 'Investiga a fondo este prospecto: completa campos vacíos, califica y deja nota estratégica' },
      { icon: Wand2,    text: 'Redacta 3 variantes de primer toque personalizado para este prospecto (AIDA, PAS, BAB)' },
      { icon: Megaphone,text: 'Sugiéreme en qué campaña activa encaja este prospecto y por qué' },
      { icon: Mail,     text: 'Prepara una secuencia de 3 toques multicanal específica para este lead' },
    ]
  }
  if (view === 'pipeline' || view === 'lead-in-campaign') {
    return [
      { icon: BarChart2, text: 'Analiza la performance de esta campaña y dame 3 recomendaciones concretas' },
      { icon: Wand2,     text: 'Genera 3 variantes A/B del paso actual de la secuencia con distintos frameworks' },
      { icon: Flame,     text: 'Identifica patrones entre los que respondieron vs los que no respondieron' },
      { icon: Target,    text: 'Sugiéreme 20 prospectos similares a los que ya respondieron para añadir' },
    ]
  }
  if (view === 'editor') {
    return [
      { icon: Megaphone, text: 'Ayúdame a diseñar una campaña de cold outreach: canal, audiencia, secuencia 5-7 toques' },
      { icon: FileText,  text: 'Sugiéreme plantillas que funcionen para esta audiencia según mi ai_context' },
      { icon: Lightbulb, text: 'Dame un ángulo de mensaje distinto al convencional para esta categoría' },
    ]
  }
  if (view === 'library') {
    return [
      { icon: BarChart2, text: 'Dame un resumen de mis campañas activas con su tasa de respuesta y recomendaciones' },
      { icon: Megaphone, text: 'Propón una campaña nueva a partir de un segmento sin explotar del pipeline' },
      { icon: Flame,     text: 'Qué campañas están por debajo del benchmark y cómo las recuperarías' },
    ]
  }
  if (view === 'templates') {
    return [
      { icon: Wand2,    text: 'Créame 3 plantillas de WhatsApp de primer toque con frameworks distintos (AIDA, PAS, QVC)' },
      { icon: Mail,     text: 'Genera una plantilla de email de ruptura ("breakup email") con tono cercano' },
      { icon: MessageSquare, text: 'Escribe un script de llamada con manejo de 3 objeciones clásicas' },
    ]
  }
  if (view === 'prospects') {
    return [
      { icon: Target,    text: 'Encuentra los 20 prospectos hot sin campaña asignada y propón en cuál añadirlos' },
      { icon: Flame,     text: 'Clasifica los registros nuevos sin score con base en los datos que tienen' },
      { icon: Megaphone, text: 'Sugiere una segmentación inteligente para crear campañas temáticas' },
    ]
  }
  // dashboard / default
  return [
    { icon: BarChart2, text: 'Dame un diagnóstico del pipeline de marketing: campañas, tasa respuesta, gaps, oportunidades' },
    { icon: Flame,     text: 'Muéstrame los leads hot sin campaña asignada — son oportunidades sin trabajar' },
    { icon: Megaphone, text: 'Propón 3 ideas de campaña nuevas basadas en mi dataset y mi ai_context' },
    { icon: Wand2,     text: 'Genera 3 plantillas de WhatsApp listas para usar según mi perfil de empresa' },
  ]
}

export function CloserWidget() {
  const ctx = useCloserContext()

  const [state, setState]   = useState<WidgetState>('closed')
  const [input, setInput]   = useState('')
  const [hydrated, setHydrated] = useState(false)
  const bottomRef           = useRef<HTMLDivElement>(null)

  // Persistencia de estado (open/minimized/closed)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'open' || saved === 'minimized' || saved === 'closed') {
        setState(saved)
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, state) } catch {}
  }, [state, hydrated])

  // Headers dinámicos con el contexto actual — se recalculan en cada envío
  const transport = useMemo(() => {
    const headers: Record<string, string> = { 'x-current-path': ctx.path }
    if (ctx.placeId) headers['x-current-place-id'] = ctx.placeId
    if (ctx.listId)  headers['x-current-list-id']  = ctx.listId
    if (ctx.view)    headers['x-current-view']     = ctx.view
    return new DefaultChatTransport({ api: '/api/agent/closer', headers })
  }, [ctx.path, ctx.placeId, ctx.listId, ctx.view])

  const { messages, sendMessage, status, stop, setMessages } = useChat({ transport })
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (state === 'open') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, state])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && state === 'open') setState('minimized')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const handleQuickPrompt = (text: string) => {
    if (isLoading) return
    sendMessage({ text })
  }

  const quickPrompts = getQuickPrompts(ctx.view)

  // ─── FAB (solo cuando closed) ─────────────────────────────────────────────
  if (state === 'closed') {
    return (
      <div className="fixed bottom-6 right-6 z-[60]">
        {isLoading && (
          <span className="absolute inset-0 rounded-full bg-brand-400 animate-ping opacity-60" />
        )}
        <button
          onClick={() => setState('open')}
          className="relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-brand-600 hover:bg-brand-700 transition-colors"
          title="Closer — Copiloto de marketing y ventas"
        >
          <Bot className="w-6 h-6 text-white" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
              {Math.min(messages.length, 9)}
            </span>
          )}
        </button>
      </div>
    )
  }

  // ─── Minimizado: barra compacta ────────────────────────────────────────────
  if (state === 'minimized') {
    return (
      <div className="fixed bottom-6 right-6 z-[60] w-[380px] max-w-[calc(100vw-3rem)]">
        <button
          onClick={() => setState('open')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold truncate">Closer</span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <span className="text-[11px] bg-white/20 rounded-full px-2 py-0.5">
                {messages.length} msg
              </span>
            )}
            <X
              className="w-4 h-4 opacity-70 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setState('closed') }}
            />
          </span>
        </button>
      </div>
    )
  }

  // ─── Ventana abierta (380x560) — sin overlay, no bloqueante ────────────────
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-[60]',
        'w-[380px] h-[560px] max-h-[calc(100vh-3rem)] max-w-[calc(100vw-3rem)]',
        'flex flex-col rounded-2xl shadow-2xl bg-white border border-gray-200 overflow-hidden',
        // Móvil: ocupa pantalla
        'max-sm:inset-2 max-sm:w-auto max-sm:h-auto max-sm:rounded-xl',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-5 h-5 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Closer</span>
              {isLoading && <Loader2 className="w-3 h-3 animate-spin text-brand-200" />}
            </div>
            {ctx.label && (
              <span className="block text-[11px] text-brand-100 truncate">
                Contexto: {ctx.label}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && !isLoading && (
            <button
              onClick={() => setMessages([])}
              title="Nueva conversación"
              className="p-1 rounded-lg hover:bg-brand-700 opacity-80 hover:opacity-100"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setState('minimized')}
            title="Minimizar"
            className="p-1 rounded-lg hover:bg-brand-700"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setState('closed')}
            title="Cerrar"
            className="p-1 rounded-lg hover:bg-brand-700"
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
              {quickPrompts.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => handleQuickPrompt(text)}
                  disabled={isLoading}
                  className="flex items-start gap-2.5 text-left text-sm px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 transition-colors disabled:opacity-50"
                >
                  <Icon className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{text}</span>
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
                message.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-900',
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
            placeholder="Pregunta a Closer..."
            disabled={isLoading}
            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 bg-white"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              title="Detener"
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 shrink-0"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              title="Enviar"
              className="p-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
