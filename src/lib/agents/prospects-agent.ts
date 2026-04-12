import { ToolLoopAgent, tool } from 'ai'
import { google } from '@ai-sdk/google'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface CreateProspectsAgentOptions {
  userId:         number
  username:       string
  companyContext?: string | null
}

export function createProspectsAgent({ userId, username, companyContext }: CreateProspectsAgentOptions) {
  const companySection = companyContext
    ? `\n\n## Perfil de la empresa (criterios de selección)\n${companyContext}`
    : ''

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    instructions: `Eres un agente especializado en identificar y seleccionar los mejores prospectos comerciales.
Tu objetivo es analizar lugares disponibles y crear listas de los 50 mejores prospectos para la empresa.${companySection}

## Flujo de trabajo
1. Llama a getTopRankedPlaces para obtener los candidatos mejor posicionados
2. Evalúa cada candidato contra los criterios de la empresa:
   - Relevancia del rubro/categoría
   - Calidad del lead (lead_score, lead_temperature)
   - Potencial comercial (rating, reseñas, presencia web)
   - Completitud de datos de contacto
3. Selecciona hasta 50 que mejor encajen y llama a saveProspectList
4. Para cada lugar seleccionado, escribe una razón breve que explique por qué es buen prospecto

## Criterios generales (si no hay perfil de empresa)
- Prioriza: lead_temperature = hot o warm
- Prioriza: lead_score >= 3
- Prioriza: negocios con teléfono y/o sitio web
- Prioriza: rating >= 3.5 con al menos 20 reseñas

Responde siempre en español. Al terminar, resume cuántos prospectos seleccionaste y por qué fueron elegidos.`,
    tools: {
      getTopRankedPlaces: tool({
        description: 'Obtiene los lugares mejor posicionados como prospectos, ordenados por score y rating. Devuelve los datos clave para evaluar cada uno.',
        inputSchema: z.object({
          limit:       z.number().min(10).max(200).default(150).describe('Máximo de lugares a devolver'),
          temperature: z.enum(['hot', 'warm', 'cold', '']).optional().describe('Filtrar por temperatura de lead'),
          minScore:    z.number().min(1).max(5).optional().describe('Puntaje mínimo de lead'),
          hasWebsite:  z.boolean().optional().describe('Solo lugares con sitio web'),
          hasPhone:    z.boolean().optional().describe('Solo lugares con teléfono'),
          category:    z.string().optional().describe('Filtrar por categoría de negocio'),
          batchTag:    z.string().optional().describe('Filtrar por lote de importación'),
        }),
        execute: async ({ limit, temperature, minScore, hasWebsite, hasPhone, category, batchTag }) => {
          const where: any = {}
          if (temperature)          where.lead_temperature = temperature
          if (minScore !== undefined) where.lead_score     = { gte: minScore }
          if (hasWebsite)            where.website         = { not: null }
          if (hasPhone)              where.phone           = { not: null }
          if (category)              where.category        = { contains: category, mode: 'insensitive' }
          if (batchTag)              where.batch_tag       = batchTag

          const places = await prisma.place.findMany({
            where,
            orderBy: [
              { lead_score:    'desc' },
              { review_rating: 'desc' },
              { review_count:  'desc' },
            ],
            take: limit,
            select: {
              id:               true,
              title:            true,
              category:         true,
              address:          true,
              phone:            true,
              website:          true,
              review_rating:    true,
              review_count:     true,
              lead_score:       true,
              lead_temperature: true,
              descriptions:     true,
              price_range:      true,
              status:           true,
            },
          })

          return {
            total: places.length,
            places: places.map((p, i) => ({
              rank:             i + 1,
              id:               p.id,
              title:            p.title,
              category:         p.category,
              address:          p.address,
              phone:            p.phone ?? null,
              website:          p.website ?? null,
              rating:           p.review_rating ? Number(p.review_rating) : null,
              reviews:          p.review_count,
              lead_score:       p.lead_score,
              lead_temperature: p.lead_temperature,
              description:      p.descriptions?.slice(0, 200) ?? null,
              price_range:      p.price_range,
              status:           p.status,
            })),
          }
        },
      }),

      saveProspectList: tool({
        description: 'Guarda una lista de prospectos seleccionados con sus razones de inclusión. Máximo 50 lugares por lista.',
        inputSchema: z.object({
          name:        z.string().min(1).describe('Nombre descriptivo de la lista, ej: "Top 50 Restaurantes Lima"'),
          description: z.string().optional().describe('Descripción de los criterios usados'),
          prospects: z.array(z.object({
            placeId: z.string(),
            rank:    z.number().optional(),
            reason:  z.string().optional().describe('Razón por la que este lugar es buen prospecto'),
          })).max(50).describe('Lista de prospectos seleccionados (máximo 50)'),
        }),
        execute: async ({ name, description, prospects }) => {
          const list = await prisma.prospectList.create({
            data: {
              name,
              description: description ?? null,
              created_by: userId,
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
        },
      }),

      getProspectLists: tool({
        description: 'Obtiene todas las listas de prospectos creadas anteriormente',
        inputSchema: z.object({}),
        execute: async () => {
          const lists = await prisma.prospectList.findMany({
            include: { _count: { select: { items: true } } },
            orderBy: { created_at: 'desc' },
          })
          return lists.map(l => ({
            id:          l.id,
            name:        l.name,
            description: l.description,
            count:       l._count.items,
            createdAt:   l.created_at,
          }))
        },
      }),
    },
  })
}
