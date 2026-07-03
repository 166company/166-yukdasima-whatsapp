import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: Request, { params }: { params: { waId: string } }) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file tələb olunur' }, { status: 400 })

  const ext = file.type.split('/')[1] ?? 'jpg'
  const filename = `${params.waId}.${ext}`
  const dir = path.join(process.cwd(), 'public', 'avatars')
  await mkdir(dir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, filename), buffer)

  const photoUrl = `/avatars/${filename}?t=${Date.now()}`
  await prisma.contact.upsert({
    where: { waId: params.waId },
    update: { photoUrl },
    create: { waId: params.waId, photoUrl },
  })

  return NextResponse.json({ photoUrl })
}

export async function DELETE(_req: Request, { params }: { params: { waId: string } }) {
  await prisma.contact.upsert({
    where: { waId: params.waId },
    update: { photoUrl: null },
    create: { waId: params.waId, photoUrl: null },
  })
  return NextResponse.json({ success: true })
}
