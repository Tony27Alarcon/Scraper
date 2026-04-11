import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token       = req.nextauth.token
    const pathname    = req.nextUrl.pathname
    const isAdminRoute =
      pathname.startsWith('/users') ||
      pathname.startsWith('/api/users')

    if (isAdminRoute && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/places/:path*',
    '/users/:path*',
    '/api/places/:path*',
    '/api/users/:path*',
    '/api/dashboard',
  ],
}
