'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, ChevronDown, ChevronUp } from 'lucide-react'
import { Place } from '@/types/place'
import { cn } from '@/lib/utils'

const PlaceSchema = z.object({
  title:          z.string().optional(),
  input_id:       z.string().optional(),
  link:           z.string().optional(),
  category:       z.string().optional(),
  address:        z.string().optional(),
  phone:          z.string().optional(),
  website:        z.string().optional(),
  email:          z.string().optional(),
  descriptions:   z.string().optional(),
  status:         z.string().optional(),
  price_range:    z.string().optional(),
  thumbnail:      z.string().optional(),
  timezone:       z.string().optional(),
  cid:            z.string().optional(),
  data_id:        z.string().optional(),
  place_id:       z.string().optional(),
  plus_code:      z.string().optional(),
  reviews_link:   z.string().optional(),
  review_count:   z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  review_rating:  z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  latitude:       z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  longitude:      z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  // JSON fields as strings
  open_hours_str:            z.string().optional(),
  popular_times_str:         z.string().optional(),
  reviews_per_rating_str:    z.string().optional(),
  complete_address_str:      z.string().optional(),
  about_str:                 z.string().optional(),
  images_str:                z.string().optional(),
  reservations_str:          z.string().optional(),
  order_online_str:          z.string().optional(),
  menu_str:                  z.string().optional(),
  owner_str:                 z.string().optional(),
  user_reviews_str:          z.string().optional(),
  user_reviews_extended_str: z.string().optional(),
  emails_str:                z.string().optional(),
  batch_tag:                 z.string().optional(),
})

type PlaceFormData = z.infer<typeof PlaceSchema>

interface PlaceFormProps {
  mode:    'create' | 'edit'
  place?:  Place
}

function tryParseJson(str: string | undefined): any {
  if (!str?.trim()) return undefined
  try { return JSON.parse(str) } catch { return str }
}

function toJsonStr(val: any): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  return JSON.stringify(val, null, 2)
}

export function PlaceForm({ mode, place }: PlaceFormProps) {
  const router = useRouter()
  const [loading, setLoading]       = useState(false)
  const [error,   setError]         = useState('')
  const [openSection, setOpenSection] = useState<string | null>('basic')

  const { register, handleSubmit, formState: { errors } } = useForm<PlaceFormData>({
    resolver: zodResolver(PlaceSchema),
    defaultValues: place ? {
      title:         place.title      ?? '',
      input_id:      place.input_id   ?? '',
      link:          place.link       ?? '',
      category:      place.category   ?? '',
      address:       place.address    ?? '',
      phone:         place.phone      ?? '',
      website:       place.website    ?? '',
      email:         place.email      ?? '',
      descriptions:  place.descriptions ?? '',
      status:        place.status     ?? '',
      price_range:   place.price_range ?? '',
      thumbnail:     place.thumbnail  ?? '',
      timezone:      place.timezone   ?? '',
      cid:           place.cid        ?? '',
      data_id:       place.data_id    ?? '',
      place_id:      place.place_id   ?? '',
      plus_code:     place.plus_code  ?? '',
      reviews_link:  place.reviews_link ?? '',
      review_count:  place.review_count  as any,
      review_rating: place.review_rating as any,
      latitude:      place.latitude   as any,
      longitude:     place.longitude  as any,
      open_hours_str:            toJsonStr(place.open_hours),
      popular_times_str:         toJsonStr(place.popular_times),
      reviews_per_rating_str:    toJsonStr(place.reviews_per_rating),
      complete_address_str:      toJsonStr(place.complete_address),
      about_str:                 toJsonStr(place.about),
      images_str:                toJsonStr(place.images),
      reservations_str:          toJsonStr(place.reservations),
      order_online_str:          toJsonStr(place.order_online),
      menu_str:                  toJsonStr(place.menu),
      owner_str:                 toJsonStr(place.owner),
      user_reviews_str:          toJsonStr(place.user_reviews),
      user_reviews_extended_str: toJsonStr(place.user_reviews_extended),
      emails_str:                toJsonStr(place.emails),
      batch_tag:                 place.batch_tag   ?? '',
    } : {},
  })

  async function onSubmit(data: PlaceFormData) {
    setLoading(true)
    setError('')

    const payload: any = { ...data }

    // Parse JSON string fields
    const jsonFields = [
      ['open_hours_str',            'open_hours'],
      ['popular_times_str',         'popular_times'],
      ['reviews_per_rating_str',    'reviews_per_rating'],
      ['complete_address_str',      'complete_address'],
      ['about_str',                 'about'],
      ['images_str',                'images'],
      ['reservations_str',          'reservations'],
      ['order_online_str',          'order_online'],
      ['menu_str',                  'menu'],
      ['owner_str',                 'owner'],
      ['user_reviews_str',          'user_reviews'],
      ['user_reviews_extended_str', 'user_reviews_extended'],
      ['emails_str',                'emails'],
    ] as const

    jsonFields.forEach(([strField, field]) => {
      payload[field] = tryParseJson(payload[strField])
      delete payload[strField]
    })

    try {
      const url    = mode === 'create' ? '/api/places' : `/api/places/${place!.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al guardar')
      }

      const saved = await res.json()
      router.push(`/places/${saved.id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const isOpen = openSection === id
    return (
      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection(isOpen ? null : id)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">{title}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
      </div>
    )
  }

  function Field({ label, name, type = 'text', placeholder }: {
    label:        string
    name:         keyof PlaceFormData
    type?:        string
    placeholder?: string
  }) {
    return (
      <div>
        <label className="label">{label}</label>
        <input
          {...register(name as any)}
          type={type}
          placeholder={placeholder}
          className="input-field"
        />
      </div>
    )
  }

  function JsonField({ label, name }: { label: string; name: keyof PlaceFormData }) {
    return (
      <div>
        <label className="label">{label}</label>
        <textarea
          {...register(name as any)}
          rows={4}
          className="input-field font-mono text-xs resize-y"
          placeholder='{"clave": "valor"}'
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Sección: Info Básica */}
      <Section id="basic" title="Información Básica">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Título"      name="title"      placeholder="Nombre del lugar" />
          <Field label="Categoría"   name="category"   placeholder="Ej: Restaurant" />
          <Field label="Dirección"   name="address"    placeholder="Calle 123, Ciudad" />
          <Field label="Teléfono"    name="phone"      placeholder="+1 234 567 8900" />
          <Field label="Sitio Web"   name="website"    placeholder="https://..." />
          <Field label="Email"       name="email"      type="email" placeholder="contacto@negocio.com" />
          <Field label="Rango Precio" name="price_range" placeholder="$ / $$ / $$$ / $$$$" />
          <Field label="Estado"      name="status"     placeholder="Ej: open, closed" />
          <Field label="Zona Horaria" name="timezone"  placeholder="America/New_York" />
          <div className="sm:col-span-2">
            <label className="label">Descripción</label>
            <textarea
              {...register('descriptions')}
              rows={3}
              className="input-field resize-y"
              placeholder="Descripción del lugar..."
            />
          </div>
          <Field label="Miniatura (URL)" name="thumbnail" placeholder="https://..." />
          <Field label="Link"            name="link"      placeholder="https://..." />
          <Field label="Etiqueta de carga" name="batch_tag" placeholder="Ej: lote-2024-01, campaña-norte" />
        </div>
      </Section>

      {/* Sección: Ubicación */}
      <Section id="location" title="Ubicación">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Latitud"   name="latitude"  type="number" placeholder="40.7128" />
          <Field label="Longitud"  name="longitude" type="number" placeholder="-74.0060" />
          <Field label="Plus Code" name="plus_code" placeholder="87G8Q2J3+9J" />
          <Field label="Zona Horaria" name="timezone" placeholder="America/New_York" />
        </div>
      </Section>

      {/* Sección: Reseñas */}
      <Section id="reviews" title="Reseñas">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Cantidad de Reseñas" name="review_count"  type="number" />
          <Field label="Rating"              name="review_rating" type="number" placeholder="4.5" />
          <Field label="Link de Reseñas"     name="reviews_link"  placeholder="https://..." />
          <JsonField label="Reseñas por Rating (JSON)" name="reviews_per_rating_str" />
        </div>
      </Section>

      {/* Sección: IDs */}
      <Section id="ids" title="Identificadores">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Input ID"  name="input_id"  />
          <Field label="Place ID"  name="place_id"  />
          <Field label="Data ID"   name="data_id"   />
          <Field label="CID"       name="cid"        />
        </div>
      </Section>

      {/* Sección: JSON Avanzado */}
      <Section id="json" title="Datos Avanzados (JSON)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <JsonField label="Horarios de Apertura"   name="open_hours_str"            />
          <JsonField label="Tiempos Populares"       name="popular_times_str"         />
          <JsonField label="Dirección Completa"      name="complete_address_str"      />
          <JsonField label="Acerca de"               name="about_str"                 />
          <JsonField label="Imágenes"                name="images_str"               />
          <JsonField label="Reservaciones"           name="reservations_str"          />
          <JsonField label="Pedir en Línea"          name="order_online_str"          />
          <JsonField label="Menú"                    name="menu_str"                  />
          <JsonField label="Propietario"             name="owner_str"                 />
          <JsonField label="Reseñas de Usuarios"     name="user_reviews_str"          />
          <JsonField label="Reseñas Extendidas"      name="user_reviews_extended_str" />
          <JsonField label="Emails"                  name="emails_str"                />
        </div>
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Guardando...
            </span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {mode === 'create' ? 'Crear Lugar' : 'Guardar Cambios'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
