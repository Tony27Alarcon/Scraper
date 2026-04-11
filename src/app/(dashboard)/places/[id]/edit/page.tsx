import { prisma } from '@/lib/prisma'
import { PlaceForm } from '@/components/places/PlaceForm'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EditPlacePage({
  params,
}: {
  params: { id: string }
}) {
  const place = await prisma.place.findUnique({ where: { id: params.id } })
  if (!place) notFound()

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/places/${params.id}`} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Lugar</h1>
          <p className="text-gray-500 mt-0.5 truncate max-w-md">{place.title}</p>
        </div>
      </div>
      <PlaceForm mode="edit" place={place as any} />
    </div>
  )
}
