import Link from 'next/link';
import ScrollToTop from '@/app/_components/ui/ScrollToTop';
import { buildMetadata } from '@/app/_lib/seo';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description:
    'Terms of Service for NEUPC — membership policies, code of conduct, intellectual property, and usage terms.',
  pathname: '/terms',
  keywords: ['terms of service', 'usage policy', 'code of conduct', 'membership terms'],
});

const SECTIONS = [
  {
    id: '01',
    title: 'Acceptance of Terms',
    content: (
      <p>
        By creating an account or using the Netrokona University Programming Club (NEUPC) website,
        you agree to these Terms of Service. If you do not agree, please do not use the website.
      </p>
    ),
  },
  {
    id: '02',
    title: 'Eligibility',
    content: (
      <ul>
        <li>Membership is open to current students and alumni of Netrokona University, Department of Computer Science and Engineering.</li>
        <li>You must use a valid Google account to sign in.</li>
        <li>Membership applications are subject to approval by the club executive committee.</li>
      </ul>
    ),
  },
  {
    id: '03',
    title: 'Account Responsibilities',
    content: (
      <ul>
        <li>You are responsible for all activity under your account.</li>
        <li>Provide accurate profile information (name, session, department).</li>
        <li>Do not share your session or impersonate other members.</li>
        <li>Report unauthorized access immediately to club administrators.</li>
      </ul>
    ),
  },
  {
    id: '04',
    title: 'Membership & Roles',
    content: (
      <>
        <p>The club operates with the following role hierarchy:</p>
        <ul>
          <li><strong>Guest:</strong> Default role after sign-in. Can browse events and apply for membership.</li>
          <li><strong>Member:</strong> Approved members with access to resources, discussions, contests, and event registration.</li>
          <li><strong>Executive:</strong> Committee members with event/blog management capabilities.</li>
          <li><strong>Mentor:</strong> Senior members who guide and mentor new members.</li>
          <li><strong>Advisor:</strong> Faculty advisors with oversight access.</li>
          <li><strong>Admin:</strong> System administrators with full access.</li>
        </ul>
        <p>
          Roles are assigned by administrators and executive committee members.
          Misuse of elevated privileges may result in account suspension.
        </p>
      </>
    ),
  },
  {
    id: '05',
    title: 'Code of Conduct',
    content: (
      <>
        <p>All members must adhere to the following principles:</p>
        <ul>
          <li><strong>Respect:</strong> Treat all members with dignity. No discrimination, harassment, or bullying.</li>
          <li><strong>Academic Integrity:</strong> Do not plagiarize code or solutions in contests, tasks, or discussions.</li>
          <li><strong>Non-political:</strong> The club is strictly non-political. No political activities or discussions within club platforms.</li>
          <li><strong>Professionalism:</strong> Maintain professional conduct in all club communications and events.</li>
          <li><strong>Collaboration:</strong> Share knowledge, help others learn, and contribute positively to the community.</li>
        </ul>
      </>
    ),
  },
  {
    id: '06',
    title: 'Events & Registrations',
    content: (
      <ul>
        <li>Event registration is subject to availability and eligibility.</li>
        <li>Duplicate registrations are automatically prevented.</li>
        <li>The club reserves the right to cancel or modify events.</li>
        <li>Participation certificates are issued at the discretion of the organizing committee.</li>
      </ul>
    ),
  },
  {
    id: '07',
    title: 'Content & Intellectual Property',
    content: (
      <ul>
        <li>Blog posts, resources, and tutorials published on the website remain the intellectual property of their respective authors.</li>
        <li>By posting content, you grant NEUPC a non-exclusive license to display it on the website.</li>
        <li>Do not upload copyrighted material without proper attribution or permission.</li>
      </ul>
    ),
  },
  {
    id: '08',
    title: 'Termination',
    content: (
      <p>
        The club reserves the right to suspend or terminate any account that violates these terms,
        the code of conduct, or university policies. Members may also request voluntary account
        deletion via the{' '}
        <Link href="/contact" className="text-neon-lime hover:text-white transition-colors underline underline-offset-2 decoration-neon-lime/30">
          Contact page
        </Link>
        .
      </p>
    ),
  },
  {
    id: '09',
    title: 'Limitation of Liability',
    content: (
      <p>
        The NEUPC website is provided &quot;as is&quot; without warranties of any kind. The club is
        not liable for any damages arising from the use of this website, including but not limited
        to data loss, service interruptions, or unauthorized access.
      </p>
    ),
  },
  {
    id: '10',
    title: 'Changes to Terms',
    content: (
      <p>
        We may update these terms at any time. Continued use of the website after changes constitutes
        acceptance of the updated terms. Significant changes will be communicated via announcements.
      </p>
    ),
  },
  {
    id: '11',
    title: 'Contact',
    content: (
      <p>
        For questions about these terms, contact us via the{' '}
        <Link href="/contact" className="text-neon-lime hover:text-white transition-colors underline underline-offset-2 decoration-neon-lime/30">
          Contact page
        </Link>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-[#05060B] overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-overlay absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(182,243,107,0.04),transparent)]" />
        <div className="bg-neon-violet/8 absolute -top-40 -right-40 h-125 w-125 rounded-full blur-[140px]" />
        <div className="bg-neon-lime/5 absolute bottom-0 -left-40 h-100 w-100 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="mb-16 sm:mb-20">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-neon-lime" />
            <span className="font-mono text-[9px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
              Legal_Document · Last updated: Feb 28, 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="kinetic-headline font-heading text-5xl font-black uppercase text-white sm:text-6xl md:text-7xl">
            TERMS
            <br />
            <span className="neon-text">OF SERVICE.</span>
          </h1>

          <p className="mt-5 max-w-lg font-sans text-sm leading-relaxed font-light text-zinc-400">
            By using the NEUPC platform you agree to the following conditions.
            Please read them carefully before signing in.
          </p>

          {/* Meta strip */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/5 pt-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-neon-lime/60">description</span>
              <span className="font-mono text-[9px] tracking-[0.25em] text-zinc-600 uppercase">11 Sections</span>
            </div>
            <span className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-neon-lime/60">schedule</span>
              <span className="font-mono text-[9px] tracking-[0.25em] text-zinc-600 uppercase">~3 min read</span>
            </div>
            <span className="h-3 w-px bg-white/10" />
            <Link
              href="/privacy"
              className="font-mono text-[9px] tracking-[0.25em] text-neon-violet/70 uppercase transition-colors hover:text-neon-violet"
            >
              Privacy Policy →
            </Link>
          </div>
        </div>

        {/* ── Sections ─────────────────────────────────────────────── */}
        <div className="space-y-0">
          {SECTIONS.map((section, i) => (
            <div
              key={section.id}
              className="group border-t border-white/5 py-8 sm:py-10"
            >
              <div className="flex gap-6 sm:gap-8">
                {/* Index */}
                <div className="shrink-0 pt-0.5">
                  <span className="font-mono text-[10px] font-bold tracking-widest text-neon-lime/40 group-hover:text-neon-lime/70 transition-colors">
                    {section.id}
                  </span>
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-lg font-black uppercase tracking-tight text-white sm:text-xl">
                    {section.title}
                  </h2>

                  <div className="legal-body mt-4 space-y-3 font-sans text-sm leading-relaxed text-zinc-400">
                    {section.content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Final border */}
          <div className="border-t border-white/5" />
        </div>

        {/* ── Footer CTA ───────────────────────────────────────────── */}
        <div className="mt-16 flex flex-col items-center gap-5 text-center sm:mt-20">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-white/10" />
            <span className="font-mono text-[9px] tracking-[0.4em] text-zinc-700 uppercase">End of Document</span>
            <span className="h-px w-10 bg-white/10" />
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 font-mono text-[10px] tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
            >
              <span className="material-symbols-outlined text-[14px]">shield</span>
              Privacy Policy
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 font-mono text-[10px] tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-violet/30 hover:text-neon-violet"
            >
              <span className="material-symbols-outlined text-[14px]">mail</span>
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* Legal body prose overrides */}
      <style>{`
        .legal-body ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
        .legal-body ul li { padding-left: 1.25rem; position: relative; }
        .legal-body ul li::before { content: '—'; position: absolute; left: 0; color: rgba(182,243,107,0.35); font-family: var(--font-mono, monospace); font-size: 0.75rem; }
        .legal-body strong { color: #e4e4e7; font-weight: 600; }
        .legal-body p + p { margin-top: 0.75rem; }
      `}</style>

      <ScrollToTop />
    </div>
  );
}
