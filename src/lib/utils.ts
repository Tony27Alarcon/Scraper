import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date))
}

export function formatRating(rating: number | string | null | undefined): string {
  if (rating === null || rating === undefined) return '—'
  return Number(rating).toFixed(1)
}

export function truncate(str: string | null | undefined, length = 50): string {
  if (!str) return '—'
  return str.length > length ? str.slice(0, length) + '...' : str
}
