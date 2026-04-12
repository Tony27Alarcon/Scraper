import { prisma } from '@/lib/prisma'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EditCompanyPage({
  params,
}: {
  params: { id: string }
}) {
  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) notFound()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/companies" className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Empresa</h1>
          <p className="text-gray-500 mt-0.5">{company.name}</p>
        </div>
      </div>

      <CompanyForm
        initialData={{
          id:          company.id,
          name:        company.name,
          industry:    company.industry    ?? '',
          description: company.description ?? '',
          website:     company.website     ?? '',
          ai_context:  company.ai_context,
        }}
      />
    </div>
  )
}
