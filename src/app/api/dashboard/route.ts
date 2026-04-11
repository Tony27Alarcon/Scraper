import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [totalPlaces, totalUsers, activeUsers, ratingAgg] = await Promise.all([
    prisma.place.count(),
    prisma.user.count(),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.place.aggregate({ _avg: { review_rating: true } }),
  ])

  return NextResponse.json({
    totalPlaces,
    totalUsers,
    activeUsers,
    avgRating: ratingAgg._avg.review_rating,
  })
}
