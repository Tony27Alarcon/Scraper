'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'

export default function NewCampaignPage() {
  const router = useRouter()
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [channel, setChannel]         = useState<'whatsapp' | 'email' | 'phone' | 'multi'>('whatsapp')
  const [goal, setGoal]               = useState('')
  const [status, setStatus]           = useState<'draft' | 'active'>('draft')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/campaigns', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, description, channel, goal, status }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al crear la campaña')
      setSubmitting(false)
      return
    }

    const data = await res.json()
    router.push(`/campaigns/${data.campaign.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Volver a campañas
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva campaña</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define los datos básicos. Después podrás añadir prospectos y la secuencia de toques,
          o pedirle a Closer que lo haga por ti desde el chat.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <Field label="Nombre" hint='Ej: "Cold WhatsApp — Restaurantes premium Lima Q2"'>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Canal">
          <select
            value={channel}
            onChange={e => setChannel(e.target.value as 'whatsapp' | 'email' | 'phone' | 'multi')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="phone">Teléfono</option>
            <option value="multi">Multicanal</option>
          </select>
        </Field>

        <Field label="Descripción" hint="Resumen breve (visible en el listado)">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Meta" hint="Métrica + segmento + razonamiento. Ej: 10% respuesta en 2 semanas en restaurantes 4+ estrellas con reservas online.">
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Estado inicial">
          <div className="flex gap-2">
            {(['draft', 'active'] as const).map(s => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={status === s}
                  onChange={() => setStatus(s)}
                />
                <span className="text-sm">{s === 'draft' ? 'Borrador' : 'Activa'}</span>
              </label>
            ))}
          </div>
        </Field>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Tip: Closer puede crear la campaña completa desde el chat.
          </p>
          <button
            type="submit"
            disabled={submitting || !name}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear campaña
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}
