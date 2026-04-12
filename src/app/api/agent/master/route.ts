import { createAgentUIStreamResponse } from 'ai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMasterAgent } from '@/lib/agents/master-agent'

export const maxDuration = 120

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await request.json()
  const currentPath = request.headers.get('x-current-path') ?? '/dashboard'
  const userId   = parseInt(session.user.id ?? '0')
  const username = session.user.name ?? session.user.email ?? 'Usuario'

  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { company: { select: { ai_context: true } } },
  })

  const agent = createMasterAgent({
    userId,
    username,
    currentPath,
    companyContext: user?.company?.ai_context ?? null,
  })

  return createAgentUIStreamResponse({ agent, uiMessages: messages })
}
