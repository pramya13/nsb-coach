import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users to login
  if (!token) {
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/coach') ||
      pathname.startsWith('/student')
    ) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  const userRole = token.role as string

  // /admin/* requires ADMIN role
  if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  // /coach/* requires ADMIN or COACH role
  if (
    pathname.startsWith('/coach') &&
    userRole !== 'ADMIN' &&
    userRole !== 'COACH'
  ) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  // /student/* requires any authenticated user (already checked above)

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/coach/:path*', '/student/:path*'],
}
