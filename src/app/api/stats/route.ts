import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/meta'

export async function GET() {
  const settings = await getSettings()

  // DB stats
  const [totalAudiences, totalRows, totalMessages, sentMessages, inMessages] = await Promise.all([
    prisma.audience.count(),
    prisma.audienceRow.count(),
    prisma.message.count(),
    prisma.message.count({ where: { direction: 'out' } }),
    prisma.message.count({ where: { direction: 'in' } }),
  ])

  const uniqueContacts = await prisma.message.groupBy({ by: ['waId'] })

  let phoneInfo: Record<string, unknown> | null = null
  let wabaInfo: Record<string, unknown> | null = null
  let billingInfo: Record<string, unknown> | null = null

  if (settings.meta_token && settings.phone_id && settings.waba_id) {
    try {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v19.0/${settings.phone_id}?fields=display_phone_number,verified_name,quality_rating,platform_type,throughput,status,code_verification_status`,
        { headers: { Authorization: `Bearer ${settings.meta_token}` }, cache: 'no-store' }
      )
      if (phoneRes.ok) phoneInfo = await phoneRes.json()
    } catch {}

    try {
      const wabaRes = await fetch(
        `https://graph.facebook.com/v19.0/${settings.waba_id}?fields=name,currency,timezone_id,account_review_status,on_behalf_of_business_info`,
        { headers: { Authorization: `Bearer ${settings.meta_token}` }, cache: 'no-store' }
      )
      if (wabaRes.ok) wabaInfo = await wabaRes.json()
    } catch {}

    try {
      const billRes = await fetch(
        `https://graph.facebook.com/v19.0/${settings.waba_id}/whatsapp_credit_lines?fields=credit_type,credit_limit,currency`,
        { headers: { Authorization: `Bearer ${settings.meta_token}` }, cache: 'no-store' }
      )
      if (billRes.ok) billingInfo = await billRes.json()
    } catch {}
  }

  return NextResponse.json({
    db: {
      totalAudiences,
      totalContacts: totalRows,
      totalMessages,
      sentMessages,
      inMessages,
      uniqueConversations: uniqueContacts.length,
    },
    phone: phoneInfo,
    waba: wabaInfo,
    billing: billingInfo,
  })
}
