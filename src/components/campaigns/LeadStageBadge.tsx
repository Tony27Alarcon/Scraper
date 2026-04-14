import { cn } from '@/lib/utils'

export const STAGE_LABELS: Record<string, string> = {
  queued:     'En cola',
  contacted:  'Contactado',
  replied:    'Respondió',
  interested: 'Interesado',
  won:        'Ganado',
  lost:       'Perdido',
}

export const STAGE_ORDER = ['queued', 'contacted', 'replied', 'interested', 'won', 'lost'] as const
export type Stage = typeof STAGE_ORDER[number]

const STYLES: Record<string, string> = {
  queued:     'bg-gray-100 text-gray-700 border-gray-200',
  contacted:  'bg-blue-50 text-blue-700 border-blue-200',
  replied:    'bg-amber-50 text-amber-700 border-amber-200',
  interested: 'bg-violet-50 text-violet-700 border-violet-200',
  won:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost:       'bg-red-50 text-red-700 border-red-200',
}

export function LeadStageBadge({ stage, className }: { stage: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium',
        STYLES[stage] ?? STYLES.queued,
        className,
      )}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
}
