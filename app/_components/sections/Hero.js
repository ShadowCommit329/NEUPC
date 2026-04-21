'use client';

/**
 * @file Hero
 * @module Hero
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Hero3DCanvas from './Hero3DCanvas';

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};
const heroStat = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const DEFAULTS = {
  department: 'Dept of CSE',
  university: 'Netrokona University',
};

function Hero({ data = {}, settings = {} }) {
  const { department = DEFAULTS.department, university = DEFAULTS.university } =
    data;
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!selectedNode) return undefined;

    const timerId = window.setTimeout(() => {
      setSelectedNode(null);
    }, 5000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [selectedNode]);

  return (
    <section
      aria-label="Hero"
      className="relative z-0 flex min-h-screen items-center overflow-hidden pt-[calc(var(--header-h,69px)+1.5rem)] pb-16 sm:pt-[calc(var(--header-h,69px)+2rem)]"
    >
      {/* ── Full-bleed 3D canvas (hidden on mobile) ─────────── */}
      <div className="absolute inset-0 z-0 hidden md:block">
        <Hero3DCanvas onNodeClick={setSelectedNode} />
        {/* Left veil keeps text readable */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#05060B]/90 via-[#05060B]/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[#05060B] to-transparent" />
      </div>

      {/* Background accent orbs */}
      <div className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
        <div className="grid-overlay absolute inset-0 opacity-30" />
        <div className="bg-neon-violet/10 absolute -top-40 -left-40 h-125 w-125 rounded-full blur-[140px]" />
        <div className="bg-neon-lime/10 absolute top-1/3 -right-40 h-125 w-125 rounded-full blur-[140px]" />
      </div>

      {/* ── Text content — left-aligned overlay ─────────────── */}
      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-screen-2xl px-4 sm:px-6 xl:px-8">
        <motion.div
          className="pointer-events-auto flex max-w-xl flex-col items-start gap-8"
          variants={heroContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Eyebrow */}
          <motion.div variants={heroItem} className="flex items-center gap-4">
            <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
            <span className="font-mono text-[9px] font-medium tracking-[0.24em] text-zinc-400 uppercase sm:text-[10px] sm:tracking-[0.3em] md:text-[11px] md:tracking-[0.35em]">
              {department} · {university}
            </span>
          </motion.div>

          {/* Kinetic headline */}
          <motion.h1
            variants={heroItem}
            className="kinetic-headline font-heading text-[12vw] leading-none font-black text-white uppercase select-none md:text-[clamp(3.5rem,9vw,8rem)]"
          >
            CODE.
            <br />
            <span className="text-stroke-lime text-transparent">COMPETE.</span>
            <br />
            <span className="neon-text">CREATE.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p variants={heroItem} className="max-w-xl font-sans text-base leading-relaxed font-light text-zinc-300 md:text-lg">
            {settings?.hero_description ||
              "Join Netrokona University's premier programming community — compete, build, and grow alongside passionate engineers."}
          </motion.p>

          {/* CTAs */}
          <motion.div variants={heroItem} className="mt-2 flex flex-wrap items-center gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/join"
                className="group bg-neon-lime font-heading inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)]"
              >
                Join the Club
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/events"
                className="font-heading hover:border-neon-lime/50 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-[11px] font-bold tracking-widest text-zinc-200 uppercase backdrop-blur-sm transition-all hover:text-white"
              >
                View Events
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={heroItem}
            className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-8"
          >
            {[
              ['150+', 'Members'],
              ['40+', 'Contests'],
              ['12', 'Awards'],
            ].map(([value, label], i) => (
              <motion.div
                key={label}
                variants={heroStat}
                custom={i}
                className="flex items-baseline gap-2"
              >
                <span className="font-heading text-xl font-bold text-white">{value}</span>
                <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Node detail panel — bottom-right (only visible when canvas is shown) */}
      {selectedNode && (
        <div className="absolute right-4 bottom-16 z-20 hidden w-64 rounded-2xl border border-white/10 bg-zinc-950/80 p-4 backdrop-blur-md md:right-6 md:block md:w-72 lg:right-10 lg:w-80">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-neon-lime h-1.5 w-1.5 rounded-full shadow-[0_0_10px_rgba(182,243,107,1)]" />
              <span className="text-neon-lime font-mono text-[10px] font-bold tracking-[0.3em] uppercase">
                {selectedNode.id} · Track
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              aria-label="Close"
              className="inline-flex min-h-9 min-w-9 touch-manipulation items-center justify-center font-mono text-[10px] tracking-widest text-zinc-400 uppercase transition-colors hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="font-heading text-lg leading-tight font-bold text-white">
            {selectedNode.label}
          </div>
          <p className="mt-2 font-sans text-xs leading-relaxed text-zinc-400">
            {selectedNode.description}
          </p>
        </div>
      )}

      {/* Scroll indicator */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="font-mono text-[10px] tracking-[0.4em] text-zinc-600 uppercase">
          Scroll
        </span>
        <div className="h-8 w-[1px] bg-gradient-to-b from-zinc-600 to-transparent" />
      </div>
    </section>
  );
}

export default Hero;
