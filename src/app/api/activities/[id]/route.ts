import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId  = parseInt(session.user.id ?? '0')
  const isAdmin = session.user.role === 'admin'
  const id      = parseInt(params.id)

  const activity = await prisma.placeActivity.findUnique({ where: { id } })
  if (!activity) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (activity.user_id !== userId && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await prisma.placeActivity.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
