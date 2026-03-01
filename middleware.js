/**
 * @file Next.js Middleware (Vercel Edge Runtime)
 * @module Middleware
 *
 * Runs at the edge before every matched request.
 * Handles authentication redirects for protected routes.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { auth } from '@/app/_lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const pathname = nextUrl.pathname;

  // Redirect unauthenticated users trying to access /account/*
  if (!isLoggedIn && pathname.startsWith('/account')) {
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Prevent authenticated users from hitting /login
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/account', nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Only run middleware on routes that need auth checks.
    // This avoids unnecessary edge invocations on static assets,
    // API auth callbacks, and Next.js internals.
    '/account/:path*',
    '/login',
  ],
};
