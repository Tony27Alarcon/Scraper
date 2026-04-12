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

  const list = await prisma.prospectList.findUnique({
    where:   { id: params.id },
    include: {
      items: {
        orderBy: { rank: 'asc' },
        include: {
          place: {
            select: {
              id:               true,
              title:            true,
              category:         true,
              address:          true,
              phone:            true,
              website:          true,
              review_rating:    true,
              review_count:     true,
              lead_score:       true,
              lead_temperature: true,
              thumbnail:        true,
            },
          },
        },
      },
      _count: { select: { items: true } },
      user:   { select: { username: true, email: true } },
    },
  })

  if (!list) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(list)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await prisma.prospectList.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
