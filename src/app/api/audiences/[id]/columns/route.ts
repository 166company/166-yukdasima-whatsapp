import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string } }

export async function PUT(req: Request, { params }: Params) {
  const id = Number(params.id)
  const { columns } = await req.json()
  if (!Array.isArray(columns)) return NextResponse.json({ error: 'columns array tələb olunur' }, { status: 400 })

  const audience = await prisma.audience.findUnique({ where: { id }, include: { rows: true } })
  if (!audience) return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })

  const oldColumns = JSON.parse(audience.columns) as string[]

  // update each row's data to match new columns
  for (const row of audience.rows) {
    const oldData = JSON.parse(row.data) as Record<string, string>
    const newData: Record<string, string> = {}
    for (const col of columns) {
      // try to find matching old column (by name), keep value; else empty
      newData[col] = oldData[col] ?? ''
    }
    await prisma.audienceRow.update({ where: { id: row.id }, data: { data: JSON.stringify(newData) } })
  }

  void oldColumns

  const updated = await prisma.audience.update({
    where: { id },
    data: { columns: JSON.stringify(columns) },
  })
  return NextResponse.json({ columns: JSON.parse(updated.columns) })
}
