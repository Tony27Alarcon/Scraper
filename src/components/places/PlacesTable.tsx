'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, Pencil, Trash2, Star, ChevronLeft, ChevronRight, Globe, Phone } from 'lucide-react'
import { Place } from '@/types/place'
import { formatRating, truncate, cn } from '@/lib/utils'

interface PlacesTableProps {
  data:       Partial<Place>[]
  total:      number
  page:       number
  totalPages: number
  isAdmin:    boolean
}

export function PlacesTable({ data, total, page, totalPages, isAdmin }: PlacesTableProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [deleting, setDeleting] = useState<string | null>(null)

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
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

  const start = (page - 1) * 20 + 1
  const end   = Math.min(page * 20, total)

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Lugar</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Contacto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No se encontraron lugares
                </td>
              </tr>
            ) : (
              data.map((place) => (
                <tr key={place.id} className="hover:bg-gray-50 transition-colors">
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

                  {/* Estado */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      place.status
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {place.status ?? 'N/A'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/places/${place.id}`}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {isAdmin && (
                        <>
                          <Link
                            href={`/places/${place.id}/edit`}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(place.id!, place.title ?? 'este lugar')}
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

      {/* Pagination */}
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
              if (totalPages <= 5) p = i + 1
              else if (page <= 3) p = i + 1
              else if (page >= totalPages - 2) p = totalPages - 4 + i
              else p = page - 2 + i
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
  )
}
