'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { Search, X, Heart, Star, ArrowDown, ArrowUp, SlidersHorizontal, ChevronDown, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlaceFiltersProps {
  categories:          string[]
  batchTags:           string[]
  prospectLists:       { id: string; name: string }[]
  currentSearch:       string
  currentCategory:     string
  currentBatchTag:     string
  currentTemperature:  string
  currentFavorites:    boolean
  currentMinRating:    string
  currentMinScore:     string
  currentSort:         string
  currentOrder:        string
  currentProspectList: string
  coldCount:           number
  warmCount:           number
  hotCount:            number
}

const SORT_OPTIONS = [
  { value: 'recent',  label: 'Más recientes'  },
  { value: 'rating',  label: 'Mayor rating'   },
  { value: 'reviews', label: 'Más reseñas'    },
  { value: 'score',   label: 'Mayor puntaje'  },
  { value: 'title',   label: 'Nombre A-Z'     },
]

const TEMP_OPTIONS = [
  { value: '',      label: 'Todos',     icon: null, activeClass: 'bg-white text-gray-900 shadow-sm' },
  { value: 'cold',  label: 'Frío',      icon: '❄️', activeClass: 'bg-blue-100 text-blue-800 shadow-sm' },
  { value: 'warm',  label: 'Tibio',     icon: '🌤', activeClass: 'bg-amber-100 text-amber-800 shadow-sm' },
  { value: 'hot',   label: 'Caliente',  icon: '🔥', activeClass: 'bg-red-100 text-red-800 shadow-sm' },
]

export function PlaceFilters({
  categories, batchTags, prospectLists,
  currentSearch, currentCategory, currentBatchTag,
  currentTemperature, currentFavorites, currentMinRating, currentMinScore,
  currentSort, currentOrder, currentProspectList,
  coldCount, warmCount, hotCount,
}: PlaceFiltersProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const searchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showMore, setShowMore] = useState(!!(currentMinRating || currentMinScore))

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      params.delete('page')
      return params.toString()
    },
    [searchParams]
  )

  function push(updates: Record<string, string>) {
    router.push(`${pathname}?${createQueryString(updates)}`)
  }

  function clearFilters() {
    router.push(pathname)
  }

  const hasFilters = !!(
    currentSearch || currentCategory || currentBatchTag ||
    currentTemperature || currentFavorites || currentMinRating ||
    currentMinScore || currentSort !== 'recent' || currentProspectList
  )

  const tempCounts: Record<string, number> = {
    cold: coldCount,
    warm: warmCount,
    hot:  hotCount,
  }

  return (
    <div className="space-y-3">

      {/* Fila 1: Búsqueda + Ordenamiento + Favoritos + Más filtros + Limpiar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            key={currentSearch}
            type="text"
            placeholder="Buscar por título, dirección..."
            defaultValue={currentSearch}
            onChange={(e) => {
              const val = e.target.value
              if (searchTimer.current) clearTimeout(searchTimer.current)
              searchTimer.current = setTimeout(() => push({ search: val }), 400)
            }}
            className="input-field pl-9"
          />
        </div>

        {/* Sort dropdown + toggle de dirección */}
        <div className="flex items-center gap-1">
          <select
            value={currentSort}
            onChange={(e) => {
              const newSort = e.target.value
              push({ sort: newSort, order: newSort === 'title' ? 'asc' : 'desc' })
            }}
            className="input-field w-auto min-w-[155px]"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => push({ order: currentOrder === 'desc' ? 'asc' : 'desc' })}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            title={currentOrder === 'desc' ? 'Orden descendente (click para ascender)' : 'Orden ascendente (click para descender)'}
          >
            {currentOrder === 'desc'
              ? <ArrowDown className="w-4 h-4" />
              : <ArrowUp   className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Solo favoritos */}
        <button
          onClick={() => push({ favorites: currentFavorites ? '' : 'true' })}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
            currentFavorites
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          <Heart className={cn('w-4 h-4', currentFavorites ? 'fill-rose-500 text-rose-500' : '')} />
          <span className="hidden sm:inline">Favoritos</span>
        </button>

        {/* Más filtros */}
        <button
          onClick={() => setShowMore(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
            (showMore || currentMinRating || currentMinScore)
              ? 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Más filtros</span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showMore && 'rotate-180')} />
        </button>

        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary gap-1.5">
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* Fila 2: Categoría + Carga + Temperatura */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={currentCategory}
          onChange={(e) => push({ category: e.target.value })}
          className="input-field w-auto min-w-[160px]"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {batchTags.length > 0 && (
          <select
            value={currentBatchTag}
            onChange={(e) => push({ batch_tag: e.target.value })}
            className="input-field w-auto min-w-[155px]"
          >
            <option value="">Todas las cargas</option>
            {batchTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}

        {prospectLists.length > 0 && (
          <button
            onClick={() => push({ prospect_list: currentProspectList ? '' : prospectLists[0].id })}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
              currentProspectList
                ? 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            <ListChecks className="w-4 h-4" />
            <span className="hidden sm:inline">
              {currentProspectList
                ? (prospectLists.find(l => l.id === currentProspectList)?.name ?? 'Prospectos')
                : 'Prospectos'
              }
            </span>
          </button>
        )}

        {prospectLists.length > 1 && currentProspectList && (
          <select
            value={currentProspectList}
            onChange={(e) => push({ prospect_list: e.target.value })}
            className="input-field w-auto min-w-[155px]"
          >
            {prospectLists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}

        {/* Pills de temperatura con contadores */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
          {TEMP_OPTIONS.map(opt => {
            const count = opt.value ? tempCounts[opt.value] : null
            const isActive = currentTemperature === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => push({ temperature: opt.value })}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-medium transition-all',
                  isActive
                    ? opt.activeClass
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/70'
                )}
              >
                {opt.icon && <span className="text-xs leading-none">{opt.icon}</span>}
                <span>{opt.label}</span>
                {count !== null && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full tabular-nums',
                    isActive ? 'bg-black/10 font-semibold' : 'bg-gray-200 text-gray-600'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Fila 3: Más filtros (expandible) */}
      {showMore && (
        <div className="flex flex-wrap gap-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {/* Rating mínimo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 font-medium shrink-0 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Rating mínimo
            </span>
            <div className="flex items-center gap-1">
              {['', '3', '3.5', '4', '4.5'].map((val) => (
                <button
                  key={val}
                  onClick={() => push({ min_rating: val })}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-sm transition-colors',
                    currentMinRating === val
                      ? 'bg-amber-100 text-amber-800 font-semibold'
                      : 'text-gray-500 hover:bg-gray-200'
                  )}
                >
                  {val === '' ? 'Todos' : `${val}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Puntaje lead mínimo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 font-medium shrink-0">Puntaje lead mín.</span>
            <div className="flex items-center gap-1">
              {['', '1', '2', '3', '4', '5'].map((val) => (
                <button
                  key={val}
                  onClick={() => push({ min_score: val })}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-sm transition-colors',
                    currentMinScore === val
                      ? 'bg-brand-100 text-brand-800 font-semibold'
                      : 'text-gray-500 hover:bg-gray-200'
                  )}
                >
                  {val === '' ? 'Todos' : `${val}★`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chips de filtros activos */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {currentSearch && (
            <FilterChip label={`"${currentSearch}"`} onRemove={() => push({ search: '' })} />
          )}
          {currentCategory && (
            <FilterChip label={currentCategory} onRemove={() => push({ category: '' })} />
          )}
          {currentBatchTag && (
            <FilterChip label={`Carga: ${currentBatchTag}`} onRemove={() => push({ batch_tag: '' })} />
          )}
          {currentTemperature && (
            <FilterChip
              label={
                currentTemperature === 'cold' ? '❄️ Frío' :
                currentTemperature === 'warm' ? '🌤 Tibio' : '🔥 Caliente'
              }
              onRemove={() => push({ temperature: '' })}
            />
          )}
          {currentFavorites && (
            <FilterChip label="❤️ Solo favoritos" onRemove={() => push({ favorites: '' })} />
          )}
          {currentMinRating && (
            <FilterChip label={`Rating ≥ ${currentMinRating}`} onRemove={() => push({ min_rating: '' })} />
          )}
          {currentMinScore && (
            <FilterChip label={`Puntaje ≥ ${currentMinScore}★`} onRemove={() => push({ min_score: '' })} />
          )}
          {currentProspectList && (
            <FilterChip
              label={`📋 ${prospectLists.find(l => l.id === currentProspectList)?.name ?? 'Lista de prospectos'}`}
              onRemove={() => push({ prospect_list: '' })}
            />
          )}
          {currentSort !== 'recent' && (
            <FilterChip
              label={`Orden: ${SORT_OPTIONS.find(o => o.value === currentSort)?.label ?? currentSort}`}
              onRemove={() => push({ sort: 'recent', order: 'desc' })}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full border border-brand-200">
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-brand-100 rounded-full transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
