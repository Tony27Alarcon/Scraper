'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { ImportCSVModal } from './ImportCSVModal'

export function ImportCSVButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <Upload className="w-4 h-4" />
        Importar CSV
      </button>
      <ImportCSVModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
