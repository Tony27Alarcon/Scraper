'use client'

import { TrendingUp } from 'lucide-react'
import { FavoriteButton } from './FavoriteButton'
import { TemperatureBadge } from './TemperatureBadge'
import { LeadScore } from './LeadScore'
import { ReactionBar } from './ReactionBar'
import { NotesThread } from './NotesThread'

interface CRMPanelProps {
  placeId:            string
  currentUserId:      number
  isAdmin:            boolean
  initialFavorited:   boolean
  initialScore:       number | null
  initialTemperature: string | null
  initialReactions:   { emoji: string; count: number; reacted: boolean }[]
}

export function CRMPanel({
  placeId,
  currentUserId,
  isAdmin,
  initialFavorited,
  initialScore,
  initialTemperature,
  initialReactions,
}: CRMPanelProps) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-600" />
          <span className="font-semibold text-gray-900 text-sm">CRM</span>
        </div>
        <FavoriteButton placeId={placeId} initialFavorited={initialFavorited} size="md" />
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Temperature */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Temperatura del lead
          </p>
          <TemperatureBadge placeId={placeId} initialTemp={initialTemperature} size="md" />
        </div>

        {/* Score */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Puntaje
          </p>
          <LeadScore placeId={placeId} initialScore={initialScore} size="md" />
        </div>

        {/* Reactions */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Reacciones
          </p>
          <ReactionBar placeId={placeId} initialReactions={initialReactions} size="md" />
        </div>

        {/* Notes */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Notas del equipo
          </p>
          <NotesThread placeId={placeId} currentUserId={currentUserId} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  )
}
