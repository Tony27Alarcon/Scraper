import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import { TemplateEditor } from '@/components/templates/TemplateEditor'

interface Props { params: Promise<{ id: string }> }

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params
  const tpl = await prisma.messageTemplate.findUnique({ where: { id } })
  if (!tpl) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/templates" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Volver a plantillas
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tpl.name}</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">
          {tpl.channel} {tpl.framework && `· ${tpl.framework}`} {tpl.tone && `· tono ${tpl.tone}`}
        </p>
      </div>

      <TemplateEditor
        id={tpl.id}
        initial={{
          name:      tpl.name,
          channel:   tpl.channel as 'whatsapp' | 'email' | 'phone',
          framework: tpl.framework ?? '',
          tone:      tpl.tone ?? '',
          subject:   tpl.subject ?? '',
          body:      tpl.body,
        }}
      />
    </div>
  )
}
