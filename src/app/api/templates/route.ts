import { NextResponse } from 'next/server'
import { getSettings, fetchApprovedTemplates } from '@/lib/meta'

export async function GET() {
  try {
    const settings = await getSettings()
    if (!settings.meta_token || !settings.waba_id) {
      return NextResponse.json({ error: 'Meta tənzimləmələri tapılmadı' }, { status: 400 })
    }
    const templates = await fetchApprovedTemplates(settings.meta_token, settings.waba_id)
    return NextResponse.json(templates)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
