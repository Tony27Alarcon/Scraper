import { prisma } from '@/lib/prisma'
import { PlaceDetail } from '@/components/places/PlaceDetail'
import { CRMPanel }    from '@/components/crm/CRMPanel'
import { AgentChat }   from '@/components/places/AgentChat'
import { notFound }    from 'next/navigation'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AddToListButton } from '@/components/places/AddToListButton'

export default async function PlaceDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { back?: string; prev?: string; next?: string }
}) {
  const backUrl = searchParams.back
    ? `/places?${decodeURIComponent(searchParams.back)}`
    : '/places'
  const session = await getServerSession(authOptions)
  const userId  = parseInt(session?.user?.id ?? '0')
  const isAdmin = session?.user?.role === 'admin'

  const place = await prisma.place.findUnique({
    where:   { id: params.id },
    include: {
      favorites: {
        where:  { user_id: userId },
        select: { id: true },
      },
      reactions: {
        select: { emoji: true, user_id: true },
      },
    },
  })

  if (!place) notFound()

  const isFavorited = place.favorites.length > 0

  const reactionMap = new Map<string, { count: number; reacted: boolean }>()
  for (const r of place.reactions) {
    const entry = reactionMap.get(r.emoji) ?? { count: 0, reacted: false }
    entry.count++
    if (r.user_id === userId) entry.reacted = true
    reactionMap.set(r.emoji, entry)
  }
  const initialReactions = Array.from(reactionMap.entries()).map(([emoji, v]) => ({
    emoji,
    count:   v.count,
    reacted: v.reacted,
  }))

  // Build prev/next URLs preserving back param
  function navUrl(id: string) {
    const p = new URLSearchParams()
    if (searchParams.back) p.set('back', searchParams.back)
    return `/places/${id}?${p.toString()}`
  }

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header con breadcrumb y navegación */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <Link
              href={backUrl}
              className="text-gray-500 hover:text-brand-600 transition-colors shrink-0"
            >
              Lugares
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            <span className="text-gray-900 font-medium truncate">
              {place.title ?? 'Sin título'}
            </span>
          </div>

          {/* Prev/Next navigation */}
          {(searchParams.prev || searchParams.next) && (
            <div className="flex items-center gap-1 shrink-0">
              {searchParams.prev ? (
                <Link
                  href={navUrl(searchParams.prev)}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  title="Lugar anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              ) : (
                <span className="p-1.5 rounded-lg border border-gray-100 text-gray-200">
                  <ChevronLeft className="w-4 h-4" />
                </span>
              )}
              {searchParams.next ? (
                <Link
                  href={navUrl(searchParams.next)}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  title="Siguiente lugar"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="p-1.5 rounded-lg border border-gray-100 text-gray-200">
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Acciones de la derecha */}
        <div className="flex items-center gap-2 shrink-0">
          <AddToListButton placeId={place.id} />
          {isAdmin && (
            <Link href={`/places/${place.id}/edit`} className="btn-primary">
              <Pencil className="w-4 h-4" />
              Editar
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <PlaceDetail place={place as any} />
        <CRMPanel
          placeId={place.id}
          currentUserId={userId}
          isAdmin={isAdmin}
          initialFavorited={isFavorited}
          initialScore={place.lead_score}
          initialTemperature={place.lead_temperature}
          initialReactions={initialReactions}
        />
      </div>

      <AgentChat placeId={place.id} />
    </div>
  )
}
