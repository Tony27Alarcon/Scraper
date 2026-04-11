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
  'price_range', 'data_id', 'place_id',
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

  const fileName = (file as File).name ?? ''
  if (!fileName.endsWith('.csv')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos .csv' }, { status: 400 })
  }

  const text = await file.text()

  const { data: rows } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  const toInsert: CreateInput[] = []
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const rowNum = i + 2 // +1 para índice 0, +1 por la fila de headers

    const payload: Record<string, unknown> = {}

    for (const field of SCALAR_FIELDS) {
      const v = raw[field]
      if (v !== undefined && v !== '') payload[field] = v
    }

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
    const CHUNK_SIZE = 500
    try {
      for (let start = 0; start < toInsert.length; start += CHUNK_SIZE) {
        const chunk = toInsert.slice(start, start + CHUNK_SIZE)
        const result = await prisma.place.createMany({
          data: chunk as any,
          skipDuplicates: true,
        })
        imported += result.count
        skipped  += chunk.length - result.count
      }
    } catch {
      return NextResponse.json({ error: 'Error al guardar en base de datos' }, { status: 500 })
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
