'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Eye, EyeOff } from 'lucide-react'

const UserSchema = z.object({
  email:    z.string().email('Email inválido'),
  username: z.string().min(2, 'Mínimo 2 caracteres').optional().or(z.literal('')),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role:     z.enum(['admin', 'user']),
  status:   z.enum(['active', 'inactive']),
})

type UserFormData = z.infer<typeof UserSchema>

export function UserForm() {
  const router = useRouter()
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver:      zodResolver(UserSchema),
    defaultValues: { role: 'user', status: 'inactive' },
  })

  async function onSubmit(data: UserFormData) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al crear usuario')
      }
      router.push('/users')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="card p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email *</label>
          <input {...register('email')} type="email" className="input-field" placeholder="usuario@ejemplo.com" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Nombre de usuario</label>
          <input {...register('username')} type="text" className="input-field" placeholder="usuario123" />
          {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
        </div>

        <div>
          <label className="label">Contraseña *</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              className="input-field pr-10"
              placeholder="Mínimo 8 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Rol</label>
            <select {...register('role')} className="input-field">
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label">Estado inicial</label>
            <select {...register('status')} className="input-field">
              <option value="inactive">Inactivo</option>
              <option value="active">Activo</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creando...
              </span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Crear Usuario
              </>
            )}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
