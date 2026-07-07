import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/meta'
import type { Template } from '@/lib/types'

export async function POST(req: Request) {
  const { audienceId, templateName, template } = await req.json() as {
    audienceId: number
    templateName: string
    template: Template
  }

  const audience = await prisma.audience.findUnique({ where: { id: audienceId } })
  if (!audience) return NextResponse.json({ error: 'Auditoriya tapılmadı' }, { status: 404 })

  const rows = await prisma.audienceRow.findMany({ where: { audienceId } })
  const columns = JSON.parse(audience.columns) as string[]
  const phoneCol = columns[0]

  const phones = rows
    .map((r) => normalizePhone((JSON.parse(r.data) as Record<string, string>)[phoneCol] ?? ''))
    .filter((p) => p.length >= 10)

  // Find phones that already have this template message in DB
  const msgs = await prisma.message.findMany({
    where: { direction: 'out', type: 'template', waId: { in: phones } },
    select: { waId: true, metadata: true },
  })
  const sentSet = new Set<string>()
  for (const m of msgs) {
    try {
      const parsed = JSON.parse(m.metadata ?? '{}') as { name?: string }
      if (parsed.name === templateName) sentSet.add(m.waId)
    } catch {}
  }

  const missing = phones.filter((p) => !sentSet.has(p))
  if (missing.length === 0) return NextResponse.json({ marked: 0 })

  const bodyComp = template.components.find((c) => c.type === 'BODY')
  const bodyText = (bodyComp as Record<string, unknown> | undefined)?.text as string | undefined
  const metadata = JSON.stringify({ name: templateName, category: template.category ?? null, body: bodyText ?? null })

  await prisma.message.createMany({
    data: missing.map((phone) => ({
      waId: phone,
      contact: phone,
      direction: 'out',
      text: bodyText ?? `[Template: ${templateName}]`,
      type: 'template',
      timestamp: Math.floor(Date.now() / 1000),
      metadata,
      status: 'sent',
    })),
  })

  return NextResponse.json({ marked: missing.length })
}
