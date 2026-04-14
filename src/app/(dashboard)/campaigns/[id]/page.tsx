import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Users, Send, Reply, Megaphone } from 'lucide-react'
import { CampaignPipeline } from '@/components/campaigns/CampaignPipeline'
import { SequenceEditor } from '@/components/campaigns/SequenceEditor'
import { CampaignTabs } from '@/components/campaigns/CampaignTabs'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function CampaignDetailPage({ params, searchParams }: Props) {
  const { id }  = await params
  const { tab = 'pipeline' } = await searchParams

  const list = await prisma.prospectList.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  })
  if (!list) notFound()

  const activities = await prisma.placeActivity.groupBy({
    by: ['type'], where: { campaign_id: id }, _count: { _all: true },
  })
  const sends   = activities.find(a => a.type === 'campaign_send')?._count._all  ?? 0
  const replies = activities.find(a => a.type === 'campaign_reply')?._count._all ?? 0
  const replyRate = sends > 0 ? Math.round((replies / sends) * 100) : null

  const initialSteps = Array.isArray(list.message_template)
    ? (list.message_template as unknown[]).map((s, i) => {
        const step = s as Record<string, unknown>
        return {
          step:       (step.step as number) ?? i + 1,
          delay_days: (step.delay_days as number) ?? 0,
          channel:    (step.channel as 'whatsapp' | 'email' | 'phone') ?? 'whatsapp',
          framework:  step.framework as string | undefined,
          subject:    step.subject   as string | undefined,
          body:       (step.body as string) ?? '',
          cta:        step.cta as string | undefined,
        }
      })
    : []

  return (
    <div className="space-y-5">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Volver a campañas
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{list.name}</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {list.channel ?? 'multi'} · {list.status}
              </p>
              {list.goal && <p className="text-sm text-gray-700 mt-2">{list.goal}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-right shrink-0">
            <MetricCard icon={Users} label="Leads"     value={list._count.items} />
            <MetricCard icon={Send}  label="Envíos"    value={sends} />
            <MetricCard icon={Reply} label="Respuesta" value={replyRate !== null ? `${replyRate}%` : '—'} />
          </div>
        </div>
      </div>

      <CampaignTabs campaignId={id} currentTab={tab} />

      {tab === 'pipeline' && <CampaignPipeline campaignId={id} />}

      {tab === 'messages' && (
        <SequenceEditor campaignId={id} initial={initialSteps} />
      )}

      {tab === 'performance' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Performance</h3>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Envíos"       value={sends} />
            <Stat label="Respuestas"   value={replies} />
            <Stat label="% Respuesta"  value={replyRate !== null ? `${replyRate}%` : '—'} />
            <Stat label="Pasos"        value={initialSteps.length} />
          </div>
          <p className="text-xs text-gray-500 pt-3 border-t border-gray-100">
            Tip: abre Closer en la esquina y pregúntale &quot;analiza la performance de esta campaña&quot; para un desglose por stage y recomendaciones concretas.
          </p>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="border border-gray-200 rounded-lg px-3 py-2 text-left">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
