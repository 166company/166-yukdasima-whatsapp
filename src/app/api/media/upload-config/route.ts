import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/meta'

// Returns Meta credentials for direct browser-to-Meta upload
export async function GET() {
  const settings = await getSettings()
  if (!settings.meta_token || !settings.phone_id) {
    return NextResponse.json({ error: 'Meta tənzimləmələri tapılmadı' }, { status: 400 })
  }
  return NextResponse.json({ token: settings.meta_token, phoneId: settings.phone_id })
}
