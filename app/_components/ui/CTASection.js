'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useIsMember } from './UserRoleProvider';

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const viewport = { once: true, margin: '-40px 0px' };

export default function CTASection({
  icon = '🎯',
  title,
  description,
  primaryAction = { label: 'Join the Club', href: '/join' },
  secondaryAction = { label: 'Contact Us', href: '/contact' },
}) {
  const isLoggedIn = useIsMember();
  const isJoinAction = primaryAction.href === '/join';
  const showPrimary = !(isJoinAction && isLoggedIn);
  const isExternal = primaryAction.href?.startsWith('http');

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet/8 blur-[160px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="mx-auto max-w-2xl text-center"
        >
          {/* Icon */}
          <motion.div variants={fadeUp} className="mb-6 text-5xl" aria-hidden>
            {icon}
          </motion.div>

          {/* Eyebrow line */}
          <motion.div variants={fadeUp} className="mb-5 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-neon-lime sm:w-10" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-neon-lime sm:text-[11px]">
              Get Involved
            </span>
            <span className="h-px w-8 bg-neon-lime sm:w-10" />
          </motion.div>

          {/* Title */}
          <motion.h2
            variants={fadeUp}
            className="kinetic-headline font-heading text-4xl font-black text-white uppercase sm:text-5xl"
          >
            {title}
          </motion.h2>

          {/* Description */}
          {description && (
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-5 max-w-lg text-sm leading-relaxed font-light text-zinc-400 sm:text-base"
            >
              {description}
            </motion.p>
          )}

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            {showPrimary && (
              isExternal ? (
                <a
                  href={primaryAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-neon-lime font-heading inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.55)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)]"
                >
                  {primaryAction.label}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </a>
              ) : (
                <Link
                  href={primaryAction.href}
                  className="group bg-neon-lime font-heading inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.55)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)]"
                >
                  {primaryAction.label}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              )
            )}

            <Link
              href={secondaryAction.href}
              className="font-heading hover:border-neon-lime/50 hover:text-neon-lime inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full border border-white/15 px-8 py-3.5 text-[11px] font-bold tracking-widest text-zinc-300 uppercase backdrop-blur-sm transition-all"
            >
              {secondaryAction.label}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
