import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [activities, notes] = await Promise.all([
    prisma.placeActivity.findMany({
      where:   { place_id: params.id },
      orderBy: { happened_at: 'desc' },
    }),
    prisma.placeNote.findMany({
      where:   { place_id: params.id },
      orderBy: { created_at: 'desc' },
    }),
  ])

  // Merge y ordenar cronológicamente (desc)
  const entries = [
    ...activities.map(a => ({
      id:         a.id,
      kind:       'activity' as const,
      type:       a.type,
      content:    a.content,
      username:   a.username,
      user_id:    a.user_id,
      date:       a.happened_at,
      created_at: a.created_at,
    })),
    ...notes.map(n => ({
      id:         n.id,
      kind:       'note' as const,
      type:       'note',
      content:    n.content,
      username:   n.username,
      user_id:    n.user_id,
      date:       n.created_at,
      created_at: n.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json(entries)
}
