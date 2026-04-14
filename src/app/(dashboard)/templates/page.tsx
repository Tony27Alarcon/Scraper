import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FileText, MessageSquare, Mail, Phone, Plus, Sparkles } from 'lucide-react'

const CHANNEL_ICON: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  email:    Mail,
  phone:    Phone,
}

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions)
  const userId  = parseInt(session?.user?.id ?? '0')

  const templates = await prisma.messageTemplate.findMany({
    where:   { owner_id: userId },
    orderBy: { updated_at: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Plantillas reutilizables de mensajes de cold outreach con frameworks explícitos.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nueva plantilla
        </Link>
      </div>

      {templates.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">Sin plantillas aún</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Pídele a Closer que genere plantillas con frameworks probados (AIDA, PAS, BAB)
            basadas en tu perfil de empresa, o créalas manualmente.
          </p>
          <p className="mt-4 text-[11px] text-gray-500 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Prueba: &quot;Créame 3 plantillas de WhatsApp con frameworks distintos&quot;
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tpl => {
          const Icon = CHANNEL_ICON[tpl.channel] ?? MessageSquare
          return (
            <Link
              key={tpl.id}
              href={`/templates/${tpl.id}`}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{tpl.name}</p>
                    <p className="text-[11px] text-gray-500 capitalize">{tpl.channel}</p>
                  </div>
                </div>
                {tpl.framework && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-semibold shrink-0">
                    {tpl.framework}
                  </span>
                )}
              </div>

              {tpl.subject && (
                <p className="text-xs text-gray-600 mt-3 font-medium truncate">{tpl.subject}</p>
              )}
              <p className="text-xs text-gray-600 mt-2 line-clamp-3 font-mono">{tpl.body}</p>

              {tpl.tone && (
                <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  Tono: <span className="text-gray-700">{tpl.tone}</span>
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
