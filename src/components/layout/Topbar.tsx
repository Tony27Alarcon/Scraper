'use client'

import { signOut } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'

interface TopbarProps {
  user: {
    email:  string
    name?:  string
    role:   string
    status: string
  }
}

export function Topbar({ user }: TopbarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 leading-none">
            {user.name ?? user.email}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{user.role}</p>
        </div>
        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-brand-600" />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}
