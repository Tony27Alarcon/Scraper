'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMOJI_OPTIONS = ['👍', '🔥', '⭐', '✅', '❌', '🤝', '💼', '📞', '💰', '🚀', '🎯', '👀']

interface Reaction {
  emoji:   string
  count:   number
  reacted: boolean
}

interface ReactionBarProps {
  placeId:          string
  initialReactions: Reaction[]
  size?:            'sm' | 'md'
}

export function ReactionBar({ placeId, initialReactions, size = 'md' }: ReactionBarProps) {
  const [reactions,    setReactions]    = useState<Reaction[]>(initialReactions)
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function toggle(emoji: string) {
    setReactions(prev => {
      const existing = prev.find(r => r.emoji === emoji)
      if (existing) {
        if (existing.reacted) {
          const newCount = existing.count - 1
          return newCount <= 0
            ? prev.filter(r => r.emoji !== emoji)
            : prev.map(r => r.emoji === emoji ? { ...r, count: newCount, reacted: false } : r)
        }
        return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r)
      }
      return [...prev, { emoji, count: 1, reacted: true }]
    })
    setPickerOpen(false)

    await fetch(`/api/places/${placeId}/reactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ emoji }),
    })
  }

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-0.5 flex-wrap">
        {reactions.slice(0, 3).map(r => (
          <button
            key={r.emoji}
            onClick={() => toggle(r.emoji)}
            className={cn(
              'inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md text-xs transition-all',
              r.reacted
                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            )}
          >
            {r.emoji}<span className="text-[10px]">{r.count}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => toggle(r.emoji)}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium transition-all select-none',
            r.reacted
              ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}

      <div ref={pickerRef} className="relative">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          title="Agregar reacción"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        {pickerOpen && (
          <div className="absolute z-50 bottom-10 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex flex-wrap gap-1 w-52">
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => toggle(emoji)}
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-xl text-lg transition-colors',
                  reactions.find(r => r.emoji === emoji && r.reacted)
                    ? 'bg-brand-50 ring-1 ring-brand-200'
                    : 'hover:bg-gray-100'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
