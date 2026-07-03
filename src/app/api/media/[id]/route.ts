import { getSettings } from '@/lib/meta'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const settings = await getSettings()
  if (!settings.meta_token) return new Response('No token', { status: 401 })

  // Get media URL from Meta
  const metaRes = await fetch(`https://graph.facebook.com/v19.0/${params.id}`, {
    headers: { Authorization: `Bearer ${settings.meta_token}` },
    cache: 'no-store',
  })
  if (!metaRes.ok) return new Response('Not found', { status: 404 })

  const { url, mime_type } = await metaRes.json()

  // Proxy the media content
  const mediaRes = await fetch(url, {
    headers: { Authorization: `Bearer ${settings.meta_token}` },
  })
  if (!mediaRes.ok) return new Response('Media fetch failed', { status: 502 })

  const buffer = await mediaRes.arrayBuffer()
  return new Response(buffer, {
    headers: {
      'Content-Type': mime_type ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
