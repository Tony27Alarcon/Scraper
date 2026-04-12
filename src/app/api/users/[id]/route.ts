import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/hash'
import { z } from 'zod'

const UpdateUserSchema = z.object({
  username:   z.string().min(2).optional(),
  status:     z.enum(['active', 'inactive']).optional(),
  role:       z.enum(['admin', 'user']).optional(),
  password:   z.string().min(8).optional(),
  company_id: z.string().nullable().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: any = { ...parsed.data }
  if (parsed.data.password) {
    updateData.password_hash = await hashPassword(parsed.data.password)
    delete updateData.password
  }

  const user = await prisma.user.update({
    where: { id: Number(params.id) },
    data:  updateData,
    select: {
      id: true, email: true, username: true,
      status: true, role: true, updated_at: true,
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (session.user.id === params.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
