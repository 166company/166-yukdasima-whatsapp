import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/meta'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const audienceId = Number(searchParams.get('audienceId'))
  const templateName = searchParams.get('templateName') ?? ''

  if (!audienceId || !templateName) {
    return NextResponse.json({ error: 'audienceId and templateName required' }, { status: 400 })
  }

  const audience = await prisma.audience.findUnique({ where: { id: audienceId } })
  if (!audience) return NextResponse.json({ error: 'Auditoriya tapılmadı' }, { status: 404 })

  const rows = await prisma.audienceRow.findMany({ where: { audienceId } })
  const columns = JSON.parse(audience.columns) as string[]
  const phoneCol = columns[0]

  const phones = rows
    .map((r) => normalizePhone((JSON.parse(r.data) as Record<string, string>)[phoneCol] ?? ''))
    .filter((p) => p.length >= 10)

  if (phones.length === 0) {
    return NextResponse.json({ total: 0, sentCount: 0, newCount: 0, sentPhones: [] })
  }

  // Fetch all outgoing template messages for these phones, filter by template name in JS
  const msgs = await prisma.message.findMany({
    where: {
      direction: 'out',
      type: 'template',
      waId: { in: phones },
    },
    select: { waId: true, metadata: true },
  })

  const sentSet = new Set<string>()
  for (const m of msgs) {
    try {
      const parsed = JSON.parse(m.metadata ?? '{}') as { name?: string }
      if (parsed.name === templateName) sentSet.add(m.waId)
    } catch {}
  }

  return NextResponse.json({
    total: phones.length,
    sentCount: sentSet.size,
    newCount: phones.length - sentSet.size,
    sentPhones: Array.from(sentSet),
  })
}
