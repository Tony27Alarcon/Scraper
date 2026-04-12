import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const company = await prisma.company.findUnique({
    where: { id: params.id },
  })

  if (!company) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(company)
}

const UpdateCompanySchema = z.object({
  name:        z.string().min(1).optional(),
  industry:    z.string().optional(),
  description: z.string().optional(),
  website:     z.string().url('URL inválida').optional().or(z.literal('')),
  ai_context:  z.string().min(10).optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = UpdateCompanySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
  )

  const company = await prisma.company.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(company)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await prisma.company.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
