'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'

const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const callbackError = searchParams.get('error')

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email:       data.email,
      password:    data.password,
      redirect:    false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Email o contraseña incorrectos')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo / Título */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-lg">
          <LogIn className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Scraper Dashboard</h1>
        <p className="text-gray-500 mt-1">Ingresa a tu cuenta</p>
      </div>

      <div className="card p-8">
        {(error || callbackError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error || 'Error al iniciar sesión. Intenta nuevamente.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="admin@ejemplo.com"
              className="input-field"
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="label">Contraseña</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-2.5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
