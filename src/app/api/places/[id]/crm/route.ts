import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CRMSchema = z.object({
  lead_score:       z.number().int().min(1).max(5).nullable().optional(),
  lead_temperature: z.enum(['cold', 'warm', 'hot']).nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body   = await req.json()
  const parsed = CRMSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const place = await prisma.place.update({
    where: { id: params.id },
    data:  parsed.data as any,
  })

  return NextResponse.json(place)
}
