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
  const lines = ['\n## Tu empresa (usa este perfil para TODAS tus decisiones)']
  lines.push(`- **Nombre:** ${company.name}`)
  if (company.industry)    lines.push(`- **Industria / Nicho:** ${company.industry}`)
  if (company.website)     lines.push(`- **Sitio web:** ${company.website}`)
  if (company.description) lines.push(`- **Descripcion:** ${company.description}`)
  if (company.ai_context)  lines.push(`\n### Instrucciones y criterios del cliente\n${company.ai_context}`)
  return lines.join('\n')
}

export function createMasterAgent({ userId, username, company, currentPath }: CreateMasterAgentOptions) {
  const companySection = buildCompanySection(company)

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    stopWhen: stepCountIs(25),
    instructions: `# Identidad

Eres **Atlas**, Analista Senior de Inteligencia Comercial y Prospeccion. No eres un chatbot que espera instrucciones — eres un estratega de ventas con pensamiento critico que toma la iniciativa, investiga a fondo, y entrega resultados accionables.

Tu mision: convertir datos crudos de negocios en oportunidades de venta reales para la empresa. Cada interaccion contigo debe dejar el CRM mas rico, mas limpio y mas accionable que antes.

## Contexto de sesion
- Pagina activa: ${currentPath}
- Usuario: ${username}
- Fecha: ${new Date().toISOString().split('T')[0]}
${companySection}

## Personalidad y estilo de trabajo

**Proactivo, no reactivo.** Cuando el usuario dice "investiga este lugar", tu no solo buscas info — la verificas, la cruzas, llenas TODOS los campos vacios que puedas, calificas el lead, documentas hallazgos Y sugieres proximos pasos. Cuando ves un patron en los datos, lo señalas sin que te lo pidan.

**Analitico y opinado.** No presentas datos planos — los interpretas. "Este negocio tiene 4.8 estrellas con 2000+ resenas y web profesional. Es score 5, hot. Recomiendo contacto inmediato." Siempre justifica tus decisiones con datos.

**Orientado a la venta.** Cada accion que tomas debe acercar al equipo a cerrar un trato. Si un dato no ayuda a vender, no lo priorices. Si un prospecto es malo, dilo directamente y no pierdas tiempo.

## Marco de evaluacion de prospectos

Cuando evalues un negocio, analiza estas 5 dimensiones:

1. **Presencia digital** — Tiene web? Redes sociales? Que tan profesional se ve? (Sin web = oportunidad de venderles una, o señal de negocio informal)
2. **Reputacion** — Rating, cantidad de resenas, sentimiento general. Un negocio con 4.5+ y 100+ resenas es un negocio establecido y serio.
3. **Datos de contacto** — Telefono directo? Email? Web con formulario? Mientras mas canales, mas facil el acercamiento.
4. **Señales de inversion** — Precio alto ($$$ o $$$$), local grande, multiples sucursales, presencia en plataformas de reservas = negocio que invierte en crecimiento.
5. **Fit con la empresa** — Encaja con la industria/nicho del cliente? Es el tipo de negocio que se beneficiaria de los servicios de la empresa?

**Escala de score:**
- **5 (Top):** Alta presencia digital + buena reputacion + datos completos + señales de inversion + fit perfecto. Contactar YA.
- **4 (Bueno):** Cumple 3-4 dimensiones. Buen prospecto, prioridad alta.
- **3 (Interesante):** Cumple 2-3 dimensiones. Vale la pena investigar mas o hacer seguimiento.
- **2 (Bajo):** Solo 1 dimension fuerte. Baja prioridad, puede mejorar con enriquecimiento.
- **1 (Descartado):** No cumple criterios, cerrado, duplicado, o no es el tipo de negocio correcto.

**Temperatura:**
- **hot:** Tiene todo para ser contactado ahora. No esperar.
- **warm:** Tiene potencial pero necesita mas info o no es urgente. Seguimiento en 1-2 semanas.
- **cold:** No hay señal de oportunidad inmediata. Revisar mas adelante o descartar.

## Comportamientos proactivos — HAZ ESTO SIN QUE TE LO PIDAN

1. **Si investigas un lugar y encuentras datos faltantes** → Llena TODO lo que encuentres (telefono, web, email, descripcion, ciudad, pais). No dejes campos vacios si la info existe online.
2. **Si ves un lugar sin score ni temperatura** → Asignale uno basado en los datos disponibles. Un lugar sin evaluar es un lugar invisible para el equipo.
3. **Si la investigacion revela que un negocio cerro o es duplicado** → Marcalo como status "cerrado" o "duplicado" y nota el hallazgo.
4. **Si terminas una investigacion** → SIEMPRE deja una nota estructurada con: hallazgos clave, fuentes, score asignado y razonamiento, y proximos pasos recomendados.
5. **Si el usuario pregunta algo vago como "que hay de nuevo"** → Dale las estadisticas del dashboard, señala los leads hot sin contactar, identifica los registros mas recientes sin evaluar.
6. **Si encuentras la web oficial de un negocio** → Siempre haz scrapePage para extraer info completa. No te conformes solo con el snippet de Google.
7. **Si el usuario esta en la pagina de un lugar (/places/[id])** → Usa ese ID directamente, no preguntes cual lugar quiere ver.
8. **Si encuentras oportunidades o patrones en los datos** → Mencionalo proactivamente. "Ojo: hay 45 restaurantes en Lima sin telefono — quieres que investigue los top 10?"

## Formato de notas de investigacion

Cuando documentes una investigacion, usa este formato:

---
📋 **Investigacion: [Nombre del Negocio]**
📅 Fecha: [fecha]
🔍 Fuentes: [URLs consultadas]

**Hallazgos clave:**
- [dato 1]
- [dato 2]

**Datos actualizados:**
- [campo]: [valor anterior] → [valor nuevo]

**Evaluacion:**
- Score: [X/5] | Temperatura: [hot/warm/cold]
- Razonamiento: [por que esta calificacion]

**Proximos pasos recomendados:**
- [accion 1]
- [accion 2]
---

## Formato de outreach / copy de marketing

Cuando el usuario pida redactar un mensaje de acercamiento, pitch o copy:
- Usa tono profesional pero cercano, adaptado a la industria del prospecto
- Personaliza con datos reales del negocio (nombre, ubicacion, puntos fuertes)
- Incluye un gancho basado en un pain point real del sector
- Cierra con un call-to-action claro
- Guarda el draft como nota en el lugar para referencia del equipo

## Reglas operativas
- Minimo 2 busquedas web distintas al investigar un lugar
- Solo actualiza campos con informacion verificada de fuentes confiables
- Para operaciones masivas de mas de 10 lugares: confirma con el usuario antes de ejecutar
- Si la pagina activa es /places/[id], el ID del lugar esta en la ruta
- Responde siempre en español
- Se conciso en el texto explicativo pero exhaustivo en las acciones — haz todo lo que puedas en cada turno`,

    tools: {
      // ── CONSULTA ─────────────────────────────────────────────────────────────
      searchPlaces: tool({
        description: 'Busca y filtra lugares en la base de datos. Usala para: encontrar prospectos por criterios, identificar registros incompletos, preparar operaciones masivas, o responder preguntas sobre el dataset. Devuelve datos CRM clave de cada resultado.',
        inputSchema: z.object({
          search:      z.string().optional().describe('Busqueda libre en titulo, direccion, categoria o telefono'),
          category:    z.string().optional().describe('Categoria del negocio (busqueda parcial, case-insensitive)'),
          city:        z.string().optional().describe('Ciudad (case-insensitive)'),
          country:     z.string().optional().describe('Pais (case-insensitive)'),
          temperature: z.enum(['hot', 'warm', 'cold']).optional().describe('Temperatura del lead'),
          minScore:    z.number().min(1).max(5).optional().describe('Lead score minimo (1-5)'),
          hasPhone:    z.boolean().optional().describe('true=con telefono, false=sin telefono'),
          hasWebsite:  z.boolean().optional().describe('true=con sitio web, false=sin sitio web'),
          batchTag:    z.string().optional().describe('Filtrar por lote/batch de importacion'),
          limit:       z.number().min(1).max(100).default(20).describe('Numero de resultados'),
          page:        z.number().min(1).default(1).describe('Pagina de resultados'),
          sortBy:      z.enum(['score', 'rating', 'reviews', 'recent']).default('score').describe('Ordenar por: score, rating, reviews o fecha reciente'),
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
            if (hasPhone === true)  where.phone   = { not: null }
            if (hasPhone === false) where.phone   = null
            if (hasWebsite === true)  where.website = { not: null }
            if (hasWebsite === false) where.website = null
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
                  emails:           true,
                  review_rating:    true,
                  review_count:     true,
                  lead_score:       true,
                  lead_temperature: true,
                  batch_tag:        true,
                  status:           true,
                  descriptions:     true,
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
                emails:           p.emails ?? null,
                rating:           p.review_rating ? Number(p.review_rating) : null,
                reviews:          p.review_count,
                lead_score:       p.lead_score,
                lead_temperature: p.lead_temperature,
                batch_tag:        p.batch_tag,
                status:           p.status,
                hasDescription:   !!p.descriptions,
              })),
            }
          } catch (err) {
            return { error: `Error al buscar lugares: ${String(err)}` }
          }
        },
      }),

      getPlaceDetail: tool({
        description: 'Obtiene TODA la informacion de un lugar: contacto, horarios, descripcion, CRM, notas recientes y datos del dueño. Usala SIEMPRE antes de investigar, actualizar o evaluar un lugar. Te da el panorama completo para tomar decisiones.',
        inputSchema: z.object({
          placeId: z.string().describe('ID del lugar'),
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
                _count: {
                  select: { favorites: true, reactions: true, notes: true },
                },
              },
            })
            if (!place) return { error: `Lugar con ID ${placeId} no encontrado` }

            return {
              ...place,
              review_rating: place.review_rating ? Number(place.review_rating) : null,
              latitude:      place.latitude ? Number(place.latitude) : null,
              longitude:     place.longitude ? Number(place.longitude) : null,
              totalNotes:    place._count.notes,
              totalFavorites: place._count.favorites,
              totalReactions: place._count.reactions,
              camposFaltantes: [
                !place.phone && 'phone',
                !place.website && 'website',
                !place.descriptions && 'descriptions',
                !place.city && 'city',
                !place.country && 'country',
                !place.lead_score && 'lead_score',
                !place.lead_temperature && 'lead_temperature',
              ].filter(Boolean),
            }
          } catch (err) {
            return { error: `Error al obtener lugar: ${String(err)}` }
          }
        },
      }),

      getDashboardStats: tool({
        description: 'Estadisticas globales del CRM: totales, distribucion por temperatura/score, top categorias, cobertura de contacto, registros sin evaluar. Usala para dar reportes rapidos o identificar donde hay trabajo pendiente.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const [total, byTemperature, byScore, topCategories, withPhone, withWebsite, ratingAgg, topCities, recentCount, unscored] = await Promise.all([
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
              prisma.place.groupBy({
                by:     ['city'],
                _count: { _all: true },
                orderBy: { _count: { city: 'desc' } },
                take:   10,
              }),
              prisma.place.count({ where: { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
              prisma.place.count({ where: { lead_score: null } }),
            ])

            return {
              total,
              withPhone,
              withWebsite,
              withoutPhone: total - withPhone,
              withoutWebsite: total - withWebsite,
              unscored,
              recentlyAdded: recentCount,
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
                category: c.category ?? 'sin categoria',
                count:    c._count._all,
              })),
              topCities: topCities.map(c => ({
                city:  c.city ?? 'sin ciudad',
                count: c._count._all,
              })),
            }
          } catch (err) {
            return { error: `Error al obtener estadisticas: ${String(err)}` }
          }
        },
      }),

      // ── INVESTIGACION WEB ──────────────────────────────────────────────────
      searchWeb: tool({
        description: 'Busca informacion en internet via Firecrawl. Usala para: encontrar telefono/web/email de negocios, verificar si un negocio existe, investigar competencia, o buscar datos del sector. SIEMPRE haz minimo 2 busquedas con queries diferentes para cada investigacion.',
        inputSchema: z.object({
          query: z.string().describe('Query especifico y contextualizado. Ej: "Restaurante El Señorio Lima Miraflores telefono reservas" o "mejores agencias de marketing digital en Bogota"'),
          limit: z.number().min(1).max(10).default(5).describe('Resultados maximos'),
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
                  content:     (r.markdown ?? '').slice(0, 1500),
                }
              }),
            }
          } catch (err) {
            return { error: `Error en busqueda web: ${String(err)}`, query, results: [] }
          }
        },
      }),

      scrapePage: tool({
        description: 'Extrae contenido completo de una URL. Usala en: webs oficiales de negocios (para contacto, servicios, precios), perfiles de redes sociales, paginas de resenas, directorios. SIEMPRE extrae la web oficial si la encuentras — ahi estan los datos mas valiosos.',
        inputSchema: z.object({
          url: z.string().url().describe('URL de la pagina a extraer'),
        }),
        execute: async ({ url }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.scrape(url, { formats: ['markdown'] })
            return {
              url,
              title:       result.metadata?.title ?? '',
              description: result.metadata?.description ?? '',
              content:     (result.markdown ?? '').slice(0, 5000),
            }
          } catch (err) {
            return { error: `Error al extraer pagina: ${String(err)}`, url }
          }
        },
      }),

      // ── ESCRITURA / ENRIQUECIMIENTO ─────────────────────────────────────────
      updatePlace: tool({
        description: 'Actualiza campos de UN lugar con informacion verificada. Envia TODOS los campos que hayas encontrado de una sola vez — no hagas multiples llamadas. Si encontraste telefono, web, email y descripcion, actualiza todo junto.',
        inputSchema: z.object({
          placeId:      z.string().describe('ID del lugar a actualizar'),
          descriptions: z.string().optional().describe('Descripcion del negocio: que hace, especialidad, publico objetivo'),
          phone:        z.string().optional().describe('Telefono con codigo de pais (+51, +57, +34...)'),
          website:      z.string().url().optional().describe('URL del sitio web oficial'),
          email:        z.string().email().optional().describe('Email de contacto del negocio'),
          price_range:  z.string().optional().describe('Rango de precios: $, $$, $$$ o $$$$'),
          timezone:     z.string().optional().describe('Zona horaria IANA, ej: America/Lima'),
          city:         z.string().optional().describe('Ciudad donde esta ubicado el negocio'),
          country:      z.string().optional().describe('Pais donde esta ubicado el negocio'),
          status:       z.string().optional().describe('Estado: activo, cerrado, duplicado, no_verificado'),
        }),
        execute: async ({ placeId, email, ...data }) => {
          try {
            const updateData: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(data)) {
              if (value !== undefined && value !== '') updateData[key] = value
            }
            // emails is a JSON field in the schema
            if (email) updateData.emails = [email]

            if (Object.keys(updateData).length === 0) {
              return { success: false, message: 'No hay campos para actualizar' }
            }
            await prisma.place.update({ where: { id: placeId }, data: updateData })
            return { success: true, placeId, updated: Object.keys(updateData) }
          } catch (err) {
            return { success: false, error: `Error al actualizar lugar: ${String(err)}` }
          }
        },
      }),

      setPriority: tool({
        description: 'Califica un lead con score (1-5) y temperatura (cold/warm/hot). Usala SIEMPRE despues de investigar un lugar. Si no tienes datos suficientes para decidir, asigna score 3 + warm y nota explicando que falta investigar mas.',
        inputSchema: z.object({
          placeId:          z.string().describe('ID del lugar'),
          lead_score:       z.number().min(1).max(5).describe('1=descartado, 2=bajo, 3=interesante, 4=buena oportunidad, 5=top oportunidad'),
          lead_temperature: z.enum(['cold', 'warm', 'hot']).describe('cold=sin potencial inmediato, warm=seguimiento, hot=contactar ya'),
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
        description: 'Crea una nota en un lugar, visible para todo el equipo. Usala para: documentar investigaciones (con formato estructurado), redactar borradores de mensajes de acercamiento/outreach, registrar decisiones, dejar instrucciones para el equipo. Las notas son el historial de inteligencia del CRM — hacelas valiosas.',
        inputSchema: z.object({
          placeId: z.string().describe('ID del lugar'),
          content: z.string().min(20).describe('Contenido de la nota. Para investigaciones usa el formato estructurado. Para outreach usa tono profesional y personalizado.'),
        }),
        execute: async ({ placeId, content }) => {
          try {
            const note = await prisma.placeNote.create({
              data: {
                place_id: placeId,
                user_id:  userId,
                username: `${username} (Atlas AI)`,
                content,
              },
            })
            return { success: true, noteId: note.id, placeId }
          } catch (err) {
            return { success: false, error: `Error al crear nota: ${String(err)}` }
          }
        },
      }),

      toggleFavorite: tool({
        description: 'Marca o desmarca un lugar como favorito para el usuario actual. Usalo cuando el usuario diga "guardalo", "marcalo", "favorito" o cuando identifiques un prospecto excepcional (score 5, hot) y quieras sugerirlo.',
        inputSchema: z.object({
          placeId: z.string().describe('ID del lugar'),
        }),
        execute: async ({ placeId }) => {
          try {
            const existing = await prisma.placeFavorite.findUnique({
              where: { place_id_user_id: { place_id: placeId, user_id: userId } },
            })
            if (existing) {
              await prisma.placeFavorite.delete({ where: { id: existing.id } })
              return { success: true, action: 'removed', placeId, message: 'Eliminado de favoritos' }
            } else {
              await prisma.placeFavorite.create({
                data: { place_id: placeId, user_id: userId },
              })
              return { success: true, action: 'added', placeId, message: 'Añadido a favoritos' }
            }
          } catch (err) {
            return { success: false, error: `Error al toggle favorito: ${String(err)}` }
          }
        },
      }),

      // ── OPERACIONES MASIVAS ──────────────────────────────────────────────────
      bulkSetPriority: tool({
        description: 'Actualiza score y/o temperatura de MULTIPLES lugares a la vez. Confirma con el usuario si son mas de 10. Usalo para: clasificar lotes nuevos, re-priorizar segmentos, limpiar registros sin evaluar.',
        inputSchema: z.object({
          placeIds:         z.array(z.string()).min(1).max(200).describe('IDs de los lugares a actualizar'),
          lead_score:       z.number().min(1).max(5).optional().describe('Nuevo score para todos'),
          lead_temperature: z.enum(['cold', 'warm', 'hot']).optional().describe('Nueva temperatura para todos'),
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
            return { success: true, updated: result.count, requested: placeIds.length }
          } catch (err) {
            return { success: false, error: `Error en actualizacion masiva: ${String(err)}` }
          }
        },
      }),

      bulkAddNote: tool({
        description: 'Añade la misma nota a MULTIPLES lugares a la vez. Util para: documentar decisiones masivas ("Clasificado como cold por falta de datos"), registrar resultados de auditorias, o marcar lotes procesados.',
        inputSchema: z.object({
          placeIds: z.array(z.string()).min(1).max(100).describe('IDs de los lugares'),
          content:  z.string().min(10).describe('Contenido de la nota a añadir a todos los lugares'),
        }),
        execute: async ({ placeIds, content }) => {
          try {
            const notes = await prisma.placeNote.createMany({
              data: placeIds.map(place_id => ({
                place_id,
                user_id: userId,
                username: `${username} (Atlas AI)`,
                content,
              })),
            })
            return { success: true, created: notes.count, placeIds: placeIds.length }
          } catch (err) {
            return { success: false, error: `Error al crear notas masivas: ${String(err)}` }
          }
        },
      }),

      // ── PROSPECTOS ────────────────────────────────────────────────────────────
      saveProspectList: tool({
        description: 'Guarda una lista curada de prospectos. Max 50 por lista. Cada prospecto DEBE tener una razon especifica y personalizada — nada generico. El nombre debe ser descriptivo y accionable.',
        inputSchema: z.object({
          name:        z.string().min(1).describe('Nombre accionable, ej: "Top 30 Restaurantes Lima - Listos para contactar"'),
          description: z.string().optional().describe('Criterios de seleccion, metodologia, y recomendacion de como abordar estos prospectos'),
          prospects:   z.array(z.object({
            placeId: z.string().describe('ID del lugar'),
            rank:    z.number().optional().describe('Posicion en el ranking'),
            reason:  z.string().min(10).describe('Razon personalizada: por que ESTE negocio especificamente es buen prospecto'),
          })).max(50).describe('Prospectos seleccionados (max 50)'),
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
        description: 'Obtiene las ultimas listas de prospectos creadas. Usala para: evitar duplicados, referenciar trabajo previo, o mostrar al usuario el historial de listas.',
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
