import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPlaceToCRM } from '@/lib/supabase'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const place = await prisma.place.findUnique({
    where:   { id: params.id },
    include: {
      notes: { orderBy: { created_at: 'desc' }, take: 3 },
    },
  })

  if (!place) {
    return NextResponse.json({ error: 'Lugar no encontrado' }, { status: 404 })
  }

  if (!place.phone) {
    return NextResponse.json(
      { error: 'Este lugar no tiene teléfono. El teléfono es obligatorio para crear un contacto en el CRM.' },
      { status: 400 },
    )
  }

  const result = await sendPlaceToCRM({
    ...place,
    review_rating: place.review_rating ? Number(place.review_rating) : null,
  })

  if (result.status === 'error') {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Registrar actividad en la DB local
  const userId   = parseInt(session.user?.id ?? '0')
  const username = session.user?.name ?? 'Usuario'
  await prisma.placeActivity.create({
    data: {
      place_id:    params.id,
      user_id:     userId,
      username,
      type:        'crm_export',
      content:     result.status === 'created'
        ? 'Contacto creado en el CRM de Bruno Lab'
        : 'Contacto actualizado en el CRM de Bruno Lab',
      happened_at: new Date(),
    },
  })

  const statusCode = result.status === 'created' ? 201 : 200
  return NextResponse.json(result, { status: statusCode })
}
