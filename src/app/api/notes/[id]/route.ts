import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = parseInt(session.user.id)
  const noteId = parseInt(params.id)

  const note = await prisma.placeNote.findUnique({ where: { id: noteId } })
  if (!note) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (note.user_id !== userId && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await prisma.placeNote.delete({ where: { id: noteId } })
  return new NextResponse(null, { status: 204 })
}
