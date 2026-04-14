'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Target, Megaphone, FileText, Users, Building2, ListChecks, ExternalLink, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  role: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, adminOnly: false },
  { href: '/places',    label: 'Prospectos', icon: Target,          adminOnly: false },
  { href: '/campaigns', label: 'Campañas',   icon: Megaphone,       adminOnly: false },
  { href: '/templates', label: 'Plantillas', icon: FileText,        adminOnly: false },
  { href: '/prospects', label: 'Listas',     icon: ListChecks,      adminOnly: false },
  { href: '/companies', label: 'Empresas',   icon: Building2,       adminOnly: true  },
  { href: '/users',     label: 'Usuarios',   icon: Users,           adminOnly: true  },
]

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Rocket className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <span className="block font-bold text-gray-900 leading-tight">Closer</span>
          <span className="block text-[10px] text-gray-500 leading-tight">Cold Outreach Suite</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || role === 'admin')
          .map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive ? 'text-brand-600' : 'text-gray-400')} />
                {item.label}
              </Link>
            )
          })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 space-y-1">
        <a
          href="https://google-maps-scraper-production-a237.up.railway.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <ExternalLink className="w-5 h-5 text-gray-400" />
          Ir al Scraper
        </a>
        <p className="text-xs text-gray-400 px-3">v1.0.0</p>
      </div>
    </aside>
  )
}
