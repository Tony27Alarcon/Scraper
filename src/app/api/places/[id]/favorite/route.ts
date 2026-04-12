import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = parseInt(session.user.id)

  const existing = await prisma.placeFavorite.findUnique({
    where: { place_id_user_id: { place_id: params.id, user_id: userId } },
  })

  if (existing) {
    await prisma.placeFavorite.delete({
      where: { place_id_user_id: { place_id: params.id, user_id: userId } },
    })
    return NextResponse.json({ favorited: false })
  }

  await prisma.placeFavorite.create({
    data: { place_id: params.id, user_id: userId },
  })
  return NextResponse.json({ favorited: true })
}
