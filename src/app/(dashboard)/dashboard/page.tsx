import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LayoutDashboard, MapPin, Users, Star } from 'lucide-react'
import { formatRating } from '@/lib/utils'

async function getStats() {
  const [totalPlaces, totalUsers, activeUsers, ratingAgg, categories] =
    await Promise.all([
      prisma.place.count(),
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.place.aggregate({ _avg: { review_rating: true } }),
      prisma.place.groupBy({
        by: ['category'],
        _count: { _all: true },
        orderBy: { _count: { category: 'desc' } },
        take: 8,
        where: { category: { not: null } },
      }),
    ])

  return { totalPlaces, totalUsers, activeUsers, ratingAgg, categories }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const stats   = await getStats()

  const statCards = [
    {
      title: 'Total de Lugares',
      value: stats.totalPlaces.toLocaleString('es-ES'),
      icon:  MapPin,
      color: 'bg-blue-500',
      bg:    'bg-blue-50',
      text:  'text-blue-700',
    },
    {
      title: 'Total Usuarios',
      value: stats.totalUsers.toLocaleString('es-ES'),
      icon:  Users,
      color: 'bg-emerald-500',
      bg:    'bg-emerald-50',
      text:  'text-emerald-700',
    },
    {
      title: 'Usuarios Activos',
      value: stats.activeUsers.toLocaleString('es-ES'),
      icon:  Users,
      color: 'bg-violet-500',
      bg:    'bg-violet-50',
      text:  'text-violet-700',
    },
    {
      title: 'Rating Promedio',
      value: formatRating(Number(stats.ratingAgg._avg.review_rating)),
      icon:  Star,
      color: 'bg-amber-500',
      bg:    'bg-amber-50',
      text:  'text-amber-700',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Bienvenido, {session?.user?.name ?? session?.user?.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.title} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.bg} p-3 rounded-xl`}>
                <card.icon className={`w-6 h-6 ${card.text}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Categorías */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Top Categorías</h2>
        <div className="space-y-3">
          {stats.categories.map((cat) => {
            const pct = stats.totalPlaces > 0
              ? Math.round((cat._count._all / stats.totalPlaces) * 100)
              : 0
            return (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-40 truncate">
                  {cat.category ?? '(sin categoría)'}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-brand-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-12 text-right">
                  {cat._count._all}
                </span>
              </div>
            )
          })}
          {stats.categories.length === 0 && (
            <p className="text-sm text-gray-400">Sin datos de categorías</p>
          )}
        </div>
      </div>
    </div>
  )
}
