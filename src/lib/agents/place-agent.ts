import { ToolLoopAgent, tool } from 'ai'
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
    ? `\n\n## Perfil de la empresa (usa esto para contextualizar cada análisis)\n${companyContext}`
    : ''

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    instructions: `Eres un asistente especializado en gestión de leads y negocios locales.
Tu tarea es ayudar a investigar, completar información y organizar por prioridad el lugar con ID: ${placeId}.${companySection}

Flujo recomendado al investigar:
1. Llama a getPlaceInfo para ver los datos actuales del lugar
2. Usa searchWeb para buscar el negocio por nombre + ciudad y encontrar fuentes relevantes
3. Si encuentras una URL concreta (web oficial, Google Maps, redes sociales), usa scrapePage para extraer detalles
4. Actualiza los campos vacíos o incorrectos con updatePlace
5. Evalúa la prioridad y usa setPriority según los criterios de la empresa
6. Deja una nota con addNote resumiendo los hallazgos y su relevancia para la empresa

Responde siempre en español. Sé conciso y directo en tus respuestas.`,
    tools: {
      getPlaceInfo: tool({
        description: 'Obtiene la información actual del lugar desde la base de datos, incluyendo las últimas notas',
        inputSchema: z.object({}),
        execute: async () => {
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
          return place
        },
      }),
      searchWeb: tool({
        description: 'Busca información en internet sobre el lugar usando Firecrawl. Devuelve URLs, títulos y fragmentos relevantes.',
        inputSchema: z.object({
          query: z.string().describe('Consulta de búsqueda, ej: "Restaurante La Mar Lima Perú telefono web"'),
          limit: z.number().min(1).max(10).default(5).describe('Número máximo de resultados'),
        }),
        execute: async ({ query, limit }) => {
          const fc = getFirecrawl()
          const result = await fc.search(query, { limit })
          const items = result.web ?? []
          return items.map((item) => {
            const asWeb = item as { url?: string; title?: string; description?: string; markdown?: string; metadata?: { title?: string; description?: string } }
            return {
              url: asWeb.url ?? '',
              title: asWeb.title ?? asWeb.metadata?.title ?? '',
              description: asWeb.description ?? asWeb.metadata?.description ?? '',
              content: (asWeb.markdown ?? '').slice(0, 800),
            }
          })
        },
      }),
      scrapePage: tool({
        description: 'Extrae el contenido completo de una URL específica. Útil para obtener teléfono, horarios, descripción y otros detalles de la web oficial del negocio.',
        inputSchema: z.object({
          url: z.string().url().describe('URL de la página a extraer'),
        }),
        execute: async ({ url }) => {
          const fc = getFirecrawl()
          const result = await fc.scrape(url, { formats: ['markdown'] })
          return {
            url,
            title: result.metadata?.title ?? '',
            description: result.metadata?.description ?? '',
            content: (result.markdown ?? '').slice(0, 3000),
          }
        },
      }),
      updatePlace: tool({
        description: 'Actualiza campos informativos del lugar (descripción, teléfono, web, precio, zona horaria)',
        inputSchema: z.object({
          descriptions: z.string().optional().describe('Descripción del negocio'),
          phone: z.string().optional().describe('Número de teléfono'),
          website: z.string().optional().describe('URL del sitio web'),
          price_range: z.string().optional().describe('Rango de precios, ej: $, $$, $$$'),
          timezone: z.string().optional().describe('Zona horaria, ej: America/Mexico_City'),
        }),
        execute: async (data) => {
          const cleaned = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
          )
          if (Object.keys(cleaned).length === 0) {
            return { success: false, message: 'No hay campos para actualizar' }
          }
          await prisma.place.update({ where: { id: placeId }, data: cleaned })
          return { success: true, updated: Object.keys(cleaned) }
        },
      }),
      setPriority: tool({
        description: 'Establece la prioridad del lead: score 1-5 y temperatura cold/warm/hot',
        inputSchema: z.object({
          lead_score: z.number().min(1).max(5).optional().describe('Puntuación del lead de 1 (baja) a 5 (alta)'),
          lead_temperature: z.enum(['cold', 'warm', 'hot']).optional().describe('Temperatura del lead'),
        }),
        execute: async ({ lead_score, lead_temperature }) => {
          await prisma.place.update({
            where: { id: placeId },
            data: {
              ...(lead_score !== undefined ? { lead_score } : {}),
              ...(lead_temperature !== undefined ? { lead_temperature } : {}),
            },
          })
          return { success: true, lead_score, lead_temperature }
        },
      }),
      addNote: tool({
        description: 'Añade una nota al lugar visible para todos los usuarios',
        inputSchema: z.object({
          content: z.string().describe('Contenido de la nota'),
        }),
        execute: async ({ content }) => {
          const note = await prisma.placeNote.create({
            data: {
              place_id: placeId,
              user_id: userId,
              username,
              content,
            },
          })
          return { success: true, noteId: note.id }
        },
      }),
    },
  })
}
