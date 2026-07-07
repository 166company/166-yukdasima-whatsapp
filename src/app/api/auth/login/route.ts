import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json() as { password: string }

  if (!password || password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: 'Yanlış şifrə' }, { status: 401 })
  }

  const secret = process.env.AUTH_SECRET ?? ''
  const res = NextResponse.json({ success: true })
  res.cookies.set('auth_token', secret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    // no maxAge → session cookie, deleted when browser closes
  })
  return res
}
