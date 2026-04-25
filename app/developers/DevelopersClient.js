'use client';

import Image from 'next/image';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { cn, driveImageUrl, getInitials } from '../_lib/utils';
import CTASection from '../_components/ui/CTASection';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});

// ─── Motion variants (exact sync with events / achievements / home) ───────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const viewport = { once: true, margin: '-40px 0px' };

// ─── Fallback data ────────────────────────────────────────────────────────────

const DEFAULT_TECH_STACK = {
  frontend: [
    { name: 'Next.js',      label: 'FRAMEWORK'   },
    { name: 'React',        label: 'UI_LIBRARY'  },
    { name: 'Tailwind CSS', label: 'STYLING'     },
    { name: 'JavaScript',   label: 'LANGUAGE'    },
  ],
  backend: [
    { name: 'Next.js API Routes', label: 'API_LAYER' },
    { name: 'NextAuth v5',        label: 'AUTH'      },
    { name: 'Supabase',           label: 'BaaS'      },
    { name: 'PostgreSQL',         label: 'DATABASE'  },
  ],
  deployment: [
    { name: 'Vercel',         label: 'HOSTING'    },
    { name: 'GitHub Actions', label: 'CI_CD'      },
    { name: 'Supabase Cloud', label: 'CLOUD'      },
    { name: 'Edge Functions', label: 'SERVERLESS' },
  ],
};

const TECH_CATEGORIES = [
  { key: 'frontend',   label: '01 Frontend',   accent: 'lime'   },
  { key: 'backend',    label: '02 Backend',    accent: 'violet' },
  { key: 'deployment', label: '03 Deployment', accent: 'lime'   },
];

const DEFAULT_TIMELINE = [
  { year: '2024',   title: 'Project Initiated', description: 'Website concept proposed and planning began',       status: 'completed' },
  { year: '2025',   title: 'MVP Launch',         description: 'Public website launched with core features',        status: 'completed' },
  { year: '2026',   title: 'Member Portal',      description: 'Authentication and member dashboard added',         status: 'current'   },
  { year: 'Future', title: 'Mobile App',         description: 'Native mobile application development',            status: 'planned'   },
];

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}

// ─── Avatar with initials fallback ────────────────────────────────────────────

function Avatar({ name, image, className, imgClassName }) {
  const [errored, setErrored] = useState(false);
  const src = image ? driveImageUrl(image) : '';
  const showImg = Boolean(src) && !errored;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {showImg ? (
        <Image
          src={src}
          alt={name || 'Developer'}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={cn('object-cover', imgClassName)}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neon-violet/20 via-surface to-neon-lime/10">
          <span className="font-heading text-3xl font-black text-white/30 select-none">
            {getInitials(name)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Social button ────────────────────────────────────────────────────────────

function SocialBtn({ href, icon, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500 transition-all duration-200 hover:border-neon-lime/30 hover:text-neon-lime"
    >
      {icon}
    </a>
  );
}

// ─── Stat tile (exact match events page) ─────────────────────────────────────

function StatTile({ value, label, mobileLabel, accent = false }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center sm:items-start sm:text-left">
      <span className={cn(
        'font-heading text-2xl font-black tabular-nums sm:text-3xl lg:text-4xl',
        accent ? 'text-neon-lime' : 'text-white'
      )}>
        {value}
      </span>
      <span className="font-mono text-[8px] tracking-[0.22em] text-zinc-500 uppercase sm:text-[9px] lg:text-[10px]">
        <span className="sm:hidden">{mobileLabel || label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </div>
  );
}

// ─── Section heading (exact match events / achievements) ─────────────────────

function SectionLabel({ tag, title, accent }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className="mb-10 sm:mb-14"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-neon-lime h-px w-7" />
        <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
          {tag}
        </span>
      </div>
      <h2 className="kinetic-headline font-heading text-3xl font-black text-white uppercase sm:text-4xl md:text-5xl">
        {title}
        {accent && <> <span className="neon-text">{accent}</span></>}
      </h2>
    </motion.div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="mx-auto max-w-xs flex items-center gap-4 px-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/8" />
      <div className="h-1 w-1 rounded-full bg-neon-lime/30" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/8" />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ stats }) {
  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">

      {/* Ambient background — exact events pattern */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-overlay absolute inset-0 opacity-25" />
        <div className="absolute -top-24 left-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-neon-violet/12 blur-[120px] sm:h-[500px] sm:w-[500px]" />
        <div className="absolute top-1/3 right-0 h-[300px] w-[300px] rounded-full bg-neon-lime/8 blur-[120px] sm:h-[400px] sm:w-[400px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#05060b] to-transparent" />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-screen-xl"
      >
        <div className="max-w-2xl space-y-6 sm:max-w-3xl sm:space-y-8">

          {/* Eyebrow */}
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-400 uppercase sm:text-[11px]">
              Developers · NEUPC · Digital Infrastructure
            </span>
          </motion.div>

          {/* Kinetic headline */}
          <motion.h1
            variants={fadeUp}
            className="kinetic-headline font-heading text-[clamp(2.8rem,11vw,7rem)] font-black leading-none text-white uppercase select-none"
          >
            Meet the<br />
            <span className="neon-text">Architects</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className="max-w-lg text-sm leading-relaxed text-zinc-400 sm:max-w-xl sm:text-base lg:text-lg"
          >
            The technical force behind the NEUPC ecosystem — engineering
            high-performance infrastructure and building the digital future of
            our community.
          </motion.p>

          {/* Live badge */}
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-neon-lime/20 bg-neon-lime/8 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-neon-lime uppercase sm:px-5 sm:py-2.5 sm:text-[11px]">
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              Open Source · GitHub · Active Development
            </span>
          </motion.div>

          {/* Stats row */}
          {stats.length > 0 && (
            <motion.div variants={fadeUp} className="border-t border-white/8 pt-6 sm:pt-8">
              <div className="grid grid-cols-4 divide-x divide-white/8">
                {stats.slice(0, 4).map((stat, i) => (
                  <div
                    key={i}
                    className={cn(
                      i === 0 ? 'pr-4 sm:pr-8' :
                      i === 3 ? 'pl-4 sm:pl-8' :
                      'px-4 sm:px-8'
                    )}
                  >
                    <StatTile
                      value={stat.value}
                      label={stat.label}
                      mobileLabel={stat.mobileLabel}
                      accent={i === 0}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>

      {/* Scroll indicator */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 lg:flex">
        <span className="font-mono text-[9px] tracking-[0.4em] text-zinc-700 uppercase">Scroll</span>
        <div className="h-7 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
      </div>
    </section>
  );
}

// ─── Developer card (portrait) — exact CoreExecCard pattern ──────────────────

function DeveloperCard({ dev, index }) {
  const isAlt = index % 2 === 1;

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={cn(
        'group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/8 bg-surface transition-all duration-500',
        isAlt ? 'hover:border-neon-violet/40' : 'hover:border-neon-lime/40'
      )}
    >
      {/* Portrait */}
      <Avatar
        name={dev.name}
        image={dev.profileImage}
        className="absolute inset-0"
        imgClassName="grayscale group-hover:grayscale-0 group-hover:scale-[1.04] transition-all duration-700 ease-out"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05060b]/95 via-[#05060b]/25 to-transparent" />

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-6">
        {/* Role badge */}
        <span className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.3em] uppercase sm:text-[10px]',
          isAlt
            ? 'border-neon-violet/30 bg-neon-violet/10 text-neon-violet'
            : 'border-neon-lime/30 bg-neon-lime/10 text-neon-lime'
        )}>
          {dev.role || 'Developer'}
        </span>

        {/* Name */}
        <h3 className="font-heading text-xl font-black text-white uppercase leading-tight sm:text-2xl">
          {dev.name}
        </h3>

        {/* Dept / session */}
        {(dev.department || dev.batch) && (
          <p className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase">
            {[dev.department, dev.batch].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Stack pills */}
        {dev.stack?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {dev.stack.slice(0, 3).map((tech, idx) => (
              <span
                key={idx}
                className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[9px] text-zinc-400"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Hover-reveal socials */}
        <div className="flex gap-2 pt-1 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <SocialBtn href={dev.github}    icon={<GithubIcon />}  label="GitHub"    />
          <SocialBtn href={dev.linkedin}  icon={<LinkedinIcon />}label="LinkedIn"  />
          <SocialBtn href={dev.portfolio} icon={<GlobeIcon />}   label="Portfolio" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Contributor card ─────────────────────────────────────────────────────────

function ContributorCard({ contributor, index }) {
  const isAlt = index % 2 === 1;

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={cn(
        'glass-panel group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/8 p-5 transition-all duration-300',
        isAlt ? 'hover:border-neon-violet/20' : 'hover:border-neon-lime/20'
      )}
    >
      {/* Ambient glow */}
      <div className={cn(
        'pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100',
        isAlt ? 'bg-neon-violet/6' : 'bg-neon-lime/6'
      )} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <span className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.3em] uppercase',
            isAlt
              ? 'border-neon-violet/25 bg-neon-violet/8 text-neon-violet'
              : 'border-neon-lime/25 bg-neon-lime/8 text-neon-lime'
          )}>
            {contributor.role || 'Contributor'}
          </span>
          <h3 className="font-heading text-base font-black text-white uppercase leading-tight sm:text-lg">
            {contributor.name}
          </h3>
          {contributor.contribution && (
            <p className="text-xs leading-relaxed text-zinc-500 line-clamp-2">
              {contributor.contribution}
            </p>
          )}
        </div>
        <div className="shrink-0 pt-0.5">
          <SocialBtn href={contributor.github} icon={<GithubIcon />} label="GitHub" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tech stack card ──────────────────────────────────────────────────────────

function TechStackCard({ category, items }) {
  const isViolet = category.accent === 'violet';
  const accentText  = isViolet ? 'text-neon-violet'        : 'text-neon-lime';
  const accentBor   = isViolet ? 'border-neon-violet/15'   : 'border-neon-lime/15';
  const accentBorHov= isViolet ? 'group-hover/item:border-neon-violet/30' : 'group-hover/item:border-neon-lime/30';
  const accentGlow  = isViolet ? 'bg-neon-violet/6'        : 'bg-neon-lime/6';
  const accentHover = isViolet ? 'hover:border-neon-violet/20' : 'hover:border-neon-lime/20';

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn(
        'glass-panel group relative overflow-hidden rounded-2xl border border-white/8 p-6 transition-all duration-300 sm:p-8',
        accentHover
      )}
    >
      {/* Corner glow */}
      <div className={cn(
        'pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100',
        accentGlow
      )} />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className={cn('font-heading text-base font-black uppercase tracking-tight sm:text-lg', accentText)}>
          {category.label}
        </h3>
        <span className={cn('font-mono text-[9px] tracking-[0.3em] uppercase opacity-40', accentText)}>
          {items.length} tech
        </span>
      </div>

      {/* Tech list */}
      <ul className="space-y-4">
        {items.map((tech, idx) => (
          <li key={idx} className="group/item flex items-center gap-4">
            {/* Icon slot */}
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-surface transition-colors duration-200',
              accentBor, accentBorHov
            )}>
              <svg viewBox="0 0 16 16" fill="none" className={cn('h-3.5 w-3.5', accentText)}>
                <path d="M2 4l4 4-4 4M8 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="font-heading text-sm font-bold text-white transition-colors duration-200 group-hover/item:text-zinc-200">
                {tech.name}
              </span>
              {tech.label && (
                <span className="font-mono text-[9px] tracking-widest text-zinc-600 uppercase">
                  {tech.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({ item, index }) {
  const isEven = index % 2 === 0;

  const dotClass =
    item.status === 'completed' ? 'border-neon-lime bg-neon-lime/30 shadow-[0_0_8px_rgba(182,243,107,0.4)]' :
    item.status === 'current'   ? 'border-neon-violet bg-neon-violet/30 shadow-[0_0_10px_rgba(124,92,255,0.6)] animate-pulse' :
                                  'border-white/20 bg-surface-2';

  return (
    <motion.div
      variants={cardReveal}
      className={cn(
        'relative flex items-start gap-4 sm:gap-0',
        isEven ? 'sm:flex-row' : 'sm:flex-row-reverse'
      )}
    >
      {/* Timeline dot */}
      <div className="absolute left-[1.05rem] z-10 sm:left-1/2 sm:-translate-x-1/2">
        <div className={cn('h-3 w-3 rounded-full border-2', dotClass)} />
      </div>

      {/* Card */}
      <div className={cn(
        'ml-12 flex-1 sm:ml-0 sm:w-[calc(50%-2rem)]',
        isEven ? 'sm:pr-8' : 'sm:pl-8'
      )}>
        <div className="glass-panel group rounded-2xl border border-white/8 p-5 transition-all duration-300 hover:border-neon-lime/20 sm:p-6">
          {/* Badges */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-neon-lime/30 bg-neon-lime/8 px-3 py-0.5 font-mono text-[10px] font-bold tracking-[0.3em] text-neon-lime uppercase">
              {item.year}
            </span>
            {item.status === 'current' && (
              <span className="rounded-full border border-neon-violet/30 bg-neon-violet/8 px-3 py-0.5 font-mono text-[10px] font-bold tracking-[0.3em] text-neon-violet uppercase">
                Current
              </span>
            )}
            {item.status === 'planned' && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 font-mono text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
                Planned
              </span>
            )}
            {item.status === 'completed' && (
              <span className="rounded-full border border-neon-lime/20 bg-neon-lime/5 px-3 py-0.5 font-mono text-[10px] font-bold tracking-[0.3em] text-neon-lime/60 uppercase">
                Done
              </span>
            )}
          </div>

          <h3 className="font-heading text-lg font-black text-white uppercase leading-tight">
            {item.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
            {item.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptySlot({ message }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.015] py-20 text-center">
      <p className="font-mono text-[10px] tracking-[0.3em] text-zinc-600 uppercase">{message}</p>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DevelopersClient({
  coreDevelopers: propCoreDevelopers = [],
  contributors: propContributors = [],
  techStack: propTechStack = {},
  timeline: propTimeline = [],
  githubStats: propGithubStats = {},
  settings = {},
}) {
  const coreDevelopers = propCoreDevelopers.length > 0 ? propCoreDevelopers : [];
  const contributors   = propContributors.length  > 0 ? propContributors  : [];
  const techStack      = Object.keys(propTechStack).length > 0 ? propTechStack : DEFAULT_TECH_STACK;
  const timeline       = propTimeline.length > 0 ? propTimeline : DEFAULT_TIMELINE;

  const totalContributors = coreDevelopers.length + contributors.length;

  const heroStats = [
    { value: propGithubStats.commits      || '500+', label: 'Commits',      mobileLabel: 'Commits' },
    { value: String(totalContributors || propGithubStats.contributors || '15+'), label: 'Contributors', mobileLabel: 'Devs' },
    { value: propGithubStats.stars        || '42',   label: 'GitHub Stars',  mobileLabel: 'Stars'  },
    { value: propGithubStats.forks        || '12',   label: 'Forks',         mobileLabel: 'Forks'  },
  ];

  return (
    <div className="overflow-x-clip">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Hero stats={heroStats} />

      {/* ── Core Developers ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-28">
        <div className="mx-auto max-w-screen-xl">
          <SectionLabel tag="Engineering Team" title="Core" accent="Developers" />
          {coreDevelopers.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="grid gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-4"
            >
              {coreDevelopers.map((dev, i) => (
                <DeveloperCard key={dev.id || i} dev={dev} index={i} />
              ))}
            </motion.div>
          ) : (
            <EmptySlot message="Developer profiles will appear here once added." />
          )}
        </div>
      </section>

      <Divider />

      {/* ── Contributors ─────────────────────────────────────────────────── */}
      {contributors.length > 0 && (
        <>
          <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-28">
            <div className="mx-auto max-w-screen-xl">
              <SectionLabel tag="Open Source" title="External" accent="Contributors" />
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
              >
                {contributors.map((c, i) => (
                  <ContributorCard key={c.id || i} contributor={c} index={i} />
                ))}
              </motion.div>
            </div>
          </section>
          <Divider />
        </>
      )}

      {/* ── Tech Stack ───────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-28">
        <div className="mx-auto max-w-screen-xl">
          <SectionLabel tag="Architecture" title="Core" accent="Tech Stack" />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid gap-6 sm:gap-7 md:grid-cols-3"
          >
            {TECH_CATEGORIES.map((cat) => (
              <TechStackCard
                key={cat.key}
                category={cat}
                items={(techStack[cat.key] || []).map((t) =>
                  typeof t === 'string' ? { name: t } : t
                )}
              />
            ))}
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-28">
        <div className="mx-auto max-w-screen-xl">
          <SectionLabel tag="History" title="Development" accent="Timeline" />

          <div className="relative">
            {/* Vertical track line */}
            <div className="absolute left-[1.1rem] top-0 bottom-0 w-px bg-gradient-to-b from-neon-lime/30 via-neon-violet/20 to-transparent sm:left-1/2 sm:-translate-x-px" />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="space-y-10 sm:space-y-14"
            >
              {timeline.map((item, i) => (
                <TimelineItem key={i} item={item} index={i} />
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <CTASection
        icon="💻"
        title={settings?.developers_page_cta_title || 'Want to Contribute?'}
        description={
          settings?.developers_page_cta_description ||
          'This project follows collaborative development practices. Contributions from club members are welcomed through GitHub.'
        }
        primaryAction={{
          label: 'View Repository',
          href: 'https://github.com/eyasir329/NEUPC',
        }}
        secondaryAction={{ label: 'Contact Team', href: '/contact' }}
      />

      <ScrollToTop />
    </div>
  );
}
