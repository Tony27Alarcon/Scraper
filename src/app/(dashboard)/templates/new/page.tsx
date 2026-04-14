'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'

export default function NewTemplatePage() {
  const router = useRouter()
  const [name, setName]           = useState('')
  const [channel, setChannel]     = useState<'whatsapp' | 'email' | 'phone'>('whatsapp')
  const [framework, setFramework] = useState<string>('')
  const [tone, setTone]           = useState<string>('')
  const [subject, setSubject]     = useState('')
  const [body, setBody]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const variables = Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1])

    const res = await fetch('/api/templates', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name, channel, framework: framework || null, tone: tone || null,
        subject: channel === 'email' ? subject : undefined,
        body, variables: Array.from(new Set(variables)),
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al crear la plantilla')
      setSubmitting(false)
      return
    }
    router.push('/templates')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/templates" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Volver a plantillas
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva plantilla</h1>
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Tip: Closer puede generar plantillas probadas desde el chat según tu ai_context.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <Field label="Nombre">
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Canal">
            <select
              value={channel}
              onChange={e => setChannel(e.target.value as 'whatsapp' | 'email' | 'phone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="phone">Teléfono</option>
            </select>
          </Field>
          <Field label="Framework">
            <select
              value={framework}
              onChange={e => setFramework(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">—</option>
              <option value="AIDA">AIDA</option>
              <option value="PAS">PAS</option>
              <option value="BAB">BAB</option>
              <option value="QVC">QVC</option>
              <option value="PPP">PPP</option>
              <option value="SPIN">SPIN</option>
            </select>
          </Field>
          <Field label="Tono">
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">—</option>
              <option value="formal">Formal</option>
              <option value="cercano">Cercano</option>
              <option value="consultivo">Consultivo</option>
              <option value="disruptivo">Disruptivo</option>
            </select>
          </Field>
        </div>

        {channel === 'email' && (
          <Field label="Asunto">
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
        )}

        <Field label="Cuerpo" hint="Usa variables merge: {{title}}, {{city}}, {{category}}, {{rating}}">
          <textarea
            required
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitting || !name || !body}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar plantilla
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
