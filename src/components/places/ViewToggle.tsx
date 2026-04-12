'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { LayoutList, Map } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ViewToggleProps {
  currentView: string
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  function switchView(view: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'table') params.delete('view')
    else params.set('view', view)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
      <button
        onClick={() => switchView('table')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
          currentView !== 'map'
            ? 'bg-gray-100 text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        )}
        title="Vista tabla"
      >
        <LayoutList className="w-4 h-4" />
        <span className="hidden sm:inline">Tabla</span>
      </button>
      <button
        onClick={() => switchView('map')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
          currentView === 'map'
            ? 'bg-gray-100 text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        )}
        title="Vista mapa"
      >
        <Map className="w-4 h-4" />
        <span className="hidden sm:inline">Mapa</span>
      </button>
    </div>
  )
}
