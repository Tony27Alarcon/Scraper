'use client'

import { useEffect, useRef, useState } from 'react'
import { ListPlus, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'

interface ProspectList {
  id:   string
  name: string
}

interface AddToListButtonProps {
  placeId?:  string
  placeIds?: string[]
  size?:     'sm' | 'md'
}

export function AddToListButton({ placeId, placeIds, size = 'md' }: AddToListButtonProps) {
  const [lists,     setLists]     = useState<ProspectList[]>([])
  const [isOpen,    setIsOpen]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [fetching,  setFetching]  = useState(false)
  const hasFetched  = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const ids = placeIds ?? (placeId ? [placeId] : [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  async function handleOpen() {
    if (!hasFetched.current) {
      setFetching(true)
      try {
        const res  = await fetch('/api/prospect-lists')
        const data = await res.json()
        setLists(data.lists ?? data ?? [])
        hasFetched.current = true
      } finally {
        setFetching(false)
      }
    }
    setIsOpen(prev => !prev)
  }

  async function addToList(list: ProspectList) {
    setIsOpen(false)
    setLoading(true)
    try {
      const results = await Promise.all(
        ids.map(id =>
          fetch(`/api/prospect-lists/${list.id}/items`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ place_id: id }),
          })
        )
      )

      const added    = results.filter(r => r.status === 201).length
      const existing = results.filter(r => r.status === 409).length
      const errors   = results.filter(r => r.status !== 201 && r.status !== 409).length

      if (added > 0 && existing === 0 && errors === 0) {
        toast({ type: 'success', message: `${added > 1 ? `${added} lugares añadidos` : 'Añadido'} a "${list.name}"` })
      } else if (added > 0 && existing > 0) {
        toast({ type: 'info', message: `${added} añadidos, ${existing} ya estaban en "${list.name}"` })
      } else if (existing === ids.length) {
        toast({ type: 'info', message: `Ya ${ids.length > 1 ? 'están' : 'está'} en "${list.name}"` })
      } else if (errors > 0) {
        toast({ type: 'error', message: 'Error al añadir a la lista' })
      }
    } catch {
      toast({ type: 'error', message: 'Error al añadir a la lista' })
    } finally {
      setLoading(false)
    }
  }

  if (ids.length === 0) return null

  const isSm = size === 'sm'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        disabled={loading}
        title="Añadir a lista de prospectos"
        className={cn(
          'inline-flex items-center gap-1 rounded-lg transition-colors',
          isSm
            ? 'p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50'
            : 'px-2.5 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
          loading && 'opacity-50 cursor-not-allowed',
        )}
      >
        {loading ? (
          <Loader2 className={cn('animate-spin', isSm ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        ) : (
          <ListPlus className={cn(isSm ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        )}
        {!isSm && <span>Añadir a lista</span>}
        {!isSm && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden py-1">
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Listas de prospectos
            </span>
          </div>
          {fetching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3 px-3">
              No hay listas creadas
            </p>
          ) : (
            lists.map(list => (
              <button
                key={list.id}
                onClick={() => addToList(list)}
                className="w-full text-left text-sm px-3 py-2 text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors truncate"
              >
                {list.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
