import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Megaphone, MessageSquare, Mail, Phone, Shuffle, Plus, Users } from 'lucide-react'

const CHANNEL_META: Record<string, { icon: typeof Megaphone; label: string; color: string }> = {
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'emerald' },
  email:    { icon: Mail,          label: 'Email',    color: 'blue' },
  phone:    { icon: Phone,         label: 'Llamadas', color: 'violet' },
  multi:    { icon: Shuffle,       label: 'Multi',    color: 'amber' },
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  draft:    { label: 'Borrador', classes: 'bg-gray-100 text-gray-700' },
  active:   { label: 'Activa',   classes: 'bg-emerald-100 text-emerald-700' },
  paused:   { label: 'Pausada',  classes: 'bg-amber-100 text-amber-700' },
  done:     { label: 'Hecha',    classes: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archivada', classes: 'bg-gray-100 text-gray-500' },
}

async function getCampaigns() {
  const lists = await prisma.prospectList.findMany({
    where: { is_campaign: true },
    include: { _count: { select: { items: true } } },
    orderBy: { updated_at: 'desc' },
  })

  const withMetrics = await Promise.all(lists.map(async (l) => {
    const activities = await prisma.placeActivity.groupBy({
      by: ['type'], where: { campaign_id: l.id }, _count: { _all: true },
    })
    const sends   = activities.find(a => a.type === 'campaign_send')?._count._all  ?? 0
    const replies = activities.find(a => a.type === 'campaign_reply')?._count._all ?? 0
    return {
      ...l,
      leadCount: l._count.items,
      metrics: { sends, replies, replyRate: sends > 0 ? Math.round((replies / sends) * 100) : null },
    }
  }))

  return withMetrics
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Campañas de contacto en frío con pipeline visual, secuencias multi-toque y métricas de respuesta.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nueva campaña
        </Link>
      </div>

      {campaigns.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <Megaphone className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">Sin campañas aún</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Pídele a Closer que cree una campaña desde el chat, o lanza una manualmente con el botón &quot;Nueva campaña&quot;.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map(c => {
          const channelMeta = CHANNEL_META[c.channel ?? 'multi'] ?? CHANNEL_META.multi
          const statusMeta  = STATUS_META[c.status]              ?? STATUS_META.draft
          const Icon = channelMeta.icon
          return (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-gray-500">{channelMeta.label}</p>
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusMeta.classes} shrink-0`}>
                  {statusMeta.label}
                </span>
              </div>

              {c.goal && (
                <p className="text-xs text-gray-600 mt-3 line-clamp-2">{c.goal}</p>
              )}

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100">
                <Stat icon={Users} label="Leads" value={c.leadCount} />
                <Stat icon={Mail}  label="Envíos" value={c.metrics.sends} />
                <Stat              label="Resp." value={c.metrics.replyRate !== null ? `${c.metrics.replyRate}%` : '—'} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon?: typeof Users; label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-gray-400 tracking-wide flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
