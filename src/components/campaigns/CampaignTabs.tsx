'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'pipeline',    label: 'Pipeline' },
  { id: 'messages',    label: 'Mensajes' },
  { id: 'performance', label: 'Performance' },
]

export function CampaignTabs({ campaignId, currentTab }: { campaignId: string; currentTab: string }) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-1">
        {TABS.map(t => {
          const active = currentTab === t.id
          return (
            <Link
              key={t.id}
              href={`/campaigns/${campaignId}?tab=${t.id}`}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
