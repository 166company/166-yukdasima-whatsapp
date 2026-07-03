import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rows = await prisma.setting.findMany()
  const obj: Record<string, string> = {}
  for (const r of rows) obj[r.key] = r.value
  return NextResponse.json(obj)
}

export async function POST(req: Request) {
  const body = await req.json()
  for (const [key, value] of Object.entries(body)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }
  return NextResponse.json({ success: true })
}
