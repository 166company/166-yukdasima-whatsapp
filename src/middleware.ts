import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always public: login page, auth API, Meta webhook
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/webhook')
  ) {
    return NextResponse.next()
  }

  const secret = process.env.AUTH_SECRET ?? ''
  const token = request.cookies.get('auth_token')?.value

  if (!secret || token !== secret) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
