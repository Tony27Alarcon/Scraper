'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  placeId:          string
  initialFavorited: boolean
  size?:            'sm' | 'md'
}

export function FavoriteButton({ placeId, initialFavorited, size = 'md' }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading,   setLoading]   = useState(false)
  const [pop,       setPop]       = useState(false)

  async function toggle() {
    if (loading) return
    setLoading(true)
    const next = !favorited
    setFavorited(next)
    if (next) { setPop(true); setTimeout(() => setPop(false), 400) }
    try {
      await fetch(`/api/places/${placeId}/favorite`, { method: 'POST' })
    } catch {
      setFavorited(!next)
    } finally {
      setLoading(false)
    }
  }

  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const btnCls  = size === 'sm' ? 'p-1'          : 'p-1.5'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={favorited ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      className={cn(
        btnCls,
        'rounded-lg transition-all duration-150 relative',
        pop && 'scale-125',
        favorited
          ? 'text-rose-500 hover:bg-rose-50'
          : 'text-gray-300 hover:text-rose-400 hover:bg-rose-50'
      )}
    >
      <Heart className={cn(iconCls, favorited && 'fill-rose-500')} />
    </button>
  )
}
