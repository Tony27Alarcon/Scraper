import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  ids:              z.array(z.string()).min(1).max(500),
  lead_temperature: z.enum(['cold', 'warm', 'hot']).nullish(),
  lead_score:       z.number().int().min(1).max(5).nullish(),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { ids, lead_temperature, lead_score } = parsed.data

  // Construir solo los campos enviados explícitamente
  const data: Record<string, unknown> = {}
  if (lead_temperature !== undefined) data.lead_temperature = lead_temperature ?? null
  if (lead_score !== undefined)       data.lead_score       = lead_score ?? null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  const result = await prisma.place.updateMany({
    where: { id: { in: ids } },
    data,
  })

  return NextResponse.json({ updated: result.count })
}
