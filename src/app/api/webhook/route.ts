import { prisma } from '@/lib/prisma'

const VERIFY_TOKEN = '166yukdasima_webhook_token'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (body.object !== 'whatsapp_business_account') {
      return new Response('Not Found', { status: 404 })
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value
        if (!value) continue

        const contacts: Record<string, string> = {}
        for (const c of value.contacts ?? []) {
          contacts[c.wa_id] = c.profile?.name ?? c.wa_id
        }

        // Incoming messages
        for (const msg of value.messages ?? []) {
          let text: string | null = null
          const msgType: string = msg.type ?? 'text'

          let metadata: string | null = null

          if (msgType === 'text') {
            text = msg.text?.body ?? null
          } else if (msgType === 'image') {
            text = msg.image?.id ? `[MEDIA:image:${msg.image.id}]` : '[Şəkil 📷]'
            if (msg.image?.caption) metadata = JSON.stringify({ caption: msg.image.caption })
          } else if (msgType === 'sticker') {
            text = msg.sticker?.id ? `[MEDIA:sticker:${msg.sticker.id}]` : '[Stiker 🎭]'
          } else if (msgType === 'video') {
            text = msg.video?.id ? `[MEDIA:video:${msg.video.id}]` : '[Video 🎥]'
            if (msg.video?.caption) metadata = JSON.stringify({ caption: msg.video.caption })
          } else if (msgType === 'audio') {
            text = msg.audio?.id ? `[MEDIA:audio:${msg.audio.id}]` : '[Ses mesajı 🎵]'
          } else if (msgType === 'voice') {
            text = msg.voice?.id ? `[MEDIA:audio:${msg.voice.id}]` : '[Səs mesajı 🎤]'
          } else if (msgType === 'document') {
            const fname = msg.document?.filename ?? 'fayl'
            text = msg.document?.id ? `[MEDIA:document:${msg.document.id}:${fname}]` : `[📎 ${fname}]`
            if (msg.document?.caption) metadata = JSON.stringify({ caption: msg.document.caption })
          } else if (msgType === 'location') {
            text = `[📍 Məkan: ${msg.location?.name ?? `${msg.location?.latitude},${msg.location?.longitude}`}]`
          } else if (msgType === 'contacts') {
            text = '[👤 Kontakt]'
          } else if (msgType === 'reaction') {
            text = `[${msg.reaction?.emoji ?? '👍'} Reaksiya]`
          } else {
            text = `[${msgType}]`
          }

          await prisma.message.create({
            data: {
              waId: msg.from,
              contact: msg.from,
              contactName: contacts[msg.from] ?? msg.from,
              direction: 'in',
              text,
              type: msgType,
              timestamp: msg.timestamp ? Number(msg.timestamp) : null,
              metadata,
            },
          })
        }

        // Delivery status updates — update Message status by wamid
        for (const st of value.statuses ?? []) {
          if (st.id && st.status) {
            await prisma.message.updateMany({
              where: { wamid: st.id },
              data: { status: st.status },
            })
          }
          if (st.errors?.length) {
            console.error(`[WA delivery] ${st.id} → ${st.status} | ${st.recipient_id} | ${JSON.stringify(st.errors)}`)
          }
        }
      }
    }
  } catch {
    // always return 200
  }
  return new Response('OK', { status: 200 })
}
