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
    offset = 0, limit = 50, mediaId: passedMediaId, skipAlreadySent = false,
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

  // Upload media only on first batch (offset === 0)
  let mediaId: string | undefined = passedMediaId ?? undefined
  if (offset === 0 && !mediaId) {
    const headerUrl = getTemplateHeaderUrl(template)
    const headerFormat = getTemplateHeaderFormat(template)
    if (headerUrl && headerFormat && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {
      try {
        mediaId = await uploadMediaFromUrl(settings.meta_token, settings.phone_id, headerUrl, headerFormat)
      } catch (e) {
        return NextResponse.json({
          error: `Şəkil yüklənə bilmədi: ${String(e)}. Zəhmət olmasa şəkli başqa bir public URL-də yerləşdirin.`
        }, { status: 400 })
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

  // Build skip set for "only new" mode
  let skipPhones = new Set<string>()
  if (skipAlreadySent && offset === 0) {
    const allPhones = rows.map((r) => normalizePhone((JSON.parse(r.data) as Record<string, string>)[phoneCol] ?? '')).filter(Boolean)
    const sent = await prisma.message.findMany({
      where: { direction: 'out', type: 'template', metadata: { contains: `"name":"${templateName}"` }, waId: { in: allPhones } },
      select: { waId: true },
      distinct: ['waId'],
    })
    skipPhones = new Set(sent.map((m) => m.waId))
  } else if (skipAlreadySent) {
    // For subsequent batches, caller passes skipPhones via sentPhones — but simpler: query each batch
    const batchPhones = rows.map((r) => normalizePhone((JSON.parse(r.data) as Record<string, string>)[phoneCol] ?? '')).filter(Boolean)
    const sent = await prisma.message.findMany({
      where: { direction: 'out', type: 'template', metadata: { contains: `"name":"${templateName}"` }, waId: { in: batchPhones } },
      select: { waId: true },
      distinct: ['waId'],
    })
    skipPhones = new Set(sent.map((m) => m.waId))
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
