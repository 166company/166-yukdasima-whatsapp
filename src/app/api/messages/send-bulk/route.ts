import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getSettings, normalizePhone, buildTemplateComponents, sendTemplateMessage,
  getTemplateHeaderUrl, getTemplateHeaderFormat, uploadMediaFromUrl
} from '@/lib/meta'
import type { BulkSendResult, Template } from '@/lib/types'

export const maxDuration = 300

export async function POST(req: Request) {
  const {
    audienceId, templateName, templateLanguage, template, variableMapping,
    offset = 0, limit = 15, mediaId: passedMediaId, skipAlreadySent = false,
  } = await req.json() as {
    audienceId: number
    templateName: string
    templateLanguage: string
    template: Template
    variableMapping?: Record<string, string>
    offset?: number
    limit?: number
    mediaId?: string | null
    skipAlreadySent?: boolean
  }

  const settings = await getSettings()
  if (!settings.meta_token || !settings.phone_id) {
    return NextResponse.json({ error: 'Meta tənzimləmələri tapılmadı' }, { status: 400 })
  }

  const audience = await prisma.audience.findUnique({ where: { id: audienceId } })
  if (!audience) return NextResponse.json({ error: 'Auditoriya tapılmadı' }, { status: 404 })

  const totalRows = await prisma.audienceRow.count({ where: { audienceId } })

  // Upload header media on first batch only, reuse mediaId on subsequent batches
  let mediaId: string | undefined = passedMediaId ?? undefined
  if (offset === 0 && !mediaId) {
    const headerHandle = getTemplateHeaderUrl(template)
    const headerFormat = getTemplateHeaderFormat(template)
    if (headerHandle && headerFormat && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {
      if (headerHandle.startsWith('http')) {
        // CDN URL — download and re-upload to get a usable media ID
        try {
          mediaId = await uploadMediaFromUrl(settings.meta_token, settings.phone_id, headerHandle, headerFormat)
        } catch (e) {
          return NextResponse.json({
            error: `Media yüklənə bilmədi (${headerFormat}): ${String(e)}`
          }, { status: 400 })
        }
      } else {
        // Already a media handle/ID — use directly
        mediaId = headerHandle
      }
    }
  }

  const rows = await prisma.audienceRow.findMany({
    where: { audienceId },
    skip: offset,
    take: limit,
  })

  const columns = JSON.parse(audience.columns) as string[]
  const phoneCol = columns[0]

  // Build skip set — fetch outgoing template messages for batch phones, filter by name in JS
  let skipPhones = new Set<string>()
  if (skipAlreadySent) {
    const batchPhones = rows
      .map((r) => normalizePhone((JSON.parse(r.data) as Record<string, string>)[phoneCol] ?? ''))
      .filter(Boolean)
    if (batchPhones.length > 0) {
      const msgs = await prisma.message.findMany({
        where: { direction: 'out', type: 'template', waId: { in: batchPhones } },
        select: { waId: true, metadata: true },
      })
      for (const m of msgs) {
        try {
          const parsed = JSON.parse(m.metadata ?? '{}') as { name?: string }
          if (parsed.name === templateName) skipPhones.add(m.waId)
        } catch {}
      }
    }
  }

  const bodyComp = template.components.find((c) => c.type === 'BODY')
  const bodyTextRaw = (bodyComp as Record<string, unknown> | undefined)?.text as string | undefined
  const headerComp = template.components.find((c) => c.type === 'HEADER')
  const headerFmt = (headerComp as Record<string, unknown> | undefined)?.format as string | undefined
  const buttons = (template.components.find((c) => c.type === 'BUTTONS') as Record<string, unknown> | undefined)
    ?.buttons as Array<{ type: string; text: string; phone_number?: string; url?: string }> | undefined

  const varNumbers = variableMapping ? Object.keys(variableMapping).map(Number).sort((a, b) => a - b) : []

  const results: BulkSendResult[] = []
  let sent = 0, failed = 0, skipped = 0

  for (const row of rows) {
    const data = JSON.parse(row.data) as Record<string, string>
    const rawPhone = data[phoneCol] ?? ''
    const phone = normalizePhone(rawPhone)

    if (!phone || phone.length < 10) {
      results.push({ phone: rawPhone, status: 'skipped', error: 'Yanlış nömrə' })
      skipped++
      continue
    }

    if (skipPhones.has(phone)) {
      results.push({ phone, status: 'skipped', error: 'Artıq göndərilib' })
      skipped++
      continue
    }

    const bodyParams = varNumbers.map((n) => {
      const col = variableMapping![String(n)]
      return col ? (data[col] ?? '') : ''
    })

    const components = buildTemplateComponents(template, mediaId, bodyParams.length > 0 ? bodyParams : undefined)

    try {
      const sendResult = await sendTemplateMessage(
        settings.meta_token!,
        settings.phone_id!,
        phone,
        templateName,
        templateLanguage,
        components as unknown[]
      )
      const wamid = (sendResult as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id ?? null

      let filledBody = bodyTextRaw
      if (filledBody && bodyParams.length > 0) {
        varNumbers.forEach((n, i) => { filledBody = filledBody!.replace(`{{${n}}}`, bodyParams[i] || `{{${n}}}`) })
      }

      const metadata = JSON.stringify({
        name: templateName,
        category: template.category ?? null,
        body: filledBody,
        headerFormat: headerFmt,
        mediaId: mediaId ?? null,
        buttons: buttons?.map((b) => ({ type: b.type, text: b.text, phone_number: b.phone_number, url: b.url })) ?? [],
      })

      await prisma.message.create({
        data: {
          waId: phone,
          contact: phone,
          direction: 'out',
          text: filledBody ?? `[Template: ${templateName}]`,
          type: 'template',
          timestamp: Math.floor(Date.now() / 1000),
          metadata,
          wamid,
          status: wamid ? 'sent' : null,
        },
      })

      results.push({ phone, status: 'sent' })
      sent++
    } catch (e) {
      results.push({ phone, status: 'failed', error: String(e) })
      failed++
    }

    await new Promise((r) => setTimeout(r, 100))
  }

  const processedUpTo = offset + rows.length
  const done = processedUpTo >= totalRows

  return NextResponse.json({ sent, failed, skipped, results, mediaId: mediaId ?? null, done, processedUpTo, totalRows })
}
