import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string) || 'Excel Import'

    if (!file) return NextResponse.json({ error: 'Fayl tələb olunur' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, string>[]

    if (!jsonData.length) return NextResponse.json({ error: 'Excel boşdur' }, { status: 400 })

    const columns = Object.keys(jsonData[0])

    const audience = await prisma.audience.create({
      data: { name: name.trim(), columns: JSON.stringify(columns) },
    })

    for (const row of jsonData) {
      const data: Record<string, string> = {}
      for (const col of columns) data[col] = String(row[col] ?? '')
      await prisma.audienceRow.create({
        data: { audienceId: audience.id, data: JSON.stringify(data) },
      })
    }

    return NextResponse.json({
      id: audience.id,
      name: audience.name,
      columns,
      rowCount: jsonData.length,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
