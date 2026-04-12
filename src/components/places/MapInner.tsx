'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface MapPoint {
  id:          string
  title:       string | null
  category:    string | null
  lat:         number
  lng:         number
  temperature: string | null
  score:       number | null
  rating:      number | null
  reviewCount: number | null
  phone:       string | null
  website:     string | null
}

// ── Colores por temperatura ───────────────────────────────────────────────────

const TEMP_COLORS: Record<string, string> = {
  cold: '#3b82f6',
  warm: '#f59e0b',
  hot:  '#ef4444',
}

function getTempColor(temp: string | null) {
  return temp ? TEMP_COLORS[temp] ?? '#6b7280' : '#6b7280'
}

// ── Capa de mapa de calor ─────────────────────────────────────────────────────

function HeatmapLayer({ points, mode }: { points: MapPoint[]; mode: 'density' | 'score' | 'rating' }) {
  const map     = useMap()
  const heatRef = useRef<any>(null)

  useEffect(() => {
    // Importar leaflet.heat dinámicamente (augmenta L con heatLayer)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    import('leaflet.heat').then(() => {
      if (heatRef.current) {
        heatRef.current.remove()
        heatRef.current = null
      }

      const heatPoints = points.map(p => {
        let weight = 0.5
        if (mode === 'score'  && p.score  != null) weight = p.score / 5
        if (mode === 'rating' && p.rating != null) weight = (p.rating - 1) / 4
        return [p.lat, p.lng, weight]
      })

      // @ts-ignore
      heatRef.current = L.heatLayer(heatPoints, {
        radius:   28,
        blur:     18,
        maxZoom:  14,
        max:      1.0,
        gradient: { 0.0: '#1d4ed8', 0.35: '#3b82f6', 0.6: '#f59e0b', 0.85: '#ef4444', 1.0: '#7f1d1d' },
      })
      heatRef.current.addTo(map)
    })

    return () => {
      if (heatRef.current) {
        heatRef.current.remove()
        heatRef.current = null
      }
    }
  }, [map, points, mode])

  return null
}

// ── Marcadores individuales (zoom alto) ──────────────────────────────────────

function MarkersLayer({ points, backParam }: { points: MapPoint[]; backParam: string }) {
  const [zoom, setZoom] = useState(0)

  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
    load:    (e) => setZoom(e.target.getZoom()),
  })

  const map = useMap()
  useEffect(() => { setZoom(map.getZoom()) }, [map])

  if (zoom < 12) return null

  return (
    <>
      {points.map(p => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={zoom >= 14 ? 8 : 5}
          pathOptions={{
            fillColor:   getTempColor(p.temperature),
            fillOpacity: 0.85,
            color:       '#fff',
            weight:      1.5,
          }}
        >
          <Popup maxWidth={260} className="leaflet-popup-crm">
            <div className="text-sm space-y-1.5 py-1">
              <p className="font-semibold text-gray-900 leading-snug">{p.title ?? '—'}</p>
              {p.category && (
                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md">
                  {p.category}
                </span>
              )}
              {p.rating != null && (
                <p className="text-gray-600 text-xs">
                  ⭐ {p.rating.toFixed(1)}
                  {p.reviewCount ? ` (${p.reviewCount.toLocaleString('es-ES')} reseñas)` : ''}
                </p>
              )}
              {p.temperature && (
                <p className="text-xs">
                  {p.temperature === 'cold' ? '❄️ Frío' : p.temperature === 'warm' ? '🌤 Tibio' : '🔥 Caliente'}
                  {p.score != null && ` · ${p.score}★`}
                </p>
              )}
              {p.phone && <p className="text-xs text-gray-500">📞 {p.phone}</p>}
              <a
                href={`/places/${p.id}${backParam}`}
                className="inline-block mt-1 text-xs text-blue-600 hover:underline font-medium"
              >
                Ver detalle →
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  )
}

// ── Leyenda ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="leaflet-bottom leaflet-right" style={{ pointerEvents: 'none' }}>
      <div className="leaflet-control bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 m-3 text-xs space-y-1.5">
        <p className="font-semibold text-gray-700 mb-2">Temperatura</p>
        {[
          { color: '#ef4444', label: '🔥 Caliente' },
          { color: '#f59e0b', label: '🌤 Tibio'    },
          { color: '#3b82f6', label: '❄️ Frío'      },
          { color: '#6b7280', label: '○ Sin clasificar' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
        <hr className="border-gray-200 my-1" />
        <p className="text-gray-400">Marcadores visibles a zoom ≥ 12</p>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface MapInnerProps {
  points:    MapPoint[]
  heatMode:  'density' | 'score' | 'rating'
  backParam: string
}

export default function MapInner({ points, heatMode, backParam }: MapInnerProps) {
  // Calcular centro del mapa a partir de los puntos
  const center = (() => {
    if (points.length === 0) return [20, 0] as [number, number]
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
    return [lat, lng] as [number, number]
  })()

  const zoom = points.length > 0 ? 10 : 3

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <HeatmapLayer points={points} mode={heatMode} />
      <MarkersLayer  points={points} backParam={backParam} />
      <Legend />

      {/* Control de zoom repositionado */}
      <div className="leaflet-top leaflet-right">
        <div className="leaflet-control leaflet-bar m-3">
          {/* react-leaflet añade el zoom control, lo overrideamos con custom CSS si hace falta */}
        </div>
      </div>
    </MapContainer>
  )
}
