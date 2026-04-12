import { createAgentUIStreamResponse } from 'ai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createProspectsAgent } from '@/lib/agents/prospects-agent'

export const maxDuration = 120

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await request.json()
  const userId   = parseInt(session.user.id ?? '0')
  const username = session.user.name ?? session.user.email ?? 'Agente'

  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: {
      company: {
        select: {
          name: true,
          industry: true,
          description: true,
          website: true,
          ai_context: true,
        },
      },
    },
  })

  const agent = createProspectsAgent({
    userId,
    username,
    company: user?.company,
  })

  return createAgentUIStreamResponse({ agent, uiMessages: messages })
}
