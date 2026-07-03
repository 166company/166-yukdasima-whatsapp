import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
  const audienceId = Number(params.id)
  const audience = await prisma.audience.findUnique({ where: { id: audienceId } })
  if (!audience) return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })

  const columns = JSON.parse(audience.columns) as string[]
  const emptyData: Record<string, string> = {}
  for (const col of columns) emptyData[col] = ''

  const row = await prisma.audienceRow.create({
    data: { audienceId, data: JSON.stringify(emptyData) },
  })
  return NextResponse.json({ id: row.id, ...emptyData })
}
