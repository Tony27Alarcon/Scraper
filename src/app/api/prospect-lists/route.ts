import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const lists = await prisma.prospectList.findMany({
    include: {
      _count: { select: { items: true } },
      user:   { select: { username: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(lists)
}
