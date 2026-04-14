'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Save } from 'lucide-react'

interface Step {
  step:       number
  delay_days: number
  channel:    'whatsapp' | 'email' | 'phone'
  framework?: string
  subject?:   string
  body:       string
  cta?:       string
}

interface Props {
  campaignId: string
  initial:    Step[]
}

export function SequenceEditor({ campaignId, initial }: Props) {
  const [steps, setSteps]       = useState<Step[]>(initial)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => { setSteps(initial) }, [initial])

  function update(idx: number, patch: Partial<Step>) {
    setSteps(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
    setSaved(false)
  }

  function addStep() {
    setSteps(prev => [
      ...prev,
      { step: prev.length + 1, delay_days: prev.length === 0 ? 0 : 3, channel: 'whatsapp', body: '' },
    ])
    setSaved(false)
  }

  function removeStep(idx: number) {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message_template: steps }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Secuencia de toques</h3>
          <p className="text-[11px] text-gray-500">
            Usa variables merge: <code className="bg-gray-100 px-1 rounded">{'{{title}}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{city}}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{category}}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{rating}}'}</code>
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || steps.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Guardado' : 'Guardar secuencia'}
        </button>
      </div>

      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                Paso {s.step}
              </span>
              <button
                onClick={() => removeStep(i)}
                title="Eliminar paso"
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Delay (días)">
                <input
                  type="number" min={0}
                  value={s.delay_days}
                  onChange={e => update(i, { delay_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </Field>
              <Field label="Canal">
                <select
                  value={s.channel}
                  onChange={e => update(i, { channel: e.target.value as Step['channel'] })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="phone">Llamada</option>
                </select>
              </Field>
              <Field label="Framework">
                <select
                  value={s.framework ?? ''}
                  onChange={e => update(i, { framework: e.target.value || undefined })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
            </div>
            {s.channel === 'email' && (
              <Field label="Asunto">
                <input
                  value={s.subject ?? ''}
                  onChange={e => update(i, { subject: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </Field>
            )}
            <Field label="Cuerpo">
              <textarea
                value={s.body}
                onChange={e => update(i, { body: e.target.value })}
                rows={4}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
              />
            </Field>
            <Field label="CTA">
              <input
                value={s.cta ?? ''}
                onChange={e => update(i, { cta: e.target.value })}
                placeholder="Ej: ¿Tienes 15 min esta semana?"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </Field>
          </div>
        ))}
      </div>

      <button
        onClick={addStep}
        className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50"
      >
        <Plus className="w-4 h-4" /> Añadir paso
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">{label}</label>
      {children}
    </div>
  )
}
