'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Shield, User, CheckCircle, XCircle, Building2 } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

interface CompanyOption {
  id:   string
  name: string
}

interface UserRow {
  id:         number
  email:      string
  username?:  string | null
  status:     string
  role:       string
  created_at: Date | string
  company?:   { id: string; name: string } | null
}

interface UsersTableProps {
  users:     UserRow[]
  companies: CompanyOption[]
}

export function UsersTable({ users, companies }: UsersTableProps) {
  const router              = useRouter()
  const [deleting,  setDeleting]  = useState<number | null>(null)
  const [toggling,  setToggling]  = useState<number | null>(null)
  const [assigning, setAssigning] = useState<number | null>(null)

  async function handleDelete(id: number, email: string) {
    if (!confirm(`¿Eliminar usuario "${email}"?`)) return
    setDeleting(id)
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  async function handleToggleStatus(user: UserRow) {
    setToggling(user.id)
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      await fetch(`/api/users/${user.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      })
      router.refresh()
    } finally {
      setToggling(null)
    }
  }

  async function handleAssignCompany(userId: number, companyId: string) {
    setAssigning(userId)
    try {
      await fetch(`/api/users/${userId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ company_id: companyId || null }),
      })
      router.refresh()
    } finally {
      setAssigning(null)
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Creado</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  {/* Usuario */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                        {user.role === 'admin'
                          ? <Shield className="w-4 h-4 text-brand-600" />
                          : <User   className="w-4 h-4 text-gray-400" />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.email}</p>
                        {user.username && (
                          <p className="text-xs text-gray-500">{user.username}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Rol */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      user.role === 'admin'
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      user.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {user.status === 'active'
                        ? <><CheckCircle className="w-3 h-3" /> Activo</>
                        : <><XCircle    className="w-3 h-3" /> Inactivo</>
                      }
                    </span>
                  </td>

                  {/* Empresa */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <select
                        value={user.company?.id ?? ''}
                        onChange={(e) => handleAssignCompany(user.id, e.target.value)}
                        disabled={assigning === user.id}
                        className="text-xs border-0 bg-transparent text-gray-600 cursor-pointer hover:text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 disabled:opacity-50 max-w-[160px]"
                      >
                        <option value="">Sin empresa</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Creado */}
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {formatDate(user.created_at)}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={toggling === user.id}
                        title={user.status === 'active' ? 'Desactivar' : 'Activar'}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors disabled:opacity-50',
                          user.status === 'active'
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100 hover:text-green-600'
                        )}
                      >
                        {user.status === 'active'
                          ? <CheckCircle className="w-4 h-4" />
                          : <XCircle    className="w-4 h-4" />
                        }
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        disabled={deleting === user.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
