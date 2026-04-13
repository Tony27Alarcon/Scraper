import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPlaceToCRM } from '@/lib/supabase'
import { z } from 'zod'

const Schema = z.object({
  ids: z.array(z.string()).min(1).max(100),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const places = await prisma.place.findMany({
    where:   { id: { in: parsed.data.ids } },
    include: { notes: { orderBy: { created_at: 'desc' }, take: 3 } },
  })

  const withPhone    = places.filter(p => p.phone)
  const withoutPhone = places.filter(p => !p.phone)

  // Procesar en batches de 10
  let sent = 0, updated = 0, failed = 0
  for (let i = 0; i < withPhone.length; i += 10) {
    const batch = withPhone.slice(i, i + 10)
    const results = await Promise.allSettled(
      batch.map(p => sendPlaceToCRM({
        ...p,
        review_rating: p.review_rating ? Number(p.review_rating) : null,
      }))
    )

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.status === 'created') sent++
        else if (r.value.status === 'updated') updated++
        else failed++
      } else {
        failed++
      }
    }
  }

  // Registrar actividad
  const userId   = parseInt(session.user?.id ?? '0')
  const username = session.user?.name ?? 'Usuario'
  if (sent + updated > 0) {
    await prisma.placeActivity.createMany({
      data: withPhone.slice(0, sent + updated).map(p => ({
        place_id:    p.id,
        user_id:     userId,
        username,
        type:        'crm_export',
        content:     'Exportado al CRM de Bruno Lab (acción masiva)',
        happened_at: new Date(),
      })),
    })
  }

  return NextResponse.json({
    sent,
    updated,
    failed,
    skipped: withoutPhone.length,
  })
}
