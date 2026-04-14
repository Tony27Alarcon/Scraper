'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Save, Trash2, Eye } from 'lucide-react'

interface Initial {
  name:      string
  channel:   'whatsapp' | 'email' | 'phone'
  framework: string
  tone:      string
  subject:   string
  body:      string
}

const SAMPLE_PROSPECT = {
  title:    'Restaurante La Mar',
  city:     'Miraflores',
  category: 'Restaurante peruano',
  rating:   '4.8',
}

function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export function TemplateEditor({ id, initial }: { id: string; initial: Initial }) {
  const router = useRouter()
  const [data, setData]         = useState(initial)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  async function save() {
    setSaving(true)
    const variables = Array.from(data.body.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1])
    const res = await fetch(`/api/templates/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...data,
        framework: data.framework || null,
        tone:      data.tone || null,
        subject:   data.channel === 'email' ? data.subject : null,
        variables: Array.from(new Set(variables)),
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta plantilla?')) return
    setDeleting(true)
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/templates')
    setDeleting(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <Field label="Nombre">
          <input
            value={data.name}
            onChange={e => setData({ ...data, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Canal">
            <select
              value={data.channel}
              onChange={e => setData({ ...data, channel: e.target.value as Initial['channel'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="phone">Teléfono</option>
            </select>
          </Field>
          <Field label="Framework">
            <select
              value={data.framework}
              onChange={e => setData({ ...data, framework: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">—</option>
              {['AIDA', 'PAS', 'BAB', 'QVC', 'PPP', 'SPIN'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Tono">
            <select
              value={data.tone}
              onChange={e => setData({ ...data, tone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">—</option>
              {['formal', 'cercano', 'consultivo', 'disruptivo'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        {data.channel === 'email' && (
          <Field label="Asunto">
            <input
              value={data.subject}
              onChange={e => setData({ ...data, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
        )}

        <Field label="Cuerpo" hint="Variables: {{title}}, {{city}}, {{category}}, {{rating}}">
          <textarea
            value={data.body}
            onChange={e => setData({ ...data, body: e.target.value })}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          />
        </Field>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            <Eye className="w-4 h-4" /> {showPreview ? 'Ocultar preview' : 'Ver preview'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-700">Preview con datos reales de muestra</h3>
            <span className="text-[11px] text-gray-500">
              {Object.entries(SAMPLE_PROSPECT).map(([k, v]) => `${k}=${v}`).join(' · ')}
            </span>
          </div>
          {data.channel === 'email' && data.subject && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Asunto</p>
              <p className="text-sm font-medium text-gray-900">
                {renderTemplate(data.subject, SAMPLE_PROSPECT)}
              </p>
            </div>
          )}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Cuerpo</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
              {renderTemplate(data.body, SAMPLE_PROSPECT)}
            </p>
          </div>
        </div>
      )}
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
