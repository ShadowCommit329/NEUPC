/**
 * @file Privacy policy page (server component).
 * Static legal content describing data collection, usage, and user rights.
 *
 * @module PrivacyPage
 */

import ScrollToTop from '@/app/_components/ui/ScrollToTop';
import { buildMetadata } from '@/app/_lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description:
    'Privacy Policy for NEUPC — how we collect, use, store, and protect your personal information.',
  pathname: '/privacy',
  keywords: [
    'privacy policy',
    'data protection',
    'personal information',
    'GDPR',
  ],
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-900 via-black to-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur-md">
            <span className="text-xl">🔒</span>
            <span className="text-primary-300">Legal</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-gray-400">Last updated: February 28, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-8 rounded-2xl bg-white/5 p-8 backdrop-blur-md md:p-12">
          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              1. Information We Collect
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                When you use the NEUPC website, we may collect the following
                information:
              </p>
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  <strong className="text-white">Account Information:</strong>{' '}
                  Name, email address, and profile picture provided via Google
                  OAuth during sign-in.
                </li>
                <li>
                  <strong className="text-white">Profile Data:</strong>{' '}
                  Department, session, bio, and social links (GitHub, LinkedIn)
                  that you voluntarily provide.
                </li>
                <li>
                  <strong className="text-white">Usage Data:</strong> Pages
                  visited, events registered for, and participation history.
                </li>
                <li>
                  <strong className="text-white">Contact Form Data:</strong>{' '}
                  Name, email, and message content when you submit the contact
                  form.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              2. How We Use Your Information
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>To create and manage your member account</li>
                <li>
                  To facilitate event registrations and track participation
                </li>
                <li>
                  To display member profiles and achievements within the club
                </li>
                <li>To communicate club announcements, events, and notices</li>
                <li>To generate participation certificates</li>
                <li>To improve our website and services</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              3. Data Storage & Security
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                Your data is stored securely using{' '}
                <strong className="text-white">Supabase</strong> (PostgreSQL)
                with the following protections:
              </p>
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  <strong className="text-white">
                    Row Level Security (RLS):
                  </strong>{' '}
                  Database policies ensure users can only access their own data.
                </li>
                <li>
                  <strong className="text-white">Encrypted connections:</strong>{' '}
                  All data transfers use HTTPS/TLS encryption.
                </li>
                <li>
                  <strong className="text-white">OAuth authentication:</strong>{' '}
                  We never store passwords — authentication is handled via
                  Google OAuth.
                </li>
                <li>
                  <strong className="text-white">Role-based access:</strong>{' '}
                  Admin, executive, mentor, and member roles have strictly
                  scoped permissions.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              4. Data Sharing
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                We do <strong className="text-white">not</strong> sell, trade,
                or rent your personal information to third parties. Your data
                may be shared only in these cases:
              </p>
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  With club executives and advisors for administrative purposes
                </li>
                <li>When required by university policy or applicable law</li>
                <li>With your explicit consent</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              5. Cookies & Analytics
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                We use essential cookies for authentication sessions (NextAuth).
                We do not use tracking cookies or third-party analytics that
                collect personal data.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              6. Your Rights
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>You have the right to:</p>
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>Access and view your personal data through your profile</li>
                <li>Update or correct your profile information</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of non-essential communications</li>
              </ul>
              <p>
                To exercise these rights, contact us via the{' '}
                <a
                  href="/contact"
                  className="text-primary-400 hover:text-primary-300 underline"
                >
                  Contact page
                </a>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              7. Changes to This Policy
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                We may update this privacy policy from time to time. Changes
                will be posted on this page with an updated revision date.
                Continued use of the website constitutes acceptance of the
                updated policy.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">8. Contact</h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                If you have questions about this privacy policy, please reach
                out via our{' '}
                <a
                  href="/contact"
                  className="text-primary-400 hover:text-primary-300 underline"
                >
                  Contact page
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
}
