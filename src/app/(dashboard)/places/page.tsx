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
  page?:      string
  search?:    string
  category?:  string
  batch_tag?: string
}

async function getPlaces(params: SearchParams, userId: number) {
  const page     = Math.max(1, Number(params.page ?? 1))
  const search   = params.search    ?? ''
  const category = params.category  ?? ''
  const batchTag = params.batch_tag ?? ''

  const where: any = {}
  if (search) {
    where.OR = [
      { title:    { contains: search, mode: 'insensitive' } },
      { address:  { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
      { phone:    { contains: search, mode: 'insensitive' } },
    ]
  }
  if (category) {
    where.category = { equals: category, mode: 'insensitive' }
  }
  if (batchTag) {
    where.batch_tag = { equals: batchTag, mode: 'insensitive' }
  }

  const [raw, total, allCategories, allBatchTags] = await Promise.all([
    prisma.place.findMany({
      where,
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      orderBy: { created_at: 'desc' },
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
  ])

  const data = raw.map(({ favorites, ...p }) => ({
    ...p,
    isFavorited: favorites.length > 0,
  }))

  const categories = allCategories.map(c => c.category).filter(Boolean) as string[]
  const batchTags  = allBatchTags.map(b => b.batch_tag).filter(Boolean) as string[]

  return { data, total, page, totalPages: Math.ceil(total / PAGE_SIZE), categories, batchTags }
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
            {result.total.toLocaleString('es-ES')} lugares en total
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
        currentSearch={searchParams.search ?? ''}
        currentCategory={searchParams.category ?? ''}
        currentBatchTag={searchParams.batch_tag ?? ''}
      />

      <PlacesTable
        data={result.data as any}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        isAdmin={session?.user?.role === 'admin'}
        currentUserId={userId}
      />
    </div>
  )
}
