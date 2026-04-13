import { createClient } from '@supabase/supabase-js'

if (typeof window !== 'undefined') {
  throw new Error('src/lib/supabase.ts solo puede usarse en el servidor')
}

// --- Constantes ---

export const BRUNO_LAB_COMPANY_ID = '062f4cb7-b06d-45ef-9e54-be684a07d239'

const TEMP_MAP: Record<string, string> = {
  cold: 'frio',
  warm: 'tibio',
  hot:  'caliente',
}

// --- Singleton ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createClient<any, 'clinicas'>>

const globalForSupabase = globalThis as unknown as {
  supabase: AnySupabaseClient | undefined
}

function getClient(): AnySupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'clinicas' } })
}

export const supabase =
  globalForSupabase.supabase ?? getClient()

if (process.env.NODE_ENV !== 'production' && supabase) {
  globalForSupabase.supabase = supabase
}

// --- Tipos ---

export interface PlaceForCRM {
  id:               string
  title:            string | null
  category:         string | null
  phone:            string | null
  email:            string | null
  website:          string | null
  address:          string | null
  city:             string | null
  country:          string | null
  descriptions:     string | null
  review_rating:    number | null | { toNumber(): number }
  review_count:     number | null
  lead_score:       number | null
  lead_temperature: string | null
  price_range:      string | null
  open_hours?:      unknown
  owner?:           unknown
  notes?:           { content: string }[]
}

export interface SendResult {
  status:     'created' | 'updated' | 'error'
  contactId?: string
  error?:     string
}

// --- Context Builder ---

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 3) + '...'
}

function getRating(val: PlaceForCRM['review_rating']): number | null {
  if (val == null) return null
  if (typeof val === 'number') return val
  return val.toNumber()
}

export function buildCRMContext(place: PlaceForCRM, reason?: string): string {
  const parts: string[] = []
  const MAX = 1800

  // Header
  parts.push(`📋 Ficha: ${place.title ?? 'Sin nombre'}`)

  const loc = [place.category, [place.city, place.country].filter(Boolean).join(', ')].filter(Boolean).join(' | ')
  if (loc) parts.push(`📍 ${loc}`)

  // Contacto
  const contact = [
    place.phone   ? `📞 ${place.phone}`   : null,
    place.email   ? `✉️ ${place.email}`    : null,
    place.website ? `🌐 ${place.website}`  : null,
  ].filter(Boolean).join(' | ')
  if (contact) parts.push(contact)

  // Métricas
  const rating = getRating(place.review_rating)
  const metrics = [
    rating         ? `⭐ ${rating}/5 (${place.review_count ?? 0} reseñas)` : null,
    place.lead_score ? `🎯 Score: ${place.lead_score}/5`                   : null,
    place.lead_temperature ? `Temp: ${TEMP_MAP[place.lead_temperature] ?? place.lead_temperature}` : null,
  ].filter(Boolean).join(' | ')
  if (metrics) parts.push(metrics)

  // Descripción
  if (place.descriptions) {
    parts.push(`\n📝 Descripción:\n${truncate(place.descriptions, 300)}`)
  }

  // Última nota de investigación
  if (place.notes?.length) {
    const latestNote = place.notes[0].content
    parts.push(`\n💡 Contexto de investigación:\n${truncate(latestNote, 500)}`)
  }

  // Datos complementarios
  if (place.address) parts.push(`📊 Dirección: ${place.address}`)
  if (place.price_range) parts.push(`💰 Rango: ${place.price_range}`)

  if (place.owner && typeof place.owner === 'object') {
    const ownerObj = place.owner as Record<string, unknown>
    if (ownerObj.name) parts.push(`👤 Propietario: ${String(ownerObj.name)}`)
  }

  // Razón del agente
  if (reason) {
    parts.push(`\n🤖 Recomendación del agente:\n${truncate(reason, 300)}`)
  }

  let result = parts.join('\n')
  if (result.length > MAX) {
    result = result.slice(0, MAX - 3) + '...'
  }
  return result
}

function buildShortNote(place: PlaceForCRM): string {
  const temp = place.lead_temperature
    ? TEMP_MAP[place.lead_temperature] ?? place.lead_temperature
    : 'sin clasificar'
  return truncate(
    `Prospecto de ${place.category ?? 'negocio'} en ${place.city ?? 'ubicación desconocida'}. Score ${place.lead_score ?? '?'}/5. ${temp}. Fuente: Scraper Dashboard.`,
    500,
  )
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

// --- Core send function ---

export async function sendPlaceToCRM(place: PlaceForCRM, reason?: string): Promise<SendResult> {
  if (!supabase) {
    return { status: 'error', error: 'Supabase no está configurado. Añade SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY al .env' }
  }

  if (!place.phone) {
    return { status: 'error', error: 'El lugar no tiene teléfono registrado' }
  }

  const phone = normalizePhone(place.phone)
  const context = buildCRMContext(place, reason)
  const shortNote = buildShortNote(place)
  const temp = place.lead_temperature ? (TEMP_MAP[place.lead_temperature] ?? 'frio') : 'frio'

  try {
    // Check existing contact
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('company_id', BRUNO_LAB_COMPANY_ID)
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      // Update existing contact
      await supabase
        .from('contacts')
        .update({
          name:        place.title ?? undefined,
          email:       place.email ?? undefined,
          temperature: temp,
          notes:       shortNote,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', existing.id)

      // Add new note with fresh context
      await supabase
        .from('contacts_notas')
        .insert({
          company_id: BRUNO_LAB_COMPANY_ID,
          contact_id: existing.id,
          content:    context,
          created_by: 'scraper',
        })

      return { status: 'updated', contactId: existing.id }
    }

    // Create new contact
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        company_id:  BRUNO_LAB_COMPANY_ID,
        phone,
        name:        place.title ?? null,
        email:       place.email ?? null,
        status:      'prospecto',
        temperature: temp,
        notes:       shortNote,
      })
      .select('id')
      .single()

    if (insertError || !newContact) {
      return { status: 'error', error: `Error al crear contacto: ${insertError?.message ?? 'sin respuesta'}` }
    }

    // Add context note
    await supabase
      .from('contacts_notas')
      .insert({
        company_id: BRUNO_LAB_COMPANY_ID,
        contact_id: newContact.id,
        content:    context,
        created_by: 'scraper',
      })

    return { status: 'created', contactId: newContact.id }
  } catch (err) {
    return { status: 'error', error: `Error de conexión con Supabase: ${String(err)}` }
  }
}
