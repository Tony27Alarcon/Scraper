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

  const notes = await prisma.placeNote.findMany({
    where:   { place_id: params.id },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json(notes)
}

const NoteSchema = z.object({ content: z.string().min(1).max(2000) })

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = parseInt(session.user.id)
  const body   = await req.json()
  const parsed = NoteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const note = await prisma.placeNote.create({
    data: {
      place_id: params.id,
      user_id:  userId,
      username: session.user.name ?? session.user.email ?? null,
      content:  parsed.data.content,
    },
  })

  return NextResponse.json(note)
}
