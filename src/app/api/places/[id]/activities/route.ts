import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  type:        z.enum(['call', 'email', 'whatsapp', 'meeting', 'contacted', 'ai_action', 'other']),
  content:     z.string().max(2000).optional(),
  happened_at: z.string().datetime().optional(), // ISO string; defaults to now
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId   = parseInt(session.user.id ?? '0')
  const username = session.user.name ?? session.user.email ?? 'Usuario'

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const activity = await prisma.placeActivity.create({
    data: {
      place_id:    params.id,
      user_id:     userId,
      username,
      type:        parsed.data.type,
      content:     parsed.data.content ?? null,
      happened_at: parsed.data.happened_at ? new Date(parsed.data.happened_at) : new Date(),
    },
  })

  return NextResponse.json({
    id:         activity.id,
    kind:       'activity',
    type:       activity.type,
    content:    activity.content,
    username:   activity.username,
    user_id:    activity.user_id,
    date:       activity.happened_at,
    created_at: activity.created_at,
  }, { status: 201 })
}
