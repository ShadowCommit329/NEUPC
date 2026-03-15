/**
 * @file Login page (server component).
 * Redirects authenticated users; renders Google OAuth sign-in for guests.
 *
 * @module LoginPage
 */

import { auth } from '@/app/_lib/auth';
import { redirect } from 'next/navigation';
import SignInButton from '@/app/_components/ui/SignInButton';
import PageShell from '@/app/_components/ui/PageShell';
import Link from 'next/link';
import Image from 'next/image';
import { Code2 } from 'lucide-react';
import bg_img from '@/public/bg.webp';
import ScrollToTop from '@/app/_components/ui/ScrollToTop';
import JoinButton from '@/app/_components/ui/JoinButton';
import { buildMetadata } from '@/app/_lib/seo';

export const metadata = buildMetadata({
  title: 'Login',
  description:
    'Sign in to access your NEUPC account — manage your profile, register for events, and track your competitive programming progress.',
  pathname: '/login',
  keywords: ['login', 'sign in', 'account access'],
});

async function LoginPage() {
  const session = await auth();

  // If already logged in, redirect to account page
  if (session?.user) {
    redirect('/account');
  }

  return (
    <PageShell className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Image */}
      <Image
        src={bg_img}
        placeholder="blur"
        quality={80}
        fill
        sizes="100vw"
        className="fixed inset-0 -z-10 object-cover object-top"
        alt="Background"
        priority
      />

      {/* Background Overlays */}
      <div className="fixed inset-0 -z-10 bg-linear-to-b from-black/60 via-black/40 to-black/70"></div>
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.8) 100%)',
        }}
      ></div>

      {/* Animated Background Orbs */}
      <div className="from-primary-500/30 to-secondary-500/30 fixed -top-40 -right-40 -z-10 h-96 w-96 rounded-full bg-linear-to-br opacity-70 blur-3xl sm:h-125 sm:w-125"></div>
      <div className="from-secondary-500/30 to-primary-500/30 fixed -bottom-40 -left-40 -z-10 h-96 w-96 rounded-full bg-linear-to-br opacity-70 blur-3xl sm:h-125 sm:w-125"></div>

      {/* Login Container */}
      <div className="relative w-full max-w-md">
        {/* Logo Section */}
        <div className="mb-8 text-center sm:mb-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 transition-transform hover:scale-105"
          >
            <div className="from-primary-500 to-primary-700 flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br shadow-lg transition-shadow group-hover:shadow-xl sm:h-16 sm:w-16">
              <Code2 className="h-8 w-8 text-white sm:h-9 sm:w-9" />
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                NEUPC
              </h2>
              <p className="text-sm text-gray-300">Programming Club</p>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="group relative overflow-hidden rounded-3xl border-2 border-white/20 bg-linear-to-br from-white/10 via-white/5 to-white/10 p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>

          {/* Background Glow */}
          <div className="from-primary-500/20 to-secondary-500/20 absolute -top-20 -right-20 h-80 w-80 rounded-full bg-linear-to-br opacity-60 blur-3xl"></div>

          <div className="relative space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl">
                Welcome Back
              </h1>
              <p className="text-base text-gray-300 sm:text-lg">
                Sign in to continue to your account
              </p>
            </div>

            {/* Sign In Button */}
            <div>
              <SignInButton />
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-linear-to-br from-white/10 to-white/5 px-4 py-1 text-gray-300 backdrop-blur-sm">
                  Secure Authentication
                </span>
              </div>
            </div>

            {/* Security Info */}
            <div className="rounded-xl border border-green-500/30 bg-linear-to-br from-green-500/10 to-green-600/5 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <svg
                  className="h-6 w-6 shrink-0 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-green-300">
                    Your Privacy is Protected
                  </p>
                  <p className="mt-1 text-xs text-green-200/90">
                    Industry-standard encryption and security measures
                  </p>
                </div>
              </div>
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-gray-400">
              By signing in, you agree to our{' '}
              <Link
                href="/terms"
                className="text-primary-400 hover:text-primary-300 font-medium underline-offset-2 transition-colors hover:underline"
              >
                Terms
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="text-primary-400 hover:text-primary-300 font-medium underline-offset-2 transition-colors hover:underline"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 space-y-4 text-center sm:mt-8">
          <p className="text-sm text-gray-300 sm:text-base">
            New to NEUPC?{' '}
            <JoinButton
              href="/join"
              label="Create an account"
              className="text-primary-400 hover:text-primary-300 font-bold transition-colors hover:underline"
            />
          </p>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-white sm:text-base"
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
      <ScrollToTop />
    </PageShell>
  );
}

export default LoginPage;
