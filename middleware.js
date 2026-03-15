import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';

// Paths that require authentication
const protectedPrefixes = ['/account'];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isProtectedPath = protectedPrefixes.some((prefix) =>
    nextUrl.pathname.startsWith(prefix)
  );

  if (isProtectedPath && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl.origin);
    // Optionally preserve the intended destination
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Matcher to optimize middleware execution
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
