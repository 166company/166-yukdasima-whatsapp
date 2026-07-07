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

  // Use PostgreSQL JSON operator for reliable JSON field matching
  const result = await prisma.$queryRaw<Array<{ waId: string }>>`
    SELECT DISTINCT "waId"
    FROM "Message"
    WHERE direction = 'out'
      AND type = 'template'
      AND metadata IS NOT NULL
      AND metadata::jsonb->>'name' = ${templateName}
      AND "waId" = ANY(${phones})
  `

  const sentSet = new Set(result.map((r) => r.waId))

  return NextResponse.json({
    total: phones.length,
    sentCount: sentSet.size,
    newCount: phones.length - sentSet.size,
    sentPhones: Array.from(sentSet),
  })
}
