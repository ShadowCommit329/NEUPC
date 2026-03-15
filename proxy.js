import NextAuth from 'next-auth';
import { authConfig } from '@/app/_lib/auth.config';

const { auth } = NextAuth(authConfig);

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
    return Response.redirect(loginUrl);
  }
});

// Matcher to optimize middleware execution
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
