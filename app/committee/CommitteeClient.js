'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { cn, driveImageUrl, getInitials } from '../_lib/utils';
import CTASection from '../_components/ui/CTASection';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});

// ─── Motion variants (exact sync with events / achievements) ─────────────────

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

// ─── Fallback data ───────────────────────────────────────────────────────────

const DEFAULT_ADVISORS = [
  {
    id: 'default-advisor',
    name: 'Dr. Mohammad Rahman',
    position: 'Associate Professor',
    designation: 'Faculty Advisor',
    department: 'Department of CSE',
    university: 'Netrokona University',
    image: '',
    message:
      'The Programming Club aims to build problem solvers and innovators who can compete globally while contributing locally.',
    linkedin: '',
    github: '',
  },
];

const HERO_STATS_DEFAULT = [
  { value: '15+', label: 'Committee Members' },
  { value: '7',   label: 'Departments'       },
  { value: '2025-26', label: 'Current Term'  },
];

// ─── Inline SVG icons ────────────────────────────────────────────────────────

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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

// ─── Avatar with initials fallback ───────────────────────────────────────────

function Avatar({ name, image, className, imgClassName }) {
  const [errored, setErrored] = useState(false);
  const src = image ? driveImageUrl(image) : '';
  const showImg = Boolean(src) && !errored;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {showImg ? (
        <Image
          src={src}
          alt={name || 'Profile'}
          fill
          sizes="(max-width: 640px) 100px, 200px"
          className={cn('object-cover', imgClassName)}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neon-violet/20 via-surface to-neon-lime/10">
          <span className="font-heading text-xl font-black text-white/40 select-none">
            {getInitials(name)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Social icon button ───────────────────────────────────────────────────────

function SocialBtn({ href, icon, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target={href.startsWith('mailto') ? undefined : '_blank'}
      rel="noopener noreferrer"
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500 transition-all duration-200 hover:border-neon-lime/30 hover:text-neon-lime"
    >
      {icon}
    </a>
  );
}

// ─── Stat tile (exact match to events page) ───────────────────────────────────

function StatTile({ value, label, mobileLabel, accent = false }) {
  return (
    <div className="flex flex-col items-start gap-0.5">
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

// ─── Section heading (matches events "Featured Event" heading style) ──────────

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

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ stats }) {
  return (
    <section className="relative isolate flex min-h-[75vh] items-center overflow-hidden px-4 pt-24 pb-16 sm:min-h-[80vh] sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">

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
        className="mx-auto w-full max-w-7xl"
      >
        <div className="max-w-2xl space-y-6 sm:max-w-3xl sm:space-y-8">

          {/* Eyebrow */}
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-400 uppercase sm:text-[11px]">
              Committee · NEUPC · 2025–26
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="kinetic-headline font-heading text-[clamp(2.8rem,11vw,7rem)] font-black leading-none text-white uppercase select-none"
          >
            Meet the<br />
            <span className="neon-text">Committee</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="max-w-lg text-sm leading-relaxed text-zinc-400 sm:max-w-xl sm:text-base lg:text-lg"
          >
            The dedicated architects steering NEUPC — from faculty mentorship to
            executive operations and everything in between.
          </motion.p>

          {/* Stats row */}
          {stats.length > 0 && (
            <motion.div variants={fadeUp} className="border-t border-white/8 pt-6 sm:pt-8">
              <div className={cn(
                'grid divide-x divide-white/8',
                `grid-cols-${Math.min(stats.length, 4)}`
              )}>
                {stats.slice(0, 4).map((stat, i) => (
                  <div
                    key={i}
                    className={cn(
                      i === 0 ? 'pr-4 sm:pr-8' :
                      i === stats.length - 1 ? 'pl-4 sm:pl-8' :
                      'px-4 sm:px-8'
                    )}
                  >
                    <StatTile
                      value={stat.value}
                      label={stat.label}
                      accent={i === 0}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 lg:flex">
        <span className="font-mono text-[9px] tracking-[0.4em] text-zinc-700 uppercase">Scroll</span>
        <div className="h-7 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
      </div>
    </section>
  );
}

// ─── Advisor card ─────────────────────────────────────────────────────────────

function AdvisorCard({ advisor, index }) {
  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="glass-panel group relative overflow-hidden rounded-2xl border border-white/8 p-6 transition-all duration-300 hover:border-neon-lime/20 sm:p-8"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-neon-lime/5 blur-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* Photo */}
        <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28 md:h-32 md:w-32">
          <div className="absolute inset-0 rounded-full border border-white/10 transition-colors duration-300 group-hover:border-neon-lime/30" />
          <Avatar
            name={advisor.name}
            image={advisor.image}
            className="absolute inset-0 rounded-full"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
          {/* Role badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-lime/30 bg-neon-lime/8 px-3 py-1 font-mono text-[10px] font-bold tracking-[0.3em] text-neon-lime uppercase">
            {advisor.designation || 'Faculty Advisor'}
          </span>

          <h3 className="font-heading text-xl font-black text-white sm:text-2xl">
            {advisor.name}
          </h3>

          {(advisor.position || advisor.department) && (
            <p className="text-sm text-zinc-500 font-light leading-relaxed">
              {[advisor.position, advisor.department, advisor.university]
                .filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Quote */}
          {advisor.message && (
            <blockquote className="relative mt-1 rounded-xl border border-white/6 bg-white/[0.025] px-4 py-3 text-left">
              <span className="absolute top-1.5 left-3 font-serif text-2xl leading-none text-neon-lime/25 select-none">"</span>
              <p className="pl-4 text-xs leading-relaxed text-zinc-400 italic sm:text-sm">
                {advisor.message}
              </p>
            </blockquote>
          )}

          {/* Socials */}
          <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
            <SocialBtn href={advisor.github}   icon={<GithubIcon />}   label="GitHub"   />
            <SocialBtn href={advisor.linkedin} icon={<LinkedinIcon />} label="LinkedIn" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Core exec portrait card ──────────────────────────────────────────────────

function CoreExecCard({ exec, index }) {
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
        name={exec.name}
        image={exec.image}
        className="absolute inset-0"
        imgClassName="grayscale group-hover:grayscale-0 group-hover:scale-[1.04] transition-all duration-700 ease-out"
      />

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05060b]/95 via-[#05060b]/30 to-transparent" />

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-5 space-y-2 sm:p-7">
        <span className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.3em] uppercase sm:text-[10px]',
          isAlt
            ? 'border-neon-violet/30 bg-neon-violet/10 text-neon-violet'
            : 'border-neon-lime/30 bg-neon-lime/10 text-neon-lime'
        )}>
          {exec.role}
        </span>

        <h3 className="font-heading text-xl font-black text-white uppercase leading-tight sm:text-2xl">
          {exec.name}
        </h3>

        {(exec.department || exec.academicSession) && (
          <p className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase sm:text-[10px]">
            {[exec.department, exec.academicSession].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Hover-reveal socials */}
        <div className="flex gap-2 pt-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <SocialBtn href={exec.github}   icon={<GithubIcon />}   label="GitHub"   />
          <SocialBtn href={exec.linkedin} icon={<LinkedinIcon />} label="LinkedIn" />
          <SocialBtn
            href={exec.email ? `mailto:${exec.email}` : ''}
            icon={<MailIcon />}
            label="Email"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Executive council card ───────────────────────────────────────────────────

function CouncilCard({ member, index }) {
  const [expanded, setExpanded] = useState(false);
  const text = member.bio || member.responsibility || '';
  const isLong = text.length > 80;
  const isAlt = index % 2 === 1;

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={cn(
        'glass-panel group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 p-5 transition-all duration-300 sm:p-6',
        isAlt ? 'hover:border-neon-violet/20' : 'hover:border-neon-lime/20'
      )}
    >
      {/* Ambient glow */}
      <div className={cn(
        'pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100',
        isAlt ? 'bg-neon-violet/5' : 'bg-neon-lime/5'
      )} />

      {/* Photo */}
      <div className="relative mb-5 aspect-square w-full overflow-hidden rounded-xl border border-white/8 bg-surface">
        <Avatar
          name={member.name}
          image={member.image}
          className="absolute inset-0"
          imgClassName="grayscale group-hover:grayscale-0 transition-all duration-500"
        />
      </div>

      {/* Role tag */}
      <span className={cn(
        'mb-2 inline-flex self-start items-center rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.3em] uppercase transition-colors duration-300',
        isAlt
          ? 'border-neon-violet/25 bg-neon-violet/8 text-neon-violet'
          : 'border-neon-lime/25 bg-neon-lime/8 text-neon-lime'
      )}>
        {member.role}
      </span>

      {/* Name */}
      <h3 className="font-heading text-base font-black text-white uppercase leading-tight sm:text-lg">
        {member.name}
      </h3>

      {/* Meta */}
      {(member.department || member.academicSession) && (
        <p className="mt-1 font-mono text-[9px] tracking-wider text-zinc-600 uppercase">
          {[member.department, member.academicSession].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Bio */}
      {text && (
        <div className="mt-3">
          <p className={cn('text-xs leading-relaxed text-zinc-500', !expanded && isLong && 'line-clamp-2')}>
            {text}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="mt-1 font-mono text-[10px] text-neon-lime/60 hover:text-neon-lime transition-colors"
            >
              {expanded ? '↑ less' : '↓ more'}
            </button>
          )}
        </div>
      )}

      {/* Socials */}
      <div className="mt-auto flex items-center gap-1.5 pt-4 border-t border-white/5">
        <SocialBtn href={member.github}   icon={<GithubIcon />}   label="GitHub"   />
        <SocialBtn href={member.linkedin} icon={<LinkedinIcon />} label="LinkedIn" />
        <SocialBtn
          href={member.email ? `mailto:${member.email}` : ''}
          icon={<MailIcon />}
          label="Email"
        />
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptySlot({ message }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.015] py-16 text-center">
      <p className="font-mono text-[10px] tracking-[0.3em] text-zinc-600 uppercase">{message}</p>
    </div>
  );
}

// ─── Thin decorative section divider ─────────────────────────────────────────

function Divider() {
  return (
    <div className="mx-auto max-w-xs flex items-center gap-4 px-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/8" />
      <div className="h-1 w-1 rounded-full bg-neon-lime/30" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/8" />
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function CommitteeClient({
  facultyAdvisors: propAdvisors = [],
  coreExecutives: propCore = [],
  executiveMembers: propExecs = [],
  heroStats: propHeroStats = [],
  settings = {},
}) {
  const advisors  = propAdvisors.length > 0 ? propAdvisors : DEFAULT_ADVISORS;
  const heroStats = propHeroStats.length > 0 ? propHeroStats : HERO_STATS_DEFAULT;

  return (
    <div className="overflow-x-clip">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Hero stats={heroStats} />

      {/* ── Advisory Board ───────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionLabel tag="Guidance & Mentorship" title="Advisory" accent="Board" />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid gap-4 sm:gap-5 md:grid-cols-2"
          >
            {advisors.map((advisor, i) => (
              <AdvisorCard key={advisor.id || i} advisor={advisor} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* ── Core Executive ───────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionLabel tag="Leadership" title="Core" accent="Executive" />
          {propCore.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="grid gap-6 sm:gap-7 md:grid-cols-2 lg:grid-cols-3"
            >
              {propCore.map((exec, i) => (
                <CoreExecCard key={exec.id || i} exec={exec} index={i} />
              ))}
            </motion.div>
          ) : (
            <EmptySlot message="Core executive positions will appear here once assigned." />
          )}
        </div>
      </section>

      <Divider />

      {/* ── Executive Council ─────────────────────────────────────────────── */}
      {propExecs.length > 0 && (
        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionLabel tag="Operations" title="Executive" accent="Council" />
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
            >
              {propExecs.map((member, i) => (
                <CouncilCard key={member.id || i} member={member} index={i} />
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <CTASection
        icon="🎯"
        title={settings?.committee_page_cta_title || 'Want to Lead with Us?'}
        description={
          settings?.committee_page_cta_description ||
          'Applications for the next committee term open soon. Be part of shaping the future of programming at Netrokona University.'
        }
        primaryAction={{ label: 'Apply for Leadership', href: '/join' }}
        secondaryAction={{ label: 'Contact Committee', href: '/contact' }}
      />

      <ScrollToTop />
    </div>
  );
}
