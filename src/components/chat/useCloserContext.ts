'use client'

import { useParams, usePathname } from 'next/navigation'
import { useMemo } from 'react'

export interface CloserClientContext {
  path:    string
  placeId: string | null
  listId:  string | null
  view:    string | null
  label:   string | null
}

/**
 * Deriva el contexto del Closer desde la ruta activa.
 * - /places/[id]                       → placeId, view=lead
 * - /campaigns/[id]                    → listId, view=pipeline
 * - /campaigns/[id]/lead/[placeId]     → listId + placeId, view=lead-in-campaign
 * - /campaigns/new                     → view=editor
 * - /campaigns                         → view=library
 * - /templates, /templates/[id]        → view=templates
 * - /dashboard                         → view=dashboard
 * - /inbox                             → view=inbox
 */
export function useCloserContext(): CloserClientContext {
  const pathname = usePathname() ?? '/'
  const params   = useParams() ?? {}

  return useMemo(() => {
    const placeIdFromParams = typeof params.placeId === 'string' ? params.placeId : null
    const idFromParams      = typeof params.id      === 'string' ? params.id      : null

    let placeId: string | null = null
    let listId:  string | null = null
    let view:    string | null = null
    let label:   string | null = null

    if (pathname.startsWith('/campaigns/') && pathname.includes('/lead/')) {
      listId  = idFromParams
      placeId = placeIdFromParams
      view    = 'lead-in-campaign'
      label   = 'Lead en campaña'
    } else if (pathname === '/campaigns/new') {
      view  = 'editor'
      label = 'Nueva campaña'
    } else if (pathname.startsWith('/campaigns/') && idFromParams) {
      listId = idFromParams
      view   = 'pipeline'
      label  = 'Campaña'
    } else if (pathname === '/campaigns') {
      view  = 'library'
      label = 'Campañas'
    } else if (pathname.startsWith('/places/') && idFromParams) {
      placeId = idFromParams
      view    = 'lead'
      label   = 'Prospecto'
    } else if (pathname === '/places') {
      view  = 'prospects'
      label = 'Prospectos'
    } else if (pathname.startsWith('/templates')) {
      view  = 'templates'
      label = 'Plantillas'
    } else if (pathname === '/dashboard') {
      view  = 'dashboard'
      label = 'Dashboard'
    } else if (pathname === '/inbox') {
      view  = 'inbox'
      label = 'Bandeja'
    }

    return { path: pathname, placeId, listId, view, label }
  }, [pathname, params])
}
