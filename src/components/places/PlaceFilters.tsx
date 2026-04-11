'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface PlaceFiltersProps {
  categories:      string[]
  currentSearch:   string
  currentCategory: string
}

export function PlaceFilters({ categories, currentSearch, currentCategory }: PlaceFiltersProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

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

  function handleSearch(value: string) {
    router.push(`${pathname}?${createQueryString({ search: value })}`)
  }

  function handleCategory(value: string) {
    router.push(`${pathname}?${createQueryString({ category: value })}`)
  }

  function clearFilters() {
    router.push(pathname)
  }

  const hasFilters = currentSearch || currentCategory

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por título, dirección..."
          defaultValue={currentSearch}
          onChange={(e) => {
            const timer = setTimeout(() => handleSearch(e.target.value), 400)
            return () => clearTimeout(timer)
          }}
          className="input-field pl-9"
        />
      </div>

      {/* Category */}
      <select
        value={currentCategory}
        onChange={(e) => handleCategory(e.target.value)}
        className="input-field w-auto min-w-[160px]"
      >
        <option value="">Todas las categorías</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {/* Clear */}
      {hasFilters && (
        <button onClick={clearFilters} className="btn-secondary gap-1.5">
          <X className="w-3.5 h-3.5" />
          Limpiar
        </button>
      )}
    </div>
  )
}
