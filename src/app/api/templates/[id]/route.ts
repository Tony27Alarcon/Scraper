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
  const tpl = await prisma.messageTemplate.findUnique({ where: { id } })
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ template: tpl })
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const data: Prisma.MessageTemplateUpdateInput = {}
  if (body.name      !== undefined) data.name      = body.name
  if (body.channel   !== undefined) data.channel   = body.channel
  if (body.subject   !== undefined) data.subject   = body.subject
  if (body.body      !== undefined) data.body      = body.body
  if (body.framework !== undefined) data.framework = body.framework
  if (body.tone      !== undefined) data.tone      = body.tone
  if (body.variables !== undefined) data.variables = body.variables

  const tpl = await prisma.messageTemplate.update({ where: { id }, data })
  return NextResponse.json({ template: tpl })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.messageTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
