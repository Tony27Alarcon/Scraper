import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  place_id: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const list = await prisma.prospectList.findUnique({ where: { id: params.id } })
  if (!list) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })

  // Calcular el siguiente rank
  const agg = await prisma.prospectListItem.aggregate({
    where:  { list_id: params.id },
    _max:   { rank: true },
  })
  const nextRank = (agg._max.rank ?? 0) + 1

  try {
    const item = await prisma.prospectListItem.create({
      data: {
        list_id:  params.id,
        place_id: parsed.data.place_id,
        rank:     nextRank,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'El lugar ya está en esta lista' }, { status: 409 })
    }
    throw err
  }
}
