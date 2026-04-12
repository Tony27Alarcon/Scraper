import { prisma } from '@/lib/prisma'
import { Building2, Pencil, Trash2, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { CompanyDeleteButton } from '@/components/companies/CompanyDeleteButton'

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'admin'

  const companies = await prisma.company.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500 mt-0.5">
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} configurada{companies.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Link href="/companies/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Nueva Empresa
          </Link>
        )}
      </div>

      {companies.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay empresas configuradas</p>
          <p className="text-sm text-gray-400 mt-1">Crea una empresa para dar contexto a la IA</p>
          {isAdmin && (
            <Link href="/companies/new" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" />
              Crear primera empresa
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {companies.map((company) => (
            <div key={company.id} className="card p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{company.name}</h2>
                    {company.industry && (
                      <span className="text-xs text-gray-500">{company.industry}</span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/companies/${company.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <CompanyDeleteButton id={company.id} name={company.name} />
                  </div>
                )}
              </div>

              {/* Descripción */}
              {company.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{company.description}</p>
              )}

              {/* Contexto IA preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Contexto IA</p>
                <p className="text-xs text-gray-600 line-clamp-3 font-mono">{company.ai_context}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {company._count.users} usuario{company._count.users !== 1 ? 's' : ''}
                </span>
                <span>Creada {formatDate(company.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
