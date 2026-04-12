'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id:      string
  type:    ToastType
  message: string
}

interface ToastContextValue {
  toast: (opts: { type: ToastType; message: string }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50   border-red-200   text-red-800',
  info:    'bg-blue-50  border-blue-200  text-blue-800',
}

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-green-500',
  error:   'text-red-500',
  info:    'text-blue-500',
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = ICONS[toast.type]
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium',
        'min-w-[240px] max-w-[360px] pointer-events-auto',
        'animate-in slide-in-from-right-4 duration-200',
        STYLES[toast.type],
      )}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', ICON_STYLES[toast.type])} />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts]   = useState<Toast[]>([])
  const counterRef            = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = `toast-${Date.now()}-${++counterRef.current}`
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => removeToast(id), 3000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
