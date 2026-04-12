import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(session.user?.id ?? '0')
  const p      = req.nextUrl.searchParams

  const search      = p.get('search')      ?? ''
  const category    = p.get('category')    ?? ''
  const batchTag    = p.get('batch_tag')   ?? ''
  const city        = p.get('city')        ?? ''
  const country     = p.get('country')     ?? ''
  const temperature = p.get('temperature') ?? ''
  const favorites   = p.get('favorites')   === 'true'
  const minRating   = parseFloat(p.get('min_rating') ?? '')
  const minScore    = parseInt(p.get('min_score')    ?? '')
  const prospectList = p.get('prospect_list') ?? ''

  const where: any = {
    latitude:  { not: null },
    longitude: { not: null },
  }

  if (search) {
    where.OR = [
      { title:    { contains: search, mode: 'insensitive' } },
      { address:  { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
      { phone:    { contains: search, mode: 'insensitive' } },
    ]
  }
  if (category)          where.category         = { equals: category, mode: 'insensitive' }
  if (batchTag)          where.batch_tag        = { equals: batchTag, mode: 'insensitive' }
  if (city)              where.city             = { equals: city, mode: 'insensitive' }
  if (country)           where.country          = { equals: country, mode: 'insensitive' }
  if (temperature)       where.lead_temperature = temperature
  if (favorites)         where.favorites        = { some: { user_id: userId } }
  if (!isNaN(minRating)) where.review_rating    = { gte: minRating }
  if (!isNaN(minScore))  where.lead_score       = { gte: minScore }
  if (prospectList)      where.prospectItems    = { some: { list_id: prospectList } }

  const places = await prisma.place.findMany({
    where,
    take: 5000,
    select: {
      id:               true,
      title:            true,
      category:         true,
      latitude:         true,
      longitude:        true,
      lead_temperature: true,
      lead_score:       true,
      review_rating:    true,
      review_count:     true,
      phone:            true,
      website:          true,
    },
  })

  const points = places
    .filter(p => p.latitude != null && p.longitude != null)
    .map(p => ({
      id:          p.id,
      title:       p.title,
      category:    p.category,
      lat:         Number(p.latitude),
      lng:         Number(p.longitude),
      temperature: p.lead_temperature,
      score:       p.lead_score,
      rating:      p.review_rating ? Number(p.review_rating) : null,
      reviewCount: p.review_count,
      phone:       p.phone,
      website:     p.website,
    }))

  return NextResponse.json({ points, total: points.length })
}
