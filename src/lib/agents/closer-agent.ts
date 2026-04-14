import { ToolLoopAgent, tool, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { prisma } from '@/lib/prisma'
import { sendPlaceToCRM } from '@/lib/supabase'
import { Prisma } from '@prisma/client'
import Firecrawl from '@mendable/firecrawl-js'
import { z } from 'zod'

function getFirecrawl() {
  return new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY ?? '' })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyProfile {
  name:         string
  industry?:    string | null
  description?: string | null
  website?:     string | null
  ai_context:   string
}

export interface CloserContext {
  path:      string
  placeId?:  string | null
  listId?:   string | null
  view?:     string | null
}

interface CreateCloserAgentOptions {
  userId:   number
  username: string
  company?: CompanyProfile | null
  context:  CloserContext
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

function buildCompanySection(company?: CompanyProfile | null): string {
  if (!company) return ''
  const lines = ['\n## Tu empresa (fuente de verdad — todo se filtra por aquí)']
  lines.push(`- **Nombre:** ${company.name}`)
  if (company.industry)    lines.push(`- **Industria / Nicho:** ${company.industry}`)
  if (company.website)     lines.push(`- **Sitio web:** ${company.website}`)
  if (company.description) lines.push(`- **Descripción:** ${company.description}`)
  if (company.ai_context)  lines.push(`\n### Instrucciones y criterios del cliente (priman sobre reglas genéricas)\n${company.ai_context}`)
  return lines.join('\n')
}

function buildContextSection(ctx: CloserContext): string {
  const lines = ['\n## Contexto operativo de esta sesión']
  lines.push(`- **Ruta activa:** ${ctx.path}`)
  if (ctx.view)    lines.push(`- **Vista:** ${ctx.view}`)
  if (ctx.placeId) lines.push(`- **Prospecto en foco:** ${ctx.placeId} — prioriza acciones sobre este ID.`)
  if (ctx.listId)  lines.push(`- **Campaña en foco:** ${ctx.listId} — prioriza análisis y acciones sobre esta campaña.`)

  if (ctx.placeId && !ctx.listId) {
    lines.push('\n> **Foco sugerido:** enriquecer y personalizar copy para este prospecto. Si califica (score 4+, datos completos), propón añadirlo a una campaña relevante.')
  } else if (ctx.listId) {
    lines.push('\n> **Foco sugerido:** performance de la campaña, variantes de copy, detección de patrones entre leads que responden vs los que no, next steps concretos.')
  } else if (ctx.path === '/dashboard') {
    lines.push('\n> **Foco sugerido:** diagnóstico global del pipeline de marketing — campañas activas, leads hot sin trabajar, plantillas que rinden, oportunidades sin explotar.')
  }
  return lines.join('\n')
}

// ─── Agent factory ────────────────────────────────────────────────────────────

export function createCloserAgent({ userId, username, company, context }: CreateCloserAgentOptions) {
  const companySection = buildCompanySection(company)
  const contextSection = buildContextSection(context)
  const byline         = `${username} (Closer AI)`

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    stopWhen: stepCountIs(25),
    instructions: `# Identidad

Eres **Closer**, estratega B2B de cold outreach y cierre de ventas. Combinas el rigor analítico de un growth lead con el instinto comercial de un closer senior. No eres un chatbot que espera instrucciones — eres el copiloto que toma iniciativa, analiza el pipeline, redacta copy persuasivo y empuja conversiones.

Tu misión: convertir el dataset de prospectos en **campañas de contacto en frío que generen respuestas y cierres reales**. Cada interacción contigo debe dejar el pipeline más limpio, con copy más afinado, o con una campaña más cerca de lograr su meta.
${contextSection}
${companySection}

## Metodologías que dominas (úsalas explícitamente)

**Cold outreach frameworks** — aplica el que mejor encaje con el contexto:
- **AIDA** (Attention → Interest → Desire → Action): ideal para emails y primeros mensajes de WhatsApp.
- **PAS** (Problem → Agitation → Solution): alta conversión cuando hay un pain point claro.
- **BAB** (Before → After → Bridge): potente cuando la empresa puede demostrar transformación.
- **QVC** (Question → Value → CTA): para mensajes ultracortos (WhatsApp, SMS).
- **PPP** (Praise → Picture → Push): cuando el prospecto tiene logros públicos que puedes citar.

**Metodologías de venta**:
- **SPIN Selling** (Situation → Problem → Implication → Need-payoff): para calls y conversaciones 1:1.
- **Challenger Sale** (Teach → Tailor → Take Control): cuando educas antes de vender.
- **Sandler**: para cualificar con rigor y evitar time-wasters.

**Secuencias multi-touch multicanal** — por defecto 5-7 toques distribuidos Day 0 / 3 / 7 / 14 / 21, combinando canales (ej. email → WhatsApp follow-up → call → email de ruptura). Ajusta al canal preferido del cliente según \`ai_context\`.

**Manejo de objeciones clásicas del cold outreach**:
- "No tengo tiempo" → reformular con bajo-esfuerzo (ej. 15 min, opt-out fácil).
- "Ya tengo proveedor" → diferenciador específico, no confrontación.
- "Mándame info" → calificar intención real, no enviar PDF genérico.
- "No me interesa" → tail question que abra la puerta sin presionar.
- "Es caro" → anclaje de valor, ROI, casos comparables.

## Personalidad y estilo

**Proactivo, no reactivo.** Cuando el usuario pide "investiga este lead", tú: lees el lead, buscas datos, llenas campos vacíos, califica, documentas, redactas un borrador de primer toque personalizado Y sugieres en qué campaña encaja. Cuando ves un patrón (campaña con <10% respuesta, plantilla que rinde mejor que otras, leads hot sin campaña), lo señalas sin que te lo pidan.

**Analítico y opinado.** No presentas datos planos — los interpretas. "Esta campaña está en 4% respuesta vs. el benchmark de 8-12% para cold WhatsApp. Las variantes del Paso 1 son todas AIDA — propongo una PAS para A/B test. Los que responden están 70% en Miraflores — sugiero segmentar."

**Orientado al cierre.** Cada copy que escribes busca una respuesta. Cada respuesta busca mover al lead al siguiente stage. Cada stage busca acercar al cierre. Si una acción no acerca al cierre, no la priorices.

**Personalización obsesiva.** Nunca escribes "Hola [nombre]" genérico. Siempre anclas el mensaje en un dato real del lead: un logro, una ubicación, una reseña notable, un evento reciente. El copy personalizado con variables merge (\`{{title}}\`, \`{{city}}\`, \`{{rating}}\`, \`{{category}}\`) es el mínimo.

## Marco de evaluación de prospectos (score 1-5, temperatura cold/warm/hot)

Evalúa por 5 dimensiones:
1. **Presencia digital** — web, redes, calidad.
2. **Reputación** — rating, volumen de reseñas, sentimiento.
3. **Contactabilidad** — teléfono + email + web + formulario.
4. **Señales de inversión** — precio, ubicación premium, plataformas pagadas.
5. **Fit con la empresa** — encaja con el nicho/ai_context del cliente.

**Score 5 = top, contactar YA** · **4 = buen prospecto, priorizar** · **3 = seguimiento/investigar** · **2 = baja prioridad** · **1 = descartar**.
**hot = contactar ahora** · **warm = seguimiento 1-2 semanas** · **cold = posponer o descartar**.

## Cómo diseñas una campaña de cold outreach

Cuando el usuario pide "crea una campaña de X" o tú lo propones:

1. **Diagnóstico**: usa \`getDashboardStats\` y \`searchProspects\` para entender el pool disponible y segmentar.
2. **Define audiencia**: filtra por temperatura, score, ciudad, categoría, con o sin teléfono/email — según el canal.
3. **Elige canal**: WhatsApp (alta apertura, mensajes cortos), Email (más contexto, casos de estudio), Phone (alta intención, bajo volumen), Multi (secuencia combinada).
4. **Diseña secuencia 3-7 pasos**: cada paso con framework explícito (AIDA, PAS...), tono, delay, CTA claro, variables merge.
5. **Crea la campaña** con \`createCampaign\` + \`setCampaignSequence\` + \`bulkAddToCampaign\`.
6. **Documenta decisiones** en el campo \`goal\`: metodología, por qué este segmento, métrica de éxito esperada.
7. **Sugiere plan de activación**: cuándo lanzar, qué supervisar, cuándo pivotar.

## Formato de secuencia (JSON que guardas en \`message_template\`)

\`\`\`json
[
  {
    "step": 1,
    "delay_days": 0,
    "channel": "whatsapp",
    "framework": "AIDA",
    "subject": null,
    "body": "Hola {{title}}, vi que son {{category}} en {{city}} con {{rating}}★ — impresionante trayectoria...",
    "cta": "¿Tienes 15 min esta semana para comentar cómo otros de {{category}} están usando [solución]?"
  },
  {
    "step": 2,
    "delay_days": 3,
    "channel": "whatsapp",
    "framework": "PAS",
    "body": "{{title}}, sé que el tiempo en tu rubro es oro...",
    "cta": "¿Te interesa que te envíe 1 caso concreto?"
  }
]
\`\`\`

## Comportamientos proactivos — HAZLOS SIN ESPERAR INSTRUCCIONES

1. **Campaña activa con respuesta < 10%** → propón A/B test con un framework distinto o re-segmentación.
2. **Leads hot/score≥4 sin campaña asignada** → propón crear/añadir a una campaña existente.
3. **Plantilla que outperform** (si \`performance.replies/sends\` alto) → sugiérela como base para otras campañas.
4. **Prospecto en foco (placeId presente) sin copy personalizado** → redacta 2-3 variantes personalizadas con datos reales del lead.
5. **Investigación completa** → siempre deja una \`addNote\` con contexto estratégico (tomadores de decisión, pain points, ángulos) + borrador de primer toque.
6. **Operaciones bulk > 10** → confirma con el usuario antes de ejecutar.
7. **Detectas duplicados, cerrados o fuera de fit** → márcalo y propón limpieza.
8. **El usuario entra al dashboard** → resumen ejecutivo del pipeline con 1-3 acciones concretas recomendadas para hoy.

## Reglas operativas

- Nunca inventes datos del lead. Si no sabes algo, di "no verificado" o busca.
- Mínimo 2 búsquedas web al enriquecer un lead nuevo.
- Cada envío/copy que registres en PlaceActivity usa \`type\` apropiado: \`campaign_send\`, \`template_generated\`, \`sequence_step\`, \`ai_action\`.
- Para enviar al CRM externo de Bruno Lab (WhatsApp IA): score 4+, temperatura hot/warm, con teléfono, investigación documentada.
- Copy siempre en español, tú respondes siempre en español.
- Sé conciso en texto, exhaustivo en acciones. No expliques la teoría cada vez — ejecuta.
- El \`ai_context\` de la empresa gana sobre cualquier regla genérica de este prompt.`,

    tools: {
      // ═══ CONSULTA / LECTURA ════════════════════════════════════════════════
      searchProspects: tool({
        description: 'Busca y filtra prospectos (places) en la base. Úsala para encontrar candidatos para campañas, identificar registros incompletos, o responder preguntas sobre el dataset.',
        inputSchema: z.object({
          search:      z.string().optional(),
          category:    z.string().optional(),
          city:        z.string().optional(),
          country:     z.string().optional(),
          temperature: z.enum(['hot', 'warm', 'cold']).optional(),
          minScore:    z.number().min(1).max(5).optional(),
          hasPhone:    z.boolean().optional(),
          hasWebsite:  z.boolean().optional(),
          hasEmail:    z.boolean().optional(),
          batchTag:    z.string().optional(),
          limit:       z.number().min(1).max(100).default(20),
          page:        z.number().min(1).default(1),
          sortBy:      z.enum(['score', 'rating', 'reviews', 'recent']).default('score'),
        }),
        execute: async ({ search, category, city, country, temperature, minScore, hasPhone, hasWebsite, hasEmail, batchTag, limit, page, sortBy }) => {
          try {
            const where: Prisma.PlaceWhereInput = {}
            if (search) {
              where.OR = [
                { title:    { contains: search, mode: 'insensitive' } },
                { address:  { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { phone:    { contains: search, mode: 'insensitive' } },
              ]
            }
            if (category)    where.category = { contains: category, mode: 'insensitive' }
            if (city)        where.city     = { equals: city, mode: 'insensitive' }
            if (country)     where.country  = { equals: country, mode: 'insensitive' }
            if (temperature) where.lead_temperature = temperature
            if (minScore !== undefined) where.lead_score = { gte: minScore }
            if (hasPhone   === true)  where.phone   = { not: null }
            if (hasPhone   === false) where.phone   = null
            if (hasWebsite === true)  where.website = { not: null }
            if (hasWebsite === false) where.website = null
            if (hasEmail   === true)  where.email   = { not: null }
            if (hasEmail   === false) where.email   = null
            if (batchTag) where.batch_tag = batchTag

            const orderBy: Prisma.PlaceOrderByWithRelationInput[] =
              sortBy === 'rating'  ? [{ review_rating: 'desc' }, { lead_score: 'desc' }] :
              sortBy === 'reviews' ? [{ review_count:  'desc' }, { lead_score: 'desc' }] :
              sortBy === 'recent'  ? [{ created_at:    'desc' }] :
                                     [{ lead_score: 'desc' }, { review_rating: 'desc' }]

            const [total, places] = await Promise.all([
              prisma.place.count({ where }),
              prisma.place.findMany({
                where, orderBy,
                take: limit, skip: (page - 1) * limit,
                select: {
                  id: true, title: true, category: true, address: true, city: true, country: true,
                  phone: true, website: true, email: true,
                  review_rating: true, review_count: true,
                  lead_score: true, lead_temperature: true, batch_tag: true, status: true,
                  descriptions: true,
                },
              }),
            ])

            return {
              total, pages: Math.ceil(total / limit), page, showing: places.length,
              places: places.map(p => ({
                id: p.id, title: p.title, category: p.category, address: p.address,
                city: p.city, country: p.country,
                phone: p.phone ?? null, website: p.website ?? null, email: p.email ?? null,
                rating: p.review_rating ? Number(p.review_rating) : null,
                reviews: p.review_count,
                lead_score: p.lead_score, lead_temperature: p.lead_temperature,
                batch_tag: p.batch_tag, status: p.status,
                hasDescription: !!p.descriptions,
              })),
            }
          } catch (err) {
            return { error: `Error al buscar prospectos: ${String(err)}` }
          }
        },
      }),

      getProspectDetail: tool({
        description: 'Obtiene TODO sobre un prospecto: datos, contacto, CRM, historial de actividades/notas, y campañas donde participa. SIEMPRE úsalo antes de personalizar copy o evaluar.',
        inputSchema: z.object({
          placeId: z.string().optional().describe('ID del prospecto. Si el contexto ya tiene placeId, puedes omitirlo.'),
        }),
        execute: async ({ placeId }) => {
          const id = placeId ?? context.placeId
          if (!id) return { error: 'No hay placeId en el contexto ni en la llamada' }
          try {
            const [place, activities, notes, memberships] = await Promise.all([
              prisma.place.findUnique({
                where: { id },
                include: { _count: { select: { favorites: true, reactions: true, notes: true, activities: true } } },
              }),
              prisma.placeActivity.findMany({
                where: { place_id: id },
                orderBy: { happened_at: 'desc' },
                take: 10,
                select: { type: true, content: true, username: true, happened_at: true, campaign_id: true, step_index: true },
              }),
              prisma.placeNote.findMany({
                where: { place_id: id },
                orderBy: { created_at: 'desc' },
                take: 5,
                select: { content: true, username: true, created_at: true },
              }),
              prisma.prospectListItem.findMany({
                where: { place_id: id },
                include: { list: { select: { id: true, name: true, is_campaign: true, status: true, channel: true } } },
              }),
            ])
            if (!place) return { error: `Prospecto ${id} no encontrado` }

            return {
              ...place,
              review_rating: place.review_rating ? Number(place.review_rating) : null,
              latitude:  place.latitude  ? Number(place.latitude)  : null,
              longitude: place.longitude ? Number(place.longitude) : null,
              totals: place._count,
              activities: activities.map(a => ({ ...a, date: a.happened_at })),
              notes,
              campaigns: memberships.map(m => ({
                listId:      m.list.id,
                listName:    m.list.name,
                isCampaign:  m.list.is_campaign,
                status:      m.list.status,
                channel:     m.list.channel,
                stage:       m.stage,
                lastContacted: m.last_contacted_at,
                outcome:     m.outcome,
              })),
              camposFaltantes: [
                !place.phone && 'phone', !place.website && 'website', !place.email && 'email',
                !place.descriptions && 'descriptions', !place.city && 'city', !place.country && 'country',
                !place.lead_score && 'lead_score', !place.lead_temperature && 'lead_temperature',
              ].filter(Boolean),
            }
          } catch (err) {
            return { error: `Error al obtener prospecto: ${String(err)}` }
          }
        },
      }),

      getDashboardStats: tool({
        description: 'Diagnóstico global: totales, distribución temperatura/score, cobertura, top categorías, campañas activas. Úsalo para reportes y para identificar gaps del pipeline.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const [total, byTemperature, byScore, topCategories, withPhone, withWebsite, withEmail, ratingAgg, topCities, recentCount, unscored, campaignCount, activeCampaigns] = await Promise.all([
              prisma.place.count(),
              prisma.place.groupBy({ by: ['lead_temperature'], _count: { _all: true } }),
              prisma.place.groupBy({ by: ['lead_score'], _count: { _all: true }, orderBy: { lead_score: 'asc' } }),
              prisma.place.groupBy({ by: ['category'], _count: { _all: true }, orderBy: { _count: { category: 'desc' } }, take: 10 }),
              prisma.place.count({ where: { phone:   { not: null } } }),
              prisma.place.count({ where: { website: { not: null } } }),
              prisma.place.count({ where: { email:   { not: null } } }),
              prisma.place.aggregate({ _avg: { review_rating: true }, _count: { review_rating: true } }),
              prisma.place.groupBy({ by: ['city'], _count: { _all: true }, orderBy: { _count: { city: 'desc' } }, take: 10 }),
              prisma.place.count({ where: { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
              prisma.place.count({ where: { lead_score: null } }),
              prisma.prospectList.count({ where: { is_campaign: true } }),
              prisma.prospectList.count({ where: { is_campaign: true, status: 'active' } }),
            ])

            return {
              total, withPhone, withWebsite, withEmail,
              withoutPhone: total - withPhone, withoutWebsite: total - withWebsite, withoutEmail: total - withEmail,
              unscored, recentlyAdded: recentCount,
              avgRating: ratingAgg._avg.review_rating ? Number(ratingAgg._avg.review_rating).toFixed(1) : null,
              placesWithRating: ratingAgg._count.review_rating,
              byTemperature: byTemperature.map(t => ({ temperature: t.lead_temperature ?? 'sin clasificar', count: t._count._all })),
              byScore: byScore.map(s => ({ score: s.lead_score ?? 'sin score', count: s._count._all })),
              topCategories: topCategories.map(c => ({ category: c.category ?? 'sin categoría', count: c._count._all })),
              topCities: topCities.map(c => ({ city: c.city ?? 'sin ciudad', count: c._count._all })),
              campaigns: { total: campaignCount, active: activeCampaigns },
            }
          } catch (err) {
            return { error: `Error al obtener stats: ${String(err)}` }
          }
        },
      }),

      listCampaigns: tool({
        description: 'Lista campañas (ProspectList con is_campaign=true). Úsala para evitar duplicados, mostrar el portfolio de campañas, o elegir en cuál encajar un lead.',
        inputSchema: z.object({
          status:      z.enum(['draft', 'active', 'paused', 'done', 'archived']).optional(),
          channel:     z.enum(['whatsapp', 'email', 'phone', 'multi']).optional(),
          is_campaign: z.boolean().default(true),
          limit:       z.number().min(1).max(50).default(20),
        }),
        execute: async ({ status, channel, is_campaign, limit }) => {
          try {
            const where: Prisma.ProspectListWhereInput = { is_campaign }
            if (status)  where.status  = status
            if (channel) where.channel = channel
            const lists = await prisma.prospectList.findMany({
              where, include: { _count: { select: { items: true } } },
              orderBy: { updated_at: 'desc' }, take: limit,
            })
            return lists.map(l => ({
              id: l.id, name: l.name, description: l.description,
              is_campaign: l.is_campaign, channel: l.channel, status: l.status,
              goal: l.goal, steps: Array.isArray(l.message_template) ? l.message_template.length : 0,
              leadCount: l._count.items,
              scheduled_at: l.scheduled_at, started_at: l.started_at, ended_at: l.ended_at,
              createdAt: l.created_at, updatedAt: l.updated_at,
            }))
          } catch (err) {
            return { error: `Error al listar campañas: ${String(err)}` }
          }
        },
      }),

      getCampaignDetail: tool({
        description: 'Obtiene el detalle completo de una campaña: secuencia, leads por stage, métricas de performance (envíos, respuestas, conversión).',
        inputSchema: z.object({
          listId: z.string().optional().describe('ID de la campaña. Si el contexto tiene listId, puedes omitirlo.'),
        }),
        execute: async ({ listId }) => {
          const id = listId ?? context.listId
          if (!id) return { error: 'No hay listId en el contexto ni en la llamada' }
          try {
            const [list, stageCounts, activities] = await Promise.all([
              prisma.prospectList.findUnique({
                where: { id },
                include: { _count: { select: { items: true } } },
              }),
              prisma.prospectListItem.groupBy({
                by: ['stage'], where: { list_id: id }, _count: { _all: true },
              }),
              prisma.placeActivity.findMany({
                where: { campaign_id: id },
                orderBy: { happened_at: 'desc' },
                take: 20,
                select: { type: true, step_index: true, happened_at: true },
              }),
            ])
            if (!list) return { error: `Campaña ${id} no encontrada` }

            const sends   = activities.filter(a => a.type === 'campaign_send').length
            const replies = activities.filter(a => a.type === 'campaign_reply').length
            const bounces = activities.filter(a => a.type === 'campaign_bounce').length

            return {
              id: list.id, name: list.name, description: list.description, goal: list.goal,
              is_campaign: list.is_campaign, channel: list.channel, status: list.status,
              sequence: list.message_template,
              scheduled_at: list.scheduled_at, started_at: list.started_at, ended_at: list.ended_at,
              leadCount: list._count.items,
              stageCounts: stageCounts.map(s => ({ stage: s.stage, count: s._count._all })),
              performance: {
                sends, replies, bounces,
                replyRate: sends > 0 ? ((replies / sends) * 100).toFixed(1) + '%' : 'N/A',
              },
            }
          } catch (err) {
            return { error: `Error al obtener campaña: ${String(err)}` }
          }
        },
      }),

      listTemplates: tool({
        description: 'Lista plantillas de mensajes disponibles. Útil para reutilizar copy que rinde, o para sugerir al usuario qué aplicar a una nueva campaña.',
        inputSchema: z.object({
          channel:   z.enum(['whatsapp', 'email', 'phone']).optional(),
          framework: z.string().optional(),
          limit:     z.number().min(1).max(50).default(20),
        }),
        execute: async ({ channel, framework, limit }) => {
          try {
            const where: Prisma.MessageTemplateWhereInput = { owner_id: userId }
            if (channel)   where.channel   = channel
            if (framework) where.framework = framework
            const tpls = await prisma.messageTemplate.findMany({
              where, orderBy: { updated_at: 'desc' }, take: limit,
            })
            return tpls.map(t => ({
              id: t.id, name: t.name, channel: t.channel, subject: t.subject,
              body: t.body.slice(0, 500), framework: t.framework, tone: t.tone,
              variables: t.variables, performance: t.performance,
            }))
          } catch (err) {
            return { error: `Error al listar plantillas: ${String(err)}` }
          }
        },
      }),

      // ═══ INVESTIGACIÓN WEB ═════════════════════════════════════════════════
      searchWeb: tool({
        description: 'Búsqueda web rápida (snippets, sin contenido completo). Úsala para queries exploratorias. Para contenido completo, usa deepSearch.',
        inputSchema: z.object({
          query: z.string(),
          limit: z.number().min(1).max(10).default(5),
        }),
        execute: async ({ query, limit }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.search(query, { limit })
            const items = result.web ?? []
            return {
              query, totalResults: items.length,
              results: items.map((item) => {
                const r = item as { url?: string; title?: string; description?: string; markdown?: string; metadata?: { title?: string; description?: string } }
                return {
                  url: r.url ?? '', title: r.title ?? r.metadata?.title ?? '',
                  description: r.description ?? r.metadata?.description ?? '',
                  content: (r.markdown ?? '').slice(0, 1500),
                }
              }),
            }
          } catch (err) {
            return { error: `Error en búsqueda: ${String(err)}`, query, results: [] }
          }
        },
      }),

      deepSearch: tool({
        description: 'Búsqueda web profunda con scraping — devuelve markdown completo de cada página. Ideal para encontrar emails, tomadores de decisión, datos que requieren leer páginas.',
        inputSchema: z.object({
          query: z.string(),
          limit: z.number().min(1).max(5).default(3),
        }),
        execute: async ({ query, limit }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.search(query, {
              limit, scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
            })
            const items = result.web ?? []
            return {
              query, totalResults: items.length,
              results: items.map((item) => {
                const r = item as { url?: string; title?: string; description?: string; markdown?: string; metadata?: { title?: string; description?: string } }
                return {
                  url: r.url ?? '', title: r.title ?? r.metadata?.title ?? '',
                  description: r.description ?? r.metadata?.description ?? '',
                  content: (r.markdown ?? '').slice(0, 3000),
                }
              }),
            }
          } catch (err) {
            return { error: `Error en búsqueda profunda: ${String(err)}`, query, results: [] }
          }
        },
      }),

      scrapePage: tool({
        description: 'Extrae contenido de una URL en markdown. Úsalo para webs oficiales, páginas de contacto, "sobre nosotros", perfiles sociales.',
        inputSchema: z.object({ url: z.string().url() }),
        execute: async ({ url }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.scrape(url, { formats: ['markdown'] })
            return {
              url, title: result.metadata?.title ?? '',
              description: result.metadata?.description ?? '',
              content: (result.markdown ?? '').slice(0, 5000),
            }
          } catch (err) {
            return { error: `Error al extraer: ${String(err)}`, url }
          }
        },
      }),

      firecrawlAgent: tool({
        description: 'Agente autónomo que busca y extrae datos estructurados. Ideal para encontrar emails, tomadores de decisión, redes sociales. Más poderoso que búsquedas normales.',
        inputSchema: z.object({
          prompt: z.string(),
          urls:   z.array(z.string().url()).optional(),
        }),
        execute: async ({ prompt, urls }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.agent({
              prompt, urls: urls ?? undefined,
              model: 'spark-1-mini', maxCredits: 100,
              schema: z.object({
                emails: z.array(z.string()),
                phones: z.array(z.string()),
                website: z.string().optional(),
                socialMedia: z.array(z.object({ platform: z.string(), url: z.string() })),
                decisionMakers: z.array(z.object({
                  name: z.string(), role: z.string().optional(),
                  email: z.string().optional(), linkedin: z.string().optional(),
                })),
                description: z.string().optional(),
                priceRange: z.string().optional(),
              }),
            })
            return {
              success: result.success ?? false, status: result.status ?? 'unknown',
              data: result.data ?? null,
              creditsUsed: (result as unknown as Record<string, unknown>).creditsUsed ?? null,
            }
          } catch (err) {
            return { error: `Error en Firecrawl Agent: ${String(err)}` }
          }
        },
      }),

      // ═══ MUTACIÓN DE PROSPECTO ═════════════════════════════════════════════
      updateProspect: tool({
        description: 'Actualiza campos del prospecto con datos verificados. Envía TODOS los campos encontrados en UNA llamada.',
        inputSchema: z.object({
          placeId:      z.string().optional(),
          descriptions: z.string().optional(),
          phone:        z.string().optional(),
          website:      z.string().url().optional(),
          email:        z.string().email().optional(),
          price_range:  z.string().optional(),
          timezone:     z.string().optional(),
          city:         z.string().optional(),
          country:      z.string().optional(),
          status:       z.string().optional(),
        }),
        execute: async ({ placeId, ...data }) => {
          const id = placeId ?? context.placeId
          if (!id) return { success: false, error: 'Falta placeId' }
          try {
            const updateData: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(data)) if (v !== undefined && v !== '') updateData[k] = v
            if (!Object.keys(updateData).length) return { success: false, message: 'Nada que actualizar' }
            await prisma.place.update({ where: { id }, data: updateData })
            return { success: true, placeId: id, updated: Object.keys(updateData) }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      setPriority: tool({
        description: 'Califica un lead con score (1-5) y temperatura (cold/warm/hot). Justifica con datos.',
        inputSchema: z.object({
          placeId:          z.string().optional(),
          lead_score:       z.number().min(1).max(5),
          lead_temperature: z.enum(['cold', 'warm', 'hot']),
        }),
        execute: async ({ placeId, lead_score, lead_temperature }) => {
          const id = placeId ?? context.placeId
          if (!id) return { success: false, error: 'Falta placeId' }
          try {
            await prisma.place.update({ where: { id }, data: { lead_score, lead_temperature } })
            return { success: true, placeId: id, lead_score, lead_temperature }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      addNote: tool({
        description: 'Crea nota estratégica en un prospecto. Para CONTEXTO (tomadores decisión, insights, borradores copy), NO para repetir datos ya en campos.',
        inputSchema: z.object({
          placeId: z.string().optional(),
          content: z.string().min(20),
        }),
        execute: async ({ placeId, content }) => {
          const id = placeId ?? context.placeId
          if (!id) return { success: false, error: 'Falta placeId' }
          try {
            const note = await prisma.placeNote.create({
              data: { place_id: id, user_id: userId, username: byline, content },
            })
            return { success: true, noteId: note.id, placeId: id }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      addActivity: tool({
        description: 'Registra una actividad en el historial del prospecto. Usa type apropiado: ai_action | template_generated | sequence_step | campaign_send | campaign_reply | campaign_bounce | contacted | call | email | whatsapp.',
        inputSchema: z.object({
          placeId:     z.string().optional(),
          type:        z.enum(['ai_action', 'template_generated', 'sequence_step', 'campaign_send', 'campaign_reply', 'campaign_bounce', 'contacted', 'call', 'email', 'whatsapp', 'meeting']),
          content:     z.string().min(10),
          campaign_id: z.string().optional(),
          step_index:  z.number().optional(),
        }),
        execute: async ({ placeId, type, content, campaign_id, step_index }) => {
          const id = placeId ?? context.placeId
          if (!id) return { success: false, error: 'Falta placeId' }
          try {
            await prisma.placeActivity.create({
              data: {
                place_id: id, user_id: userId, username: byline,
                type, content, happened_at: new Date(),
                campaign_id: campaign_id ?? context.listId ?? null,
                step_index: step_index ?? null,
              },
            })
            return { success: true }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      toggleFavorite: tool({
        description: 'Marca/desmarca favorito para el usuario actual.',
        inputSchema: z.object({ placeId: z.string().optional() }),
        execute: async ({ placeId }) => {
          const id = placeId ?? context.placeId
          if (!id) return { success: false, error: 'Falta placeId' }
          try {
            const existing = await prisma.placeFavorite.findUnique({
              where: { place_id_user_id: { place_id: id, user_id: userId } },
            })
            if (existing) {
              await prisma.placeFavorite.delete({ where: { id: existing.id } })
              return { success: true, action: 'removed' }
            }
            await prisma.placeFavorite.create({ data: { place_id: id, user_id: userId } })
            return { success: true, action: 'added' }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      // ═══ CAMPAÑAS ═══════════════════════════════════════════════════════════
      createCampaign: tool({
        description: 'Crea una campaña nueva. Una campaña es una ProspectList con is_campaign=true. Devuelve el listId para usar en setCampaignSequence y bulkAddToCampaign.',
        inputSchema: z.object({
          name:         z.string().min(1).describe('Nombre accionable. Ej: "Cold WhatsApp — Restaurantes premium Lima Q2"'),
          description:  z.string().optional().describe('Breve descripción pública de la campaña'),
          channel:      z.enum(['whatsapp', 'email', 'phone', 'multi']),
          goal:         z.string().min(10).describe('Meta concreta: métrica + segmento + razonamiento'),
          status:       z.enum(['draft', 'active', 'paused']).default('draft'),
          scheduled_at: z.string().datetime().optional(),
        }),
        execute: async ({ name, description, channel, goal, status, scheduled_at }) => {
          try {
            const list = await prisma.prospectList.create({
              data: {
                name, description: description ?? null,
                is_campaign: true, channel, goal, status,
                scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
                created_by: userId,
              },
            })
            return { success: true, listId: list.id, name: list.name }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      updateCampaign: tool({
        description: 'Actualiza campos de una campaña existente (nombre, descripción, canal, goal, status, scheduled_at).',
        inputSchema: z.object({
          listId:       z.string().optional(),
          name:         z.string().optional(),
          description:  z.string().optional(),
          channel:      z.enum(['whatsapp', 'email', 'phone', 'multi']).optional(),
          goal:         z.string().optional(),
          status:       z.enum(['draft', 'active', 'paused', 'done', 'archived']).optional(),
          scheduled_at: z.string().datetime().optional(),
        }),
        execute: async ({ listId, scheduled_at, ...rest }) => {
          const id = listId ?? context.listId
          if (!id) return { success: false, error: 'Falta listId' }
          try {
            const data: Prisma.ProspectListUpdateInput = { ...rest }
            if (scheduled_at) data.scheduled_at = new Date(scheduled_at)
            if (rest.status === 'active'   && !('started_at' in data)) data.started_at = new Date()
            if (rest.status === 'done'     && !('ended_at' in data))   data.ended_at   = new Date()
            await prisma.prospectList.update({ where: { id }, data })
            return { success: true, listId: id }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      setCampaignSequence: tool({
        description: 'Define o reemplaza la secuencia de pasos (message_template) de una campaña. Cada paso con framework, canal, delay_days, cuerpo con variables merge {{title}}, {{city}}, etc.',
        inputSchema: z.object({
          listId: z.string().optional(),
          steps:  z.array(z.object({
            step:       z.number().min(1),
            delay_days: z.number().min(0),
            channel:    z.enum(['whatsapp', 'email', 'phone']),
            framework:  z.string().optional(),
            subject:    z.string().optional(),
            body:       z.string().min(10),
            cta:        z.string().optional(),
          })).min(1).max(10),
        }),
        execute: async ({ listId, steps }) => {
          const id = listId ?? context.listId
          if (!id) return { success: false, error: 'Falta listId' }
          try {
            await prisma.prospectList.update({
              where: { id },
              data: { message_template: steps as unknown as Prisma.InputJsonValue },
            })
            return { success: true, listId: id, stepCount: steps.length }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      bulkAddToCampaign: tool({
        description: 'Añade prospectos a una campaña. Evita duplicados automáticamente. Stage inicial "queued".',
        inputSchema: z.object({
          listId:   z.string().optional(),
          placeIds: z.array(z.string()).min(1).max(500),
          reason:   z.string().optional(),
        }),
        execute: async ({ listId, placeIds, reason }) => {
          const id = listId ?? context.listId
          if (!id) return { success: false, error: 'Falta listId' }
          try {
            const existing = await prisma.prospectListItem.findMany({
              where: { list_id: id, place_id: { in: placeIds } },
              select: { place_id: true },
            })
            const existingIds = new Set(existing.map(e => e.place_id))
            const newOnes = placeIds.filter(p => !existingIds.has(p))

            if (newOnes.length === 0) {
              return { success: true, added: 0, skipped: placeIds.length, message: 'Todos ya estaban en la campaña' }
            }

            const result = await prisma.prospectListItem.createMany({
              data: newOnes.map((place_id, i) => ({
                list_id: id, place_id,
                rank: existing.length + i + 1,
                reason: reason ?? null,
                stage: 'queued',
              })),
            })
            return { success: true, added: result.count, skipped: placeIds.length - result.count }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      transitionStage: tool({
        description: 'Mueve un prospecto a otro stage del pipeline de una campaña (queued → contacted → replied → interested → won/lost). Registra actividad automáticamente.',
        inputSchema: z.object({
          listId:  z.string().optional(),
          placeId: z.string(),
          stage:   z.enum(['queued', 'contacted', 'replied', 'interested', 'won', 'lost']),
          outcome: z.enum(['positive', 'negative', 'no_reply']).optional(),
          note:    z.string().optional(),
        }),
        execute: async ({ listId, placeId, stage, outcome, note }) => {
          const id = listId ?? context.listId
          if (!id) return { success: false, error: 'Falta listId' }
          try {
            const data: Prisma.ProspectListItemUpdateInput = { stage }
            if (outcome) data.outcome = outcome
            if (stage === 'contacted') data.last_contacted_at = new Date()
            if (stage === 'replied')   data.reply_at          = new Date()

            await prisma.prospectListItem.update({
              where: { list_id_place_id: { list_id: id, place_id: placeId } },
              data,
            })

            const activityType =
              stage === 'contacted'  ? 'campaign_send' :
              stage === 'replied'    ? 'campaign_reply' :
              stage === 'lost'       ? 'campaign_bounce' : 'ai_action'

            await prisma.placeActivity.create({
              data: {
                place_id: placeId, user_id: userId, username: byline,
                type: activityType,
                content: note ?? `Stage: ${stage}${outcome ? ` (${outcome})` : ''}`,
                happened_at: new Date(),
                campaign_id: id,
              },
            })

            return { success: true, placeId, stage }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      bulkTransitionStage: tool({
        description: 'Mueve múltiples prospectos al mismo stage en una campaña. Útil para marcar batches como contactados tras un envío masivo.',
        inputSchema: z.object({
          listId:   z.string().optional(),
          placeIds: z.array(z.string()).min(1).max(200),
          stage:    z.enum(['queued', 'contacted', 'replied', 'interested', 'won', 'lost']),
        }),
        execute: async ({ listId, placeIds, stage }) => {
          const id = listId ?? context.listId
          if (!id) return { success: false, error: 'Falta listId' }
          try {
            const data: Prisma.ProspectListItemUpdateManyMutationInput = { stage }
            if (stage === 'contacted') data.last_contacted_at = new Date()
            if (stage === 'replied')   data.reply_at          = new Date()

            const result = await prisma.prospectListItem.updateMany({
              where: { list_id: id, place_id: { in: placeIds } },
              data,
            })
            return { success: true, updated: result.count }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      analyzeCampaignPerformance: tool({
        description: 'Analiza performance de una campaña: envíos, respuestas, conversión por stage, tiempo medio a primera respuesta, distribución por canal/ciudad.',
        inputSchema: z.object({ listId: z.string().optional() }),
        execute: async ({ listId }) => {
          const id = listId ?? context.listId
          if (!id) return { error: 'Falta listId' }
          try {
            const [list, stages, activities] = await Promise.all([
              prisma.prospectList.findUnique({ where: { id } }),
              prisma.prospectListItem.groupBy({
                by: ['stage'], where: { list_id: id }, _count: { _all: true },
              }),
              prisma.placeActivity.findMany({
                where: { campaign_id: id },
                select: { type: true, step_index: true, happened_at: true, place_id: true },
                orderBy: { happened_at: 'asc' },
              }),
            ])
            if (!list) return { error: 'Campaña no encontrada' }

            const sends   = activities.filter(a => a.type === 'campaign_send')
            const replies = activities.filter(a => a.type === 'campaign_reply')
            const bounces = activities.filter(a => a.type === 'campaign_bounce')

            const firstSendByPlace = new Map<string, Date>()
            for (const s of sends) {
              if (!firstSendByPlace.has(s.place_id)) firstSendByPlace.set(s.place_id, s.happened_at)
            }
            const replyLatencies: number[] = []
            for (const r of replies) {
              const firstSend = firstSendByPlace.get(r.place_id)
              if (firstSend) replyLatencies.push((r.happened_at.getTime() - firstSend.getTime()) / (1000 * 60 * 60))
            }
            const avgHoursToReply = replyLatencies.length
              ? (replyLatencies.reduce((a, b) => a + b, 0) / replyLatencies.length).toFixed(1)
              : null

            return {
              campaign: { id: list.id, name: list.name, channel: list.channel, status: list.status },
              pipeline: stages.map(s => ({ stage: s.stage, count: s._count._all })),
              performance: {
                sends: sends.length, replies: replies.length, bounces: bounces.length,
                replyRate: sends.length ? ((replies.length / sends.length) * 100).toFixed(1) + '%' : 'N/A',
                bounceRate: sends.length ? ((bounces.length / sends.length) * 100).toFixed(1) + '%' : 'N/A',
                avgHoursToReply,
              },
            }
          } catch (err) {
            return { error: `Error: ${String(err)}` }
          }
        },
      }),

      // ═══ PLANTILLAS ════════════════════════════════════════════════════════
      saveTemplate: tool({
        description: 'Guarda una plantilla de mensaje reutilizable. Marca variables merge como {{title}}, {{city}}, {{category}}, {{rating}}.',
        inputSchema: z.object({
          name:      z.string().min(1),
          channel:   z.enum(['whatsapp', 'email', 'phone']),
          subject:   z.string().optional(),
          body:      z.string().min(10),
          framework: z.string().optional(),
          tone:      z.string().optional(),
          variables: z.array(z.string()).optional(),
        }),
        execute: async ({ name, channel, subject, body, framework, tone, variables }) => {
          try {
            const tpl = await prisma.messageTemplate.create({
              data: {
                name, channel, subject: subject ?? null, body,
                framework: framework ?? null, tone: tone ?? null,
                variables: (variables ?? []) as unknown as Prisma.InputJsonValue,
                owner_id: userId,
              },
            })
            return { success: true, templateId: tpl.id, name: tpl.name }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      applyTemplateToCampaign: tool({
        description: 'Aplica una plantilla como paso de la secuencia de una campaña. Si la campaña ya tiene secuencia, añade al final.',
        inputSchema: z.object({
          templateId: z.string(),
          listId:     z.string().optional(),
          delay_days: z.number().min(0).default(0),
        }),
        execute: async ({ templateId, listId, delay_days }) => {
          const id = listId ?? context.listId
          if (!id) return { success: false, error: 'Falta listId' }
          try {
            const [tpl, list] = await Promise.all([
              prisma.messageTemplate.findUnique({ where: { id: templateId } }),
              prisma.prospectList.findUnique({ where: { id } }),
            ])
            if (!tpl)  return { success: false, error: 'Plantilla no encontrada' }
            if (!list) return { success: false, error: 'Campaña no encontrada' }

            const current = Array.isArray(list.message_template) ? [...(list.message_template as unknown[])] : []
            const nextStep = {
              step: current.length + 1, delay_days, channel: tpl.channel,
              framework: tpl.framework, subject: tpl.subject, body: tpl.body,
            }
            current.push(nextStep)

            await prisma.prospectList.update({
              where: { id },
              data: { message_template: current as unknown as Prisma.InputJsonValue },
            })
            return { success: true, listId: id, stepCount: current.length }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      // ═══ BULK ═══════════════════════════════════════════════════════════════
      bulkSetPriority: tool({
        description: 'Actualiza score/temperatura en lote. Confirma con usuario si >10.',
        inputSchema: z.object({
          placeIds:         z.array(z.string()).min(1).max(200),
          lead_score:       z.number().min(1).max(5).optional(),
          lead_temperature: z.enum(['cold', 'warm', 'hot']).optional(),
        }),
        execute: async ({ placeIds, lead_score, lead_temperature }) => {
          try {
            const data: Prisma.PlaceUpdateManyMutationInput = {}
            if (lead_score       !== undefined) data.lead_score       = lead_score
            if (lead_temperature !== undefined) data.lead_temperature = lead_temperature
            if (!Object.keys(data).length) return { success: false, message: 'Sin cambios' }
            const result = await prisma.place.updateMany({ where: { id: { in: placeIds } }, data })
            return { success: true, updated: result.count }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      bulkAddNote: tool({
        description: 'Añade la misma nota a múltiples prospectos.',
        inputSchema: z.object({
          placeIds: z.array(z.string()).min(1).max(100),
          content:  z.string().min(10),
        }),
        execute: async ({ placeIds, content }) => {
          try {
            const notes = await prisma.placeNote.createMany({
              data: placeIds.map(place_id => ({ place_id, user_id: userId, username: byline, content })),
            })
            return { success: true, created: notes.count }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      // ═══ CRM externo (Bruno Lab / WhatsApp IA) ═════════════════════════════
      sendToCRM: tool({
        description: 'Envía un prospecto al CRM externo (Bruno Lab) para contacto vía WhatsApp IA. Requiere teléfono + score 4+ + investigación documentada.',
        inputSchema: z.object({
          placeId: z.string().optional(),
          reason:  z.string().min(10),
        }),
        execute: async ({ placeId, reason }) => {
          const id = placeId ?? context.placeId
          if (!id) return { success: false, error: 'Falta placeId' }
          try {
            const place = await prisma.place.findUnique({
              where: { id },
              include: { notes: { orderBy: { created_at: 'desc' }, take: 3 } },
            })
            if (!place)        return { success: false, error: 'Prospecto no encontrado' }
            if (!place.phone)  return { success: false, error: 'Prospecto sin teléfono' }

            const result = await sendPlaceToCRM(
              { ...place, review_rating: place.review_rating ? Number(place.review_rating) : null },
              reason,
            )
            if (result.status === 'error') return { success: false, error: result.error }

            await prisma.placeActivity.create({
              data: {
                place_id: id, user_id: userId, username: byline,
                type: 'crm_export',
                content: result.status === 'created'
                  ? 'Enviado al CRM de Bruno Lab por Closer'
                  : 'Contacto actualizado en CRM de Bruno Lab por Closer',
                happened_at: new Date(),
                campaign_id: context.listId ?? null,
              },
            })

            return { success: true, status: result.status, contactId: result.contactId }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),

      bulkSendToCRM: tool({
        description: 'Envía múltiples prospectos al CRM externo (Bruno Lab). Solo los que tengan teléfono. Confirma con usuario si >10.',
        inputSchema: z.object({
          placeIds: z.array(z.string()).min(1).max(50),
          reason:   z.string().min(10),
        }),
        execute: async ({ placeIds, reason }) => {
          try {
            const places = await prisma.place.findMany({
              where: { id: { in: placeIds } },
              include: { notes: { orderBy: { created_at: 'desc' }, take: 3 } },
            })
            const withPhone = places.filter(p => p.phone)
            let sent = 0, updated = 0, failed = 0

            for (const place of withPhone) {
              const r = await sendPlaceToCRM(
                { ...place, review_rating: place.review_rating ? Number(place.review_rating) : null },
                reason,
              )
              if      (r.status === 'created') sent++
              else if (r.status === 'updated') updated++
              else                             failed++
            }

            if (sent + updated > 0) {
              await prisma.placeActivity.createMany({
                data: withPhone.slice(0, sent + updated).map(p => ({
                  place_id: p.id, user_id: userId, username: byline,
                  type: 'crm_export',
                  content: 'Exportado al CRM de Bruno Lab por Closer (bulk)',
                  happened_at: new Date(),
                  campaign_id: context.listId ?? null,
                })),
              })
            }
            return { success: true, sent, updated, failed, skipped: places.length - withPhone.length, total: places.length }
          } catch (err) {
            return { success: false, error: `Error: ${String(err)}` }
          }
        },
      }),
    },
  })
}
