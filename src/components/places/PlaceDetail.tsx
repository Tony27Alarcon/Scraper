'use client'

import { useState } from 'react'
import { Place } from '@/types/place'
import { formatRating, formatDate } from '@/lib/utils'
import {
  MapPin, Phone, Globe, Star, Clock, DollarSign,
  Mail, Image as ImageIcon, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'

interface PlaceDetailProps {
  place: Place
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title:       string
  icon:        React.ElementType
  children:    React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-brand-600" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 flex-1 break-words">{value}</span>
    </div>
  )
}

function JsonBlock({ data }: { data: any }) {
  if (!data) return <span className="text-gray-400 text-sm">Sin datos</span>
  return (
    <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-64 text-gray-700 font-mono">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export function PlaceDetail({ place }: PlaceDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="card p-5 flex gap-4">
        {place.thumbnail && (
          <img
            src={place.thumbnail}
            alt={place.title ?? ''}
            className="w-24 h-24 rounded-xl object-cover shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900">{place.title ?? '—'}</h2>
          {place.category && (
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
              {place.category}
            </span>
          )}
          {place.address && (
            <p className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
              {place.address}
            </p>
          )}
          {place.review_rating && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-semibold text-gray-800">{formatRating(place.review_rating)}</span>
              {place.review_count && (
                <span className="text-sm text-gray-500">
                  ({place.review_count.toLocaleString('es-ES')} reseñas)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Básica */}
      <Section title="Información Básica" icon={MapPin}>
        <div className="mt-3">
          <DataRow label="Teléfono"       value={place.phone} />
          <DataRow label="Sitio Web"      value={place.website ? (
            <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline flex items-center gap-1">
              {place.website} <ExternalLink className="w-3 h-3" />
            </a>
          ) : null} />
          <DataRow label="Email"          value={place.email ? (
            <a href={`mailto:${place.email}`} className="text-brand-600 hover:underline flex items-center gap-1">
              {place.email} <Mail className="w-3 h-3" />
            </a>
          ) : null} />
          <DataRow label="Rango de Precio" value={place.price_range} />
          <DataRow label="Estado"          value={place.status} />
          <DataRow label="Zona Horaria"    value={place.timezone} />
          <DataRow label="Plus Code"       value={place.plus_code} />
          <DataRow label="Descripción"     value={place.descriptions} />
        </div>
      </Section>

      {/* Ubicación */}
      <Section title="Ubicación" icon={MapPin} defaultOpen={false}>
        <div className="mt-3">
          <DataRow label="Latitud"    value={place.latitude?.toString()} />
          <DataRow label="Longitud"   value={place.longitude?.toString()} />
          <DataRow label="CID"        value={place.cid} />
          <DataRow label="Place ID"   value={place.place_id} />
          <DataRow label="Data ID"    value={place.data_id} />
          <DataRow label="Input ID"   value={place.input_id} />
          {place.complete_address && (
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-1">Dirección Completa</p>
              <JsonBlock data={place.complete_address} />
            </div>
          )}
        </div>
      </Section>

      {/* Horarios */}
      {place.open_hours && (
        <Section title="Horarios" icon={Clock} defaultOpen={false}>
          <div className="mt-3">
            {Array.isArray((place.open_hours as any)?.weekday_text)
              ? (place.open_hours as any).weekday_text.map((day: string, i: number) => (
                  <p key={i} className="text-sm text-gray-700 py-1 border-b border-gray-50 last:border-0">{day}</p>
                ))
              : <JsonBlock data={place.open_hours} />
            }
          </div>
        </Section>
      )}

      {/* Reseñas */}
      <Section title="Reseñas" icon={Star} defaultOpen={false}>
        <div className="mt-3">
          <DataRow label="Total Reseñas" value={place.review_count?.toLocaleString('es-ES')} />
          <DataRow label="Rating"        value={formatRating(place.review_rating)} />
          <DataRow label="Link Reseñas"  value={place.reviews_link ? (
            <a href={place.reviews_link} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
              Ver reseñas
            </a>
          ) : null} />
          {place.reviews_per_rating && (
            <div className="mt-3">
              <p className="text-sm text-gray-500 mb-2">Distribución de Ratings</p>
              <JsonBlock data={place.reviews_per_rating} />
            </div>
          )}
        </div>
      </Section>

      {/* Emails */}
      {place.emails && (
        <Section title="Emails" icon={Mail} defaultOpen={false}>
          <div className="mt-3">
            <JsonBlock data={place.emails} />
          </div>
        </Section>
      )}

      {/* Metadatos */}
      <Section title="Metadatos" icon={Clock} defaultOpen={false}>
        <div className="mt-3">
          <DataRow label="Creado"       value={formatDate(place.created_at)} />
          <DataRow label="Actualizado"  value={formatDate(place.updated_at)} />
          <DataRow label="ID interno"   value={place.id} />
        </div>
      </Section>
    </div>
  )
}
