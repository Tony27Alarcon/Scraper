import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'
import { CreateSchema, JSON_FIELDS, type CreateInput } from '@/lib/placeSchema'

const SCALAR_FIELDS = [
  'input_id', 'link', 'title', 'category', 'address', 'phone', 'website',
  'plus_code', 'review_count', 'review_rating', 'latitude', 'longitude',
  'cid', 'status', 'descriptions', 'reviews_link', 'thumbnail', 'timezone',
  'price_range', 'data_id', 'place_id', 'batch_tag', 'city', 'country',
]

function parseJsonField(raw: string | undefined): { value: unknown; error: string | null } {
  if (!raw?.trim()) return { value: undefined, error: null }
  try {
    return { value: JSON.parse(raw), error: null }
  } catch {
    return { value: undefined, error: `JSON inválido: ${raw.slice(0, 60)}` }
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
  }

  const batchTag = (formData.get('batch_tag') as string | null)?.trim() || undefined

  const fileName = (file as File).name ?? ''
  if (!fileName.endsWith('.csv') && !fileName.endsWith('.tsv')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos .csv o .tsv' }, { status: 400 })
  }

  const text = await file.text()

  // Detectar delimitador automáticamente (soporta CSV y TSV)
  const delimiter = text.indexOf('\t') !== -1 ? '\t' : ','

  const { data: rows } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  })

  // Algunos exportadores TSV agregan columnas vacías al final — las eliminamos
  const validFields = new Set([...SCALAR_FIELDS, ...JSON_FIELDS])
  const cleanRows = rows.map(row => {
    const cleaned: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      if (k.trim() !== '' && validFields.has(k.trim())) cleaned[k.trim()] = v
    }
    return cleaned
  })

  const toInsert: CreateInput[] = []
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < cleanRows.length; i++) {
    const raw = cleanRows[i]
    const rowNum = i + 2 // +1 para índice 0, +1 por la fila de headers

    const payload: Record<string, unknown> = {}

    for (const field of SCALAR_FIELDS) {
      const v = raw[field]
      if (v !== undefined && v !== '') payload[field] = v
    }

    // batch_tag del formulario sobreescribe el del CSV (si se envió uno)
    if (batchTag) payload['batch_tag'] = batchTag

    let hasJsonError = false
    for (const field of JSON_FIELDS) {
      const { value, error } = parseJsonField(raw[field])
      if (error) {
        errors.push({ row: rowNum, message: `Campo "${field}": ${error}` })
        hasJsonError = true
        break
      }
      if (value !== undefined) payload[field] = value
    }
    if (hasJsonError) continue

    const parsed = CreateSchema.safeParse(payload)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      errors.push({
        row: rowNum,
        message: `${issue.path.join('.') || 'datos'}: ${issue.message}`,
      })
      continue
    }

    toInsert.push(parsed.data)
  }

  let imported = 0
  let skipped = 0

  if (toInsert.length > 0) {
    try {
      // Separar registros con y sin place_id
      const withPlaceId    = toInsert.filter((r: any) => r.place_id)
      const withoutPlaceId = toInsert.filter((r: any) => !r.place_id)

      // Deduplicar place_id DENTRO del mismo CSV (evita unique constraint en createMany)
      const seenInCsv = new Map<string, CreateInput>()
      for (const r of withPlaceId) seenInCsv.set((r as any).place_id, r)
      const uniqueInCsv = Array.from(seenInCsv.values())
      skipped += withPlaceId.length - uniqueInCsv.length

      // Buscar cuáles place_ids ya existen en la base de datos
      const existingIds = new Set(
        (await prisma.place.findMany({
          where: { place_id: { in: uniqueInCsv.map((r: any) => r.place_id) } },
          select: { place_id: true },
        })).map(r => r.place_id)
      )

      const newRecords = uniqueInCsv.filter((r: any) => !existingIds.has(r.place_id))
      skipped += uniqueInCsv.length - newRecords.length

      // Insertar en chunks los registros nuevos
      const CHUNK_SIZE = 500
      const toCreate = [...newRecords, ...withoutPlaceId]
      for (let start = 0; start < toCreate.length; start += CHUNK_SIZE) {
        const chunk = toCreate.slice(start, start + CHUNK_SIZE)
        const result = await prisma.place.createMany({ data: chunk as any })
        imported += result.count
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[places/import] Error al guardar en base de datos:', err)
      return NextResponse.json(
        {
          error: 'Error al guardar en base de datos',
          detail: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
