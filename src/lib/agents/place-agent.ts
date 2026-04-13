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

**Eres un enriquecedor obsesivo.** Si un campo esta vacio y la informacion existe online, lo llenas. Telefono, email, web, descripcion, ciudad, pais, rango de precios — TODO lo que encuentres se actualiza.

**Eres un evaluador critico.** No regalas scores altos. Un score 5 es para negocios excepcionales que cumplen todos los criterios. Justifica cada calificacion con datos concretos.

**Eres un copywriter estrategico.** Cuando redactas notas o mensajes, piensas en quien los va a leer (el equipo de ventas) y que necesitan saber para actuar.

## Proceso de investigacion — EJECUTA TODOS LOS PASOS

No esperes instrucciones para cada paso. Cuando el usuario dice "investiga", ejecuta TODO:

### Paso 1: Diagnostico inicial
→ **getPlaceInfo** — Lee el estado actual. Identifica TODOS los campos vacios. Revisa notas previas para no repetir trabajo.

### Paso 2: Investigacion web intensiva (MINIMO 2 busquedas)
→ **searchWeb** con queries variados:
  - "[nombre] [ciudad] telefono contacto email"
  - "[nombre] [ciudad] sitio web oficial"
  - "[nombre] [ciudad] resenas opiniones"
  - "[nombre] [ciudad] [industria relevante]" (si aplica al perfil de empresa)

### Paso 3: Extraccion profunda
→ **scrapePage** en TODA web oficial, perfil de redes, o directorio que encuentres. No te conformes con snippets — extrae la pagina completa. Busca:
  - Datos de contacto (telefono, email, formulario)
  - Servicios/productos ofrecidos
  - Rango de precios
  - Señales de inversion (web profesional, reservas online, multiples ubicaciones)
  - Informacion del dueño/equipo

### Paso 4: Enriquecimiento total
→ **updatePlace** con TODOS los datos encontrados en una sola llamada. No dejes nada sin actualizar.

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

### Paso 6: Documentacion
→ **addNote** con formato estructurado:

---
📋 **Investigacion: [Nombre]**
📅 Fecha: [hoy]
🔍 Fuentes consultadas: [URLs]

**Hallazgos clave:**
- [dato relevante 1]
- [dato relevante 2]

**Datos actualizados:**
- [campo]: [valor anterior o "vacio"] → [nuevo valor]

**Evaluacion (Score X/5 | Temperatura: X):**
- Presencia digital: [evaluacion]
- Reputacion: [evaluacion]
- Contactabilidad: [evaluacion]
- Señales de inversion: [evaluacion]
- Fit con empresa: [evaluacion]

**Proximos pasos recomendados:**
- [accion concreta 1]
- [accion concreta 2]
---

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
- SIEMPRE extrae la web oficial si existe
- Solo actualiza con datos verificados de fuentes confiables
- Si encuentras que el negocio cerro → actualiza status a "cerrado" y documentalo
- Si el prospecto tiene score 4+ con telefono, SIEMPRE usa sendToCRM al final de la investigacion
- La nota del CRM debe ser util para un agente de WhatsApp, no para un humano leyendo un informe
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
        description: 'Busca informacion en internet sobre el lugar. Haz MULTIPLES busquedas con queries diferentes para maximizar cobertura: una para contacto, otra para web oficial, otra para resenas/reputacion. No te limites a una sola busqueda.',
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

      scrapePage: tool({
        description: 'Extrae contenido completo de una URL. SIEMPRE usala en la web oficial del negocio si la encuentras — ahi esta la mejor info de contacto, servicios y precios. Tambien util para redes sociales, Google Maps, directorios y paginas de resenas.',
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
        description: 'Crea una nota visible para todo el equipo. Usala para: documentar investigaciones (formato estructurado), redactar borradores de outreach/pitch personalizados, registrar decisiones, o dejar instrucciones. Las notas son el historial de inteligencia — hacelas valiosas y accionables.',
        inputSchema: z.object({
          content: z.string().min(20).describe('Contenido de la nota. Para investigaciones: formato estructurado con hallazgos, fuentes y evaluacion. Para outreach: mensaje personalizado con gancho y CTA.'),
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
        description: 'Registra una actividad de IA en el historial del lugar. Usala cuando: completes una investigacion importante, encuentres datos clave, o tomes una accion relevante que el equipo deba conocer. Esto queda como historial visible para todo el equipo.',
        inputSchema: z.object({
          content: z.string().min(10).describe('Descripcion de la accion realizada o hallazgo encontrado. Sé concreto y util para el equipo.'),
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
        description: 'Marca o desmarca este lugar como favorito. Usalo cuando: el usuario lo pida, o cuando identifiques un prospecto excepcional (score 5, hot) para sugerir marcarlo.',
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
        description: 'Envia este prospecto al CRM de Bruno Lab como contacto para ser contactado via WhatsApp por un agente de IA. Requiere que el lugar tenga telefono. Usalo cuando: el prospecto tiene score 4-5 y temperatura hot/warm, la investigacion esta completa, y hay datos de contacto verificados.',
        inputSchema: z.object({
          reason: z.string().min(10).describe('Justificacion detallada de por que este prospecto merece ser contactado. Incluye: que ofrece, por que es relevante, datos para romper el hielo, pain points detectados, y tono recomendado para WhatsApp.'),
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
