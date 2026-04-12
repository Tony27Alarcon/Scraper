import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const companies = await prisma.company.findMany({
    select: {
      id:          true,
      name:        true,
      industry:    true,
      description: true,
      website:     true,
      ai_context:  true,
      created_at:  true,
      updated_at:  true,
      _count: { select: { users: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(companies)
}

const CreateCompanySchema = z.object({
  name:        z.string().min(1, 'El nombre es requerido'),
  industry:    z.string().optional(),
  description: z.string().optional(),
  website:     z.string().url('URL inválida').optional().or(z.literal('')),
  ai_context:  z.string().min(10, 'El contexto para la IA debe tener al menos 10 caracteres'),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = CreateCompanySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const company = await prisma.company.create({
    data: {
      name:        parsed.data.name,
      industry:    parsed.data.industry || null,
      description: parsed.data.description || null,
      website:     parsed.data.website || null,
      ai_context:  parsed.data.ai_context,
    },
  })

  return NextResponse.json(company, { status: 201 })
}
