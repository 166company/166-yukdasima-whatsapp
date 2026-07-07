import { prisma } from './prisma'
import type { Settings, Template } from './types'

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany()
  const obj: Settings = {}
  for (const r of rows) {
    (obj as Record<string, string>)[r.key] = r.value
  }
  return obj
}

export function normalizePhone(raw: string): string {
  let p = (raw || '').replace(/\D/g, '')
  if (p.startsWith('0') && p.length === 10) p = '994' + p.slice(1)
  if (!p.startsWith('994') && p.length === 9) p = '994' + p
  return p
}

export async function fetchApprovedTemplates(token: string, wabaId: string): Promise<Template[]> {
  const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100&status=APPROVED`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta API error: ${err}`)
  }
  const data = await res.json()
  return (data.data ?? []) as Template[]
}

export function getBodyVariableCount(template: Template): number {
  const body = template.components.find((c) => c.type === 'BODY') as Record<string, unknown> | undefined
  const text = body?.text as string | undefined
  if (!text) return 0
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? []
  const nums = matches.map((m) => Number(m.replace(/[{}]/g, '')))
  return nums.length ? Math.max(...nums) : 0
}

export function buildTemplateComponents(template: Template, mediaId?: string, bodyParams?: string[]) {
  const result: unknown[] = []

  // Header component — use uploaded media ID
  const header = template.components.find((c) => c.type === 'HEADER')
  if (header) {
    const fmt = (header as unknown as Record<string, unknown>).format as string | undefined
    if (mediaId) {
      if (fmt === 'IMAGE') {
        result.push({ type: 'header', parameters: [{ type: 'image', image: { id: mediaId } }] })
      } else if (fmt === 'VIDEO') {
        result.push({ type: 'header', parameters: [{ type: 'video', video: { id: mediaId } }] })
      } else if (fmt === 'DOCUMENT') {
        result.push({ type: 'header', parameters: [{ type: 'document', document: { id: mediaId } }] })
      }
    }
  }

  // Body component — variable substitution ({{1}}, {{2}}, ...)
  if (bodyParams && bodyParams.length > 0) {
    result.push({
      type: 'body',
      parameters: bodyParams.map((val) => ({ type: 'text', text: val ?? '' })),
    })
  }

  // Button components — only FLOW / QUICK_REPLY need runtime params
  const buttons = template.components.find((c) => c.type === 'BUTTONS')
  if (buttons?.buttons?.length) {
    buttons.buttons.forEach((btn, idx) => {
      if (btn.type === 'FLOW') {
        result.push({ type: 'button', sub_type: 'flow', index: String(idx), parameters: [{ type: 'action', action: { flow_action_data: {} } }] })
      } else if (btn.type === 'QUICK_REPLY') {
        result.push({ type: 'button', sub_type: 'quick_reply', index: String(idx), parameters: [{ type: 'payload', payload: btn.text }] })
      }
    })
  }

  return result
}

export function getTemplateHeaderUrl(template: Template): string | null {
  const header = template.components.find((c) => c.type === 'HEADER')
  if (!header) return null
  const example = (header as unknown as Record<string, unknown>).example as Record<string, unknown> | undefined
  const handles = example?.header_handle as string[] | undefined
  return handles?.[0] ?? null
}

export function getTemplateHeaderFormat(template: Template): string | null {
  const header = template.components.find((c) => c.type === 'HEADER')
  if (!header) return null
  return (header as unknown as Record<string, unknown>).format as string ?? null
}

export async function uploadMediaFromUrl(
  token: string,
  phoneId: string,
  url: string,
  format: string
): Promise<string> {
  // Fetch image — try with Bearer token first (works for scontent.whatsapp.net)
  const fetchRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!fetchRes.ok) throw new Error(`Şəkil yüklənə bilmədi: ${fetchRes.status}`)

  const buffer = await fetchRes.arrayBuffer()
  const mimeMap: Record<string, string> = {
    IMAGE: 'image/jpeg',
    VIDEO: 'video/mp4',
    DOCUMENT: 'application/pdf',
  }
  const mime = mimeMap[format] ?? 'image/jpeg'
  const ext = mime.split('/')[1]

  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', mime)
  form.append('file', new Blob([buffer], { type: mime }), `media.${ext}`)

  const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const data = await uploadRes.json()
  if (!uploadRes.ok) throw new Error(data.error?.message ?? 'Media upload xətası')
  return data.id as string
}

export async function uploadMediaBlob(
  token: string,
  phoneId: string,
  buffer: ArrayBuffer,
  mime: string,
  filename: string
): Promise<string> {
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', mime)
  form.append('file', new Blob([buffer], { type: mime }), filename)

  const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const data = await uploadRes.json()
  if (!uploadRes.ok) throw new Error(data.error?.message ?? 'Media upload xətası')
  return data.id as string
}

export async function sendMediaMessage(
  token: string,
  phoneId: string,
  to: string,
  mediaType: 'image' | 'video' | 'document' | 'audio',
  mediaId: string,
  caption?: string,
  filename?: string
) {
  const mediaObj: Record<string, unknown> = { id: mediaId }
  if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
    mediaObj.caption = caption
  }
  if (filename && mediaType === 'document') mediaObj.filename = filename

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: mediaObj,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || 'Meta API error')
  }
  return res.json()
}

export async function sendTemplateMessage(
  token: string,
  phoneId: string,
  to: string,
  templateName: string,
  languageCode: string,
  components: unknown[]
) {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  }
  if (components.length > 0) {
    (payload.template as Record<string, unknown>).components = components
  }
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || 'Meta API error')
  }
  return res.json()
}

export async function sendTextMessage(
  token: string,
  phoneId: string,
  to: string,
  text: string
) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || 'Meta API error')
  }
  return res.json()
}
