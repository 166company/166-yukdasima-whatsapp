import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { templateName, mediaId } = await req.json() as { templateName: string; mediaId: string }
  if (!templateName || !mediaId) {
    return NextResponse.json({ error: 'templateName və mediaId tələb olunur' }, { status: 400 })
  }
  const cacheKey = `tmpl_media_${templateName}`
  await prisma.setting.upsert({
    where: { key: cacheKey },
    update: { value: mediaId },
    create: { key: cacheKey, value: mediaId },
  })
  return NextResponse.json({ ok: true })
}
