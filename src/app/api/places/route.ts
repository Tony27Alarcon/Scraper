import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CreateSchema } from '@/lib/placeSchema'

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page      = Math.max(1, Number(searchParams.get('page') ?? 1))
  const search    = searchParams.get('search')    ?? ''
  const category  = searchParams.get('category')  ?? ''
  const batchTag  = searchParams.get('batch_tag') ?? ''

  const where: any = {}
  if (search) {
    where.OR = [
      { title:    { contains: search, mode: 'insensitive' } },
      { address:  { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (category) where.category  = { equals: category,  mode: 'insensitive' }
  if (batchTag) where.batch_tag = { equals: batchTag,  mode: 'insensitive' }

  const [data, total] = await Promise.all([
    prisma.place.findMany({
      where,
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      orderBy: { created_at: 'desc' },
    }),
    prisma.place.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / PAGE_SIZE) })
}


export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const place = await prisma.place.create({ data: parsed.data as any })
    return NextResponse.json(place, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un lugar con ese place_id' },
        { status: 409 }
      )
    }
    throw e
  }
}
