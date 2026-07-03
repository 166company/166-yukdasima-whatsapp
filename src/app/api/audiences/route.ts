import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const audiences = await prisma.audience.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { rows: true } } },
  })
  return NextResponse.json(
    audiences.map((a) => ({
      id: a.id,
      name: a.name,
      columns: JSON.parse(a.columns) as string[],
      createdAt: a.createdAt.toISOString(),
      rowCount: a._count.rows,
    }))
  )
}

export async function POST(req: Request) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Ad tələb olunur' }, { status: 400 })
  const audience = await prisma.audience.create({
    data: { name: name.trim(), columns: JSON.stringify(['WhatsApp Nömrəsi', 'Ad']) },
  })
  return NextResponse.json({
    id: audience.id,
    name: audience.name,
    columns: JSON.parse(audience.columns) as string[],
    createdAt: audience.createdAt.toISOString(),
    rowCount: 0,
  })
}
