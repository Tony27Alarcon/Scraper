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
  page?:     string
  search?:   string
  category?: string
}

async function getPlaces(params: SearchParams) {
  const page     = Math.max(1, Number(params.page ?? 1))
  const search   = params.search   ?? ''
  const category = params.category ?? ''

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

  const [data, total, allCategories] = await Promise.all([
    prisma.place.findMany({
      where,
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      orderBy: { created_at: 'desc' },
      select: {
        id:            true,
        title:         true,
        category:      true,
        address:       true,
        phone:         true,
        review_rating: true,
        review_count:  true,
        status:        true,
        thumbnail:     true,
        website:       true,
        created_at:    true,
      },
    }),
    prisma.place.count({ where }),
    prisma.place.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } },
      orderBy: { category: 'asc' },
    }),
  ])

  const categories = allCategories
    .map((c) => c.category)
    .filter(Boolean) as string[]

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    categories,
  }
}

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  const result  = await getPlaces(searchParams)

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
        currentSearch={searchParams.search ?? ''}
        currentCategory={searchParams.category ?? ''}
      />

      <PlacesTable
        data={result.data as any}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        isAdmin={session?.user?.role === 'admin'}
      />
    </div>
  )
}
