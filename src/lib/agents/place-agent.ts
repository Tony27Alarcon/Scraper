import { ToolLoopAgent, tool } from 'ai'
import { google } from '@ai-sdk/google'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export function createPlaceAgent(placeId: string, userId: number, username: string) {
  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    instructions: `Eres un asistente especializado en gestión de leads y negocios locales.
Tu tarea es ayudar a investigar, completar información y organizar por prioridad el lugar con ID: ${placeId}.

Flujo recomendado al investigar:
1. Llama a getPlaceInfo para ver los datos actuales
2. Usa google_search para buscar información actualizada del negocio
3. Actualiza los campos vacíos o incorrectos con updatePlace
4. Evalúa la prioridad y usa setPriority si corresponde
5. Deja una nota con addNote si tienes observaciones relevantes

Criterios de prioridad:
- hot (score 4-5): negocio activo, tiene web, buen rating (+4), datos completos
- warm (score 2-3): negocio establecido pero con datos incompletos o rating medio
- cold (score 1): negocio cerrado, sin web, datos escasos o rating bajo

Responde siempre en español. Sé conciso y directo en tus respuestas.`,
    tools: {
      google_search: google.tools.googleSearch({}),
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
