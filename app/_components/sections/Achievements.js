'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/app/_lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};
const statsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const statItem = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 18 } },
};

function isMedalist(result) {
  if (!result) return false;
  const r = result.toLowerCase();
  return /1st|first|champion|winner|gold|rank.?1\b|#1\b|2nd|second|silver|rank.?2\b|#2\b|3rd|third|bronze|rank.?3\b|#3\b/.test(r);
}

function deriveStats(achievements, participations) {
  const achYears = [...new Set(achievements.map((a) => a.year).filter(Boolean))];
  const partYears = [...new Set(participations.map((p) => p.year).filter(Boolean))];
  const yearsActive = Math.max(achYears.length - 1, partYears.length - 1);
  return [
    { value: String(achievements.length), label: 'Achievements' },
    { value: String(achievements.filter((a) => isMedalist(a.result)).length), label: 'Medalists' },
    { value: String(participations.length), label: 'Participations' },
    { value: yearsActive > 0 ? `${yearsActive}+` : '—', label: 'Years Active' },
  ];
}

function Achievements({
  achievements = [],
  participations = [],
  stats = [],
  settings = {},
}) {
  const featured = achievements.filter((a) => a.is_featured);
  const displayFeatured =
    featured.length > 0 ? featured : achievements.length > 0 ? [achievements[0]] : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const hasMultiple = displayFeatured.length > 1;
  const current = displayFeatured[currentIndex] || null;

  const goTo = useCallback((nextIndex) => {
    setVisible(false);
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setVisible(true);
    }, 250);
  }, []);

  const handleNext = useCallback(() => {
    goTo(currentIndex === displayFeatured.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, displayFeatured.length, goTo]);

  const handlePrev = useCallback(() => {
    goTo(currentIndex === 0 ? displayFeatured.length - 1 : currentIndex - 1);
  }, [currentIndex, displayFeatured.length, goTo]);

  useEffect(() => {
    if (!hasMultiple) return;
    const timer = setTimeout(handleNext, 5000);
    return () => clearTimeout(timer);
  }, [hasMultiple, currentIndex, handleNext]);

  const displayStats =
    achievements.length > 0 || participations.length > 0
      ? deriveStats(achievements, participations)
      : stats.length > 0
        ? stats
        : deriveStats([], []);

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
      {/* Top divider */}
      <div className="absolute top-0 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-neon-lime/20" />

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute top-1/3 left-1/2 h-[300px] w-full max-w-3xl -translate-x-1/2 rounded-full bg-neon-lime/5 blur-[120px] sm:h-[500px] sm:blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px 0px' }}
          className="mb-12 space-y-4 text-center sm:mb-16 sm:space-y-5"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-neon-lime sm:w-10" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-neon-lime sm:text-[11px] sm:tracking-[0.5em]">
              Recognition / 003
            </span>
            <span className="h-px w-8 bg-neon-lime sm:w-10" />
          </div>
          <h2 className="kinetic-headline font-heading text-4xl font-black uppercase text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
            Hall of <span className="neon-text">Victories</span>
          </h2>
          <p className="mx-auto max-w-sm px-4 text-sm font-light leading-relaxed text-slate-500 sm:max-w-md sm:px-0 dark:text-zinc-400">
            Our members compete and win at national and international programming contests.
          </p>
        </motion.div>

        {/* Featured Achievement Slider */}
        {current ? (
          <motion.div
            className="relative"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px 0px' }}
          >
            <div className="holographic-card rounded-2xl p-6 sm:rounded-3xl sm:p-10 md:p-14 lg:p-16">
              <div
                className="flex flex-col items-center gap-8 transition-all duration-300 ease-in-out sm:gap-12 lg:flex-row lg:gap-16"
                style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
              >

                {/* Image */}
                <div className="w-full max-w-xs sm:max-w-sm lg:w-5/12 lg:max-w-none">
                  <div className="relative">
                    <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-neon-lime/15 dark:bg-[#020307] sm:p-3">
                      {current.featured_photo?.url ? (
                        <div className="relative h-full w-full overflow-hidden rounded-xl">
                          <Image
                            src={current.featured_photo.url}
                            alt={current.title}
                            fill
                            className="object-cover transition-transform duration-700"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="ph-lime flex h-full w-full items-center justify-center rounded-xl">
                          <svg className="h-20 w-20 text-[--accent] sm:h-28 sm:w-28" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Floating badge */}
                    <div className="soft-glow-violet bg-neon-violet absolute -right-3 -top-3 rotate-12 rounded-xl p-3 shadow-xl sm:-right-4 sm:-top-4 sm:rounded-2xl sm:p-4">
                      <svg className="h-5 w-5 text-white sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="w-full space-y-5 text-center sm:space-y-6 lg:w-7/12 lg:text-left">
                  <span className="inline-block rounded-full border border-neon-lime/30 bg-neon-lime/10 px-4 py-2 font-mono text-[10px] font-bold uppercase text-neon-lime sm:px-6 sm:py-2.5 sm:text-[11px]">
                    {current.result || `Major Milestone ${current.year || new Date().getFullYear()}`}
                  </span>

                  <h3 className="kinetic-headline font-heading text-3xl font-black uppercase text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl dark:text-white">
                    {current.title}
                  </h3>

                  {current.description && (
                    <p className="text-sm leading-loose font-light text-slate-500 sm:text-base lg:text-lg dark:text-zinc-400">
                      {current.description}
                    </p>
                  )}

                  {/* Icon pills */}
                  <div className="flex justify-center gap-3 sm:gap-4 lg:justify-start">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neon-lime/20 bg-neon-lime/10 sm:h-14 sm:w-14">
                      <svg className="h-5 w-5 text-neon-lime sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-200 bg-violet-50 sm:h-14 sm:w-14 dark:border-neon-violet/20 dark:bg-[#0c0e16]">
                      <svg className="h-5 w-5 text-violet-600 sm:h-6 sm:w-6 dark:text-neon-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slider controls */}
            {hasMultiple && (
              <div className="mt-6 flex items-center justify-between sm:mt-8">
                <button
                  onClick={handlePrev}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:h-11 sm:w-11 dark:border-white/10 dark:text-zinc-400 dark:hover:border-neon-lime dark:hover:text-neon-lime dark:focus-visible:ring-neon-lime"
                  aria-label="Previous achievement"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2">
                  {displayFeatured.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={cn(
                        'h-2 rounded-full transition-all duration-300 focus-visible:outline-none',
                        i === currentIndex
                          ? 'w-6 bg-emerald-500 dark:bg-neon-lime'
                          : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-white/20 dark:hover:bg-white/30'
                      )}
                      aria-label={`Go to achievement ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:h-11 sm:w-11 dark:border-white/10 dark:text-zinc-400 dark:hover:border-neon-lime dark:hover:text-neon-lime dark:focus-visible:ring-neon-lime"
                  aria-label="Next achievement"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="holographic-card rounded-2xl py-16 text-center sm:py-20"
          >
            <p className="font-mono text-[11px] tracking-[0.3em] text-slate-400 uppercase dark:text-zinc-600">
              {settings?.achievements_empty_message || '[ No Featured Achievements ]'}
            </p>
          </motion.div>
        )}

        {/* Stats grid */}
        <motion.div
          variants={statsContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px 0px' }}
          className="mt-16 grid grid-cols-2 divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white/40 backdrop-blur-xl sm:mt-20 sm:rounded-3xl lg:grid-cols-4 dark:divide-white/5 dark:border-white/5 dark:bg-[#020307]/40"
        >
          {displayStats.map((stat, i) => (
            <motion.div
              key={i}
              variants={statItem}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={cn(
                'group relative px-4 py-8 text-center cursor-default sm:px-6 sm:py-10 dark:hover:bg-neon-lime/5 hover:bg-neon-lime/5 transition-colors',
                i % 2 === 0 && i !== displayStats.length - 1 && 'border-r border-slate-200 dark:border-white/5',
                i < displayStats.length - 2 && 'border-b border-slate-200 lg:border-b-0 dark:border-white/5',
                i < displayStats.length - 1 && i % 2 !== 0 && 'lg:border-r lg:border-slate-200 lg:dark:border-white/5',
              )}
            >
              <div className="stat-numeral font-heading mb-2 text-4xl font-black leading-none tracking-tighter text-neon-lime sm:mb-3 sm:text-5xl md:text-6xl">
                {stat.value}
              </div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500 sm:text-[10px] sm:tracking-[0.4em] dark:text-zinc-500">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-8 text-center sm:mt-10"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link
              href="/achievements"
              className="font-heading inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime sm:px-8 sm:py-3.5 sm:text-[11px] dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-neon-lime dark:hover:text-neon-lime"
            >
              {settings?.homepage_achievements_cta || 'View All Achievements'}
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Achievements;
