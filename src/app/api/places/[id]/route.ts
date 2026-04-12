import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const place = await prisma.place.findUnique({ where: { id: params.id } })
  if (!place) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(place)
}

const UpdateSchema = z.object({
  title:                 z.string().optional(),
  input_id:              z.string().optional(),
  link:                  z.string().optional(),
  category:              z.string().optional(),
  address:               z.string().optional(),
  phone:                 z.string().optional(),
  website:               z.string().optional(),
  review_count:          z.coerce.number().int().nonnegative().optional(),
  review_rating:         z.coerce.number().min(0).max(5).optional(),
  latitude:              z.coerce.number().optional(),
  longitude:             z.coerce.number().optional(),
  status:                z.string().optional(),
  price_range:           z.string().optional(),
  thumbnail:             z.string().optional(),
  timezone:              z.string().optional(),
  cid:                   z.string().optional(),
  data_id:               z.string().optional(),
  place_id:              z.string().optional(),
  plus_code:             z.string().optional(),
  descriptions:          z.string().optional(),
  reviews_link:          z.string().optional(),
  open_hours:            z.any().optional(),
  popular_times:         z.any().optional(),
  reviews_per_rating:    z.any().optional(),
  complete_address:      z.any().optional(),
  about:                 z.any().optional(),
  images:                z.any().optional(),
  reservations:          z.any().optional(),
  order_online:          z.any().optional(),
  menu:                  z.any().optional(),
  owner:                 z.any().optional(),
  user_reviews:          z.any().optional(),
  user_reviews_extended: z.any().optional(),
  emails:                z.any().optional(),
  batch_tag:             z.string().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const place = await prisma.place.update({
    where: { id: params.id },
    data:  parsed.data as any,
  })

  return NextResponse.json(place)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await prisma.place.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
