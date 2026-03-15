/**
 * @file Committee page client component — professional minimal redesign.
 * Displays faculty advisor, core executives, and executive members
 * with a clean, modern, attractive layout.
 *
 * Design principles:
 * - Minimal but premium: generous whitespace, refined typography
 * - Subtle depth: layered backgrounds, soft glows, micro-animations
 * - Clear hierarchy: advisor > core executives > executive members
 * - Data-complete: session, dept, responsibilities all visible at a glance
 *
 * @module CommitteeClient
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import CTASection from '../_components/ui/CTASection';
import SectionHeader from '../_components/ui/SectionHeader';
import dynamic from 'next/dynamic';
const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});
import PageBackground from '../_components/ui/PageBackground';
import PageShell from '../_components/ui/PageShell';
import { GitHubIcon, LinkedInIcon } from '../_components/ui/SocialIcons';
import { useDelayedLoad, useScrollReveal, useStaggerReveal } from '../_lib/hooks';
import { cn, driveImageUrl, getInitials } from '../_lib/utils';

// ---------------------------------------------------------------------------
// Fallback data
// ---------------------------------------------------------------------------

const DEFAULT_ADVISORS = [
  {
    id: 'default-advisor',
    name: 'Dr. Mohammad Rahman',
    position: 'Associate Professor',
    designation: 'Faculty Advisor',
    department: 'Department of CSE',
    university: 'Netrokona University',
    image: '/images/advisor.jpg',
    message:
      'The Programming Club aims to build problem solvers and innovators who can compete globally while contributing locally.',
    linkedin: '#',
    github: '',
  },
];

const HERO_STATS = [
  {
    value: '15+',
    label: 'Committee Members',
    accent: 'primary',
  },
  {
    value: '7',
    label: 'Departments',
    accent: 'secondary',
  },
  {
    value: '2025-26',
    label: 'Current Term',
    accent: 'purple',
  },
];

// ---------------------------------------------------------------------------
// Tiny SVG icons (inline to avoid extra import overhead)
// ---------------------------------------------------------------------------

const BuildingIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm2 3a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H7a1 1 0 01-1-1V5zm0 4a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm6-4a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1zm0 4a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const CalendarIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
      clipRule="evenodd"
    />
  </svg>
);

const TaskIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path
      fillRule="evenodd"
      d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm2 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-2 4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const MailIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

const QuoteIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M10 8C6.686 8 4 10.686 4 14s2.686 6 6 6h.667C9.79 22.083 8.5 24.167 6 26h4c4-2.333 6-6 6-10 0-4.418-2.686-8-6-8zm16 0c-3.314 0-6 2.686-6 6s2.686 6 6 6h.667C25.79 22.083 24.5 24.167 22 26h4c4-2.333 6-6 6-10 0-4.418-2.686-8-6-8z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/**
 * Profile avatar with graceful fallback to initials.
 */
function ProfileAvatar({ name, image, sizeClass = 'h-16 w-16', textClass = 'text-lg', ringClass = '' }) {
  const [errored, setErrored] = useState(false);
  const showImg = Boolean(image) && !errored;

  return (
    <div className={cn('relative overflow-hidden rounded-full', sizeClass, ringClass)}>
      {showImg ? (
        <Image
          src={driveImageUrl(image)}
          alt={name || 'Profile photo'}
          fill
          sizes="(max-width: 768px) 80px, 128px"
          className="object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
          <span className={cn('font-bold text-white', textClass)}>{getInitials(name)}</span>
        </div>
      )}
    </div>
  );
}

/** Compact social icon pill */
function SocialBtn({ href, icon, label, hoverCls = 'hover:text-blue-400 hover:border-blue-400/30' }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-500 transition-all duration-200',
        hoverCls
      )}
    >
      {icon}
    </a>
  );
}

/** Small metadata chip */
function Chip({ icon, text, className }) {
  if (!text) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-gray-400 transition-colors hover:text-gray-300',
        className
      )}
    >
      {icon && <span className="shrink-0 text-gray-500">{icon}</span>}
      {text}
    </span>
  );
}

/** Expandable responsibility text */
function Responsibility({ text }) {
  const [open, setOpen] = useState(false);
  if (!text?.trim()) return null;
  const isLong = text.length > 90;
  return (
    <div className="mt-3 rounded-lg border border-white/6 bg-white/[0.025] px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TaskIcon className="h-3 w-3 text-primary-400/70" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-400/80">
            Responsibility
          </span>
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[10px] text-gray-500 transition-colors hover:text-primary-300"
          >
            {open ? 'less' : 'more'}
          </button>
        )}
      </div>
      <p
        className={cn(
          'text-[11px] leading-relaxed text-gray-400',
          !open && isLong && 'line-clamp-2'
        )}
      >
        {text}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Faculty Advisor Card
// ---------------------------------------------------------------------------

function AdvisorCard({ advisor, isLoaded, index }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-0 backdrop-blur-sm transition-all duration-700',
        isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Ambient glow on hover */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary-500/8 blur-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100" />

      <div className="flex flex-col items-center gap-8 p-6 sm:flex-row sm:items-start sm:p-8 md:p-10">
        {/* Avatar column */}
        <div className="relative shrink-0">
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36">
            {/* Decorative ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary-500/20 transition-colors duration-300 group-hover:border-primary-500/40" />
            {/* Outer blur halo */}
            <div className="absolute -inset-2 rounded-full bg-primary-500/5 blur-md" />
            <ProfileAvatar
              name={advisor.name}
              image={advisor.image}
              sizeClass="h-full w-full absolute inset-0"
              textClass="text-4xl"
              ringClass=""
            />
          </div>
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          {/* Role badge */}
          <span className="inline-flex items-center rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-300 ring-1 ring-primary-500/20">
            Faculty Advisor
          </span>

          <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">{advisor.name}</h3>

          {/* Meta chips */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {advisor.position && (
              <Chip icon={<TaskIcon className="h-3 w-3" />} text={advisor.position} />
            )}
            {advisor.department && (
              <Chip icon={<BuildingIcon className="h-3 w-3" />} text={advisor.department} />
            )}
          </div>

          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-widest text-gray-600">
            {advisor.university}
          </p>

          {/* Quote */}
          {advisor.message && (
            <div className="relative mt-5 rounded-xl border border-white/6 bg-white/[0.02] px-5 py-4">
              <QuoteIcon className="absolute top-3 left-4 h-4 w-4 text-primary-500/30" />
              <p className="pl-2 text-sm leading-relaxed text-gray-400 italic">
                {advisor.message}
              </p>
            </div>
          )}

          {/* Social links */}
          <div className="mt-5 flex items-center justify-center gap-2 sm:justify-start">
            <SocialBtn
              href={advisor.linkedin}
              icon={<LinkedInIcon className="h-4 w-4" />}
              label="LinkedIn"
              hoverCls="hover:text-blue-400 hover:border-blue-400/30"
            />
            <SocialBtn
              href={advisor.github}
              icon={<GitHubIcon className="h-4 w-4" />}
              label="GitHub"
              hoverCls="hover:text-white hover:border-white/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Core Executive Card (medium prominence)
// ---------------------------------------------------------------------------

function CoreExecCard({ exec, index, isLoaded }) {
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-6 backdrop-blur-sm transition-all duration-700 hover:border-white/15 hover:shadow-lg hover:shadow-black/20',
        isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      )}
      style={{ transitionDelay: `${(index + 1) * 100}ms` }}
    >
      {/* Ambient accent */}
      <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-primary-500/5 blur-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100" />

      {/* Top: Avatar + Identity */}
      <div className="flex items-start gap-5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20">
            <div className="absolute inset-0 rounded-full border border-primary-500/20 transition-colors duration-300 group-hover:border-primary-500/40" />
            <ProfileAvatar
              name={exec.name}
              image={exec.image}
              sizeClass="h-full w-full absolute inset-0"
              textClass="text-xl"
              ringClass=""
            />
          </div>
        </div>

        {/* Name + role */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-base font-bold text-white sm:text-lg">{exec.name}</h3>
          <span className="mt-1 inline-flex items-center rounded-md bg-primary-500/10 px-2 py-0.5 text-xs font-semibold text-primary-300 ring-1 ring-primary-500/20">
            {exec.role}
          </span>
          {/* Dept + session chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip icon={<BuildingIcon className="h-3 w-3" />} text={exec.department} />
            <Chip icon={<CalendarIcon className="h-3 w-3" />} text={exec.academicSession} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-white/6" />

      {/* Bio */}
      {exec.bio && (
        <p className="text-sm leading-relaxed text-gray-400 line-clamp-3">{exec.bio}</p>
      )}

      {/* Responsibility */}
      <Responsibility text={exec.responsibility} />

      {/* Social links */}
      <div className="mt-auto pt-4 flex items-center gap-2">
        <SocialBtn
          href={exec.linkedin}
          icon={<LinkedInIcon className="h-3.5 w-3.5" />}
          label="LinkedIn"
          hoverCls="hover:text-blue-400 hover:border-blue-400/30"
        />
        <SocialBtn
          href={exec.github}
          icon={<GitHubIcon className="h-3.5 w-3.5" />}
          label="GitHub"
          hoverCls="hover:text-white hover:border-white/20"
        />
        {exec.email && (
          <SocialBtn
            href={`mailto:${exec.email}`}
            icon={<MailIcon className="h-3.5 w-3.5" />}
            label="Email"
            hoverCls="hover:text-emerald-400 hover:border-emerald-400/30"
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Executive Member Card (compact)
// ---------------------------------------------------------------------------

function MemberCard({ member, isVisible, index }) {
  const [expanded, setExpanded] = useState(false);
  const hasResponsibility = member.responsibility?.trim();
  const isLong = hasResponsibility && member.responsibility.length > 100;

  return (
    <div
      className={cn(
        'group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border border-white/8 bg-[#0e1525] p-4 transition-all duration-500 hover:border-primary-500/25 hover:bg-[#111929] hover:shadow-lg hover:shadow-black/30',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      )}
      style={{ transitionDelay: isVisible ? `${index * 50}ms` : '0ms' }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary-500/0 transition-all duration-500 group-hover:bg-primary-500/60" />

      {/* Avatar */}
      <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
        <div className="absolute inset-0 rounded-full border border-white/10 transition-colors duration-300 group-hover:border-primary-500/40" />
        <ProfileAvatar
          name={member.name}
          image={member.image}
          sizeClass="h-full w-full absolute inset-0"
          textClass="text-sm"
          ringClass=""
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Top row: name + role + socials */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-white leading-tight sm:text-base">
              {member.name}
            </h3>
            <span className="mt-1 inline-flex items-center rounded bg-primary-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-300 ring-1 ring-primary-500/20">
              {member.role}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SocialBtn
              href={member.linkedin}
              icon={<LinkedInIcon className="h-3 w-3" />}
              label="LinkedIn"
              hoverCls="hover:text-blue-400 hover:border-blue-400/30 h-7 w-7"
            />
            <SocialBtn
              href={member.github}
              icon={<GitHubIcon className="h-3 w-3" />}
              label="GitHub"
              hoverCls="hover:text-white hover:border-white/20 h-7 w-7"
            />
          </div>
        </div>

        {/* Chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip
            icon={<BuildingIcon className="h-2.5 w-2.5" />}
            text={member.department}
            className="px-2 py-0.5 text-[10px]"
          />
          <Chip
            icon={<CalendarIcon className="h-2.5 w-2.5" />}
            text={member.academicSession}
            className="px-2 py-0.5 text-[10px]"
          />
        </div>

        {/* Responsibility — always visible */}
        {hasResponsibility && (
          <div className="mt-3">
            <p className={cn('text-[11px] leading-relaxed text-gray-400', !expanded && isLong && 'line-clamp-2')}>
              {member.responsibility}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-[10px] font-medium text-primary-400/70 transition-colors hover:text-primary-300"
              >
                {expanded ? '↑ less' : '↓ more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Hero stat card
// ---------------------------------------------------------------------------

const ACCENT_CLASSES = {
  primary: {
    bg: 'from-primary-500/10 to-primary-500/5',
    border: 'border-primary-500/20 group-hover:border-primary-500/40',
    text: 'text-primary-300',
    glow: 'hover:shadow-primary-500/10',
  },
  secondary: {
    bg: 'from-secondary-500/10 to-secondary-500/5',
    border: 'border-secondary-500/20 group-hover:border-secondary-500/40',
    text: 'text-secondary-300',
    glow: 'hover:shadow-secondary-500/10',
  },
  purple: {
    bg: 'from-purple-500/10 to-purple-500/5',
    border: 'border-purple-500/20 group-hover:border-purple-500/40',
    text: 'text-purple-300',
    glow: 'hover:shadow-purple-500/10',
  },
};

function StatCard({ stat }) {
  const acc = ACCENT_CLASSES[stat.accent] || ACCENT_CLASSES.primary;
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-gradient-to-b px-4 py-4 transition-all duration-300 hover:shadow-lg',
        acc.bg,
        acc.border,
        acc.glow
      )}
    >
      <div className={cn('whitespace-nowrap text-xl font-bold tabular-nums sm:text-2xl', acc.text)}>
        {stat.value}
      </div>
      <div className="mt-0.5 text-xs text-gray-500 transition-colors group-hover:text-gray-400">
        {stat.label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptySlot({ message }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] py-12 text-center text-sm text-gray-600">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decorative divider
// ---------------------------------------------------------------------------

function SectionDivider() {
  return (
    <div className="mx-auto my-2 flex items-center gap-4 max-w-xs">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
      <div className="h-1 w-1 rounded-full bg-white/20" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CommitteeClient({
  facultyAdvisors: propAdvisors = [],
  coreExecutives: propCore = [],
  executiveMembers: propExecs = [],
  heroStats: propHeroStats = [],
  settings = {},
}) {
  const isLoaded = useDelayedLoad();
  const [advisorRef, advisorVisible] = useScrollReveal({ threshold: 0.05 });
  const [coreRef, coreVisible] = useScrollReveal({ threshold: 0.05 });
  const { ref: membersRef, isVisible: membersVisible } = useStaggerReveal({ threshold: 0.05 });

  const facultyAdvisors = propAdvisors.length > 0 ? propAdvisors : DEFAULT_ADVISORS;
  const coreExecutives = propCore;
  const executiveMembers = propExecs;
  const heroStats = propHeroStats.length > 0 ? propHeroStats : HERO_STATS;

  return (
    <PageShell>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-24">
        <PageBackground variant="absolute" />

        {/* Radial top-center glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-72 w-full max-w-lg rounded-full bg-primary-500/6 blur-3xl"
        />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            {/* Eyebrow badge */}
            <div
              className={cn(
                'mb-5 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/8 px-4 py-1.5 text-xs font-semibold tracking-wider text-primary-300 uppercase transition-all duration-700',
                isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
              {settings?.committee_page_badge || 'Leadership Team 2025–26'}
            </div>

            {/* Headline */}
            <h1
              className={cn(
                'text-4xl font-bold tracking-tight text-white transition-all delay-100 duration-700 sm:text-5xl md:text-6xl',
                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              )}
            >
              {settings?.committee_page_title || (
                <>
                  Meet the{' '}
                  <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                    Committee
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p
              className={cn(
                'mx-auto mt-5 max-w-xl text-sm leading-relaxed text-gray-400 transition-all delay-200 duration-700 sm:text-base',
                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              )}
            >
              {settings?.committee_page_description ||
                'The dedicated team leading the Netrokona University Programming Club towards excellence in competitive programming and software development.'}
            </p>

            {/* Stats row */}
            <div
              className={cn(
                'mx-auto mt-10 grid max-w-lg gap-3 sm:grid-cols-3 sm:max-w-2xl transition-all delay-300 duration-700',
                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              )}
            >
              {heroStats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Faculty Advisors ──────────────────────────────────────────── */}
      <section ref={advisorRef} className="relative px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <SectionHeader
            badge="Guidance"
            title="Faculty Advisor"
            subtitle="Providing expertise and mentorship to our club's journey"
            lineClassName="to-primary-500/40"
            titleClassName="from-white via-gray-100 to-gray-300"
            className={cn(
              'transition-all duration-700',
              advisorVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            )}
          />

          <div className="space-y-4">
            {facultyAdvisors.map((advisor, i) => (
              <AdvisorCard
                key={advisor.id || i}
                advisor={advisor}
                isLoaded={advisorVisible}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── Core Executive Panel ──────────────────────────────────────── */}
      <section ref={coreRef} className="relative px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            badge="Leadership"
            title="Core Executive Panel"
            subtitle="The leadership driving our club's vision and mission"
            lineClassName="to-secondary-500/40"
            titleClassName="from-white via-gray-100 to-gray-300"
            className={cn(
              'transition-all duration-700',
              coreVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            )}
          />

          {coreExecutives.length > 0 ? (
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
              {coreExecutives.map((exec, i) => (
                <CoreExecCard
                  key={exec.id}
                  exec={exec}
                  index={i}
                  isLoaded={coreVisible}
                />
              ))}
            </div>
          ) : (
            <EmptySlot message="Core executive members will appear here once positions are assigned." />
          )}
        </div>
      </section>

      <SectionDivider />

      {/* ── Executive Members ─────────────────────────────────────────── */}
      <section ref={membersRef} className="relative px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            badge="Team"
            title="Executive Members"
            subtitle="Supporting the club's operations and initiatives"
            lineClassName="to-white/20"
            titleClassName="from-white via-gray-100 to-gray-300"
            className={cn(
              'transition-all duration-700',
              membersVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            )}
          />

          {executiveMembers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {executiveMembers.map((member, i) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isVisible={membersVisible}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <EmptySlot message="Additional executive members will appear here once assigned." />
          )}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
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
    </PageShell>
  );
}
