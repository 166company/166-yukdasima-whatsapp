import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const id = Number(params.id)
  const audience = await prisma.audience.findUnique({
    where: { id },
    include: { rows: true },
  })
  if (!audience) return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })

  const columns = JSON.parse(audience.columns) as string[]
  const rows = audience.rows.map((r) => ({ id: r.id, ...JSON.parse(r.data) }))

  return NextResponse.json({
    id: audience.id,
    name: audience.name,
    columns,
    rows,
    createdAt: audience.createdAt.toISOString(),
  })
}

export async function PUT(req: Request, { params }: Params) {
  const id = Number(params.id)
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Ad tələb olunur' }, { status: 400 })
  const updated = await prisma.audience.update({ where: { id }, data: { name: name.trim() } })
  return NextResponse.json({ id: updated.id, name: updated.name })
}

export async function DELETE(_req: Request, { params }: Params) {
  const id = Number(params.id)
  await prisma.audience.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
