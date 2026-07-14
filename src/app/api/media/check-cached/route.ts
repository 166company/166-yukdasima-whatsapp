import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const templateName = searchParams.get('templateName')
  if (!templateName) return NextResponse.json({ cached: false })

  const cacheKey = `tmpl_media_${templateName}`
  const row = await prisma.setting.findUnique({ where: { key: cacheKey } })
  return NextResponse.json({ cached: !!row?.value })
}
