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
  const lines = ['\n## Tu empresa (criterios de seleccion)']
  lines.push(`- **Nombre:** ${company.name}`)
  if (company.industry)    lines.push(`- **Industria / Nicho:** ${company.industry}`)
  if (company.website)     lines.push(`- **Sitio web:** ${company.website}`)
  if (company.description) lines.push(`- **Descripcion:** ${company.description}`)
  if (company.ai_context)  lines.push(`\n### Instrucciones y criterios del cliente\n${company.ai_context}`)
  return lines.join('\n')
}

export function createProspectsAgent({ userId, username, company }: CreateProspectsAgentOptions) {
  const companySection = buildCompanySection(company)

  return new ToolLoopAgent({
    model: google('gemini-2.5-flash'),
    stopWhen: stepCountIs(10),
    instructions: `# Identidad

Eres **Radar**, Estratega de Seleccion de Prospectos. Tu especialidad: analizar datasets completos de negocios y extraer las mejores oportunidades comerciales con precision quirurgica.

No eres un filtro pasivo — eres un analista que entiende la diferencia entre un negocio con numeros altos y un prospecto que realmente va a comprar. Cada lista que creas debe ser inmediatamente accionable por el equipo de ventas.
${companySection}

## Tu mentalidad

**Estrategico, no mecanico.** No ordenas por score y cortas en 50. Analizas la distribucion del dataset, identificas segmentos de valor, y seleccionas con criterio. Un restaurante con score 3 pero web profesional y 500 resenas puede ser mejor prospecto que uno con score 5 pero sin telefono.

**Orientado a la accion.** Cada lista que creas tiene un proposito claro: "estos 30 son para llamar esta semana", "estos 20 necesitan investigacion antes de contactar", "estos 50 son para una campaña de email". La lista sin contexto de accion es inutil.

**Analitico y transparente.** Siempre explicas: que criterios usaste, por que excluiste ciertos candidatos, que patron encontraste en los datos. El usuario debe confiar en tu seleccion porque entiende tu razonamiento.

## Proceso de trabajo

### Fase 1: Diagnostico del dataset
→ **getPlacesStats** — Antes de seleccionar, ENTIENDE:
- Cuantos registros hay en total
- Como esta distribuida la temperatura y el score
- Que categorias dominan
- Cuantos tienen datos de contacto completos
- Cuantos estan sin evaluar

Con este diagnostico, reporta al usuario: "Tienes X registros, Y% estan evaluados, Z estan hot. Voy a crear una lista enfocada en [criterio]."

### Fase 2: Extraccion y analisis
→ **getTopRankedPlaces** — Extrae mas candidatos de los que necesitas (150-200) para tener margen de seleccion. Aplica filtros inteligentes basados en:
- El perfil de la empresa (si existe)
- La distribucion del dataset (si 80% son restaurantes, no filtres por categoria)
- Combinaciones estrategicas (hot + con telefono > warm + sin datos)

### Fase 3: Seleccion curada
→ **getTopRankedPlaces** con filtros diferentes si necesitas mas candidatos o de otro segmento.

Selecciona con criterio, no por orden:
- **Tier 1 (primeros 15-20):** Los mejores absolutos — score alto, datos completos, fit perfecto
- **Tier 2 (siguientes 15-20):** Buenos prospectos que necesitan un poco mas de investigacion
- **Tier 3 (ultimos 10-15):** Oportunidades emergentes — quiza score medio pero con señales interesantes

### Fase 4: Lista final
→ **saveProspectList** — Cada prospecto con una razon ESPECIFICA y DIFERENTE:

❌ MAL: "Buen score y buena reputacion" (esto no dice nada)
✅ BIEN: "Restaurante premium ($$$$) con 4.8 estrellas y 1200 resenas. Tiene web profesional con sistema de reservas — señal de que invierte en tecnologia. Ideal para [servicio de la empresa]."

La descripcion de la lista debe incluir:
1. Criterios de seleccion usados
2. Metodologia (que filtros, que pesos)
3. Recomendacion de abordaje (llamar? email? LinkedIn?)
4. Segmentos identificados dentro de la lista

### Fase 5: Reporte y recomendaciones
Despues de guardar, entrega al usuario:
- Resumen ejecutivo: cuantos seleccionaste y por que
- Distribucion: cuantos por tier, por ciudad, por categoria
- Insights: patrones encontrados (ej: "los restaurantes de Miraflores tienen mejor score promedio")
- Recomendacion: por donde empezar a contactar y como priorizarlos
- Siguiente paso sugerido: "Quieres que investigue a fondo los top 5 de la lista?"

## Framework de seleccion (si no hay perfil de empresa)

**Prioridad ALTA (incluir primero):**
- lead_temperature = hot o warm
- lead_score >= 4
- Tiene telefono Y sitio web
- review_rating >= 4.0 con 50+ resenas

**Prioridad MEDIA (incluir si hay espacio):**
- lead_score = 3 con datos parciales
- Rating bueno pero pocos datos de contacto
- Categoria relevante pero sin evaluar

**Excluir:**
- lead_score <= 1
- Status: cerrado, duplicado
- Sin ningun dato de contacto Y sin score

## Reglas operativas
- NUNCA crees una lista sin antes analizar las estadisticas del dataset
- Cada prospecto DEBE tener una razon unica y especifica — si no puedes escribir una razon diferenciada, no lo incluyas
- Si el dataset tiene menos de 50 candidatos viables, incluye menos — calidad sobre cantidad
- Evita duplicar prospectos que ya esten en listas anteriores (usa getProspectLists para verificar)
- Responde siempre en español
- Presenta los resultados de forma ejecutiva — el usuario es un profesional de ventas que necesita actuar, no leer un ensayo`,

    tools: {
      getPlacesStats: tool({
        description: 'Diagnostico completo del dataset: totales, distribucion por temperatura/score/categoria/ciudad, cobertura de datos de contacto, registros sin evaluar. SIEMPRE es tu primer paso — necesitas entender el panorama antes de seleccionar.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const [total, byTemperature, byScore, topCategories, topCities, withPhone, withWebsite, withEmail, ratingStats, unscored, withDescription] = await Promise.all([
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
                take:   15,
              }),
              prisma.place.groupBy({
                by:     ['city'],
                _count: { _all: true },
                orderBy: { _count: { city: 'desc' } },
                take:   10,
              }),
              prisma.place.count({ where: { phone:   { not: null } } }),
              prisma.place.count({ where: { website: { not: null } } }),
              prisma.place.count({ where: { email:   { not: null } } }),
              prisma.place.aggregate({
                _avg: { review_rating: true },
                _count: { review_rating: true },
                _max: { review_rating: true },
                _min: { review_rating: true },
              }),
              prisma.place.count({ where: { lead_score: null } }),
              prisma.place.count({ where: { descriptions: { not: null } } }),
            ])

            const hotCount  = byTemperature.find(t => t.lead_temperature === 'hot')?._count._all ?? 0
            const warmCount = byTemperature.find(t => t.lead_temperature === 'warm')?._count._all ?? 0
            const coldCount = byTemperature.find(t => t.lead_temperature === 'cold')?._count._all ?? 0

            return {
              total,
              cobertura: {
                conTelefono:     withPhone,
                sinTelefono:     total - withPhone,
                conWeb:          withWebsite,
                sinWeb:          total - withWebsite,
                conEmail:        withEmail,
                sinEmail:        total - withEmail,
                conDescripcion:  withDescription,
                sinEvaluar:      unscored,
                evaluados:       total - unscored,
              },
              temperatura: { hot: hotCount, warm: warmCount, cold: coldCount, sinClasificar: total - hotCount - warmCount - coldCount },
              score: byScore.map(s => ({
                score: s.lead_score ?? 'sin score',
                count: s._count._all,
              })),
              topCategorias: topCategories.map(c => ({
                categoria: c.category ?? 'sin categoria',
                count:     c._count._all,
              })),
              topCiudades: topCities.map(c => ({
                ciudad: c.city ?? 'sin ciudad',
                count:  c._count._all,
              })),
              ratings: {
                promedio: ratingStats._avg.review_rating ? Number(ratingStats._avg.review_rating).toFixed(1) : null,
                maximo:   ratingStats._max.review_rating ? Number(ratingStats._max.review_rating) : null,
                minimo:   ratingStats._min.review_rating ? Number(ratingStats._min.review_rating) : null,
                conRating: ratingStats._count.review_rating,
              },
            }
          } catch (err) {
            return { error: `Error al obtener estadisticas: ${String(err)}` }
          }
        },
      }),

      getTopRankedPlaces: tool({
        description: 'Extrae los candidatos mejor posicionados con filtros flexibles. Pide MAS de los que necesitas (150-200) para tener margen de seleccion. Combina filtros estrategicamente segun el diagnostico del dataset.',
        inputSchema: z.object({
          limit:       z.number().min(10).max(200).default(150).describe('Candidatos a extraer (pide mas de 50 para tener margen)'),
          temperature: z.enum(['hot', 'warm', 'cold']).optional().describe('Filtrar por temperatura'),
          minScore:    z.number().min(1).max(5).optional().describe('Score minimo'),
          maxScore:    z.number().min(1).max(5).optional().describe('Score maximo (util para encontrar oportunidades no evaluadas)'),
          hasWebsite:  z.boolean().optional().describe('true=con web, false=sin web'),
          hasPhone:    z.boolean().optional().describe('true=con telefono, false=sin telefono'),
          category:    z.string().optional().describe('Filtrar por categoria (busqueda parcial)'),
          batchTag:    z.string().optional().describe('Filtrar por lote de importacion'),
          city:        z.string().optional().describe('Filtrar por ciudad'),
          country:     z.string().optional().describe('Filtrar por pais'),
          minRating:   z.number().min(1).max(5).optional().describe('Rating minimo de resenas'),
          minReviews:  z.number().min(0).optional().describe('Cantidad minima de resenas'),
        }),
        execute: async ({ limit, temperature, minScore, maxScore, hasWebsite, hasPhone, category, batchTag, city, country, minRating, minReviews }) => {
          try {
            const where: Prisma.PlaceWhereInput = {}
            if (temperature)           where.lead_temperature = temperature
            if (minScore !== undefined && maxScore !== undefined) {
              where.lead_score = { gte: minScore, lte: maxScore }
            } else if (minScore !== undefined) {
              where.lead_score = { gte: minScore }
            } else if (maxScore !== undefined) {
              where.lead_score = { lte: maxScore }
            }
            if (hasWebsite === true)   where.website = { not: null }
            if (hasWebsite === false)  where.website = null
            if (hasPhone === true)     where.phone   = { not: null }
            if (hasPhone === false)    where.phone   = null
            if (category)              where.category = { contains: category, mode: 'insensitive' }
            if (batchTag)              where.batch_tag = batchTag
            if (city)                  where.city     = { equals: city, mode: 'insensitive' }
            if (country)               where.country  = { equals: country, mode: 'insensitive' }
            if (minRating !== undefined) where.review_rating = { gte: minRating }
            if (minReviews !== undefined) where.review_count = { gte: minReviews }

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
                city:             true,
                country:          true,
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
              filtrosAplicados: { temperature, minScore, maxScore, hasWebsite, hasPhone, category, city, country, minRating, minReviews },
              places: places.map((p, i) => ({
                rank:             i + 1,
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
                description:      p.descriptions?.slice(0, 200) ?? null,
                price_range:      p.price_range,
                status:           p.status,
                datosCompletos:   !!(p.phone && p.website && p.descriptions),
              })),
            }
          } catch (err) {
            return { error: `Error al obtener lugares: ${String(err)}`, total: 0, places: [] }
          }
        },
      }),

      saveProspectList: tool({
        description: 'Guarda la lista final curada. Max 50. Cada prospecto DEBE tener una razon UNICA y ESPECIFICA — nada generico. Si no puedes diferenciar por que incluiste un prospecto, no lo incluyas.',
        inputSchema: z.object({
          name:        z.string().min(1).describe('Nombre accionable. Ej: "Top 30 Restaurantes Lima - Listos para llamar esta semana"'),
          description: z.string().optional().describe('Criterios de seleccion, metodologia, segmentos identificados, y recomendacion de abordaje'),
          prospects: z.array(z.object({
            placeId: z.string().describe('ID del lugar'),
            rank:    z.number().optional().describe('Posicion en el ranking'),
            reason:  z.string().min(10).describe('Razon ESPECIFICA y DIFERENCIADA. Ej: "Restaurante premium con 4.8 estrellas, 1200 resenas y web con reservas online — invierte en tecnologia"'),
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
        description: 'Obtiene listas de prospectos anteriores. SIEMPRE verifica antes de crear una nueva lista para evitar duplicados o solapamiento con trabajo previo.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const lists = await prisma.prospectList.findMany({
              include: {
                _count: { select: { items: true } },
                items: {
                  take: 5,
                  orderBy: { rank: 'asc' },
                  select: { place_id: true, rank: true, reason: true },
                },
              },
              orderBy:  { created_at: 'desc' },
              take:     10,
            })
            return lists.map(l => ({
              id:          l.id,
              name:        l.name,
              description: l.description,
              count:       l._count.items,
              createdAt:   l.created_at,
              topItems:    l.items,
            }))
          } catch (err) {
            return { error: `Error al obtener listas: ${String(err)}` }
          }
        },
      }),
    },
  })
}
