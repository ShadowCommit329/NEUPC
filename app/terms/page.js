/**
 * @file Terms of service page (server component).
 * Static legal content describing membership policies, code of conduct, and usage terms.
 *
 * @module TermsPage
 */

import ScrollToTop from '@/app/_components/ui/ScrollToTop';
import { buildMetadata } from '@/app/_lib/seo';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description:
    'Terms of Service for NEUPC — membership policies, code of conduct, intellectual property, and usage terms.',
  pathname: '/terms',
  keywords: [
    'terms of service',
    'usage policy',
    'code of conduct',
    'membership terms',
  ],
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-900 via-black to-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur-md">
            <span className="text-xl">📋</span>
            <span className="text-primary-300">Legal</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Terms of Service
          </h1>
          <p className="text-gray-400">Last updated: February 28, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-8 rounded-2xl bg-white/5 p-8 backdrop-blur-md md:p-12">
          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              1. Acceptance of Terms
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                By creating an account or using the Netrokona University
                Programming Club (NEUPC) website, you agree to these Terms of
                Service. If you do not agree, please do not use the website.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              2. Eligibility
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  Membership is open to current students and alumni of Netrokona
                  University, Department of Computer Science and Engineering.
                </li>
                <li>You must use a valid Google account to sign in.</li>
                <li>
                  Membership applications are subject to approval by the club
                  executive committee.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              3. Account Responsibilities
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  You are responsible for all activity under your account.
                </li>
                <li>
                  Provide accurate profile information (name, session,
                  department).
                </li>
                <li>Do not share your session or impersonate other members.</li>
                <li>
                  Report unauthorized access immediately to club administrators.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              4. Membership & Roles
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>The club operates with the following role hierarchy:</p>
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  <strong className="text-white">Guest:</strong> Default role
                  after sign-in. Can browse events and apply for membership.
                </li>
                <li>
                  <strong className="text-white">Member:</strong> Approved
                  members with access to resources, discussions, contests, and
                  event registration.
                </li>
                <li>
                  <strong className="text-white">Executive:</strong> Committee
                  members with event/blog management capabilities.
                </li>
                <li>
                  <strong className="text-white">Mentor:</strong> Senior members
                  who guide and mentor new members.
                </li>
                <li>
                  <strong className="text-white">Advisor:</strong> Faculty
                  advisors with oversight access.
                </li>
                <li>
                  <strong className="text-white">Admin:</strong> System
                  administrators with full access.
                </li>
              </ul>
              <p>
                Roles are assigned by administrators and executive committee
                members. Misuse of elevated privileges may result in account
                suspension.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              5. Code of Conduct
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>All members must adhere to the following principles:</p>
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  <strong className="text-white">Respect:</strong> Treat all
                  members with dignity. No discrimination, harassment, or
                  bullying.
                </li>
                <li>
                  <strong className="text-white">Academic Integrity:</strong> Do
                  not plagiarize code or solutions in contests, tasks, or
                  discussions.
                </li>
                <li>
                  <strong className="text-white">Non-political:</strong> The
                  club is strictly non-political. No political activities or
                  discussions within club platforms.
                </li>
                <li>
                  <strong className="text-white">Professionalism:</strong>{' '}
                  Maintain professional conduct in all club communications and
                  events.
                </li>
                <li>
                  <strong className="text-white">Collaboration:</strong> Share
                  knowledge, help others learn, and contribute positively to the
                  community.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              6. Events & Registrations
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  Event registration is subject to availability and eligibility.
                </li>
                <li>Duplicate registrations are automatically prevented.</li>
                <li>The club reserves the right to cancel or modify events.</li>
                <li>
                  Participation certificates are issued at the discretion of the
                  organizing committee.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              7. Content & Intellectual Property
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <ul className="ml-4 list-disc space-y-2 pl-4">
                <li>
                  Blog posts, resources, and tutorials published on the website
                  remain the intellectual property of their respective authors.
                </li>
                <li>
                  By posting content, you grant NEUPC a non-exclusive license to
                  display it on the website.
                </li>
                <li>
                  Do not upload copyrighted material without proper attribution
                  or permission.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              8. Termination
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                The club reserves the right to suspend or terminate any account
                that violates these terms, the code of conduct, or university
                policies. Members may also request voluntary account deletion
                via the{' '}
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
              9. Limitation of Liability
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                The NEUPC website is provided &quot;as is&quot; without
                warranties of any kind. The club is not liable for any damages
                arising from the use of this website, including but not limited
                to data loss, service interruptions, or unauthorized access.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">
              10. Changes to Terms
            </h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                We may update these terms at any time. Continued use of the
                website after changes constitutes acceptance of the updated
                terms. Significant changes will be communicated via
                announcements.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">11. Contact</h2>
            <div className="space-y-3 leading-relaxed text-gray-300">
              <p>
                For questions about these terms, contact us via the{' '}
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
