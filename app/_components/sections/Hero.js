'use client';

/**
 * @file Hero
 * @module Hero
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Hero3DCanvas from './Hero3DCanvas';

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
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="grid-overlay absolute inset-0 opacity-30" />
        <div className="bg-neon-violet/10 absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-[140px]" />
        <div className="bg-neon-lime/10 absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full blur-[140px]" />
      </div>

      {/* Content grid */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        {/* ── Left column: copy ───────────────────────────────── */}
        <div className="flex flex-col items-start gap-8 lg:col-span-7">
          {/* Eyebrow */}
          <div className="flex items-center gap-4">
            <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
            <span className="font-mono text-[11px] font-medium tracking-[0.35em] text-slate-500 uppercase dark:text-zinc-500">
              {department} <br/> {university}
            </span>
          </div>

          {/* Kinetic headline */}
          <h1 className="kinetic-headline font-heading text-[12vw] leading-none font-black text-slate-900 uppercase select-none md:text-[8rem] dark:text-white">
            CODE.
            <br />
            <span className="text-stroke-lime text-transparent">COMPETE.</span>
            <br />
            <span className="neon-text">CREATE.</span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-xl font-sans text-base leading-relaxed font-light text-slate-600 md:text-lg dark:text-zinc-400">
            {settings?.hero_description ||
              "Join Netrokona University's premier programming community — compete, build, and grow alongside passionate engineers."}
          </p>

          {/* CTAs */}
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/join"
              className="group bg-neon-lime font-heading inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-all hover:scale-[1.02] hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)]"
            >
              Join the Club
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <Link
              href="/events"
              className="font-heading dark:hover:border-neon-lime dark:hover:text-neon-lime inline-flex items-center gap-2 rounded-full border border-slate-300 px-8 py-3.5 text-[11px] font-bold tracking-widest text-slate-700 uppercase transition-all hover:border-slate-900 hover:text-slate-900 dark:border-white/15 dark:text-zinc-300"
            >
              View Events
            </Link>
          </div>

          {/* Meta row */}
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-slate-200 pt-8 dark:border-white/5">
            {[
              ['150+', 'Members'],
              ['40+', 'Contests'],
              ['12', 'Awards'],
            ].map(([value, label]) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                  {value}
                </span>
                <span className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase dark:text-zinc-500">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column: decorative stack ─────────────────── */}
        <div className="relative hidden lg:col-span-5 lg:block">
          {/* Main portrait placeholder */}
          <div className="group relative flex aspect-[4/5] w-full items-center justify-center bg-transparent">
            {/* 1. IDEAL UX: Place a real dark/moody photograph of your club here. */}
            {/* Just add a photo to your public folder and uncomment the Image component below */}
            {/* <Image 
                  src="/your-club-photo.jpg" 
                  alt="NEUPC Hackathon" 
                  fill 
                  className="object-cover opacity-40 mix-blend-luminosity transition-transform duration-700 hover:scale-105" 
                /> */}

            {/* 2. GRAPHIC: Interactive 3D Network art */}
            <Hero3DCanvas onNodeClick={setSelectedNode} />

            {/* Overlay UI elements. pointer-events-none ensures we can drag the 3D globe underneath! */}
            <div className="pointer-events-none absolute top-6 left-6 font-mono text-[10px] font-bold tracking-[0.4em] text-zinc-400 uppercase">
              {'/// NEUPC.01'}
            </div>

            {/* Interactive Drag Hint UI */}
            {/* <div className="pointer-events-none absolute top-6 right-6 flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1.5 backdrop-blur-md transition-opacity duration-700 group-hover:opacity-0"> */}
            {/* <div className="bg-neon-lime h-1.5 w-1.5 animate-pulse rounded-full shadow-[0_0_10px_rgba(182,243,107,1)]" /> */}
            {/* <span className="font-mono text-[9px] font-medium tracking-widest text-zinc-300 uppercase">
                Drag · Click a Node
              </span> */}
            {/* </div> */}

            {selectedNode ? (
              <div className="absolute right-6 bottom-6 left-6 z-30 rounded-2xl border border-white/10 bg-zinc-950/75 p-4 backdrop-blur-md">
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
                    className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase transition-colors hover:text-white"
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
            ) : (
              <div className="pointer-events-none absolute right-6 bottom-6 left-6 flex items-end justify-between text-zinc-300">
                {/* <div>
                  <div className="font-heading text-4xl leading-none font-black text-white drop-shadow-lg">
                    2024
                  </div>
                  <div className="mt-1 font-mono text-[10px] tracking-[0.3em] uppercase opacity-70">
                    Est. year
                  </div>
                </div> */}
                {/* <div className="text-right font-mono text-[10px] tracking-[0.3em] uppercase opacity-70">
                  N—22.02°
                  <br />
                  E—90.73°
                </div> */}
              </div>
            )}
          </div>

          {/* Floating stats card */}
          {/* <div className="glass-panel absolute -bottom-6 -left-6 max-w-[14rem] rounded-2xl p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              <span className="text-neon-lime font-mono text-[10px] font-bold tracking-[0.3em] uppercase">
                Live
              </span>
            </div>
            <p className="font-sans text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
              Weekly practice contests every Friday at 9:00 PM.
            </p>
          </div> */}

          {/* Floating accent chip */}
          {/* <div className="border-neon-violet/30 bg-neon-violet/10 absolute -top-4 -right-4 rotate-6 rounded-xl border px-4 py-2 backdrop-blur-xl">
            <span className="text-neon-violet font-mono text-[10px] font-bold tracking-[0.3em] uppercase">
              ICPC ready
            </span>
          </div> */}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="font-mono text-[10px] tracking-[0.4em] text-slate-500 uppercase dark:text-zinc-600">
          Scroll
        </span>
        <div className="h-8 w-[1px] bg-gradient-to-b from-slate-400 to-transparent dark:from-zinc-600" />
      </div>
    </section>
  );
}

export default Hero;
