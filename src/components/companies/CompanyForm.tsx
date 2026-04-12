'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Save } from 'lucide-react'

const CompanySchema = z.object({
  name:        z.string().min(1, 'El nombre es requerido'),
  industry:    z.string().optional(),
  description: z.string().optional(),
  website:     z.string().url('URL inválida').optional().or(z.literal('')),
  ai_context:  z.string().min(10, 'Escribe al menos 10 caracteres de contexto para la IA'),
})

type CompanyFormData = z.infer<typeof CompanySchema>

interface CompanyFormProps {
  initialData?: Partial<CompanyFormData> & { id?: string }
}

const AI_CONTEXT_PLACEHOLDER = `Ejemplo:
Somos una agencia de marketing digital especializada en restaurantes y negocios de gastronomía en Lima, Perú.

Buscamos negocios que:
- Tengan entre 50 y 500 reseñas en Google
- Rating superior a 3.5 estrellas
- No tengan sitio web actualizado o presencia en redes sociales

Lead ideal: restaurante o bar activo, con buena reputación pero poca visibilidad digital, sin agencia de marketing aparente.

Criterio de temperatura:
- hot: >200 reseñas, rating >4, sin web o web desactualizada
- warm: 50-200 reseñas, rating >3.5, presencia digital básica
- cold: <50 reseñas, rating <3.5, o negocio en mal estado`

export function CompanyForm({ initialData }: CompanyFormProps) {
  const router  = useRouter()
  const isEdit  = !!initialData?.id
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<CompanyFormData>({
    resolver:      zodResolver(CompanySchema),
    defaultValues: {
      name:        initialData?.name        ?? '',
      industry:    initialData?.industry    ?? '',
      description: initialData?.description ?? '',
      website:     initialData?.website     ?? '',
      ai_context:  initialData?.ai_context  ?? '',
    },
  })

  async function onSubmit(data: CompanyFormData) {
    setLoading(true)
    setError('')
    try {
      const url    = isEdit ? `/api/companies/${initialData!.id}` : '/api/companies'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al guardar')
      }
      router.push('/companies')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 max-w-2xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Nombre + Rubro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre de la empresa *</label>
            <input
              {...register('name')}
              type="text"
              className="input-field"
              placeholder="Acme Marketing"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Rubro / Industria</label>
            <input
              {...register('industry')}
              type="text"
              className="input-field"
              placeholder="Marketing Digital, Inmobiliaria..."
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="label">Descripción breve</label>
          <input
            {...register('description')}
            type="text"
            className="input-field"
            placeholder="Agencia especializada en..."
          />
        </div>

        {/* Sitio web */}
        <div>
          <label className="label">Sitio web</label>
          <input
            {...register('website')}
            type="url"
            className="input-field"
            placeholder="https://miempresa.com"
          />
          {errors.website && <p className="mt-1 text-xs text-red-600">{errors.website.message}</p>}
        </div>

        {/* Contexto IA */}
        <div>
          <label className="label">
            Contexto para la IA *
            <span className="ml-2 text-xs font-normal text-gray-400">
              Describe tu empresa, qué buscas y cómo evaluar los leads
            </span>
          </label>
          <textarea
            {...register('ai_context')}
            rows={12}
            className="input-field font-mono text-xs leading-relaxed resize-y"
            placeholder={AI_CONTEXT_PLACEHOLDER}
          />
          {errors.ai_context && (
            <p className="mt-1 text-xs text-red-600">{errors.ai_context.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Este texto se inyecta en el sistema del agente IA al analizar cada lugar. Cuanto más detallado, mejores los análisis.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Guardando...
              </span>
            ) : (
              <>
                {isEdit ? <Save className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                {isEdit ? 'Guardar cambios' : 'Crear empresa'}
              </>
            )}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
