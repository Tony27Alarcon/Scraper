import { ToolLoopAgent, tool, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { prisma } from '@/lib/prisma'
import Firecrawl from '@mendable/firecrawl-js'
import { z } from 'zod'

function getFirecrawl() {
  return new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY ?? '' })
}

interface CreatePlaceAgentOptions {
  placeId:        string
  userId:         number
  username:       string
  companyContext?: string | null
}

export function createPlaceAgent({ placeId, userId, username, companyContext }: CreatePlaceAgentOptions) {
  const companySection = companyContext
    ? `\n\n## Perfil de la empresa (contextualiza tu análisis con esto)\n${companyContext}`
    : ''

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    stopWhen: stepCountIs(15),
    instructions: `Eres un asistente especializado en investigación de leads y negocios locales.
Tu tarea: investigar, enriquecer y calificar el lugar con ID: ${placeId}.${companySection}

## Proceso de investigación
1. **getPlaceInfo** — Empieza siempre aquí para conocer el estado actual
2. **searchWeb** — Busca por nombre + ciudad. Prueba queries distintas:
   - "[nombre negocio] [ciudad] teléfono"
   - "[nombre negocio] [ciudad] sitio web"
   - "[nombre negocio] [ciudad] horarios contacto"
3. **scrapePage** — Si encuentras una web oficial, redes sociales o Google Maps, extrae el contenido completo
4. **updatePlace** — Actualiza todos los campos que hayas encontrado con datos confiables
5. **setPriority** — Evalúa score (1-5) y temperatura (cold/warm/hot) según el potencial y criterios de la empresa
6. **addNote** — Cierra siempre con una nota que resuma hallazgos, fuentes usadas y razonamiento de prioridad

## Reglas de calidad
- Haz mínimo 2 búsquedas web con queries distintos
- Siempre visita la web oficial si existe
- Solo actualiza campos con datos verificados y confiables
- La nota final debe ser detallada: qué encontraste, qué falta, por qué asignaste esa prioridad

Responde siempre en español. Sé conciso en tus respuestas al usuario pero exhaustivo en la investigación.`,
    tools: {
      getPlaceInfo: tool({
        description: 'Obtiene la información actual del lugar desde la base de datos, incluyendo las últimas notas. Llama esto primero.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const place = await prisma.place.findUnique({
              where: { id: placeId },
              include: {
                notes: {
                  orderBy: { created_at: 'desc' },
                  take: 5,
                  select: { content: true, username: true, created_at: true },
                },
              },
            })
            if (!place) return { error: 'Lugar no encontrado en la base de datos' }
            return place
          } catch (err) {
            return { error: `Error al obtener lugar: ${String(err)}` }
          }
        },
      }),

      searchWeb: tool({
        description: 'Busca información en internet sobre el lugar usando Firecrawl. Devuelve URLs, títulos y contenido relevante. Haz múltiples búsquedas con queries distintos para cubrir teléfono, web oficial, horarios y reseñas.',
        inputSchema: z.object({
          query: z.string().describe('Query de búsqueda específica. Ej: "Restaurante La Mar Miraflores Lima teléfono reservas"'),
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
        description: 'Extrae el contenido completo de una URL. Úsala en webs oficiales del negocio, Google Maps, TripAdvisor, redes sociales o cualquier fuente que tenga datos de contacto, horarios o descripción.',
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

      updatePlace: tool({
        description: 'Actualiza campos del lugar con información verificada. Solo envía los campos que hayas confirmado con fuentes confiables.',
        inputSchema: z.object({
          descriptions: z.string().optional().describe('Descripción del negocio (qué hace, su especialidad)'),
          phone:        z.string().optional().describe('Número de teléfono con código de país si es posible'),
          website:      z.string().url().optional().describe('URL del sitio web oficial'),
          price_range:  z.string().optional().describe('Rango de precios: $, $$, $$$ o $$$$'),
          timezone:     z.string().optional().describe('Zona horaria IANA, ej: America/Lima'),
        }),
        execute: async (data) => {
          try {
            const cleaned = Object.fromEntries(
              Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
            )
            if (Object.keys(cleaned).length === 0) {
              return { success: false, message: 'No hay campos para actualizar' }
            }
            await prisma.place.update({ where: { id: placeId }, data: cleaned })
            return { success: true, updated: Object.keys(cleaned) }
          } catch (err) {
            return { success: false, error: `Error al actualizar lugar: ${String(err)}` }
          }
        },
      }),

      setPriority: tool({
        description: 'Establece la calificación del lead. Úsala después de investigar y evaluar el potencial del negocio según los criterios de la empresa.',
        inputSchema: z.object({
          lead_score: z.number().min(1).max(5).describe(
            'Puntuación 1-5: 1=no califica, 2=baja prioridad, 3=interesante, 4=buena oportunidad, 5=oportunidad top'
          ),
          lead_temperature: z.enum(['cold', 'warm', 'hot']).describe(
            'Temperatura: cold=sin potencial inmediato, warm=seguimiento moderado, hot=contactar urgente'
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
        description: 'Añade una nota al lugar visible para todos los usuarios. Siempre termina la investigación con una nota que resuma los hallazgos, fuentes consultadas y justificación de la prioridad asignada.',
        inputSchema: z.object({
          content: z.string().min(20).describe('Nota detallada: hallazgos, fuentes, datos de contacto encontrados, evaluación del potencial y razonamiento de la prioridad'),
        }),
        execute: async ({ content }) => {
          try {
            const note = await prisma.placeNote.create({
              data: {
                place_id: placeId,
                user_id:  userId,
                username,
                content,
              },
            })
            return { success: true, noteId: note.id }
          } catch (err) {
            return { success: false, error: `Error al crear nota: ${String(err)}` }
          }
        },
      }),
    },
  })
}
