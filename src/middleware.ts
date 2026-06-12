import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isPublicPath =
    pathname.startsWith('/q/') ||
    pathname === '/login' ||
    pathname.startsWith('/api/auth')

  if (!isPublicPath && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
