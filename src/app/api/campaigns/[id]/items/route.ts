import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')

  const where: Prisma.ProspectListItemWhereInput = { list_id: id }
  if (stage) where.stage = stage

  const items = await prisma.prospectListItem.findMany({
    where,
    include: {
      place: {
        select: {
          id: true, title: true, category: true, city: true, country: true,
          phone: true, email: true, website: true,
          review_rating: true, review_count: true,
          lead_score: true, lead_temperature: true,
          thumbnail: true,
        },
      },
    },
    orderBy: [{ stage: 'asc' }, { rank: 'asc' }],
  })

  return NextResponse.json({
    items: items.map(i => ({
      id:        i.id,
      place_id:  i.place_id,
      stage:     i.stage,
      rank:      i.rank,
      reason:    i.reason,
      outcome:   i.outcome,
      last_contacted_at: i.last_contacted_at,
      reply_at:  i.reply_at,
      next_action_at: i.next_action_at,
      place: {
        ...i.place,
        review_rating: i.place.review_rating ? Number(i.place.review_rating) : null,
      },
    })),
  })
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const placeIds: string[] = body.placeIds ?? []
  const reason: string | null = body.reason ?? null

  if (!placeIds.length) return NextResponse.json({ error: 'placeIds vacío' }, { status: 400 })

  const existing = await prisma.prospectListItem.findMany({
    where: { list_id: id, place_id: { in: placeIds } },
    select: { place_id: true },
  })
  const existingIds = new Set(existing.map(e => e.place_id))
  const newOnes = placeIds.filter(p => !existingIds.has(p))

  if (!newOnes.length) {
    return NextResponse.json({ added: 0, skipped: placeIds.length, message: 'Ya estaban todos' })
  }

  const result = await prisma.prospectListItem.createMany({
    data: newOnes.map((place_id, i) => ({
      list_id: id, place_id,
      rank: existing.length + i + 1,
      reason,
      stage: 'queued',
    })),
  })

  return NextResponse.json({ added: result.count, skipped: placeIds.length - result.count })
}

export async function DELETE(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get('placeId')
  if (!placeId) return NextResponse.json({ error: 'placeId requerido' }, { status: 400 })

  await prisma.prospectListItem.delete({
    where: { list_id_place_id: { list_id: id, place_id: placeId } },
  })
  return NextResponse.json({ ok: true })
}
