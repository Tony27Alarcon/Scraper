import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/hash'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',      type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        const valid = await verifyPassword(credentials.password, user.password_hash)
        if (!valid) return null

        // Al hacer login exitoso, cambiar status a active
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'active' },
        })

        return {
          id:       String(user.id),
          email:    user.email,
          name:     user.username ?? user.email,
          role:     user.role,
          status:   'active',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id     = user.id
        token.role   = (user as any).role
        token.status = (user as any).status
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id     = token.id as string
        session.user.role   = token.role as string
        session.user.status = token.status as string
      }
      return session
    },
  },
}
