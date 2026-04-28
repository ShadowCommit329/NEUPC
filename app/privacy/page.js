import Link from 'next/link';
import ScrollToTop from '@/app/_components/ui/ScrollToTop';
import { buildMetadata } from '@/app/_lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description:
    'Privacy Policy for NEUPC — how we collect, use, store, and protect your personal information.',
  pathname: '/privacy',
  keywords: ['privacy policy', 'data protection', 'personal information', 'GDPR'],
});

const SECTIONS = [
  {
    id: '01',
    title: 'Information We Collect',
    accent: 'neon-violet',
    content: (
      <>
        <p>When you use the NEUPC website, we may collect the following information:</p>
        <ul>
          <li><strong>Account Information:</strong> Name, email address, and profile picture provided via Google OAuth during sign-in.</li>
          <li><strong>Profile Data:</strong> Department, session, bio, and social links (GitHub, LinkedIn) that you voluntarily provide.</li>
          <li><strong>Usage Data:</strong> Pages visited, events registered for, and participation history.</li>
          <li><strong>Contact Form Data:</strong> Name, email, and message content when you submit the contact form.</li>
        </ul>
      </>
    ),
  },
  {
    id: '02',
    title: 'How We Use Your Information',
    accent: 'neon-violet',
    content: (
      <ul>
        <li>To create and manage your member account.</li>
        <li>To facilitate event registrations and track participation.</li>
        <li>To display member profiles and achievements within the club.</li>
        <li>To communicate club announcements, events, and notices.</li>
        <li>To generate participation certificates.</li>
        <li>To improve our website and services.</li>
      </ul>
    ),
  },
  {
    id: '03',
    title: 'Data Storage & Security',
    accent: 'neon-emerald',
    content: (
      <>
        <p>
          Your data is stored securely using <strong>Supabase</strong> (PostgreSQL)
          with the following protections:
        </p>
        <ul>
          <li><strong>Row Level Security (RLS):</strong> Database policies ensure users can only access their own data.</li>
          <li><strong>Encrypted connections:</strong> All data transfers use HTTPS/TLS encryption.</li>
          <li><strong>OAuth authentication:</strong> We never store passwords — authentication is handled via Google OAuth.</li>
          <li><strong>Role-based access:</strong> Admin, executive, mentor, and member roles have strictly scoped permissions.</li>
        </ul>
      </>
    ),
  },
  {
    id: '04',
    title: 'Data Sharing',
    accent: 'neon-violet',
    content: (
      <>
        <p>
          We do <strong>not</strong> sell, trade, or rent your personal information to third parties.
          Your data may be shared only in these cases:
        </p>
        <ul>
          <li>With club executives and advisors for administrative purposes.</li>
          <li>When required by university policy or applicable law.</li>
          <li>With your explicit consent.</li>
        </ul>
      </>
    ),
  },
  {
    id: '05',
    title: 'Cookies & Analytics',
    accent: 'neon-violet',
    content: (
      <p>
        We use essential cookies for authentication sessions (NextAuth). We do not use tracking
        cookies or third-party analytics that collect personal data.
      </p>
    ),
  },
  {
    id: '06',
    title: 'Your Rights',
    accent: 'neon-lime',
    content: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>Access and view your personal data through your profile.</li>
          <li>Update or correct your profile information.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>Opt out of non-essential communications.</li>
        </ul>
        <p>
          To exercise these rights, contact us via the{' '}
          <Link href="/contact" className="text-neon-lime hover:text-white transition-colors underline underline-offset-2 decoration-neon-lime/30">
            Contact page
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: '07',
    title: 'Changes to This Policy',
    accent: 'neon-violet',
    content: (
      <p>
        We may update this privacy policy from time to time. Changes will be posted on this page
        with an updated revision date. Continued use of the website constitutes acceptance of the
        updated policy.
      </p>
    ),
  },
  {
    id: '08',
    title: 'Contact',
    accent: 'neon-violet',
    content: (
      <p>
        If you have questions about this privacy policy, please reach out via our{' '}
        <Link href="/contact" className="text-neon-lime hover:text-white transition-colors underline underline-offset-2 decoration-neon-lime/30">
          Contact page
        </Link>
        .
      </p>
    ),
  },
];

const HIGHLIGHTS = [
  { icon: 'lock', label: 'No passwords stored', sub: 'Google OAuth only' },
  { icon: 'share_off', label: 'Never sold', sub: 'Your data stays private' },
  { icon: 'verified_user', label: 'TLS 1.3', sub: 'Encrypted in transit' },
  { icon: 'manage_accounts', label: 'Your rights', sub: 'Access · Edit · Delete' },
];

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-[#05060B] overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-overlay absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(124,92,255,0.05),transparent)]" />
        <div className="bg-neon-violet/8 absolute -top-40 -left-40 h-125 w-125 rounded-full blur-[140px]" />
        <div className="bg-neon-lime/5 absolute bottom-0 -right-40 h-100 w-100 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="mb-16 sm:mb-20">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-neon-violet" />
            <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase sm:text-[11px]">
              Legal_Document · Last updated: Feb 28, 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="kinetic-headline font-heading text-5xl font-black uppercase text-white sm:text-6xl md:text-7xl">
            PRIVACY
            <br />
            <span className="text-stroke-lime text-transparent">POLICY.</span>
          </h1>

          <p className="mt-5 max-w-lg font-sans text-sm leading-relaxed font-light text-zinc-400">
            We respect your privacy. Here is exactly what data we collect, how we use
            it, and what control you have over it.
          </p>

          {/* Meta strip */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/5 pt-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-neon-violet/60">description</span>
              <span className="font-mono text-[9px] tracking-[0.25em] text-zinc-600 uppercase">8 Sections</span>
            </div>
            <span className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-neon-violet/60">schedule</span>
              <span className="font-mono text-[9px] tracking-[0.25em] text-zinc-600 uppercase">~2 min read</span>
            </div>
            <span className="h-3 w-px bg-white/10" />
            <Link
              href="/terms"
              className="font-mono text-[9px] tracking-[0.25em] text-neon-lime/70 uppercase transition-colors hover:text-neon-lime"
            >
              Terms of Service →
            </Link>
          </div>
        </div>

        {/* ── Key highlights grid ───────────────────────────────────── */}
        <div className="mb-16 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.label}
              className="holographic-card no-lift rounded-xl p-4 text-center"
            >
              <span className="material-symbols-outlined text-[20px] text-neon-violet/70">{h.icon}</span>
              <p className="mt-2 font-mono text-[9px] font-bold tracking-widest text-zinc-300 uppercase leading-snug">
                {h.label}
              </p>
              <p className="mt-1 font-mono text-[8px] tracking-wide text-zinc-600 uppercase">
                {h.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Sections ─────────────────────────────────────────────── */}
        <div className="space-y-0">
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              className="group border-t border-white/5 py-8 sm:py-10"
            >
              <div className="flex gap-6 sm:gap-8">
                {/* Index */}
                <div className="shrink-0 pt-0.5">
                  <span className="font-mono text-[10px] font-bold tracking-widest text-neon-violet/40 group-hover:text-neon-violet/70 transition-colors">
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
              href="/terms"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 font-mono text-[10px] tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
            >
              <span className="material-symbols-outlined text-[14px]">description</span>
              Terms of Service
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
        .legal-body ul li::before { content: '—'; position: absolute; left: 0; color: rgba(124,92,255,0.35); font-family: var(--font-mono, monospace); font-size: 0.75rem; }
        .legal-body strong { color: #e4e4e7; font-weight: 600; }
        .legal-body p + p { margin-top: 0.75rem; }
      `}</style>

      <ScrollToTop />
    </div>
  );
}
