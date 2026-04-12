'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

type Temp = 'cold' | 'warm' | 'hot' | null

const CYCLE: Temp[] = [null, 'cold', 'warm', 'hot']

const CFG: Record<string, { label: string; icon: string; bg: string; text: string; ring: string }> = {
  cold: { label: 'Frío',     icon: '❄️', bg: 'bg-blue-50',   text: 'text-blue-600',  ring: 'ring-blue-200'  },
  warm: { label: 'Tibio',    icon: '🌤', bg: 'bg-amber-50',  text: 'text-amber-600', ring: 'ring-amber-200' },
  hot:  { label: 'Caliente', icon: '🔥', bg: 'bg-red-50',    text: 'text-red-600',   ring: 'ring-red-200'   },
}

interface TemperatureBadgeProps {
  placeId:     string
  initialTemp: string | null | undefined
  size?:       'sm' | 'md'
}

async function saveTemp(placeId: string, temp: Temp) {
  await fetch(`/api/places/${placeId}/crm`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ lead_temperature: temp }),
  })
}

export function TemperatureBadge({ placeId, initialTemp, size = 'sm' }: TemperatureBadgeProps) {
  const [temp, setTemp] = useState<Temp>((initialTemp as Temp) ?? null)

  // ── sm: click to cycle ──────────────────────────────────────────────────
  if (size === 'sm') {
    function cycle() {
      const idx  = CYCLE.indexOf(temp)
      const next = CYCLE[(idx + 1) % CYCLE.length]
      setTemp(next)
      saveTemp(placeId, next)
    }

    const cfg = temp ? CFG[temp] : null

    return (
      <button
        onClick={cycle}
        title="Cambiar temperatura"
        className={cn(
          'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all select-none',
          cfg ? `${cfg.bg} ${cfg.text}` : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        )}
      >
        {cfg ? cfg.icon : '·'}
      </button>
    )
  }

  // ── md: button group ────────────────────────────────────────────────────
  function pick(t: Temp) {
    const next = temp === t ? null : t
    setTemp(next)
    saveTemp(placeId, next)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {(Object.keys(CFG) as (keyof typeof CFG)[]).map((t) => {
        const c    = CFG[t]
        const active = temp === t
        return (
          <button
            key={t}
            onClick={() => pick(t as Temp)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
              active
                ? `${c.bg} ${c.text} border-transparent ring-1 ${c.ring}`
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <span>{c.icon}</span>
            {c.label}
          </button>
        )
      })}
      {temp && (
        <button
          onClick={() => pick(null)}
          className="px-3 py-1.5 rounded-xl text-sm text-gray-400 border border-dashed border-gray-200 hover:border-gray-300 transition-all"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
