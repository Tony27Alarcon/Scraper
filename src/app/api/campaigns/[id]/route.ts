import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [list, stages, activities] = await Promise.all([
    prisma.prospectList.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true } },
        user:   { select: { username: true, email: true } },
      },
    }),
    prisma.prospectListItem.groupBy({
      by: ['stage'], where: { list_id: id }, _count: { _all: true },
    }),
    prisma.placeActivity.findMany({
      where: { campaign_id: id },
      select: { id: true, type: true, content: true, step_index: true, happened_at: true, place_id: true, username: true },
      orderBy: { happened_at: 'desc' },
      take: 50,
    }),
  ])
  if (!list) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const sends   = activities.filter(a => a.type === 'campaign_send')
  const replies = activities.filter(a => a.type === 'campaign_reply')
  const bounces = activities.filter(a => a.type === 'campaign_bounce')

  return NextResponse.json({
    campaign: {
      ...list,
      leadCount: list._count.items,
      owner: list.user?.username ?? list.user?.email ?? null,
    },
    stages:   stages.map(s => ({ stage: s.stage, count: s._count._all })),
    metrics: {
      sends: sends.length, replies: replies.length, bounces: bounces.length,
      replyRate:  sends.length ? Math.round((replies.length / sends.length) * 100)  : null,
      bounceRate: sends.length ? Math.round((bounces.length / sends.length) * 100) : null,
    },
    recentActivity: activities.slice(0, 10),
  })
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const data: Prisma.ProspectListUpdateInput = {}
  if (body.name        !== undefined) data.name        = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.channel     !== undefined) data.channel     = body.channel
  if (body.goal        !== undefined) data.goal        = body.goal
  if (body.status      !== undefined) data.status      = body.status
  if (body.message_template !== undefined) data.message_template = body.message_template
  if (body.scheduled_at !== undefined) {
    data.scheduled_at = body.scheduled_at ? new Date(body.scheduled_at) : null
  }
  if (body.status === 'active' && !body.started_at) data.started_at = new Date()
  if (body.status === 'done'   && !body.ended_at)   data.ended_at   = new Date()

  const updated = await prisma.prospectList.update({ where: { id }, data })
  return NextResponse.json({ campaign: updated })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.prospectList.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
