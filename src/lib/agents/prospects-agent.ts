import { ToolLoopAgent, tool, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

interface CompanyProfile {
  name:         string
  industry?:    string | null
  description?: string | null
  website?:     string | null
  ai_context:   string
}

interface CreateProspectsAgentOptions {
  userId:   number
  username: string
  company?: CompanyProfile | null
}

function buildCompanySection(company?: CompanyProfile | null): string {
  if (!company) return ''
  const lines = ['## Empresa (criterios de selección)']
  lines.push(`- **Nombre:** ${company.name}`)
  if (company.industry)    lines.push(`- **Industria / Nicho:** ${company.industry}`)
  if (company.website)     lines.push(`- **Sitio web:** ${company.website}`)
  if (company.description) lines.push(`- **Descripción:** ${company.description}`)
  if (company.ai_context)  lines.push(`\n### Instrucciones y criterios\n${company.ai_context}`)
  return '\n\n' + lines.join('\n')
}

export function createProspectsAgent({ userId, username, company }: CreateProspectsAgentOptions) {
  const companySection = buildCompanySection(company)

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    stopWhen: stepCountIs(6),
    instructions: `Eres un agente especializado en identificar y seleccionar los mejores prospectos comerciales.
Tu objetivo: analizar los lugares disponibles y crear una lista con los 50 mejores prospectos para la empresa.${companySection}

## Proceso recomendado
1. **getPlacesStats** — Empieza aquí para entender la distribución del dataset (categorías, scores, temperaturas)
2. **getTopRankedPlaces** — Obtén los candidatos mejor posicionados, usando filtros si el perfil de empresa los sugiere
3. **saveProspectList** — Guarda la lista final con máximo 50 prospectos, incluyendo una razón clara para cada uno

## Criterios de selección (si no hay perfil de empresa)
- Prioridad alta: lead_temperature = hot o warm
- Prioridad alta: lead_score >= 3
- Prioridad alta: negocios con teléfono y/o sitio web
- Prioridad alta: review_rating >= 3.5 con al menos 20 reseñas
- Prioridad baja: datos de contacto incompletos, score bajo, sin reseñas

## Al guardar la lista
- El nombre debe ser descriptivo: ej. "Top 50 Restaurantes Lima - Hot Leads"
- Cada prospecto debe tener una razón específica (no genérica) de por qué fue seleccionado
- Describe en el campo descripción qué criterios usaste para la selección

Responde siempre en español. Al terminar, indica cuántos prospectos seleccionaste y el razonamiento general.`,
    tools: {
      getPlacesStats: tool({
        description: 'Obtiene estadísticas generales del dataset: distribución por temperatura, score promedio, categorías principales y totales. Úsalo al inicio para entender el panorama antes de seleccionar.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const [total, byTemperature, byScore, topCategories] = await Promise.all([
              prisma.place.count(),
              prisma.place.groupBy({
                by:     ['lead_temperature'],
                _count: { _all: true },
              }),
              prisma.place.groupBy({
                by:     ['lead_score'],
                _count: { _all: true },
                orderBy: { lead_score: 'desc' },
              }),
              prisma.place.groupBy({
                by:     ['category'],
                _count: { _all: true },
                orderBy: { _count: { category: 'desc' } },
                take:   10,
              }),
            ])

            const withPhone   = await prisma.place.count({ where: { phone:   { not: null } } })
            const withWebsite = await prisma.place.count({ where: { website: { not: null } } })

            return {
              total,
              withPhone,
              withWebsite,
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

      getTopRankedPlaces: tool({
        description: 'Obtiene los lugares mejor posicionados como prospectos, ordenados por score y rating. Aplica filtros según el perfil de empresa para refinar la selección.',
        inputSchema: z.object({
          limit:       z.number().min(10).max(200).default(150).describe('Máximo de lugares a devolver (devuelve más de 50 para tener margen de selección)'),
          temperature: z.enum(['hot', 'warm', 'cold']).optional().describe('Filtrar por temperatura de lead'),
          minScore:    z.number().min(1).max(5).optional().describe('Puntaje mínimo de lead'),
          hasWebsite:  z.boolean().optional().describe('Solo lugares con sitio web'),
          hasPhone:    z.boolean().optional().describe('Solo lugares con teléfono'),
          category:    z.string().optional().describe('Filtrar por categoría de negocio (búsqueda parcial)'),
          batchTag:    z.string().optional().describe('Filtrar por lote de importación'),
          city:        z.string().optional().describe('Filtrar por ciudad (búsqueda exacta)'),
          country:     z.string().optional().describe('Filtrar por país (búsqueda exacta)'),
        }),
        execute: async ({ limit, temperature, minScore, hasWebsite, hasPhone, category, batchTag, city, country }) => {
          try {
            const where: Prisma.PlaceWhereInput = {}
            if (temperature)           where.lead_temperature = temperature
            if (minScore !== undefined) where.lead_score       = { gte: minScore }
            if (hasWebsite)            where.website           = { not: null }
            if (hasPhone)              where.phone             = { not: null }
            if (category)              where.category          = { contains: category, mode: 'insensitive' }
            if (batchTag)              where.batch_tag         = batchTag
            if (city)                  where.city              = { equals: city, mode: 'insensitive' }
            if (country)               where.country           = { equals: country, mode: 'insensitive' }

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
          } catch (err) {
            return { error: `Error al obtener lugares: ${String(err)}`, total: 0, places: [] }
          }
        },
      }),

      saveProspectList: tool({
        description: 'Guarda la lista final de prospectos seleccionados con sus razones. Máximo 50 lugares por lista. Incluye una razón específica para cada prospecto.',
        inputSchema: z.object({
          name:        z.string().min(1).describe('Nombre descriptivo, ej: "Top 50 Restaurantes Lima - Hot Leads Abril 2025"'),
          description: z.string().optional().describe('Descripción de los criterios y metodología usada para la selección'),
          prospects: z.array(z.object({
            placeId: z.string().describe('ID del lugar'),
            rank:    z.number().optional().describe('Posición en el ranking'),
            reason:  z.string().min(10).describe('Razón específica por la que este lugar es un buen prospecto para la empresa'),
          })).max(50).describe('Lista de prospectos seleccionados (máximo 50)'),
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
        description: 'Obtiene todas las listas de prospectos creadas anteriormente. Úsala para evitar duplicar listas o para referenciar trabajos previos.',
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
