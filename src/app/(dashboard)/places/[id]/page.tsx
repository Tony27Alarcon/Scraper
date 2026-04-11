import { prisma } from '@/lib/prisma'
import { PlaceDetail } from '@/components/places/PlaceDetail'
import { notFound } from 'next/navigation'
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
  const place   = await prisma.place.findUnique({ where: { id: params.id } })

  if (!place) notFound()

  return (
    <div className="max-w-5xl space-y-5">
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
        {session?.user?.role === 'admin' && (
          <Link href={`/places/${place.id}/edit`} className="btn-primary">
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
        )}
      </div>
      <PlaceDetail place={place as any} />
    </div>
  )
}
