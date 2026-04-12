'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'

interface LeadScoreProps {
  placeId:      string
  initialScore: number | null | undefined
  size?:        'sm' | 'md'
}

export function LeadScore({ placeId, initialScore, size = 'md' }: LeadScoreProps) {
  const [score, setScore] = useState<number | null>(initialScore ?? null)
  const [hover, setHover] = useState(0)
  const { toast } = useToast()

  async function handleClick(n: number) {
    const prev = score
    const next = score === n ? null : n
    setScore(next)
    try {
      const res = await fetch(`/api/places/${placeId}/crm`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lead_score: next }),
      })
      if (!res.ok) throw new Error()
      toast({ type: 'success', message: next ? `Puntaje: ${next}/5` : 'Puntaje eliminado' })
    } catch {
      setScore(prev)
      toast({ type: 'error', message: 'Error al guardar el puntaje' })
    }
  }

  // ── sm: mini dots ──────────────────────────────────────────────────────
  if (size === 'sm') {
    return (
      <div className="flex items-center gap-0.5" title={score ? `Puntaje: ${score}/5` : 'Sin puntaje'}>
        {Array.from({ length: 5 }, (_, i) => {
          const n      = i + 1
          const active = n <= (hover || score || 0)
          return (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => handleClick(n)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all duration-100',
                active ? 'bg-amber-400' : 'bg-gray-200 hover:bg-amber-200'
              )}
            />
          )
        })}
      </div>
    )
  }

  // ── md: star row ──────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const n      = i + 1
        const active = n <= (hover || score || 0)
        return (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => handleClick(n)}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg text-xl transition-all duration-100',
              active ? 'text-amber-400 scale-110' : 'text-gray-200 hover:text-amber-300'
            )}
          >
            ★
          </button>
        )
      })}
      {score ? (
        <span className="text-sm text-gray-400 ml-1">{score}/5</span>
      ) : (
        <span className="text-sm text-gray-300 ml-1">Sin puntaje</span>
      )}
    </div>
  )
}
