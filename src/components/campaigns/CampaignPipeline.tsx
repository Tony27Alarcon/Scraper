'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Phone, Globe, Mail, Star, ArrowRight, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGE_ORDER, STAGE_LABELS, type Stage } from './LeadStageBadge'

interface PipelineItem {
  id: number
  place_id: string
  stage: Stage
  rank: number | null
  reason: string | null
  outcome: string | null
  last_contacted_at: string | null
  reply_at: string | null
  next_action_at: string | null
  place: {
    id: string
    title: string | null
    category: string | null
    city: string | null
    country: string | null
    phone: string | null
    email: string | null
    website: string | null
    review_rating: number | null
    review_count: number | null
    lead_score: number | null
    lead_temperature: string | null
    thumbnail: string | null
  }
}

interface Props {
  campaignId: string
}

export function CampaignPipeline({ campaignId }: Props) {
  const [items, setItems]     = useState<PipelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [moving, setMoving]   = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/items`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setItems(data.items)
    }
    setLoading(false)
  }

  useEffect(() => { refresh() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [campaignId])

  async function moveToStage(placeId: string, stage: Stage) {
    setMoving(placeId)
    const res = await fetch(`/api/campaigns/${campaignId}/items/${placeId}/stage`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ stage }),
    })
    setMoving(null)
    if (res.ok) {
      setItems(prev => prev.map(i => (i.place_id === placeId ? { ...i, stage } : i)))
    }
  }

  const itemsByStage: Record<string, PipelineItem[]> = {}
  for (const s of STAGE_ORDER) itemsByStage[s] = []
  for (const it of items) (itemsByStage[it.stage] ?? itemsByStage.queued).push(it)

  const total = items.length
  const replied = itemsByStage.replied.length + itemsByStage.interested.length + itemsByStage.won.length
  const won     = itemsByStage.won.length
  const contacted = total - itemsByStage.queued.length

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando pipeline...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3">
        <Metric label="Total leads" value={total} />
        <Metric label="Contactados" value={contacted} hint={total ? `${Math.round((contacted / total) * 100)}%` : undefined} />
        <Metric label="Respondieron" value={replied} hint={contacted ? `${Math.round((replied / contacted) * 100)}%` : undefined} />
        <Metric label="Ganados" value={won} hint={total ? `${Math.round((won / total) * 100)}%` : undefined} accent="emerald" />
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
        {STAGE_ORDER.map(stage => (
          <div key={stage} className="bg-gray-50 rounded-lg border border-gray-200 min-h-[500px] flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-gray-50">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-[11px] text-gray-500 bg-white px-1.5 py-0.5 rounded-full">
                {itemsByStage[stage].length}
              </span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {itemsByStage[stage].map(item => (
                <LeadCard
                  key={item.id}
                  item={item}
                  busy={moving === item.place_id}
                  onMove={(s) => moveToStage(item.place_id, s)}
                />
              ))}
              {itemsByStage[stage].length === 0 && (
                <p className="text-[11px] text-gray-400 text-center py-3">Sin leads</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, hint, accent = 'gray' }: { label: string; value: number; hint?: string; accent?: 'gray' | 'emerald' }) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      accent === 'emerald' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200',
    )}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function LeadCard({ item, busy, onMove }: { item: PipelineItem; busy: boolean; onMove: (s: Stage) => void }) {
  const p = item.place
  const nextStages = STAGE_ORDER.filter(s => s !== item.stage)

  return (
    <div className="bg-white rounded-md border border-gray-200 p-2 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/places/${p.id}`} className="flex-1 min-w-0 group">
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-brand-700">
            {p.title ?? 'Sin nombre'}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {[p.category, p.city].filter(Boolean).join(' · ')}
          </p>
        </Link>
        <Link
          href={`/places/${p.id}`}
          className="text-gray-400 hover:text-brand-600 shrink-0"
          title="Abrir prospecto"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
        {p.review_rating !== null && (
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {p.review_rating.toFixed(1)}
          </span>
        )}
        {p.lead_score && <span className="text-brand-600 font-medium">S{p.lead_score}</span>}
        {p.lead_temperature === 'hot'  && <span className="text-red-600">🔥</span>}
        {p.lead_temperature === 'warm' && <span className="text-amber-600">☀️</span>}
        {p.lead_temperature === 'cold' && <span className="text-blue-400">❄️</span>}
      </div>

      <div className="flex items-center gap-1 mt-1.5 text-gray-400">
        {p.phone   && <Phone  className="w-3 h-3" />}
        {p.email   && <Mail   className="w-3 h-3" />}
        {p.website && <Globe  className="w-3 h-3" />}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        {busy ? (
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Moviendo...
          </div>
        ) : (
          <details className="group">
            <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-brand-600 list-none flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Mover a...
            </summary>
            <div className="mt-1 flex flex-wrap gap-1">
              {nextStages.map(s => (
                <button
                  key={s}
                  onClick={() => onMove(s)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-brand-100 hover:text-brand-700 text-gray-700"
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
