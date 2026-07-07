import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('auth_token', '', { httpOnly: true, secure: true, maxAge: 0, path: '/' })
  return res
}
