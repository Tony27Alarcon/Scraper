import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/hash'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id:         true,
      email:      true,
      username:   true,
      status:     true,
      role:       true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(users)
}

const CreateUserSchema = z.object({
  email:    z.string().email('Email inválido'),
  username: z.string().min(2).optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  status:   z.enum(['active', 'inactive']).default('inactive'),
  role:     z.enum(['admin', 'user']).default('user'),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 })
  }

  const passwordHash = await hashPassword(parsed.data.password)

  const user = await prisma.user.create({
    data: {
      email:         parsed.data.email,
      username:      parsed.data.username,
      password_hash: passwordHash,
      status:        parsed.data.status,
      role:          parsed.data.role,
    },
    select: {
      id: true, email: true, username: true,
      status: true, role: true, created_at: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
