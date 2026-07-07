import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSettings, sendTextMessage } from '@/lib/meta'

export async function POST(req: Request) {
  const { to, text } = await req.json()
  if (!to || !text?.trim()) {
    return NextResponse.json({ error: 'to və text tələb olunur' }, { status: 400 })
  }

  const settings = await getSettings()
  if (!settings.meta_token || !settings.phone_id) {
    return NextResponse.json({ error: 'Meta tənzimləmələri tapılmadı' }, { status: 400 })
  }

  const sendResult = await sendTextMessage(settings.meta_token, settings.phone_id, to, text.trim())
  const wamid = (sendResult as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id ?? null

  await prisma.message.create({
    data: {
      waId: to,
      contact: to,
      direction: 'out',
      text: text.trim(),
      type: 'text',
      timestamp: Math.floor(Date.now() / 1000),
      wamid,
      status: wamid ? 'sent' : null,
    },
  })

  return NextResponse.json({ success: true })
}
