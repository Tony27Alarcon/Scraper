'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlaceNote } from '@/types/place'
import { useToast } from '@/components/ui/ToastProvider'
import ReactMarkdown from 'react-markdown'

interface NotesThreadProps {
  placeId:       string
  currentUserId: number
  isAdmin:       boolean
}

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)   return 'ahora'
  if (m < 60)  return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d`
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(date))
}

export function NotesThread({ placeId, currentUserId, isAdmin }: NotesThreadProps) {
  const [notes,   setNotes]   = useState<PlaceNote[]>([])
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetch(`/api/places/${placeId}/notes`)
      .then(r => r.json())
      .then(setNotes)
      .catch(() => {})
  }, [placeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes.length])

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 72) + 'px'
  }

  async function addNote(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/places/${placeId}/notes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: text.trim() }),
      })
      if (!res.ok) throw new Error()
      const note = await res.json()
      setNotes(prev => [...prev, note])
      setText('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      toast({ type: 'success', message: 'Nota añadida' })
    } catch {
      toast({ type: 'error', message: 'Error al añadir la nota' })
    } finally {
      setLoading(false)
    }
  }

  async function deleteNote(id: number) {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      setNotes(prev => prev.filter(n => n.id !== id))
      toast({ type: 'info', message: 'Nota eliminada' })
    } catch {
      toast({ type: 'error', message: 'Error al eliminar la nota' })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addNote()
    }
  }

  return (
    <div className="space-y-3">
      {notes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Sin notas aún — sé el primero en comentar
        </p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {notes.map(note => {
            const initials = ((note.username ?? 'U').slice(0, 2)).toUpperCase()
            const canDelete = note.user_id === currentUserId || isAdmin
            return (
              <div key={note.id} className="flex gap-2.5 group">
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-700 truncate">
                      {note.username ?? 'Usuario'}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {timeAgo(note.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5 break-words leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        em:     ({ children }) => <em className="italic text-gray-700">{children}</em>,
                        h1:     ({ children }) => <p className="font-bold text-base text-gray-900 mt-2 mb-1">{children}</p>,
                        h2:     ({ children }) => <p className="font-semibold text-sm text-gray-800 mt-1.5 mb-1">{children}</p>,
                        h3:     ({ children }) => <p className="font-medium text-sm text-gray-700 mt-1 mb-0.5">{children}</p>,
                        ul:     ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
                        ol:     ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
                        li:     ({ children }) => <li className="leading-snug">{children}</li>,
                        code:   ({ children }) => <code className="bg-gray-100 border border-gray-200 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                        pre:    ({ children }) => <pre className="bg-gray-100 rounded-lg p-2 my-1.5 overflow-x-auto text-xs font-mono">{children}</pre>,
                        hr:     () => <hr className="my-2 border-gray-200" />,
                        a:      ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{children}</a>,
                      }}
                    >
                      {note.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <form onSubmit={addNote} className="flex gap-2 pt-1 border-t border-gray-100 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Agregar una nota… (Enter para enviar)"
          rows={1}
          className={cn(
            'flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2',
            'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white transition-all',
            'resize-none overflow-hidden leading-relaxed',
          )}
          style={{ maxHeight: '72px' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
