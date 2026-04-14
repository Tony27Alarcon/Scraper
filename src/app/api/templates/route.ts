import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(session.user.id ?? '0')
  const { searchParams } = new URL(request.url)
  const channel   = searchParams.get('channel')
  const framework = searchParams.get('framework')

  const where: Prisma.MessageTemplateWhereInput = { owner_id: userId }
  if (channel)   where.channel   = channel
  if (framework) where.framework = framework

  const templates = await prisma.messageTemplate.findMany({
    where, orderBy: { updated_at: 'desc' },
  })
  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = parseInt(session.user.id ?? '0')
  const body = await request.json()
  const { name, channel, subject, body: tplBody, framework, tone, variables, company_id } = body

  if (!name || !channel || !tplBody) {
    return NextResponse.json({ error: 'name, channel, body son requeridos' }, { status: 400 })
  }

  const tpl = await prisma.messageTemplate.create({
    data: {
      name, channel,
      subject:   subject ?? null,
      body:      tplBody,
      framework: framework ?? null,
      tone:      tone ?? null,
      variables: variables ?? [],
      owner_id:  userId,
      company_id: company_id ?? null,
    },
  })
  return NextResponse.json({ template: tpl }, { status: 201 })
}
