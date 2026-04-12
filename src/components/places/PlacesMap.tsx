'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Map, AlertCircle, Thermometer, Star, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MapPoint } from './MapInner'

// Carga Leaflet sólo en cliente para evitar errores de SSR
const MapInner = dynamic(() => import('./MapInner'), {
  ssr:     false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
})

// ── Controles del mapa ────────────────────────────────────────────────────────

type HeatMode = 'density' | 'score' | 'rating'

const HEAT_MODES: { value: HeatMode; label: string; icon: React.ReactNode }[] = [
  { value: 'density', label: 'Densidad',    icon: <Map         className="w-3.5 h-3.5" /> },
  { value: 'score',   label: 'Puntaje CRM', icon: <Thermometer className="w-3.5 h-3.5" /> },
  { value: 'rating',  label: 'Rating',      icon: <Star        className="w-3.5 h-3.5" /> },
]

// ── Componente principal ──────────────────────────────────────────────────────

export function PlacesMap() {
  const searchParams = useSearchParams()

  const [points,   setPoints]   = useState<MapPoint[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [heatMode, setHeatMode] = useState<HeatMode>('density')

  // Construir back param para que los popups del mapa vuelvan con filtros
  const backParam = searchParams.toString()
    ? `?back=${encodeURIComponent(searchParams.toString())}`
    : ''

  useEffect(() => {
    setLoading(true)
    setError(null)

    // Pasar los mismos filtros activos al endpoint del heatmap
    const qs = searchParams.toString()
    fetch(`/api/places/heatmap${qs ? `?${qs}` : ''}`)
      .then(r => {
        if (!r.ok) throw new Error('Error al cargar los datos del mapa')
        return r.json()
      })
      .then(data => setPoints(data.points ?? []))
      .catch(e  => setError(e.message))
      .finally(() => setLoading(false))
  }, [searchParams.toString()])

  return (
    <div className="card overflow-hidden flex flex-col" style={{ height: '70vh', minHeight: 480 }}>
      {/* Barra superior del mapa */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {loading
              ? 'Cargando...'
              : `${points.length.toLocaleString('es-ES')} lugares en el mapa`
            }
          </span>
        </div>

        {/* Selector del modo de calor */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          <span className="text-xs text-gray-500 px-2 hidden sm:block">Intensidad:</span>
          {HEAT_MODES.map(m => (
            <button
              key={m.value}
              onClick={() => setHeatMode(m.value)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                heatMode === m.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cuerpo del mapa */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando mapa de calor...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {!loading && !error && points.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50 gap-2 text-gray-400">
            <Map className="w-10 h-10" />
            <p className="text-sm">No hay lugares con coordenadas para los filtros actuales</p>
          </div>
        )}

        {!error && (
          <MapInner
            points={points}
            heatMode={heatMode}
            backParam={backParam}
          />
        )}
      </div>

      {/* Stats rápidas debajo */}
      {!loading && !error && points.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500 shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {points.filter(p => p.temperature === 'hot').length} calientes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {points.filter(p => p.temperature === 'warm').length} tibios
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            {points.filter(p => p.temperature === 'cold').length} fríos
          </span>
          <span className="text-gray-300">|</span>
          <span>
            {points.filter(p => !p.temperature).length} sin clasificar
          </span>
          {points.length >= 5000 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-amber-600">Mostrando los primeros 5,000 resultados</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
