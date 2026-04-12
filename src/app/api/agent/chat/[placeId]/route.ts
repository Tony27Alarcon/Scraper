import { createAgentUIStreamResponse } from 'ai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
  const userId = parseInt(session.user.id ?? '0')
  const username = session.user.name ?? session.user.email ?? 'Agente IA'

  const agent = createPlaceAgent(params.placeId, userId, username)

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  })
}
