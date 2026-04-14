import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  Target, Megaphone, Flame, Send, Reply, TrendingUp, FileText, ArrowRight,
} from 'lucide-react'

async function getMarketingStats() {
  const [
    totalProspects,
    hotLeads,
    warmLeads,
    withPhone,
    withEmail,
    unscored,
    activeCampaigns,
    totalCampaigns,
    templates,
    topCategories,
    sendsAgg,
    repliesAgg,
  ] = await Promise.all([
    prisma.place.count(),
    prisma.place.count({ where: { lead_temperature: 'hot' } }),
    prisma.place.count({ where: { lead_temperature: 'warm' } }),
    prisma.place.count({ where: { phone:   { not: null } } }),
    prisma.place.count({ where: { email:   { not: null } } }),
    prisma.place.count({ where: { lead_score: null } }),
    prisma.prospectList.count({ where: { is_campaign: true, status: 'active' } }),
    prisma.prospectList.count({ where: { is_campaign: true } }),
    prisma.messageTemplate.count(),
    prisma.place.groupBy({
      by: ['category'],
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
      take: 6,
      where: { category: { not: null } },
    }),
    prisma.placeActivity.count({ where: { type: 'campaign_send' } }),
    prisma.placeActivity.count({ where: { type: 'campaign_reply' } }),
  ])

  const replyRate = sendsAgg > 0 ? Math.round((repliesAgg / sendsAgg) * 100) : null

  return {
    totalProspects, hotLeads, warmLeads, withPhone, withEmail, unscored,
    activeCampaigns, totalCampaigns, templates,
    topCategories,
    sends: sendsAgg, replies: repliesAgg, replyRate,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const s       = await getMarketingStats()

  const tiles = [
    { title: 'Prospectos',        value: s.totalProspects, href: '/places',    icon: Target,    color: 'bg-blue-50 text-blue-700' },
    { title: 'Leads Hot',         value: s.hotLeads,       href: '/places?temperature=hot', icon: Flame, color: 'bg-red-50 text-red-700' },
    { title: 'Campañas activas',  value: s.activeCampaigns,href: '/campaigns', icon: Megaphone, color: 'bg-emerald-50 text-emerald-700' },
    { title: 'Tasa respuesta',    value: s.replyRate !== null ? `${s.replyRate}%` : '—', href: '/campaigns', icon: Reply, color: 'bg-violet-50 text-violet-700' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de marketing</h1>
        <p className="text-gray-500 mt-1">
          Bienvenido, {session?.user?.name ?? session?.user?.email}. Pídele a Closer en la esquina un diagnóstico rápido de tu pipeline.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {typeof t.value === 'number' ? t.value.toLocaleString('es-ES') : t.value}
                </p>
              </div>
              <div className={`${t.color} p-3 rounded-xl`}>
                <t.icon className="w-6 h-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Funnel + plantillas side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Embudo de outreach</h2>
            <Link href="/campaigns" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Ver campañas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <FunnelStep icon={Target}    label="Prospectos"  value={s.totalProspects} sub={`${s.withPhone} con teléfono`} />
            <FunnelStep icon={Flame}     label="Calientes"   value={s.hotLeads + s.warmLeads} sub={`${s.hotLeads} hot / ${s.warmLeads} warm`} />
            <FunnelStep icon={Send}      label="Enviados"    value={s.sends}          sub="mensajes de campaña" />
            <FunnelStep icon={Reply}     label="Respuestas"  value={s.replies}        sub={s.replyRate !== null ? `${s.replyRate}% tasa` : 'aún sin envíos'} />
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-sm">
            <Snippet label="Sin calificar"        value={s.unscored} hint="leads que Closer puede calificar" />
            <Snippet label="Con email"            value={s.withEmail} hint="audiencia para campañas email" />
            <Snippet label="Campañas totales"     value={s.totalCampaigns} hint={`${s.activeCampaigns} activas`} />
          </div>
        </div>

        <div className="card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Plantillas</h2>
            <Link href="/templates" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <FileText className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{s.templates}</p>
            <p className="text-xs text-gray-500 mt-1">plantillas de mensaje guardadas</p>
            <Link
              href="/templates"
              className="mt-4 text-xs px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full hover:bg-brand-100"
            >
              Gestionar plantillas
            </Link>
          </div>
        </div>
      </div>

      {/* Top Categorías */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Segmentos con más volumen</h2>
          <TrendingUp className="w-4 h-4 text-gray-400" />
        </div>
        <div className="space-y-3">
          {s.topCategories.map((cat) => {
            const pct = s.totalProspects > 0 ? Math.round((cat._count._all / s.totalProspects) * 100) : 0
            return (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-40 truncate">{cat.category ?? '(sin categoría)'}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-700 w-12 text-right">{cat._count._all}</span>
              </div>
            )
          })}
          {s.topCategories.length === 0 && <p className="text-sm text-gray-400">Sin datos</p>}
        </div>
      </div>
    </div>
  )
}

function FunnelStep({ icon: Icon, label, value, sub }: { icon: typeof Target; label: string; value: number; sub?: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-brand-600" />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('es-ES')}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function Snippet({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-gray-400 tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value.toLocaleString('es-ES')}</p>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}
