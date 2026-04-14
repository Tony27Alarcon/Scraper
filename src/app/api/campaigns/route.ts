import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status      = searchParams.get('status')
  const channel     = searchParams.get('channel')
  const isCampaign  = searchParams.get('is_campaign')

  const where: Prisma.ProspectListWhereInput = {}
  if (isCampaign === 'false') where.is_campaign = false
  else                         where.is_campaign = true
  if (status)  where.status  = status
  if (channel) where.channel = channel

  const lists = await prisma.prospectList.findMany({
    where,
    include: {
      _count: { select: { items: true } },
      user:   { select: { username: true, email: true } },
    },
    orderBy: { updated_at: 'desc' },
  })

  const withMetrics = await Promise.all(lists.map(async (l) => {
    const activities = await prisma.placeActivity.groupBy({
      by: ['type'],
      where: { campaign_id: l.id },
      _count: { _all: true },
    })
    const sends   = activities.find(a => a.type === 'campaign_send')?._count._all  ?? 0
    const replies = activities.find(a => a.type === 'campaign_reply')?._count._all ?? 0
    return {
      id: l.id, name: l.name, description: l.description, goal: l.goal,
      is_campaign: l.is_campaign, channel: l.channel, status: l.status,
      steps: Array.isArray(l.message_template) ? l.message_template.length : 0,
      leadCount: l._count.items,
      scheduled_at: l.scheduled_at, started_at: l.started_at, ended_at: l.ended_at,
      created_at: l.created_at, updated_at: l.updated_at,
      owner: l.user?.username ?? l.user?.email ?? null,
      metrics: {
        sends, replies,
        replyRate: sends > 0 ? Math.round((replies / sends) * 100) : null,
      },
    }
  }))

  return NextResponse.json({ campaigns: withMetrics })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, description, channel, goal, status = 'draft', scheduled_at, message_template } = body

  if (!name)    return NextResponse.json({ error: 'name es requerido' }, { status: 400 })
  if (!channel) return NextResponse.json({ error: 'channel es requerido' }, { status: 400 })

  const userId = parseInt(session.user.id ?? '0')

  const list = await prisma.prospectList.create({
    data: {
      name,
      description:      description ?? null,
      is_campaign:      true,
      channel,
      goal:             goal ?? null,
      status,
      scheduled_at:     scheduled_at ? new Date(scheduled_at) : null,
      message_template: message_template ?? null,
      created_by:       userId,
    },
  })

  return NextResponse.json({ campaign: list }, { status: 201 })
}
