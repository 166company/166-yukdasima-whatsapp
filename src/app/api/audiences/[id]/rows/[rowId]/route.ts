import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string; rowId: string } }

export async function PUT(req: Request, { params }: Params) {
  const rowId = Number(params.rowId)
  const { data } = await req.json()
  const updated = await prisma.audienceRow.update({
    where: { id: rowId },
    data: { data: JSON.stringify(data) },
  })
  return NextResponse.json({ id: updated.id, ...data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const rowId = Number(params.rowId)
  await prisma.audienceRow.delete({ where: { id: rowId } })
  return NextResponse.json({ success: true })
}
