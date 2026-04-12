import { CompanyForm } from '@/components/companies/CompanyForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCompanyPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/companies" className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Empresa</h1>
          <p className="text-gray-500 mt-0.5">Configura el perfil y contexto para la IA</p>
        </div>
      </div>

      <CompanyForm />
    </div>
  )
}
