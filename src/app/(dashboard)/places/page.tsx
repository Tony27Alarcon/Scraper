import { prisma } from '@/lib/prisma'
import { PlacesTable } from '@/components/places/PlacesTable'
import { PlaceFilters } from '@/components/places/PlaceFilters'
import { ImportCSVButton } from '@/components/places/ImportCSVButton'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const PAGE_SIZE = 20

interface SearchParams {
  page?:          string
  search?:        string
  category?:      string
  batch_tag?:     string
  temperature?:   string
  favorites?:     string
  min_rating?:    string
  min_score?:     string
  sort?:          string
  order?:         string
  prospect_list?: string
}

async function getPlaces(params: SearchParams, userId: number) {
  const page         = Math.max(1, Number(params.page ?? 1))
  const search       = params.search        ?? ''
  const category     = params.category      ?? ''
  const batchTag     = params.batch_tag     ?? ''
  const temperature  = params.temperature   ?? ''
  const favorites    = params.favorites     === 'true'
  const minRating    = parseFloat(params.min_rating ?? '')
  const minScore     = parseInt(params.min_score    ?? '')
  const sort         = params.sort  ?? 'recent'
  const order        = (params.order ?? 'desc') as 'asc' | 'desc'
  const prospectList = params.prospect_list ?? ''

  // Base where without temperature (used for temp counts)
  const whereBase: any = {}
  if (search) {
    whereBase.OR = [
      { title:    { contains: search, mode: 'insensitive' } },
      { address:  { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
      { phone:    { contains: search, mode: 'insensitive' } },
    ]
  }
  if (category)          whereBase.category      = { equals: category, mode: 'insensitive' }
  if (batchTag)          whereBase.batch_tag     = { equals: batchTag, mode: 'insensitive' }
  if (favorites)         whereBase.favorites     = { some: { user_id: userId } }
  if (!isNaN(minRating)) whereBase.review_rating  = { gte: minRating }
  if (!isNaN(minScore))  whereBase.lead_score     = { gte: minScore }
  if (prospectList)      whereBase.prospectItems  = { some: { list_id: prospectList } }

  // Full where including temperature
  const where: any = { ...whereBase }
  if (temperature) where.lead_temperature = temperature

  // Sorting
  let orderBy: any = { created_at: order }
  if (sort === 'rating')  orderBy = { review_rating: order }
  if (sort === 'reviews') orderBy = { review_count:  order }
  if (sort === 'score')   orderBy = { lead_score:    order }
  if (sort === 'title')   orderBy = { title:         order }

  const [raw, total, allCategories, allBatchTags, tempGroups, prospectLists] = await Promise.all([
    prisma.place.findMany({
      where,
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      orderBy,
      select: {
        id:               true,
        title:            true,
        category:         true,
        address:          true,
        phone:            true,
        review_rating:    true,
        review_count:     true,
        status:           true,
        thumbnail:        true,
        website:          true,
        created_at:       true,
        lead_score:       true,
        lead_temperature: true,
        favorites: {
          where:  { user_id: userId },
          select: { id: true },
        },
      },
    }),
    prisma.place.count({ where }),
    prisma.place.findMany({
      select:   { category: true },
      distinct: ['category'],
      where:    { category: { not: null } },
      orderBy:  { category: 'asc' },
    }),
    prisma.place.findMany({
      select:   { batch_tag: true },
      distinct: ['batch_tag'],
      where:    { batch_tag: { not: null } },
      orderBy:  { batch_tag: 'asc' },
    }),
    // Count by temperature using the base where (without temp filter)
    prisma.place.groupBy({
      by:    ['lead_temperature'],
      where: whereBase,
      _count: { _all: true },
    }),
    prisma.prospectList.findMany({
      select:  { id: true, name: true },
      orderBy: { created_at: 'desc' },
    }),
  ])

  const data = raw.map(({ favorites, ...p }) => ({
    ...p,
    isFavorited: favorites.length > 0,
  }))

  const categories = allCategories.map(c => c.category).filter(Boolean) as string[]
  const batchTags  = allBatchTags.map(b => b.batch_tag).filter(Boolean) as string[]

  const coldCount = tempGroups.find(t => t.lead_temperature === 'cold')?._count._all ?? 0
  const warmCount = tempGroups.find(t => t.lead_temperature === 'warm')?._count._all ?? 0
  const hotCount  = tempGroups.find(t => t.lead_temperature === 'hot')?._count._all  ?? 0

  return {
    data, total, page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    categories, batchTags, prospectLists,
    coldCount, warmCount, hotCount,
  }
}

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  const userId  = parseInt(session?.user?.id ?? '0')
  const result  = await getPlaces(searchParams, userId)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lugares</h1>
          <p className="text-gray-500 mt-0.5">
            {result.total.toLocaleString('es-ES')} lugares encontrados
          </p>
        </div>
        {session?.user?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <ImportCSVButton />
            <Link href="/places/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              Nuevo Lugar
            </Link>
          </div>
        )}
      </div>

      <PlaceFilters
        categories={result.categories}
        batchTags={result.batchTags}
        prospectLists={result.prospectLists}
        currentSearch={searchParams.search        ?? ''}
        currentCategory={searchParams.category    ?? ''}
        currentBatchTag={searchParams.batch_tag   ?? ''}
        currentTemperature={searchParams.temperature ?? ''}
        currentFavorites={searchParams.favorites  === 'true'}
        currentMinRating={searchParams.min_rating ?? ''}
        currentMinScore={searchParams.min_score   ?? ''}
        currentSort={searchParams.sort            ?? 'recent'}
        currentOrder={searchParams.order          ?? 'desc'}
        currentProspectList={searchParams.prospect_list ?? ''}
        coldCount={result.coldCount}
        warmCount={result.warmCount}
        hotCount={result.hotCount}
      />

      <PlacesTable
        data={result.data as any}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        isAdmin={session?.user?.role === 'admin'}
        currentUserId={userId}
        currentSort={searchParams.sort   ?? 'recent'}
        currentOrder={searchParams.order ?? 'desc'}
      />
    </div>
  )
}
