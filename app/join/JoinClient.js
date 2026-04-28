'use client';

import { signIn } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMember } from '../_components/ui/UserRoleProvider';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Zap, Users, BarChart2, BadgeCheck } from 'lucide-react';
import {
  pageFadeUp as fadeUp,
  pageStagger as stagger,
  pageCardReveal as cardReveal,
  pageViewport as viewport,
} from '../_components/motion/motion';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});

const cardsStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// ─── Default features ────────────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  {
    Icon: Zap,
    title: 'Event Registration',
    description: 'Register for contests, workshops, and hackathons as they go live.',
    accent: true,
  },
  {
    Icon: Users,
    title: 'Smart Notifications',
    description: 'Get alerts for events, blogs, roadmaps, and club announcements.',
    accent: false,
  },
  {
    Icon: BarChart2,
    title: 'Participation Log',
    description: 'Track your event history and download participation certificates.',
    accent: true,
  },
  {
    Icon: BadgeCheck,
    title: 'Membership Apply',
    description: 'Submit your application to become an official club member.',
    accent: false,
  },
];

const ICON_MAP = { Zap, Users, BarChart2, BadgeCheck };

// ─── Google SVG ───────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ feature }) {
  const { Icon, title, description, accent } = feature;
  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="holographic-card group rounded-2xl p-5 sm:p-6"
    >
      <motion.div
        className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors sm:mb-5 sm:h-11 sm:w-11 ${
          accent
            ? 'bg-neon-lime/10 text-neon-lime group-hover:bg-neon-lime group-hover:text-black'
            : 'bg-neon-violet/10 text-neon-violet group-hover:bg-neon-violet group-hover:text-white'
        }`}
        whileHover={{ rotate: 6 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </motion.div>
      <h3 className="font-heading mb-2 text-base font-bold text-white sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-relaxed font-light text-zinc-400">
        {description}
      </p>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JoinClient({ features: propFeatures = [], settings = {} }) {
  const isLoggedIn = useIsMember();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) router.replace('/account');
  }, [isLoggedIn, router]);

  const handleGoogleSignIn = () => signIn('google', { callbackUrl: '/account' });

  const features =
    propFeatures.length > 0
      ? propFeatures.map((f, i) => ({
          Icon: ICON_MAP[DEFAULT_FEATURES[i]?.Icon?.displayName] || DEFAULT_FEATURES[i]?.Icon || Zap,
          title: f.title,
          description: f.description,
          accent: i % 2 === 0,
        }))
      : DEFAULT_FEATURES;

  return (
    <div className="overflow-x-clip">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[80vh] items-center overflow-hidden px-4 pt-24 pb-16 sm:min-h-[85vh] sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">

        {/* Ambient background — matches Events page exactly */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="grid-overlay absolute inset-0 opacity-25" />
          <div className="absolute -top-24 left-1/4 h-100 w-100 -translate-x-1/2 rounded-full bg-neon-violet/12 blur-[120px] sm:h-125 sm:w-125" />
          <div className="absolute top-1/3 right-0 h-75 w-75 rounded-full bg-neon-lime/8 blur-[120px] sm:h-100 sm:w-100" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#05060b] to-transparent" />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-7xl"
        >
          <div className="max-w-2xl space-y-6 sm:max-w-3xl sm:space-y-8">

            {/* Eyebrow */}
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
              <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-400 uppercase sm:text-[11px]">
                {settings?.join_page_badge || 'Join · NEUPC'}
              </span>
            </motion.div>

            {/* Kinetic headline */}
            <motion.h1
              variants={fadeUp}
              className="kinetic-headline font-heading text-[clamp(2.8rem,11vw,7rem)] font-black leading-none text-white uppercase select-none"
            >
              {settings?.join_page_title ? (
                settings.join_page_title
              ) : (
                <>
                  Create Your
                  <br />
                  <span className="neon-text">Account.</span>
                </>
              )}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="max-w-lg text-sm leading-relaxed text-zinc-400 sm:max-w-xl sm:text-base lg:text-lg"
            >
              {settings?.join_page_description ||
                'Stay updated with events, contests, and workshops at Netrokona University Programming Club.'}
            </motion.p>

            {/* Status pill */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-neon-lime/20 bg-neon-lime/8 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-neon-lime uppercase sm:px-5 sm:py-2.5 sm:text-[11px]"
            >
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              Free · Open to All Students
            </motion.div>

            {/* CTA */}
            <motion.div variants={fadeUp}>
              <motion.button
                onClick={handleGoogleSignIn}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group bg-neon-lime font-heading inline-flex min-h-11 touch-manipulation items-center gap-2.5 rounded-full px-8 py-3.5 text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)]"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </motion.button>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* ── What you get ──────────────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-24 lg:py-32">

        {/* Ambient */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="grid-overlay absolute inset-0 opacity-20" />
          <div className="bg-neon-lime/5 absolute top-1/2 left-1/2 h-75 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] sm:h-100" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Section eyebrow */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-12 space-y-4 sm:mb-16"
          >
            <div className="flex items-center gap-3">
              <span className="bg-neon-lime h-px w-8 sm:w-10" />
              <span className="text-neon-lime font-mono text-[10px] font-bold tracking-[0.4em] uppercase sm:text-[11px] sm:tracking-[0.5em]">
                Public Account
              </span>
              <span className="bg-neon-lime h-px w-8 sm:w-10" />
            </div>
            <h2 className="kinetic-headline font-heading text-4xl font-black text-white uppercase sm:text-5xl md:text-6xl">
              What You <span className="neon-text">Unlock.</span>
            </h2>
            <p className="max-w-xl text-sm leading-relaxed font-light text-zinc-400 sm:text-base">
              Get started with a free public account. Upgrade to full membership anytime for deeper access.
            </p>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            variants={cardsStagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"
          >
            {features.map((feature, i) => (
              <FeatureCard key={feature.title || i} feature={feature} />
            ))}
          </motion.div>

          {/* Important note — matches existing amber style */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:mt-10 sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span className="mt-0.5 shrink-0 text-xl text-amber-400">ℹ</span>
              <div>
                <h3 className="font-heading mb-1.5 text-sm font-bold text-amber-300 uppercase tracking-wide">
                  Important Note
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Public accounts do not have access to internal member resources, weekly problem sets,
                  or committee discussions. Upgrade to full membership for unrestricted access.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── Final CTA block — matches Join section on homepage ────────────── */}
      <section className="relative py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="border-neon-lime/20 from-neon-lime/5 to-neon-violet/5 relative overflow-hidden rounded-2xl border bg-linear-to-br via-transparent p-6 sm:rounded-3xl sm:p-10 md:p-14 lg:p-16"
          >
            <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">

              {/* Text */}
              <div className="md:col-span-2">
                <p className="text-neon-lime mb-2 font-mono text-[10px] font-bold tracking-[0.4em] uppercase sm:mb-3">
                  /// Get started
                </p>
                <h3 className="font-heading text-2xl leading-tight font-black text-white uppercase sm:text-3xl md:text-4xl">
                  Ready to join<br className="hidden sm:block" /> the community?
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed font-light text-zinc-400 sm:mt-4">
                  Sign in with your Google account to register, track events, and start your journey with NEUPC.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-row flex-wrap items-center gap-3 md:flex-col md:items-end md:gap-3">
                <motion.button
                  onClick={handleGoogleSignIn}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="group bg-neon-lime font-heading focus-visible:ring-neon-lime inline-flex items-center gap-2 rounded-full px-6 py-3 text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)] focus-visible:ring-2 focus-visible:outline-none sm:px-8 sm:py-3.5 sm:text-[11px]"
                >
                  <GoogleIcon />
                  Sign in now
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </motion.button>
                <p className="font-mono text-[10px] tracking-[0.3em] text-zinc-600 uppercase">
                  Free · No credit card
                </p>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}
