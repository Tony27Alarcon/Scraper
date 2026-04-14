import { createAgentUIStreamResponse } from 'ai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCloserAgent } from '@/lib/agents/closer-agent'

export const maxDuration = 120

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { messages } = await request.json()

  const path    = request.headers.get('x-current-path')     ?? '/dashboard'
  const placeId = request.headers.get('x-current-place-id') || null
  const listId  = request.headers.get('x-current-list-id')  || null
  const view    = request.headers.get('x-current-view')     || null

  const userId   = parseInt(session.user.id ?? '0')
  const username = session.user.name ?? session.user.email ?? 'Usuario'

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      company: {
        select: {
          name: true, industry: true, description: true, website: true, ai_context: true,
        },
      },
    },
  })

  const agent = createCloserAgent({
    userId, username,
    company: user?.company,
    context: { path, placeId, listId, view },
  })

  return createAgentUIStreamResponse({ agent, uiMessages: messages })
}
