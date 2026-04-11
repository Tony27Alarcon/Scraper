import { UserForm } from '@/components/users/UserForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewUserPage() {
  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/users" className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Usuario</h1>
          <p className="text-gray-500 mt-0.5">Crear cuenta de acceso</p>
        </div>
      </div>
      <UserForm />
    </div>
  )
}
