import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Conversation } from '@/lib/types'

export async function GET() {
  const messages = await prisma.message.findMany({ orderBy: { timestamp: 'asc' } })
  const contacts = await prisma.contact.findMany()
  const photoMap = new Map(contacts.map((c) => [c.waId, c.photoUrl]))

  const map = new Map<string, Conversation>()
  for (const m of messages) {
    const key = m.waId
    if (!map.has(key)) {
      map.set(key, {
        contact: m.contact ?? m.waId,
        contactName: m.contactName ?? m.waId,
        photoUrl: photoMap.get(key) ?? undefined,
        messages: [],
        lastAt: 0,
      })
    }
    const conv = map.get(key)!
    conv.messages.push({
      id: m.id,
      waId: m.waId,
      direction: m.direction as 'in' | 'out',
      text: m.text,
      type: m.type,
      timestamp: m.timestamp,
      metadata: m.metadata ?? undefined,
    })
    if ((m.timestamp ?? 0) > conv.lastAt) conv.lastAt = m.timestamp ?? 0
    if (m.contactName) conv.contactName = m.contactName
  }

  const conversations = Array.from(map.values()).sort((a, b) => b.lastAt - a.lastAt)
  return NextResponse.json(conversations)
}
