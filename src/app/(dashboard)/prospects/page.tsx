import { prisma } from '@/lib/prisma'
import { ProspectListCard }  from '@/components/prospects/ProspectListCard'
import { ListChecks }        from 'lucide-react'
import { getServerSession }  from 'next-auth'
import { authOptions }       from '@/lib/auth'

export default async function ProspectsPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'admin'

  const lists = await prisma.prospectList.findMany({
    where: { is_campaign: false },
    include: {
      _count: { select: { items: true } },
      user:   { select: { username: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Listas</h1>
        <p className="text-gray-500 mt-0.5">
          Listas curadas de prospectos (no campañas). Para outreach activo, usa{' '}
          <a href="/campaigns" className="text-brand-600 hover:text-brand-700 underline">Campañas</a>.
        </p>
      </div>

      {lists.length === 0 ? (
        <div className="card p-12 text-center">
          <ListChecks className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aún no hay listas</p>
          <p className="text-sm text-gray-400 mt-1">
            Pídele a Closer (esquina inferior derecha) que te cree una lista curada de prospectos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {lists.length} lista{lists.length !== 1 ? 's' : ''} creada{lists.length !== 1 ? 's' : ''}
          </h2>
          {lists.map((list) => (
            <ProspectListCard
              key={list.id}
              id={list.id}
              name={list.name}
              description={list.description}
              count={list._count.items}
              createdAt={list.created_at}
              createdBy={list.user.username ?? list.user.email}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
