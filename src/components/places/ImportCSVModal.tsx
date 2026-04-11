'use client'

import { useState } from 'react'
import { Upload, X, CheckCircle2, AlertTriangle, XCircle, Download } from 'lucide-react'

const CSV_HEADERS = [
  'input_id','link','title','category','address','open_hours','popular_times',
  'website','phone','plus_code','review_count','review_rating','reviews_per_rating',
  'latitude','longitude','cid','status','descriptions','reviews_link','thumbnail',
  'timezone','price_range','data_id','place_id','images','reservations','order_online',
  'menu','owner','complete_address','about','user_reviews','user_reviews_extended','emails',
]

interface ImportResult {
  imported: number
  skipped:  number
  errors:   Array<{ row: number; message: string }>
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

interface ImportCSVModalProps {
  isOpen:     boolean
  onClose:    () => void
  onSuccess?: () => void
}

export function ImportCSVModal({ isOpen, onClose, onSuccess }: ImportCSVModalProps) {
  const [state,    setState]    = useState<UploadState>('idle')
  const [file,     setFile]     = useState<File | null>(null)
  const [result,   setResult]   = useState<ImportResult | null>(null)
  const [apiError, setApiError] = useState('')

  function handleClose() {
    setFile(null)
    setResult(null)
    setApiError('')
    setState('idle')
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && !f.name.endsWith('.csv')) {
      setApiError('Solo se aceptan archivos .csv')
      setFile(null)
      return
    }
    setFile(f)
    setApiError('')
    setResult(null)
    setState('idle')
  }

  async function handleUpload() {
    if (!file) return
    setState('uploading')
    setApiError('')
    setResult(null)

    try {
      const form = new FormData()
      form.append('file', file)

      const res  = await fetch('/api/places/import', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok) {
        setApiError(json.error ?? 'Error al importar')
        setState('error')
        return
      }

      setResult(json)
      setState('done')
      if (json.imported > 0) onSuccess?.()
    } catch {
      setApiError('Error de red. Intenta nuevamente.')
      setState('error')
    }
  }

  function downloadTemplate() {
    const csv  = CSV_HEADERS.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'plantilla_lugares.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Importar CSV</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* File input */}
          <div>
            <label className="label">Archivo CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          {/* Error de validación / API */}
          {apiError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {apiError}
            </p>
          )}

          {/* Resultado */}
          {state === 'done' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {result.imported} importados
                </span>
                {result.skipped > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {result.skipped} omitidos
                  </span>
                )}
                {result.errors.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700">
                    <XCircle className="w-3.5 h-3.5" />
                    {result.errors.length} errores
                  </span>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-red-100 bg-red-50">
                  {result.errors.map((err, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 text-xs text-red-700 border-b border-red-100 last:border-0"
                    >
                      <span className="font-medium">Fila {err.row}:</span> {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar plantilla
            </button>

            <div className="flex items-center gap-2">
              <button onClick={handleClose} className="btn-secondary text-sm">
                Cerrar
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || state === 'uploading'}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state === 'uploading' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
