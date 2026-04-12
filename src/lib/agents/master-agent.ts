import { ToolLoopAgent, tool, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Firecrawl from '@mendable/firecrawl-js'
import { z } from 'zod'

function getFirecrawl() {
  return new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY ?? '' })
}

interface CompanyProfile {
  name:         string
  industry?:    string | null
  description?: string | null
  website?:     string | null
  ai_context:   string
}

interface CreateMasterAgentOptions {
  userId:      number
  username:    string
  company?:    CompanyProfile | null
  currentPath: string
}

function buildCompanySection(company?: CompanyProfile | null): string {
  if (!company) return ''
  const lines = ['## Empresa (usa este perfil para contextualizar todo tu trabajo)']
  lines.push(`- **Nombre:** ${company.name}`)
  if (company.industry)    lines.push(`- **Industria / Nicho:** ${company.industry}`)
  if (company.website)     lines.push(`- **Sitio web:** ${company.website}`)
  if (company.description) lines.push(`- **Descripción:** ${company.description}`)
  if (company.ai_context)  lines.push(`\n### Instrucciones y criterios\n${company.ai_context}`)
  return '\n\n' + lines.join('\n')
}

export function createMasterAgent({ userId, username, company, currentPath }: CreateMasterAgentOptions) {
  const companySection = buildCompanySection(company)

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    stopWhen: stepCountIs(20),
    instructions: `Eres el Agente Maestro del Scraper Dashboard. Puedes controlar todo el sistema: buscar y filtrar lugares, investigar en internet, actualizar información, calificar leads, hacer operaciones masivas y crear listas de prospectos.

## Contexto actual
- Página activa: ${currentPath}
- Usuario: ${username}${companySection}

## Capacidades disponibles

**Consulta:** searchPlaces, getPlaceDetail, getDashboardStats
**Investigación web:** searchWeb, scrapePage
**Escritura individual:** updatePlace, setPriority, addNote
**Operaciones masivas:** bulkSetPriority
**Prospectos:** saveProspectList, getProspectLists

## Proceso de trabajo

**Para consultas rápidas:**
→ searchPlaces o getDashboardStats según lo que se pida

**Para investigar y enriquecer UN lugar:**
1. getPlaceDetail → conocer el estado actual
2. searchWeb x2 → queries distintos (nombre+ciudad+teléfono, nombre+ciudad+web)
3. scrapePage → si hay web oficial, extraer contenido completo
4. updatePlace → actualizar con datos verificados
5. setPriority → calificar según criterios de la empresa
6. addNote → documentar hallazgos, fuentes y razonamiento

**Para operaciones masivas:**
1. searchPlaces → obtener IDs con filtros específicos
2. Confirmar con el usuario si son más de 10 lugares
3. bulkSetPriority → aplicar cambios

**Para crear listas de prospectos:**
1. searchPlaces → obtener candidatos con filtros
2. saveProspectList → guardar los mejores 50 con razones

## Reglas importantes
- Siempre haz mínimo 2 búsquedas web distintas al investigar un lugar
- Solo actualiza campos con información verificada de fuentes confiables
- Para operaciones masivas de más de 10 lugares: confirma con el usuario antes de ejecutar
- Termina siempre las investigaciones con una nota que documente los hallazgos
- Si la página activa es /places/[id], el ID del lugar está en la ruta y puedes usarlo directamente

Responde siempre en español. Sé conciso en el texto pero exhaustivo en las acciones.`,

    tools: {
      // ── CONSULTA ─────────────────────────────────────────────────────────────
      searchPlaces: tool({
        description: 'Busca y filtra lugares en la base de datos. Devuelve id, título, categoría, ciudad, score, temperatura, teléfono, web y rating. Úsalo para encontrar lugares antes de investigarlos, calificarlos o crear listas.',
        inputSchema: z.object({
          search:      z.string().optional().describe('Búsqueda libre: título, dirección, categoría, teléfono'),
          category:    z.string().optional().describe('Categoría del negocio (búsqueda parcial, case-insensitive)'),
          city:        z.string().optional().describe('Ciudad exacta (case-insensitive)'),
          country:     z.string().optional().describe('País exacto (case-insensitive)'),
          temperature: z.enum(['hot', 'warm', 'cold']).optional().describe('Temperatura del lead'),
          minScore:    z.number().min(1).max(5).optional().describe('Lead score mínimo (1-5)'),
          hasPhone:    z.boolean().optional().describe('Solo lugares con teléfono'),
          hasWebsite:  z.boolean().optional().describe('Solo lugares con sitio web'),
          batchTag:    z.string().optional().describe('Filtrar por lote de importación'),
          limit:       z.number().min(1).max(100).default(20).describe('Número de resultados a devolver'),
          page:        z.number().min(1).default(1).describe('Página de resultados'),
          sortBy:      z.enum(['score', 'rating', 'reviews', 'recent']).default('score').describe('Ordenar por: score=lead_score, rating=review_rating, reviews=review_count, recent=created_at'),
        }),
        execute: async ({ search, category, city, country, temperature, minScore, hasPhone, hasWebsite, batchTag, limit, page, sortBy }) => {
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
            if (category)    where.category        = { contains: category, mode: 'insensitive' }
            if (city)        where.city             = { equals: city, mode: 'insensitive' }
            if (country)     where.country          = { equals: country, mode: 'insensitive' }
            if (temperature) where.lead_temperature = temperature
            if (minScore !== undefined) where.lead_score = { gte: minScore }
            if (hasPhone)    where.phone   = { not: null }
            if (hasWebsite)  where.website = { not: null }
            if (batchTag)    where.batch_tag = batchTag

            const orderBy: Prisma.PlaceOrderByWithRelationInput[] =
              sortBy === 'rating'  ? [{ review_rating: 'desc' }, { lead_score: 'desc' }] :
              sortBy === 'reviews' ? [{ review_count:  'desc' }, { lead_score: 'desc' }] :
              sortBy === 'recent'  ? [{ created_at:    'desc' }] :
                                     [{ lead_score: 'desc' }, { review_rating: 'desc' }]

            const [total, places] = await Promise.all([
              prisma.place.count({ where }),
              prisma.place.findMany({
                where,
                orderBy,
                take:   limit,
                skip:   (page - 1) * limit,
                select: {
                  id:               true,
                  title:            true,
                  category:         true,
                  address:          true,
                  city:             true,
                  country:          true,
                  phone:            true,
                  website:          true,
                  review_rating:    true,
                  review_count:     true,
                  lead_score:       true,
                  lead_temperature: true,
                  batch_tag:        true,
                  status:           true,
                },
              }),
            ])

            return {
              total,
              pages: Math.ceil(total / limit),
              page,
              showing: places.length,
              places: places.map(p => ({
                id:               p.id,
                title:            p.title,
                category:         p.category,
                address:          p.address,
                city:             p.city,
                country:          p.country,
                phone:            p.phone ?? null,
                website:          p.website ?? null,
                rating:           p.review_rating ? Number(p.review_rating) : null,
                reviews:          p.review_count,
                lead_score:       p.lead_score,
                lead_temperature: p.lead_temperature,
                batch_tag:        p.batch_tag,
                status:           p.status,
              })),
            }
          } catch (err) {
            return { error: `Error al buscar lugares: ${String(err)}` }
          }
        },
      }),

      getPlaceDetail: tool({
        description: 'Obtiene la información completa de un lugar específico por ID: datos de contacto, horarios, descripción, calificación CRM y las últimas 5 notas. Úsalo antes de actualizar o investigar.',
        inputSchema: z.object({
          placeId: z.string().describe('ID del lugar en la base de datos'),
        }),
        execute: async ({ placeId }) => {
          try {
            const place = await prisma.place.findUnique({
              where:   { id: placeId },
              include: {
                notes: {
                  orderBy: { created_at: 'desc' },
                  take:    5,
                  select:  { content: true, username: true, created_at: true },
                },
              },
            })
            if (!place) return { error: `Lugar con ID ${placeId} no encontrado` }
            return place
          } catch (err) {
            return { error: `Error al obtener lugar: ${String(err)}` }
          }
        },
      }),

      getDashboardStats: tool({
        description: 'Obtiene estadísticas globales del sistema: total de lugares, distribución por temperatura y score, top categorías, cuántos tienen teléfono y web. Úsalo para responder preguntas sobre el estado general del dataset.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const [total, byTemperature, byScore, topCategories, withPhone, withWebsite, ratingAgg] = await Promise.all([
              prisma.place.count(),
              prisma.place.groupBy({ by: ['lead_temperature'], _count: { _all: true } }),
              prisma.place.groupBy({ by: ['lead_score'], _count: { _all: true }, orderBy: { lead_score: 'asc' } }),
              prisma.place.groupBy({
                by:      ['category'],
                _count:  { _all: true },
                orderBy: { _count: { category: 'desc' } },
                take:    10,
              }),
              prisma.place.count({ where: { phone:   { not: null } } }),
              prisma.place.count({ where: { website: { not: null } } }),
              prisma.place.aggregate({ _avg: { review_rating: true }, _count: { review_rating: true } }),
            ])

            return {
              total,
              withPhone,
              withWebsite,
              avgRating:    ratingAgg._avg.review_rating ? Number(ratingAgg._avg.review_rating).toFixed(1) : null,
              placesWithRating: ratingAgg._count.review_rating,
              byTemperature: byTemperature.map(t => ({
                temperature: t.lead_temperature ?? 'sin clasificar',
                count:       t._count._all,
              })),
              byScore: byScore.map(s => ({
                score: s.lead_score ?? 'sin score',
                count: s._count._all,
              })),
              topCategories: topCategories.map(c => ({
                category: c.category ?? 'sin categoría',
                count:    c._count._all,
              })),
            }
          } catch (err) {
            return { error: `Error al obtener estadísticas: ${String(err)}` }
          }
        },
      }),

      // ── WEB ──────────────────────────────────────────────────────────────────
      searchWeb: tool({
        description: 'Busca información en internet sobre un lugar o tema usando Firecrawl. Devuelve URLs, títulos y resumen del contenido. Haz múltiples búsquedas con queries distintos para cubrir teléfono, web oficial y horarios.',
        inputSchema: z.object({
          query: z.string().describe('Query específico. Ej: "Restaurante El Señorío Lima Miraflores teléfono reservas"'),
          limit: z.number().min(1).max(10).default(5).describe('Número máximo de resultados'),
        }),
        execute: async ({ query, limit }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.search(query, { limit })
            const items = result.web ?? []
            return {
              query,
              totalResults: items.length,
              results: items.map((item) => {
                const r = item as {
                  url?: string
                  title?: string
                  description?: string
                  markdown?: string
                  metadata?: { title?: string; description?: string }
                }
                return {
                  url:         r.url ?? '',
                  title:       r.title ?? r.metadata?.title ?? '',
                  description: r.description ?? r.metadata?.description ?? '',
                  content:     (r.markdown ?? '').slice(0, 1200),
                }
              }),
            }
          } catch (err) {
            return { error: `Error en búsqueda web: ${String(err)}`, query, results: [] }
          }
        },
      }),

      scrapePage: tool({
        description: 'Extrae el contenido completo de una URL: web oficial, Google Maps, TripAdvisor, redes sociales. Úsala cuando encuentres una URL concreta en la búsqueda web que pueda tener teléfono, horarios o descripción del negocio.',
        inputSchema: z.object({
          url: z.string().url().describe('URL completa de la página a extraer'),
        }),
        execute: async ({ url }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.scrape(url, { formats: ['markdown'] })
            return {
              url,
              title:       result.metadata?.title ?? '',
              description: result.metadata?.description ?? '',
              content:     (result.markdown ?? '').slice(0, 4000),
            }
          } catch (err) {
            return { error: `Error al extraer página: ${String(err)}`, url }
          }
        },
      }),

      // ── ESCRITURA INDIVIDUAL ──────────────────────────────────────────────────
      updatePlace: tool({
        description: 'Actualiza campos de UN lugar específico con información verificada. Solo envía los campos que hayas confirmado con fuentes confiables.',
        inputSchema: z.object({
          placeId:      z.string().describe('ID del lugar a actualizar'),
          descriptions: z.string().optional().describe('Descripción del negocio'),
          phone:        z.string().optional().describe('Teléfono con código de país si es posible'),
          website:      z.string().url().optional().describe('URL del sitio web oficial'),
          price_range:  z.string().optional().describe('Rango de precios: $, $$, $$$ o $$$$'),
          timezone:     z.string().optional().describe('Zona horaria IANA, ej: America/Lima'),
          status:       z.string().optional().describe('Estado del negocio'),
        }),
        execute: async ({ placeId, ...data }) => {
          try {
            const cleaned = Object.fromEntries(
              Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
            )
            if (Object.keys(cleaned).length === 0) {
              return { success: false, message: 'No hay campos para actualizar' }
            }
            await prisma.place.update({ where: { id: placeId }, data: cleaned })
            return { success: true, placeId, updated: Object.keys(cleaned) }
          } catch (err) {
            return { success: false, error: `Error al actualizar lugar: ${String(err)}` }
          }
        },
      }),

      setPriority: tool({
        description: 'Establece la calificación de UN lugar: score (1-5) y temperatura (cold/warm/hot). Úsalo después de investigar y evaluar el potencial del negocio.',
        inputSchema: z.object({
          placeId:          z.string().describe('ID del lugar'),
          lead_score:       z.number().min(1).max(5).describe('1=no califica, 2=baja, 3=interesante, 4=buena oportunidad, 5=top'),
          lead_temperature: z.enum(['cold', 'warm', 'hot']).describe('cold=sin potencial inmediato, warm=seguimiento moderado, hot=contactar urgente'),
        }),
        execute: async ({ placeId, lead_score, lead_temperature }) => {
          try {
            await prisma.place.update({
              where: { id: placeId },
              data:  { lead_score, lead_temperature },
            })
            return { success: true, placeId, lead_score, lead_temperature }
          } catch (err) {
            return { success: false, error: `Error al establecer prioridad: ${String(err)}` }
          }
        },
      }),

      addNote: tool({
        description: 'Añade una nota a un lugar, visible para todos los usuarios. Úsala para documentar investigaciones, hallazgos, fuentes consultadas y el razonamiento de la calificación asignada.',
        inputSchema: z.object({
          placeId: z.string().describe('ID del lugar'),
          content: z.string().min(20).describe('Nota detallada: hallazgos, fuentes, datos encontrados, razonamiento de la prioridad'),
        }),
        execute: async ({ placeId, content }) => {
          try {
            const note = await prisma.placeNote.create({
              data: {
                place_id: placeId,
                user_id:  userId,
                username,
                content,
              },
            })
            return { success: true, noteId: note.id, placeId }
          } catch (err) {
            return { success: false, error: `Error al crear nota: ${String(err)}` }
          }
        },
      }),

      // ── MASIVO ───────────────────────────────────────────────────────────────
      bulkSetPriority: tool({
        description: 'Actualiza el lead_score y/o lead_temperature de MÚLTIPLES lugares a la vez. Confirma con el usuario antes de ejecutar si son más de 10 lugares. Úsalo después de hacer searchPlaces para obtener los IDs.',
        inputSchema: z.object({
          placeIds:         z.array(z.string()).min(1).max(200).describe('Lista de IDs de los lugares a actualizar'),
          lead_score:       z.number().min(1).max(5).optional().describe('Nuevo lead score para todos los lugares'),
          lead_temperature: z.enum(['cold', 'warm', 'hot']).optional().describe('Nueva temperatura para todos los lugares'),
        }),
        execute: async ({ placeIds, lead_score, lead_temperature }) => {
          try {
            const data: Prisma.PlaceUpdateManyMutationInput = {}
            if (lead_score !== undefined)       data.lead_score       = lead_score
            if (lead_temperature !== undefined) data.lead_temperature = lead_temperature

            if (Object.keys(data).length === 0) {
              return { success: false, message: 'Debes especificar al menos lead_score o lead_temperature' }
            }

            const result = await prisma.place.updateMany({
              where: { id: { in: placeIds } },
              data,
            })
            return { success: true, updated: result.count, placeIds: placeIds.length }
          } catch (err) {
            return { success: false, error: `Error en actualización masiva: ${String(err)}` }
          }
        },
      }),

      // ── PROSPECTOS ────────────────────────────────────────────────────────────
      saveProspectList: tool({
        description: 'Guarda una lista de prospectos seleccionados. Máximo 50 lugares por lista, cada uno con una razón específica. El nombre debe ser descriptivo.',
        inputSchema: z.object({
          name:        z.string().min(1).describe('Nombre descriptivo, ej: "Top 50 Restaurantes Lima - Hot Leads"'),
          description: z.string().optional().describe('Descripción de los criterios de selección usados'),
          prospects:   z.array(z.object({
            placeId: z.string().describe('ID del lugar'),
            rank:    z.number().optional().describe('Posición en el ranking'),
            reason:  z.string().min(10).describe('Razón específica de por qué es un buen prospecto'),
          })).max(50).describe('Lista de prospectos (máximo 50)'),
        }),
        execute: async ({ name, description, prospects }) => {
          try {
            const list = await prisma.prospectList.create({
              data: {
                name,
                description: description ?? null,
                created_by:  userId,
                items: {
                  create: prospects.map((p, i) => ({
                    place_id: p.placeId,
                    rank:     p.rank ?? i + 1,
                    reason:   p.reason ?? null,
                  })),
                },
              },
              include: { _count: { select: { items: true } } },
            })
            return {
              success:  true,
              listId:   list.id,
              listName: list.name,
              count:    list._count.items,
            }
          } catch (err) {
            return { success: false, error: `Error al guardar lista: ${String(err)}` }
          }
        },
      }),

      getProspectLists: tool({
        description: 'Obtiene las listas de prospectos creadas anteriormente (últimas 10). Úsala para evitar duplicados o para referenciar trabajo previo.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const lists = await prisma.prospectList.findMany({
              include:  { _count: { select: { items: true } } },
              orderBy:  { created_at: 'desc' },
              take:     10,
            })
            return lists.map(l => ({
              id:          l.id,
              name:        l.name,
              description: l.description,
              count:       l._count.items,
              createdAt:   l.created_at,
            }))
          } catch (err) {
            return { error: `Error al obtener listas: ${String(err)}` }
          }
        },
      }),
    },
  })
}
