'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Phone, Mail, MessageCircle, Users, CheckCircle2, Bot,
  MoreHorizontal, Send, Trash2, Calendar, StickyNote, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'
import { TimelineEntry } from '@/types/place'

// ─── Configuración de tipos ───────────────────────────────────────────────────

type ActivityType = 'call' | 'email' | 'whatsapp' | 'meeting' | 'contacted' | 'ai_action' | 'other' | 'note'

interface TypeConfig {
  label: string
  icon:  React.ElementType
  color: string    // Tailwind bg+text para el ícono
  badge: string    // Tailwind para el badge de tipo
}

const TYPE_CFG: Record<ActivityType, TypeConfig> = {
  call:      { label: 'Llamada',       icon: Phone,          color: 'bg-green-100 text-green-600',  badge: 'bg-green-50 text-green-700 border-green-200'  },
  email:     { label: 'Correo',        icon: Mail,           color: 'bg-blue-100 text-blue-600',    badge: 'bg-blue-50 text-blue-700 border-blue-200'    },
  whatsapp:  { label: 'WhatsApp',      icon: MessageCircle,  color: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  meeting:   { label: 'Reunión',       icon: Users,          color: 'bg-purple-100 text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  contacted: { label: 'Contactado',    icon: CheckCircle2,   color: 'bg-teal-100 text-teal-600',    badge: 'bg-teal-50 text-teal-700 border-teal-200'    },
  ai_action: { label: 'IA',            icon: Bot,            color: 'bg-brand-100 text-brand-600',  badge: 'bg-brand-50 text-brand-700 border-brand-200'  },
  other:     { label: 'Otro',          icon: MoreHorizontal, color: 'bg-gray-100 text-gray-500',    badge: 'bg-gray-50 text-gray-600 border-gray-200'    },
  note:      { label: 'Nota',          icon: StickyNote,     color: 'bg-amber-100 text-amber-600',  badge: 'bg-amber-50 text-amber-700 border-amber-200'  },
}

const ACTIVITY_TYPES: ActivityType[] = ['call', 'email', 'whatsapp', 'meeting', 'contacted', 'other']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('es-ES', {
    day:   '2-digit',
    month: 'short',
    hour:  '2-digit',
    minute:'2-digit',
  }).format(d)
}

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ActivityTimelineProps {
  placeId:       string
  currentUserId: number
  isAdmin:       boolean
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ActivityTimeline({ placeId, currentUserId, isAdmin }: ActivityTimelineProps) {
  const [entries,     setEntries]     = useState<TimelineEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const [type,        setType]        = useState<ActivityType>('call')
  const [content,     setContent]     = useState('')
  const [happenedAt,  setHappenedAt]  = useState(() => toLocalDatetime(new Date()))
  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Fetch timeline
  useEffect(() => {
    setLoading(true)
    fetch(`/api/places/${placeId}/timeline`)
      .then(r => r.json())
      .then(data => { setEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [placeId])

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/places/${placeId}/activities`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type,
          content:     content.trim() || undefined,
          happened_at: new Date(happenedAt).toISOString(),
        }),
      })
      if (!res.ok) throw new Error()
      const entry = await res.json()
      setEntries(prev => [entry, ...prev].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ))
      setContent('')
      setHappenedAt(toLocalDatetime(new Date()))
      setShowForm(false)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      toast({ type: 'success', message: `${TYPE_CFG[type].label} registrado` })
    } catch {
      toast({ type: 'error', message: 'Error al registrar la actividad' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteActivity(id: number) {
    try {
      await fetch(`/api/activities/${id}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => !(e.kind === 'activity' && e.id === id)))
      toast({ type: 'info', message: 'Actividad eliminada' })
    } catch {
      toast({ type: 'error', message: 'Error al eliminar' })
    }
  }

  async function handleDeleteNote(id: number) {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => !(e.kind === 'note' && e.id === id)))
      toast({ type: 'info', message: 'Nota eliminada' })
    } catch {
      toast({ type: 'error', message: 'Error al eliminar' })
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Botón para añadir actividad */}
      <button
        onClick={() => setShowForm(prev => !prev)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-medium transition-all',
          showForm
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
        )}
      >
        <span className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5" />
          Registrar actividad
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', showForm && 'rotate-180')} />
      </button>

      {/* Formulario de actividad */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          {/* Selector de tipo */}
          <div className="flex gap-1.5 flex-wrap">
            {ACTIVITY_TYPES.map(t => {
              const cfg  = TYPE_CFG[t]
              const Icon = cfg.icon
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                    type === t ? cfg.badge : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {/* Descripción */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            placeholder="Descripción (opcional): qué pasó, con quién, qué se acordó..."
            rows={2}
            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none overflow-hidden leading-relaxed"
            style={{ maxHeight: '96px' }}
          />

          {/* Fecha y hora */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="datetime-local"
              value={happenedAt}
              onChange={e => setHappenedAt(e.target.value)}
              className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-200 text-gray-700"
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setContent(''); setHappenedAt(toLocalDatetime(new Date())) }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Guardando...' : `Registrar ${TYPE_CFG[type].label}`}
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Sin actividad aún — registra el primer contacto
        </p>
      ) : (
        <div className="space-y-0">
          {entries.map((entry, i) => {
            const cfg    = TYPE_CFG[entry.type as ActivityType] ?? TYPE_CFG.other
            const Icon   = cfg.icon
            const isLast = i === entries.length - 1
            const canDelete = entry.user_id === currentUserId || isAdmin

            return (
              <div key={`${entry.kind}-${entry.id}`} className="flex gap-3 group">
                {/* Línea de tiempo + ícono */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', cfg.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-gray-100 my-1" />}
                </div>

                {/* Contenido */}
                <div className={cn('flex-1 min-w-0 pb-4', isLast && 'pb-0')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-md border', cfg.badge)}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      {entry.content && (
                        <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                          {entry.content}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.username ?? 'Usuario'}
                      </p>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => entry.kind === 'activity' ? handleDeleteActivity(entry.id) : handleDeleteNote(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all shrink-0 mt-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
