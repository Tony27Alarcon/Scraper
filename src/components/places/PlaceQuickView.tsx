'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  X, Phone, Globe, Mail, MapPin, Star, ExternalLink, Loader2,
} from 'lucide-react'
import { cn, formatRating } from '@/lib/utils'
import { FavoriteButton }   from '@/components/crm/FavoriteButton'
import { TemperatureBadge } from '@/components/crm/TemperatureBadge'
import { LeadScore }        from '@/components/crm/LeadScore'
import { ActivityTimeline } from '@/components/crm/ActivityTimeline'
import { AddToListButton }  from '@/components/places/AddToListButton'
import { SendToCRMButton }  from '@/components/places/SendToCRMButton'

interface PlaceData {
  id:               string
  title:            string | null
  category:         string | null
  address:          string | null
  phone:            string | null
  website:          string | null
  email:            string | null
  review_rating:    number | null
  review_count:     number | null
  thumbnail:        string | null
  lead_score:       number | null
  lead_temperature: string | null
  isFavorited:      boolean
  initialReactions: { emoji: string; count: number; reacted: boolean }[]
}

interface PlaceQuickViewProps {
  placeId:       string | null
  onClose:       () => void
  currentUserId: number
  isAdmin:       boolean
}

export function PlaceQuickView({ placeId, onClose, currentUserId, isAdmin }: PlaceQuickViewProps) {
  const [place,   setPlace]   = useState<PlaceData | null>(null)
  const [loading, setLoading] = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const hasChanges   = useRef(false)

  // Fetch when opening
  useEffect(() => {
    if (!placeId) return
    setPlace(null)
    setLoading(true)
    fetch(`/api/places/${placeId}`)
      .then(r => r.json())
      .then(data => { setPlace(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [placeId])

  // Block body scroll when open
  useEffect(() => {
    if (placeId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [placeId])

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && placeId) handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [placeId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    if (hasChanges.current) router.refresh()
    hasChanges.current = false
    onClose()
  }

  const backParam = searchParams.toString()
    ? `?back=${encodeURIComponent(searchParams.toString())}`
    : ''

  const isOpen = placeId !== null

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[420px] z-50 bg-white shadow-2xl flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          {place?.thumbnail ? (
            <img
              src={place.thumbnail}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </>
            ) : (
              <>
                <h2 className="font-bold text-gray-900 truncate leading-tight">
                  {place?.title ?? '—'}
                </h2>
                <p className="text-sm text-gray-500 truncate">{place?.category ?? '—'}</p>
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          ) : place ? (
            <>
              {/* Info rápida */}
              <div className="space-y-2">
                {place.review_rating && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="font-medium">{formatRating(place.review_rating)}</span>
                    {place.review_count && (
                      <span className="text-gray-400">({place.review_count.toLocaleString('es-ES')} reseñas)</span>
                    )}
                  </div>
                )}
                {place.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <a href={`tel:${place.phone}`} className="hover:text-brand-600 transition-colors">
                      {place.phone}
                    </a>
                  </div>
                )}
                {place.website && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline truncate"
                    >
                      {place.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {place.email && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <a href={`mailto:${place.email}`} className="text-brand-600 hover:underline truncate">
                      {place.email}
                    </a>
                  </div>
                )}
                {place.address && (
                  <div className="flex items-start gap-1.5 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{place.address}</span>
                  </div>
                )}
              </div>

              {/* CRM inline */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Estado del lead
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <FavoriteButton
                    placeId={place.id}
                    initialFavorited={place.isFavorited}
                    size="sm"
                  />
                  <TemperatureBadge
                    placeId={place.id}
                    initialTemp={place.lead_temperature}
                    size="sm"
                  />
                  <LeadScore
                    placeId={place.id}
                    initialScore={place.lead_score}
                    size="sm"
                  />
                  <AddToListButton placeId={place.id} size="sm" />
                  <SendToCRMButton placeId={place.id} size="sm" />
                </div>
              </div>

              {/* Timeline */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Historial
                </p>
                <ActivityTimeline
                  placeId={place.id}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {place && (
          <div className="shrink-0 px-5 py-4 border-t border-gray-100">
            <Link
              href={`/places/${place.id}${backParam}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              Ver detalle completo
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
