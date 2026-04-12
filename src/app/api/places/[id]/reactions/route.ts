import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({ emoji: z.string().min(1).max(8) })

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = parseInt(session.user.id)
  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { emoji } = parsed.data

  const existing = await prisma.placeReaction.findUnique({
    where: { place_id_user_id_emoji: { place_id: params.id, user_id: userId, emoji } },
  })

  if (existing) {
    await prisma.placeReaction.delete({
      where: { place_id_user_id_emoji: { place_id: params.id, user_id: userId, emoji } },
    })
    return NextResponse.json({ reacted: false })
  }

  await prisma.placeReaction.create({
    data: { place_id: params.id, user_id: userId, emoji },
  })
  return NextResponse.json({ reacted: true })
}
