import { prisma } from '@/lib/prisma'
import { UsersTable } from '@/components/users/UsersTable'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'

export default async function UsersPage() {
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-0.5">
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/users/new" className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </Link>
      </div>

      <UsersTable users={users as any} />
    </div>
  )
}
