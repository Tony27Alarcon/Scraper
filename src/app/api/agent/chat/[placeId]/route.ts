import { createAgentUIStreamResponse } from 'ai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPlaceAgent } from '@/lib/agents/place-agent'

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: { placeId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await request.json()
  const userId   = parseInt(session.user.id ?? '0')
  const username = session.user.name ?? session.user.email ?? 'Agente IA'

  // Fetch user's company for AI context
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { company: { select: { name: true, industry: true, ai_context: true } } },
  })

  const agent = createPlaceAgent({
    placeId:        params.placeId,
    userId,
    username,
    companyContext: user?.company?.ai_context ?? null,
  })

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  })
}
