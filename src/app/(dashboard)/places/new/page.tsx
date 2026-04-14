import { PlaceForm } from '@/components/places/PlaceForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewPlacePage() {
  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/places" className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Prospecto</h1>
          <p className="text-gray-500 mt-0.5">Crear un prospecto manualmente</p>
        </div>
      </div>
      <PlaceForm mode="create" />
    </div>
  )
}
