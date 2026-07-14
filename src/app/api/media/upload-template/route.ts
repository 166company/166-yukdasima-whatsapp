import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSettings, uploadMediaBlob } from '@/lib/meta'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const templateName = form.get('templateName') as string | null
    const format = (form.get('format') as string | null)?.toUpperCase() ?? 'IMAGE'

    if (!file || !templateName) {
      return NextResponse.json({ error: 'Fayl və ya template adı çatışmır' }, { status: 400 })
    }

    const settings = await getSettings()
    if (!settings.meta_token || !settings.phone_id) {
      return NextResponse.json({ error: 'Meta tənzimləmələri tapılmadı' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const mime = file.type || (format === 'VIDEO' ? 'video/mp4' : 'image/jpeg')
    const mediaId = await uploadMediaBlob(settings.meta_token, settings.phone_id, buffer, mime, file.name)

    const cacheKey = `tmpl_media_${templateName}`
    await prisma.setting.upsert({
      where: { key: cacheKey },
      update: { value: mediaId },
      create: { key: cacheKey, value: mediaId },
    })

    return NextResponse.json({ mediaId })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
