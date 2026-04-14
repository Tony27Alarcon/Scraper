import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface Ctx { params: Promise<{ id: string; placeId: string }> }

const VALID_STAGES = ['queued', 'contacted', 'replied', 'interested', 'won', 'lost'] as const
const VALID_OUTCOMES = ['positive', 'negative', 'no_reply'] as const

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: listId, placeId } = await params
  const body = await request.json()

  const stage   = body.stage   as typeof VALID_STAGES[number] | undefined
  const outcome = body.outcome as typeof VALID_OUTCOMES[number] | undefined
  const note    = body.note    as string | undefined

  if (!stage || !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'stage inválido' }, { status: 400 })
  }

  const userId   = parseInt(session.user.id ?? '0')
  const username = session.user.name ?? session.user.email ?? 'Usuario'

  const data: Prisma.ProspectListItemUpdateInput = { stage }
  if (outcome) data.outcome = outcome
  if (stage === 'contacted') data.last_contacted_at = new Date()
  if (stage === 'replied')   data.reply_at          = new Date()

  await prisma.prospectListItem.update({
    where: { list_id_place_id: { list_id: listId, place_id: placeId } },
    data,
  })

  const activityType =
    stage === 'contacted' ? 'campaign_send' :
    stage === 'replied'   ? 'campaign_reply' :
    stage === 'lost'      ? 'campaign_bounce' : 'ai_action'

  await prisma.placeActivity.create({
    data: {
      place_id:    placeId,
      user_id:     userId,
      username,
      type:        activityType,
      content:     note ?? `Stage: ${stage}${outcome ? ` (${outcome})` : ''}`,
      happened_at: new Date(),
      campaign_id: listId,
    },
  })

  return NextResponse.json({ ok: true, stage })
}
