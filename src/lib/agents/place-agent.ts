import { ToolLoopAgent, tool, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { prisma } from '@/lib/prisma'
import { sendPlaceToCRM } from '@/lib/supabase'
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

interface CreatePlaceAgentOptions {
  placeId:  string
  userId:   number
  username: string
  company?: CompanyProfile | null
}

function buildCompanySection(company?: CompanyProfile | null): string {
  if (!company) return ''
  const lines = ['\n## Tu empresa (evalua todo desde esta perspectiva)']
  lines.push(`- **Nombre:** ${company.name}`)
  if (company.industry)    lines.push(`- **Industria / Nicho:** ${company.industry}`)
  if (company.website)     lines.push(`- **Sitio web:** ${company.website}`)
  if (company.description) lines.push(`- **Descripcion:** ${company.description}`)
  if (company.ai_context)  lines.push(`\n### Instrucciones y criterios del cliente\n${company.ai_context}`)
  return lines.join('\n')
}

export function createPlaceAgent({ placeId, userId, username, company }: CreatePlaceAgentOptions) {
  const companySection = buildCompanySection(company)

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    stopWhen: stepCountIs(18),
    instructions: `# Identidad

Eres **Scout**, Investigador de Inteligencia Comercial especializado en enriquecimiento y evaluacion profunda de prospectos. Tu trabajo es convertir un registro basico en un perfil comercial completo y accionable.

Tu objetivo con este lugar (ID: ${placeId}): investigarlo a fondo, llenar cada campo vacio posible, evaluar su potencial como prospecto, y dejar documentacion que permita al equipo de ventas actuar inmediatamente.
${companySection}

## Tu mentalidad

**Eres un detective comercial.** No te conformas con el primer resultado de Google — cruzas fuentes, verificas datos, buscas en la web oficial, redes sociales, directorios y resenas. Si un dato no cuadra, lo señalas.

**Eres un enriquecedor obsesivo.** Si un campo esta vacio y la informacion existe online, lo llenas. Telefono, email, web, descripcion, ciudad, pais, rango de precios — TODO lo que encuentres se actualiza. **El email es prioridad maxima** — buscalo en la web oficial, en paginas de contacto, en directorios, en redes sociales.

**Eres un evaluador critico.** No regalas scores altos. Un score 5 es para negocios excepcionales que cumplen todos los criterios. Justifica cada calificacion con datos concretos.

**Eres un cazador de tomadores de decision.** Siempre buscas quien es el dueño, fundador, gerente o persona clave del negocio. Nombres, roles, emails personales, perfiles de LinkedIn — todo suma para el equipo de ventas.

## Proceso de investigacion — EJECUTA TODOS LOS PASOS

No esperes instrucciones para cada paso. Cuando el usuario dice "investiga", ejecuta TODO:

### Paso 1: Diagnostico inicial
→ **getPlaceInfo** — Lee el estado actual. Identifica TODOS los campos vacios. Revisa notas previas para no repetir trabajo.

### Paso 2: Investigacion web profunda (MINIMO 2 busquedas)
→ **deepSearch** con queries variados y scraping incluido:
  - "[nombre] [ciudad] contacto email telefono" — PRIORIDAD: conseguir email
  - "[nombre] [ciudad] sitio web oficial"
  - "[nombre] [ciudad] fundador dueño gerente equipo" — para tomadores de decision
  - "[nombre] [ciudad] [industria]" (si aplica al perfil de empresa)

Usa **deepSearch** en vez de searchWeb cuando necesites contenido completo de las paginas encontradas (trae markdown de cada resultado). Usa **searchWeb** solo para busquedas rapidas donde no necesites el contenido.

### Paso 3: Investigacion profunda con Firecrawl Agent
→ **firecrawlAgent** — Tu herramienta mas poderosa. NO necesita URLs — busca autonomamente en la web. Usala para:
  - Encontrar emails de contacto del negocio
  - Encontrar tomadores de decision: fundadores, gerentes, dueños, con nombres y roles
  - Encontrar redes sociales y perfiles publicos
  - Cualquier dato dificil de encontrar con busquedas normales

Ejemplo de prompt: "Encuentra el email de contacto, fundador o dueño, y redes sociales de [nombre] en [ciudad]"

Complementa con **scrapePage** en la web oficial o paginas especificas que ya tengas.

### Paso 4: Enriquecimiento total
→ **updatePlace** con TODOS los datos encontrados en una sola llamada. No dejes nada sin actualizar. **El email es prioridad** — si lo encontraste, actualizalo primero.

### Paso 5: Evaluacion y calificacion
→ **setPriority** basado en estas 5 dimensiones:

| Dimension | Score alto (4-5) | Score bajo (1-2) |
|-----------|-----------------|-------------------|
| Presencia digital | Web profesional, redes activas | Sin web, sin redes |
| Reputacion | Rating 4.5+, 100+ resenas | Rating bajo, pocas resenas |
| Contactabilidad | Telefono + email + web | Sin datos de contacto |
| Señales de inversion | $$-$$$$, reservas online, local premium | $, basico, informal |
| Fit con empresa | Encaja perfecto con el nicho | No es el tipo de cliente ideal |

**Temperatura:**
- **hot** = Score 4-5 + datos completos + fit alto → contactar AHORA
- **warm** = Score 3-4 + datos parciales → investigar mas o hacer seguimiento
- **cold** = Score 1-2 + mal fit o datos insuficientes → baja prioridad

### Paso 6: Documentacion — Nota de contexto NO REDUNDANTE
→ **addNote** con informacion que NO este ya en los campos del lugar. La nota debe aportar valor agregado:

---
📋 **Contexto: [Nombre]**
📅 Fecha: [hoy]

**Tomadores de decision:**
- [Nombre] — [Rol] — [Email/LinkedIn si disponible]

**Contexto del negocio** (lo que NO esta en los campos):
- [Insight relevante 1: historia, logros, eventos recientes]
- [Insight relevante 2: pain points, oportunidades]

**Evaluacion (Score X/5 | Temperatura: X):**
- [Justificacion breve de la calificacion]

**Proximos pasos recomendados:**
- [accion concreta 1]
- [accion concreta 2]
---

**IMPORTANTE:** NO repitas en la nota datos que ya estan en los campos (telefono, email, web, direccion, descripcion). La nota es para CONTEXTO ESTRATEGICO: tomadores de decision, insights, evaluacion, recomendaciones.

### Paso 7 (si aplica): Borrador de outreach
Si el prospecto es score 4+ y hot/warm, redacta proactivamente un borrador de mensaje de acercamiento como nota adicional:
- Personalizado con datos reales del negocio
- Tono profesional pero cercano
- Gancho basado en un pain point del sector
- Propuesta de valor clara
- Call-to-action especifico

### Paso 8: Exportar al CRM (cuando el prospecto cualifica)
Despues de completar la investigacion y documentacion, evalua si el prospecto debe ser enviado al CRM para contacto directo via WhatsApp:

**Criterios de envio automatico (TODOS deben cumplirse):**
- Score 4 o 5
- Temperatura hot o warm
- Tiene telefono verificado
- La investigacion esta documentada (nota creada)

Si cumple los criterios → usa **sendToCRM** inmediatamente con una justificacion detallada.

**Sobre la nota del CRM:** El CRM es usado por un agente de IA que contacta prospectos via WhatsApp. Tu justificacion debe incluir:
- Que ofrece este negocio y por que es relevante para la empresa
- Datos clave para romper el hielo (resenas positivas, logros, eventos recientes)
- Pain points detectados donde la empresa puede aportar valor
- Tono recomendado para el primer mensaje de WhatsApp
- Temas a evitar si detectaste algo sensible

No envies prospectos con score 1-2 o temperatura cold al CRM — seria spam.

## Reglas operativas
- NUNCA preguntes "quieres que investigue?" — HAZLO directamente
- Minimo 2 busquedas web con queries distintos
- SIEMPRE usa firecrawlAgent para buscar emails y tomadores de decision — es mas poderoso que busquedas manuales
- Solo actualiza con datos verificados de fuentes confiables
- Si encuentras que el negocio cerro → actualiza status a "cerrado" y documentalo
- Si el prospecto tiene score 4+ con telefono, SIEMPRE usa sendToCRM al final de la investigacion
- La nota del CRM debe ser util para un agente de WhatsApp, no para un humano leyendo un informe
- **El email es el dato de contacto mas valioso despues del telefono — buscalo obsesivamente**
- **Siempre busca tomadores de decision: nombres, roles, emails, LinkedIn**
- Responde siempre en español
- Se conciso en explicaciones pero exhaustivo en acciones`,

    tools: {
      getPlaceInfo: tool({
        description: 'Obtiene TODA la informacion actual del lugar desde la base de datos: contacto, ubicacion, CRM, historial de actividades/notas y campos faltantes. SIEMPRE es tu primer paso — necesitas saber que datos ya existen, que acciones se han tomado y cuales faltan antes de investigar.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const [place, activities, notes] = await Promise.all([
              prisma.place.findUnique({
                where: { id: placeId },
                include: {
                  _count: { select: { favorites: true, reactions: true, notes: true, activities: true } },
                },
              }),
              prisma.placeActivity.findMany({
                where:   { place_id: placeId },
                orderBy: { happened_at: 'desc' },
                take:    10,
                select:  { type: true, content: true, username: true, happened_at: true },
              }),
              prisma.placeNote.findMany({
                where:   { place_id: placeId },
                orderBy: { created_at: 'desc' },
                take:    5,
                select:  { content: true, username: true, created_at: true },
              }),
            ])
            if (!place) return { error: 'Lugar no encontrado en la base de datos' }

            // Construir timeline legible para el agente
            const timelineEntries = [
              ...activities.map(a => ({ type: a.type, content: a.content, username: a.username, date: a.happened_at })),
              ...notes.map(n => ({ type: 'note', content: n.content, username: n.username, date: n.created_at })),
            ]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)

            const timelineText = timelineEntries.length > 0
              ? timelineEntries.map(e =>
                  `- [${e.type}, ${new Date(e.date).toLocaleDateString('es-ES')}] ${e.username ?? 'Usuario'}: "${e.content ?? '(sin descripción)'}"`
                ).join('\n')
              : 'Sin actividad registrada aún'

            return {
              ...place,
              review_rating:  place.review_rating ? Number(place.review_rating) : null,
              latitude:       place.latitude ? Number(place.latitude) : null,
              longitude:      place.longitude ? Number(place.longitude) : null,
              totalActivities: place._count.activities,
              totalNotes:     place._count.notes,
              totalFavorites: place._count.favorites,
              timeline:       timelineText,
              camposFaltantes: [
                !place.phone && 'phone',
                !place.website && 'website',
                !place.email && 'email',
                !place.descriptions && 'descriptions',
                !place.city && 'city',
                !place.country && 'country',
                !place.lead_score && 'lead_score',
                !place.lead_temperature && 'lead_temperature',
                !place.price_range && 'price_range',
                !place.timezone && 'timezone',
              ].filter(Boolean),
            }
          } catch (err) {
            return { error: `Error al obtener lugar: ${String(err)}` }
          }
        },
      }),

      searchWeb: tool({
        description: 'Busqueda web rapida — devuelve snippets sin contenido completo. Usala para busquedas exploratorias rapidas. Para busquedas donde necesites el contenido completo de las paginas, usa deepSearch en su lugar.',
        inputSchema: z.object({
          query: z.string().describe('Query especifica y contextualizada. Incluye nombre + ciudad + lo que buscas.'),
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

      deepSearch: tool({
        description: 'Busqueda web profunda con scraping incluido — devuelve el contenido markdown completo de cada pagina encontrada. Ideal para buscar emails, datos de contacto, tomadores de decision, y cualquier informacion que requiera leer el contenido de las paginas. Mas poderosa que searchWeb pero consume mas creditos.',
        inputSchema: z.object({
          query: z.string().describe('Query especifica. Incluye nombre + ciudad + lo que buscas (ej: "Restaurante Miraflores Lima contacto email fundador").'),
          limit: z.number().min(1).max(5).default(3).describe('Resultados maximos (cada uno se scrapea, maximo 5)'),
        }),
        execute: async ({ query, limit }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.search(query, {
              limit,
              scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
            })
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
                  content:     (r.markdown ?? '').slice(0, 3000),
                }
              }),
            }
          } catch (err) {
            return { error: `Error en busqueda profunda: ${String(err)}`, query, results: [] }
          }
        },
      }),

      scrapePage: tool({
        description: 'Extrae contenido completo de una URL en markdown. Usala en webs oficiales, paginas de contacto, paginas "sobre nosotros" o "equipo", perfiles de redes sociales, y directorios.',
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

      firecrawlAgent: tool({
        description: 'Agente de IA autonomo que busca, navega y extrae datos estructurados de la web. NO necesita URLs — solo describe que datos necesitas. Es la herramienta mas poderosa para: encontrar emails, tomadores de decision (fundadores, gerentes, dueños), redes sociales, y datos dificiles de encontrar. Devuelve datos estructurados.',
        inputSchema: z.object({
          prompt: z.string().describe('Descripcion en lenguaje natural de lo que necesitas. Ej: "Encuentra el email de contacto, el fundador o dueño, y redes sociales de Restaurante La Mar en Lima, Peru"'),
          urls:   z.array(z.string().url()).optional().describe('URLs opcionales para enfocar la busqueda (ej: web oficial del negocio). Si no se proporcionan, el agente busca autonomamente.'),
        }),
        execute: async ({ prompt, urls }) => {
          try {
            const fc = getFirecrawl()
            const result = await fc.agent({
              prompt,
              urls:       urls ?? undefined,
              model:      'spark-1-mini',
              maxCredits: 100,
              schema: z.object({
                emails:       z.array(z.string()).describe('Todos los emails encontrados'),
                phones:       z.array(z.string()).describe('Todos los telefonos encontrados'),
                website:      z.string().optional().describe('Sitio web oficial'),
                socialMedia:  z.array(z.object({
                  platform: z.string().describe('Nombre de la red social'),
                  url:      z.string().describe('URL del perfil'),
                })).describe('Perfiles de redes sociales'),
                decisionMakers: z.array(z.object({
                  name:       z.string().describe('Nombre completo'),
                  role:       z.string().optional().describe('Cargo o rol'),
                  email:      z.string().optional().describe('Email personal o de trabajo'),
                  linkedin:   z.string().optional().describe('URL de perfil LinkedIn'),
                })).describe('Tomadores de decision: fundadores, gerentes, dueños'),
                description:  z.string().optional().describe('Descripcion breve del negocio'),
                priceRange:   z.string().optional().describe('Rango de precios: $, $$, $$$ o $$$$'),
              }),
            })
            return {
              success:    result.success ?? false,
              status:     result.status ?? 'unknown',
              data:       result.data ?? null,
              creditsUsed: (result as unknown as Record<string, unknown>).creditsUsed ?? null,
            }
          } catch (err) {
            return { error: `Error en Firecrawl Agent: ${String(err)}` }
          }
        },
      }),

      updatePlace: tool({
        description: 'Actualiza campos del lugar con informacion verificada. Envia TODOS los datos encontrados en UNA sola llamada. No hagas llamadas separadas para cada campo — es ineficiente.',
        inputSchema: z.object({
          descriptions: z.string().optional().describe('Descripcion del negocio: que ofrece, especialidad, publico'),
          phone:        z.string().optional().describe('Telefono con codigo de pais (+51, +57, +34...)'),
          website:      z.string().url().optional().describe('URL del sitio web oficial'),
          email:        z.string().email().optional().describe('Email de contacto del negocio'),
          price_range:  z.string().optional().describe('Rango de precios: $, $$, $$$ o $$$$'),
          timezone:     z.string().optional().describe('Zona horaria IANA, ej: America/Lima'),
          city:         z.string().optional().describe('Ciudad del negocio'),
          country:      z.string().optional().describe('Pais del negocio'),
          status:       z.string().optional().describe('Estado: activo, cerrado, duplicado, no_verificado'),
        }),
        execute: async (data) => {
          try {
            const updateData: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(data)) {
              if (value !== undefined && value !== '') updateData[key] = value
            }

            if (Object.keys(updateData).length === 0) {
              return { success: false, message: 'No hay campos para actualizar' }
            }
            await prisma.place.update({ where: { id: placeId }, data: updateData })
            return { success: true, updated: Object.keys(updateData) }
          } catch (err) {
            return { success: false, error: `Error al actualizar lugar: ${String(err)}` }
          }
        },
      }),

      setPriority: tool({
        description: 'Califica el lead con score (1-5) y temperatura (cold/warm/hot). SIEMPRE usala despues de investigar. Justifica tu decision con datos — no califiques sin evidencia.',
        inputSchema: z.object({
          lead_score: z.number().min(1).max(5).describe(
            '1=descartado, 2=bajo, 3=interesante, 4=buena oportunidad, 5=top oportunidad'
          ),
          lead_temperature: z.enum(['cold', 'warm', 'hot']).describe(
            'cold=sin potencial inmediato, warm=seguimiento, hot=contactar urgente'
          ),
        }),
        execute: async ({ lead_score, lead_temperature }) => {
          try {
            await prisma.place.update({
              where: { id: placeId },
              data:  { lead_score, lead_temperature },
            })
            return { success: true, lead_score, lead_temperature }
          } catch (err) {
            return { success: false, error: `Error al establecer prioridad: ${String(err)}` }
          }
        },
      }),

      addNote: tool({
        description: 'Crea una nota visible para todo el equipo. IMPORTANTE: la nota debe ser de CONTEXTO ESTRATEGICO — NO repitas datos que ya estan en los campos del lugar (telefono, email, web, direccion). Incluye: tomadores de decision, insights del negocio, evaluacion, recomendaciones de accion.',
        inputSchema: z.object({
          content: z.string().min(20).describe('Nota de contexto no redundante. Incluye tomadores de decision, insights estrategicos, evaluacion y proximos pasos.'),
        }),
        execute: async ({ content }) => {
          try {
            const note = await prisma.placeNote.create({
              data: {
                place_id: placeId,
                user_id:  userId,
                username: `${username} (Scout AI)`,
                content,
              },
            })
            return { success: true, noteId: note.id }
          } catch (err) {
            return { success: false, error: `Error al crear nota: ${String(err)}` }
          }
        },
      }),

      addActivity: tool({
        description: 'Registra una actividad de IA en el historial del lugar. Usala cuando: completes una investigacion importante, encuentres datos clave, o tomes una accion relevante que el equipo deba conocer.',
        inputSchema: z.object({
          content: z.string().min(10).describe('Descripcion de la accion realizada o hallazgo encontrado.'),
        }),
        execute: async ({ content }) => {
          try {
            await prisma.placeActivity.create({
              data: {
                place_id:    placeId,
                user_id:     userId,
                username:    `${username} (Scout AI)`,
                type:        'ai_action',
                content,
                happened_at: new Date(),
              },
            })
            return { success: true }
          } catch (err) {
            return { success: false, error: `Error al registrar actividad: ${String(err)}` }
          }
        },
      }),

      toggleFavorite: tool({
        description: 'Marca o desmarca este lugar como favorito. Usalo cuando el usuario lo pida o cuando identifiques un prospecto excepcional (score 5, hot).',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const existing = await prisma.placeFavorite.findUnique({
              where: { place_id_user_id: { place_id: placeId, user_id: userId } },
            })
            if (existing) {
              await prisma.placeFavorite.delete({ where: { id: existing.id } })
              return { success: true, action: 'removed', message: 'Eliminado de favoritos' }
            } else {
              await prisma.placeFavorite.create({
                data: { place_id: placeId, user_id: userId },
              })
              return { success: true, action: 'added', message: 'Añadido a favoritos' }
            }
          } catch (err) {
            return { success: false, error: `Error al toggle favorito: ${String(err)}` }
          }
        },
      }),

      sendToCRM: tool({
        description: 'Envia este prospecto al CRM como contacto para ser contactado via WhatsApp por un agente de IA. Requiere telefono. Usalo cuando: score 4-5, temperatura hot/warm, investigacion completa y datos de contacto verificados.',
        inputSchema: z.object({
          reason: z.string().min(10).describe('Justificacion detallada para el agente de WhatsApp: que ofrece, relevancia, datos para romper el hielo, pain points, tono recomendado.'),
        }),
        execute: async ({ reason }) => {
          try {
            const place = await prisma.place.findUnique({
              where:   { id: placeId },
              include: { notes: { orderBy: { created_at: 'desc' }, take: 3 } },
            })
            if (!place) return { success: false, error: 'Lugar no encontrado' }
            if (!place.phone) return { success: false, error: 'El lugar no tiene telefono — es obligatorio para el CRM' }

            const result = await sendPlaceToCRM(
              { ...place, review_rating: place.review_rating ? Number(place.review_rating) : null },
              reason,
            )

            if (result.status === 'error') {
              return { success: false, error: result.error }
            }

            await prisma.placeActivity.create({
              data: {
                place_id:    placeId,
                user_id:     userId,
                username:    `${username} (Scout AI)`,
                type:        'crm_export',
                content:     result.status === 'created'
                  ? 'Contacto creado en el CRM de Bruno Lab por Scout AI'
                  : 'Contacto actualizado en el CRM de Bruno Lab por Scout AI',
                happened_at: new Date(),
              },
            })

            return { success: true, status: result.status, contactId: result.contactId }
          } catch (err) {
            return { success: false, error: `Error al enviar al CRM: ${String(err)}` }
          }
        },
      }),
    },
  })
}
