import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSettings, uploadMediaBlob, sendMediaMessage } from '@/lib/meta'

function mediaTypeFromMime(mime: string): 'image' | 'video' | 'document' | 'audio' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const to = formData.get('to') as string | null
  const caption = (formData.get('caption') as string | null) ?? undefined

  if (!file || !to) {
    return NextResponse.json({ error: 'file və to tələb olunur' }, { status: 400 })
  }

  const settings = await getSettings()
  if (!settings.meta_token || !settings.phone_id) {
    return NextResponse.json({ error: 'Meta tənzimləmələri tapılmadı' }, { status: 400 })
  }

  const mediaType = mediaTypeFromMime(file.type)
  const buffer = await file.arrayBuffer()

  try {
    const mediaId = await uploadMediaBlob(settings.meta_token, settings.phone_id, buffer, file.type, file.name)
    await sendMediaMessage(settings.meta_token, settings.phone_id, to, mediaType, mediaId, caption, file.name)

    const metadata = caption ? JSON.stringify({ caption }) : null
    await prisma.message.create({
      data: {
        waId: to,
        contact: to,
        direction: 'out',
        text: `[MEDIA:${mediaType}:${mediaId}${mediaType === 'document' ? ':' + file.name : ''}]`,
        type: mediaType,
        timestamp: Math.floor(Date.now() / 1000),
        metadata,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
