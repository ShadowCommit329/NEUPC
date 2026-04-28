'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const QUICK_LINKS = [
  { label: 'Events', href: '/events', icon: 'event' },
  { label: 'Achievements', href: '/achievements', icon: 'emoji_events' },
  { label: 'Roadmaps', href: '/roadmaps', icon: 'map' },
  { label: 'Blogs', href: '/blogs', icon: 'article' },
  { label: 'Committee', href: '/committee', icon: 'groups' },
  { label: 'Contact', href: '/contact', icon: 'mail' },
];

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060B] px-4 py-24 sm:px-6">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-overlay absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(124,92,255,0.06),transparent)]" />
        <div className="bg-neon-violet/8 absolute -top-40 -right-32 h-125 w-125 rounded-full blur-[140px]" />
        <div className="bg-neon-lime/5 absolute -bottom-40 -left-32 h-100 w-100 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl text-center">
        {/* Eyebrow */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="bg-neon-lime/30 h-px w-8" />
          <span className="font-mono text-[9px] font-bold tracking-[0.4em] text-zinc-600 uppercase">
            Error_404 · Route_Not_Found
          </span>
          <span className="bg-neon-lime/30 h-px w-8" />
        </div>

        {/* Big 404 */}
        <div className="kinetic-headline font-heading mb-6 text-[clamp(6rem,25vw,14rem)] leading-none font-black text-white uppercase select-none">
          4<span className="text-stroke-lime text-transparent">0</span>4
        </div>

        {/* Terminal card */}
        <div className="void-glow-violet relative overflow-hidden rounded-sm border border-white/5 bg-[rgba(12,14,22,0.75)] p-7 backdrop-blur-2xl sm:p-8">
          {/* Corner accents */}
          <span className="bg-neon-lime/60 absolute top-0 left-0 h-5 w-px" />
          <span className="bg-neon-lime/60 absolute top-0 left-0 h-px w-5" />
          <span className="bg-neon-violet/50 absolute right-0 bottom-0 h-5 w-px" />
          <span className="bg-neon-violet/50 absolute right-0 bottom-0 h-px w-5" />

          <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
            <span className="text-neon-lime/70">&gt;&gt;</span> The page you
            requested does not exist or has been moved.
          </p>

          {/* Quick links */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group hover:border-neon-lime/20 hover:bg-neon-lime/3 flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/2 px-2 py-3 transition-all"
              >
                <span className="material-symbols-outlined group-hover:text-neon-lime/70 text-[18px] text-zinc-600 transition-colors">
                  {link.icon}
                </span>
                <span className="font-mono text-[8px] tracking-[0.2em] text-zinc-600 uppercase transition-colors group-hover:text-zinc-400">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="group bg-neon-lime font-heading inline-flex items-center gap-2 rounded-full px-7 py-3 text-[10px] font-black tracking-[0.2em] text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] transition-all hover:shadow-[0_0_45px_-5px_rgba(182,243,107,0.7)] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            Return_To_Home
          </Link>

          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-7 py-3 font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase transition-all hover:border-white/20 hover:text-zinc-200 active:scale-[0.98]"
          >
            <svg
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
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
            Go_Back
          </button>
        </div>

        {/* Help */}
        <p className="mt-8 font-mono text-[9px] tracking-wide text-zinc-700">
          Still lost?{' '}
          <Link
            href="/contact"
            className="text-neon-violet/60 decoration-neon-violet/20 hover:text-neon-violet underline underline-offset-2 transition-colors"
          >
            Contact_Support →
          </Link>
        </p>
      </div>
    </main>
  );
}
