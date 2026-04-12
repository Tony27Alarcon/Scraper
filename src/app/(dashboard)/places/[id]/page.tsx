import { prisma } from '@/lib/prisma'
import { PlaceDetail } from '@/components/places/PlaceDetail'
import { CRMPanel }    from '@/components/crm/CRMPanel'
import { AgentChat }   from '@/components/places/AgentChat'
import { notFound }    from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function PlaceDetailPage({
  params,
}: {
  params: { id: string }
}) {
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

  // Aggregate reactions: { emoji → { count, reacted } }
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

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/places" className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 truncate max-w-lg">
              {place.title ?? 'Sin título'}
            </h1>
            <p className="text-gray-500 mt-0.5">{place.category ?? '—'}</p>
          </div>
        </div>
        {isAdmin && (
          <Link href={`/places/${place.id}/edit`} className="btn-primary">
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
        )}
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
