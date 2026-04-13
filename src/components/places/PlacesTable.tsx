'use client'

import { useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil, Trash2, Star, ChevronLeft, ChevronRight,
  Globe, Phone, Mail, ArrowUp, ArrowDown, ArrowUpDown,
  ExternalLink, Thermometer, Hash, X,
} from 'lucide-react'
import { Place } from '@/types/place'
import { formatRating, truncate, cn } from '@/lib/utils'
import { FavoriteButton }    from '@/components/crm/FavoriteButton'
import { TemperatureBadge }  from '@/components/crm/TemperatureBadge'
import { LeadScore }         from '@/components/crm/LeadScore'
import { AgentQuickActions } from '@/components/places/AgentQuickActions'
import { AddToListButton }   from '@/components/places/AddToListButton'
import { SendToCRMButton }   from '@/components/places/SendToCRMButton'
import { PlaceQuickView }    from '@/components/places/PlaceQuickView'
import { useToast }          from '@/components/ui/ToastProvider'

interface PlacesTableProps {
  data:          Partial<Place>[]
  total:         number
  page:          number
  totalPages:    number
  isAdmin:       boolean
  currentUserId: number
  currentSort:   string
  currentOrder:  string
}

function SortableHeader({
  label, sortKey, currentSort, currentOrder, onSort, className,
}: {
  label:        string
  sortKey:      string
  currentSort:  string
  currentOrder: string
  onSort:       (key: string) => void
  className?:   string
}) {
  const isActive = currentSort === sortKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn('flex items-center gap-1 group select-none', className)}
    >
      <span className={cn(
        'font-medium transition-colors',
        isActive ? 'text-brand-600' : 'text-gray-600 group-hover:text-gray-900'
      )}>
        {label}
      </span>
      {isActive
        ? (currentOrder === 'desc'
            ? <ArrowDown  className="w-3.5 h-3.5 text-brand-500" />
            : <ArrowUp    className="w-3.5 h-3.5 text-brand-500" />)
        : <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />
      }
    </button>
  )
}

const TEMP_LABELS: Record<string, string> = {
  cold: '❄️ Frío',
  warm: '🌤 Tibio',
  hot:  '🔥 Caliente',
}

export function PlacesTable({
  data, total, page, totalPages, isAdmin, currentUserId, currentSort, currentOrder,
}: PlacesTableProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const { toast }    = useToast()

  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [quickViewId,  setQuickViewId]  = useState<string | null>(null)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [bulkLoading,  setBulkLoading]  = useState(false)
  const [bulkTempOpen, setBulkTempOpen] = useState(false)
  const [bulkScoreOpen,setBulkScoreOpen]= useState(false)
  const headerCheckRef = useRef<HTMLInputElement>(null)

  // Sync indeterminate state on header checkbox
  const allSelected  = data.length > 0 && selectedIds.size === data.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length
  if (headerCheckRef.current) {
    headerCheckRef.current.indeterminate = someSelected
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    setSelectedIds(new Set())
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSort(sortKey: string) {
    const params   = new URLSearchParams(searchParams.toString())
    const prevSort = params.get('sort') ?? 'recent'
    if (prevSort === sortKey) {
      params.set('order', params.get('order') === 'desc' ? 'asc' : 'desc')
    } else {
      params.set('sort',  sortKey)
      params.set('order', sortKey === 'title' ? 'asc' : 'desc')
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    try {
      await fetch(`/api/places/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkUpdate(payload: Record<string, unknown>, label: string) {
    setBulkLoading(true)
    setBulkTempOpen(false)
    setBulkScoreOpen(false)
    try {
      const res = await fetch('/api/places/bulk', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: Array.from(selectedIds), ...payload }),
      })
      if (!res.ok) throw new Error()
      const { updated } = await res.json()
      toast({ type: 'success', message: `${label} actualizado en ${updated} lugar${updated !== 1 ? 'es' : ''}` })
      setSelectedIds(new Set())
      router.refresh()
    } catch {
      toast({ type: 'error', message: 'Error al actualizar' })
    } finally {
      setBulkLoading(false)
    }
  }

  // Build detail URL with prev/next for navigation
  const backParamStr = searchParams.toString()
  function detailUrl(place: Partial<Place>, index: number) {
    const params = new URLSearchParams()
    if (backParamStr) params.set('back', backParamStr)
    const prevId = index > 0 ? data[index - 1].id : undefined
    const nextId = index < data.length - 1 ? data[index + 1].id : undefined
    if (prevId) params.set('prev', prevId)
    if (nextId) params.set('next', nextId)
    return `/places/${place.id}?${params.toString()}`
  }

  const start = (page - 1) * 20 + 1
  const end   = Math.min(page * 20, total)

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {/* Checkbox header */}
                <th className="px-3 py-3 w-10">
                  <input
                    ref={headerCheckRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      setSelectedIds(e.target.checked ? new Set(data.map(p => p.id!)) : new Set())
                    }}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3">
                  <SortableHeader
                    label="Lugar"
                    sortKey="title"
                    currentSort={currentSort}
                    currentOrder={currentOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                  Categoría
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                  Contacto
                </th>
                <th className="text-left px-4 py-3">
                  <SortableHeader
                    label="Rating"
                    sortKey="rating"
                    currentSort={currentSort}
                    currentOrder={currentOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">
                  <SortableHeader
                    label="Lead"
                    sortKey="score"
                    currentSort={currentSort}
                    currentOrder={currentOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No se encontraron lugares
                  </td>
                </tr>
              ) : (
                data.map((place, index) => (
                  <tr
                    key={place.id}
                    className={cn(
                      'hover:bg-gray-50/70 transition-colors cursor-pointer',
                      selectedIds.has(place.id!) && 'bg-brand-50/50',
                    )}
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('button') || target.closest('a') || target.closest('input')) return
                      setQuickViewId(place.id!)
                    }}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(place.id!)}
                        onChange={() => toggleSelect(place.id!)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>

                    {/* Nombre + dirección */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {place.thumbnail ? (
                          <img
                            src={place.thumbnail}
                            alt={place.title ?? ''}
                            className="w-9 h-9 rounded-lg object-cover shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">
                            {truncate(place.title, 40)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {truncate(place.address, 45)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {place.category ?? '—'}
                      </span>
                    </td>

                    {/* Contacto */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="space-y-1">
                        {place.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone className="w-3 h-3" />
                            {place.phone}
                          </div>
                        )}
                        {place.website && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[150px]">
                            <Globe className="w-3 h-3 shrink-0" />
                            {place.website.replace(/^https?:\/\//, '')}
                          </div>
                        )}
                        {place.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Mail className="w-3 h-3 shrink-0" />
                            <a
                              href={`mailto:${place.email}`}
                              onClick={e => e.stopPropagation()}
                              className="truncate max-w-[150px] hover:text-brand-600 transition-colors"
                            >
                              {place.email}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3">
                      {place.review_rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-medium text-gray-800">
                            {formatRating(place.review_rating)}
                          </span>
                          {place.review_count && (
                            <span className="text-xs text-gray-400">
                              ({place.review_count.toLocaleString('es-ES')})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Lead CRM */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <FavoriteButton
                          placeId={place.id!}
                          initialFavorited={place.isFavorited ?? false}
                          size="sm"
                        />
                        <TemperatureBadge
                          placeId={place.id!}
                          initialTemp={place.lead_temperature}
                          size="sm"
                        />
                        <LeadScore
                          placeId={place.id!}
                          initialScore={place.lead_score}
                          size="sm"
                        />
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <div className="hidden lg:flex items-center gap-1">
                          <AgentQuickActions placeId={place.id!} />
                        </div>
                        <AddToListButton placeId={place.id!} size="sm" />
                        <SendToCRMButton placeId={place.id!} size="sm" />
                        <Link
                          href={detailUrl(place, index)}
                          onClick={e => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Ver detalle completo"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {isAdmin && (
                          <>
                            <Link
                              href={`/places/${place.id}/edit`}
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(place.id!, place.title ?? 'este lugar') }}
                              disabled={deleting === place.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Mostrando {start}–{end} de {total.toLocaleString('es-ES')}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number
                if (totalPages <= 5)             p = i + 1
                else if (page <= 3)              p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else                             p = page - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium',
                      p === page
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Drawer */}
      <PlaceQuickView
        placeId={quickViewId}
        onClose={() => setQuickViewId(null)}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white rounded-2xl shadow-2xl border border-gray-200 px-4 py-3 flex items-center gap-3 whitespace-nowrap">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} lugar{selectedIds.size !== 1 ? 'es' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="h-4 w-px bg-gray-200" />

          {/* Temperatura bulk */}
          <div className="relative">
            <button
              onClick={() => { setBulkTempOpen(p => !p); setBulkScoreOpen(false) }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 transition-colors disabled:opacity-50"
            >
              <Thermometer className="w-3.5 h-3.5" />
              Temperatura
            </button>
            {bulkTempOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-40 z-10">
                {[
                  { value: 'cold', label: '❄️ Frío' },
                  { value: 'warm', label: '🌤 Tibio' },
                  { value: 'hot',  label: '🔥 Caliente' },
                  { value: null,   label: '— Limpiar' },
                ].map(({ value, label }) => (
                  <button
                    key={String(value)}
                    onClick={() => bulkUpdate({ lead_temperature: value }, TEMP_LABELS[value ?? ''] ?? 'Temperatura')}
                    className="w-full text-left text-sm px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Score bulk */}
          <div className="relative">
            <button
              onClick={() => { setBulkScoreOpen(p => !p); setBulkTempOpen(false) }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 transition-colors disabled:opacity-50"
            >
              <Hash className="w-3.5 h-3.5" />
              Score
            </button>
            {bulkScoreOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-40 z-10">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => bulkUpdate({ lead_score: n }, `Score ${n}★`)}
                    className="w-full text-left text-sm px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    {'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n}/5)
                  </button>
                ))}
                <button
                  onClick={() => bulkUpdate({ lead_score: null }, 'Score')}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-gray-50 text-gray-500 transition-colors border-t border-gray-100"
                >
                  — Limpiar
                </button>
              </div>
            )}
          </div>

          {/* Añadir a lista bulk */}
          <AddToListButton placeIds={Array.from(selectedIds)} size="md" />
          <SendToCRMButton placeIds={Array.from(selectedIds)} size="md" />

          <div className="h-4 w-px bg-gray-200" />
          <button
            onClick={() => setSelectedIds(new Set())}
            title="Deseleccionar todo"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}
