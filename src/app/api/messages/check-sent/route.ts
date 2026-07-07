import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/meta'

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

  const phones = rows.map((r) => normalizePhone((JSON.parse(r.data) as Record<string, string>)[phoneCol] ?? ''))
    .filter((p) => p.length >= 10)

  const alreadySentMsgs = await prisma.message.findMany({
    where: {
      direction: 'out',
      type: 'template',
      metadata: { contains: `"name":"${templateName}"` },
      waId: { in: phones },
    },
    select: { waId: true },
    distinct: ['waId'],
  })

  const sentSet = new Set(alreadySentMsgs.map((m) => m.waId))

  return NextResponse.json({
    total: phones.length,
    sentCount: sentSet.size,
    newCount: phones.length - sentSet.size,
    sentPhones: Array.from(sentSet),
  })
}
