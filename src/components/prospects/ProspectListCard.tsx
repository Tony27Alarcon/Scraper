'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListChecks, Trash2, ExternalLink, ChevronDown, ChevronUp, Star, Globe, Phone } from 'lucide-react'
import { formatDate, formatRating, cn } from '@/lib/utils'

interface PlaceItem {
  id:               string
  title:            string | null
  category:         string | null
  address:          string | null
  phone:            string | null
  website:          string | null
  review_rating:    number | string | null
  review_count:     number | null
  lead_score:       number | null
  lead_temperature: string | null
  thumbnail:        string | null
}

interface ProspectItem {
  id:       number
  rank:     number | null
  reason:   string | null
  place:    PlaceItem
}

interface ProspectListCardProps {
  id:          string
  name:        string
  description: string | null
  count:       number
  createdAt:   Date | string
  createdBy:   string
  isAdmin:     boolean
}

const TEMP_COLOR: Record<string, string> = {
  hot:  'bg-red-100 text-red-700',
  warm: 'bg-amber-100 text-amber-700',
  cold: 'bg-blue-100 text-blue-700',
}

export function ProspectListCard({
  id, name, description, count, createdAt, createdBy, isAdmin,
}: ProspectListCardProps) {
  const router            = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [items, setItems]       = useState<ProspectItem[] | null>(null)
  const [loading, setLoading]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function loadItems() {
    if (items) { setExpanded(!expanded); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/prospect-lists/${id}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setExpanded(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la lista "${name}"?`)) return
    setDeleting(true)
    try {
      await fetch(`/api/prospect-lists/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5 text-brand-600" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">
                  {count} prospecto{count !== 1 ? 's' : ''} · {formatDate(createdAt)}
                </span>
                {createdBy && (
                  <span className="text-xs text-gray-400">por {createdBy}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={`/places?prospect_list=${id}`}
              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              title="Ver en Lugares"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Eliminar lista"
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={loadItems}
              disabled={loading}
              title={expanded ? 'Colapsar' : 'Ver prospectos'}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading
                ? <span className="w-4 h-4 block border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
                : expanded
                  ? <ChevronUp   className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {description && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">{description}</p>
        )}
      </div>

      {/* Expanded items */}
      {expanded && items && (
        <div className="border-t border-gray-100">
          <div className="divide-y divide-gray-50">
            {items.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400 text-center">Lista vacía</p>
            ) : (
              items.map((item) => (
                <a
                  key={item.id}
                  href={`/places/${item.place.id}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                >
                  {/* Rank */}
                  <span className="w-6 text-xs font-mono text-gray-400 mt-0.5 shrink-0">
                    #{item.rank ?? '—'}
                  </span>

                  {/* Thumbnail */}
                  {item.place.thumbnail ? (
                    <img
                      src={item.place.thumbnail}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                        {item.place.title ?? '—'}
                      </p>
                      {item.place.lead_temperature && (
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded-full font-medium',
                          TEMP_COLOR[item.place.lead_temperature] ?? 'bg-gray-100 text-gray-600',
                        )}>
                          {item.place.lead_temperature === 'hot'  ? '🔥' :
                           item.place.lead_temperature === 'warm' ? '🌤' : '❄️'}
                        </span>
                      )}
                      {item.place.lead_score != null && (
                        <span className="text-xs text-gray-500">{'★'.repeat(item.place.lead_score)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {item.place.category && (
                        <span className="text-xs text-gray-500">{item.place.category}</span>
                      )}
                      {item.place.review_rating != null && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {formatRating(item.place.review_rating)}
                          {item.place.review_count != null && (
                            <span className="text-gray-400 ml-0.5">({item.place.review_count})</span>
                          )}
                        </span>
                      )}
                      {item.place.phone && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Phone className="w-3 h-3" />{item.place.phone}
                        </span>
                      )}
                      {item.place.website && (
                        <span className="flex items-center gap-0.5 text-xs text-brand-500">
                          <Globe className="w-3 h-3" />web
                        </span>
                      )}
                    </div>

                    {item.reason && (
                      <p className="text-xs text-gray-400 mt-0.5 italic line-clamp-1">{item.reason}</p>
                    )}
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
