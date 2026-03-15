/**
 * @file Developers page client component.
 * Displays core development team, tech stack, contributors, and timeline.
 *
 * @module DevelopersClient
 */

'use client';

import { useState } from 'react';
import CTASection from '../_components/ui/CTASection';
import dynamic from 'next/dynamic';
const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});
import PageBackground from '../_components/ui/PageBackground';
import PageShell from '../_components/ui/PageShell';
import PageHero from '../_components/ui/PageHero';
import MotionSection from '../_components/motion/MotionSection';
import MotionFadeIn from '../_components/motion/MotionFadeIn';
import MotionStagger from '../_components/motion/MotionStagger';
import {
  GitHubIcon,
  LinkedInIcon,
  GlobeIcon,
} from '../_components/ui/SocialIcons';
import { useDelayedLoad } from '../_lib/hooks';
import { cn } from '../_lib/utils';

// ---------------------------------------------------------------------------
// Constants & defaults
// ---------------------------------------------------------------------------

/** Accurate default tech stack — reflects what the project actually uses */
const DEFAULT_TECH_STACK = {
  frontend: [
    { name: 'Next.js', icon: '⚡' },
    { name: 'React', icon: '⚛️' },
    { name: 'Tailwind CSS', icon: '🎨' },
    { name: 'JavaScript', icon: '📘' },
  ],
  backend: [
    { name: 'Next.js API Routes', icon: '🔗' },
    { name: 'NextAuth v5', icon: '🔐' },
    { name: 'Supabase', icon: '🟢' },
    { name: 'PostgreSQL', icon: '🐘' },
  ],
  deployment: [
    { name: 'Vercel', icon: '▲' },
    { name: 'GitHub Actions', icon: '🔄' },
    { name: 'Supabase Cloud', icon: '☁️' },
    { name: 'Edge Functions', icon: '⚡' },
  ],
  tools: [
    { name: 'Git', icon: '📦' },
    { name: 'Figma', icon: '🎯' },
    { name: 'VS Code', icon: '💻' },
    { name: 'Postman', icon: '📮' },
  ],
};

/** Tech stack category card styling */
const TECH_CATEGORIES = [
  {
    key: 'frontend',
    label: 'Frontend',
    emoji: '🎨',
    borderColor: 'hover:border-primary-500/30',
    shadowColor: 'hover:shadow-primary-500/10',
    badgeBg: 'bg-primary-500/20',
  },
  {
    key: 'backend',
    label: 'Backend',
    emoji: '⚙️',
    borderColor: 'hover:border-secondary-500/30',
    shadowColor: 'hover:shadow-secondary-500/10',
    badgeBg: 'bg-secondary-500/20',
  },
  {
    key: 'deployment',
    label: 'Deployment',
    emoji: '☁️',
    borderColor: 'hover:border-purple-500/30',
    shadowColor: 'hover:shadow-purple-500/10',
    badgeBg: 'bg-purple-500/20',
  },
  {
    key: 'tools',
    label: 'Tools',
    emoji: '🛠️',
    borderColor: 'hover:border-pink-500/30',
    shadowColor: 'hover:shadow-pink-500/10',
    badgeBg: 'bg-pink-500/20',
  },
];

/** Default development timeline */
const DEFAULT_TIMELINE = [
  {
    year: '2024',
    title: 'Project Initiated',
    description: 'Website concept proposed and planning began',
    status: 'completed',
  },
  {
    year: '2025',
    title: 'MVP Launch',
    description: 'Public website launched with core features',
    status: 'completed',
  },
  {
    year: '2026',
    title: 'Member Portal',
    description: 'Authentication and member dashboard added',
    status: 'current',
  },
  {
    year: 'Future',
    title: 'Mobile App',
    description: 'Native mobile application development',
    status: 'planned',
  },
];

/** GitHub stats display config (label + color) */
const GITHUB_STAT_ITEMS = [
  {
    key: 'commits',
    label: 'Commits',
    colorClass: 'text-purple-300',
    hoverBorder: 'hover:border-purple-500/30',
    hoverShadow: 'hover:shadow-purple-500/20',
  },
  {
    key: 'contributors',
    label: 'Contributors',
    colorClass: 'text-blue-300',
    hoverBorder: 'hover:border-blue-500/30',
    hoverShadow: 'hover:shadow-blue-500/20',
  },
  {
    key: 'stars',
    label: 'Stars',
    colorClass: 'text-pink-300',
    hoverBorder: 'hover:border-pink-500/30',
    hoverShadow: 'hover:shadow-pink-500/20',
  },
  {
    key: 'forks',
    label: 'Forks',
    colorClass: 'text-cyan-300',
    hoverBorder: 'hover:border-cyan-500/30',
    hoverShadow: 'hover:shadow-cyan-500/20',
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Social link button for developer cards.
 * @param {{ href: string, icon: React.ReactNode, hoverColor?: string }} props
 */
function SocialLinkButton({
  href,
  icon,
  hoverColor = 'hover:border-primary-500/30 hover:bg-primary-500/10 hover:text-primary-300',
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-all',
        hoverColor
      )}
    >
      {icon}
    </a>
  );
}

/**
 * Developer profile card.
 * @param {{ dev: object, index: number }} props
 */
function DeveloperCard({ dev, index }) {
  return (
    <div className="group hover:border-primary-500/30 hover:shadow-primary-500/20 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-2xl">
      {/* Photo section */}
      <div className="from-primary-500/20 to-secondary-500/20 relative h-48 overflow-hidden bg-linear-to-br">
        <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
        {dev.profileImage ? (
          <img
            src={dev.profileImage}
            alt={dev.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-20 w-20 text-white/30 transition-transform duration-300 group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="mb-1 text-lg font-bold text-white">{dev.name}</h3>
        <p className="text-primary-400 mb-3 text-sm font-semibold">
          {dev.role}
        </p>
        <p className="mb-4 text-xs leading-relaxed text-gray-400">{dev.bio}</p>

        {/* Tech badges */}
        {dev.stack?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {dev.stack.map((tech, idx) => (
              <span
                key={idx}
                className="bg-primary-500/10 text-primary-300 rounded-full px-2 py-1 text-xs font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Social links */}
        <div className="flex gap-3">
          <SocialLinkButton
            href={dev.github}
            icon={<GitHubIcon className="h-4 w-4" />}
          />
          <SocialLinkButton
            href={dev.linkedin}
            icon={<LinkedInIcon className="h-4 w-4" />}
            hoverColor="hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"
          />
          <SocialLinkButton
            href={dev.portfolio}
            icon={<GlobeIcon className="h-4 w-4" />}
            hoverColor="hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Tech stack category card.
 * @param {{ category: object, items: Array }} props
 */
function TechStackCard({ category, items }) {
  return (
    <div
      className={cn(
        'group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 hover:shadow-lg',
        category.borderColor,
        category.shadowColor
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12',
            category.badgeBg
          )}
        >
          {category.emoji}
        </div>
        <h3 className="text-lg font-bold text-white">{category.label}</h3>
      </div>
      <div className="space-y-2">
        {items.map((tech, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-sm text-gray-300"
          >
            <span>{tech.icon}</span>
            <span>{tech.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Timeline dot indicator.
 * @param {{ status: string }} props
 */
function TimelineDot({ status }) {
  return (
    <div className="absolute left-4 flex h-3 w-3 items-center justify-center sm:left-1/2 sm:-translate-x-1/2">
      <div
        className={cn(
          'h-3 w-3 rounded-full border-2',
          status === 'completed' && 'border-green-500 bg-green-500/50',
          status === 'current' &&
            'border-primary-500 bg-primary-500/50 animate-pulse',
          status === 'planned' && 'border-gray-500 bg-gray-500/50'
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Developers page client component.
 *
 * @param {{ coreDevelopers?: Array, contributors?: Array, techStack?: object, timeline?: Array, githubStats?: object }} props
 */
export default function DevelopersClient({
  coreDevelopers: propCoreDevelopers = [],
  contributors: propContributors = [],
  techStack: propTechStack = {},
  timeline: propTimeline = [],
  githubStats: propGithubStats = {},
  settings = {},
}) {
  const isLoaded = useDelayedLoad();

  // --- Data normalization ---
  const coreDevelopers =
    propCoreDevelopers.length > 0 ? propCoreDevelopers : [];
  const contributors = propContributors.length > 0 ? propContributors : [];

  const techStack =
    Object.keys(propTechStack).length > 0 ? propTechStack : DEFAULT_TECH_STACK;

  const timeline = propTimeline.length > 0 ? propTimeline : DEFAULT_TIMELINE;

  const githubStats = {
    commits: propGithubStats.commits || '500+',
    contributors:
      propGithubStats.contributors ||
      String(coreDevelopers.length + contributors.length || '15'),
    stars: propGithubStats.stars || '42',
    forks: propGithubStats.forks || '12',
  };

  return (
    <PageShell>
      {/* Hero Section */}
      <PageHero
        badge={settings?.developers_page_badge || 'Development Team'}
        badgeIcon="💻"
        title={settings?.developers_page_title || 'Meet the Developers'}
        description={
          settings?.developers_page_description ||
          'The minds behind the digital platform of Netrokona University Programming Club. Passionate developers building the future of our community.'
        }
        stats={GITHUB_STAT_ITEMS.map((stat) => ({
          value: githubStats[stat.key],
          label: stat.label,
          color: stat.colorClass,
        }))}
      />

      <MotionSection as="section" className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl md:text-4xl">
              Core Development Team
            </h2>
            <p className="text-sm text-gray-400 sm:text-base">
              The architects of our digital ecosystem
            </p>
          </div>

          <MotionStagger stagger={0.08} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {coreDevelopers.map((dev, index) => (
              <MotionFadeIn key={dev.id} direction="up">
                <DeveloperCard dev={dev} index={index} />
              </MotionFadeIn>
            ))}
          </MotionStagger>
        </div>
      </MotionSection>

      <MotionSection as="section" className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl md:text-4xl">
              Tech Stack
            </h2>
            <p className="text-sm text-gray-400 sm:text-base">
              Technologies powering our platform
            </p>
          </div>

          <MotionStagger stagger={0.07} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {TECH_CATEGORIES.map((category, index) => (
              <MotionFadeIn key={category.key} direction="up">
                <TechStackCard
                  category={category}
                  items={techStack[category.key] || []}
                />
              </MotionFadeIn>
            ))}
          </MotionStagger>
        </div>
      </MotionSection>

      <MotionSection as="section" className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl md:text-4xl">
              Contributors
            </h2>
            <p className="text-sm text-gray-400 sm:text-base">
              Special thanks to everyone who helped build this platform
            </p>
          </div>

          <MotionStagger stagger={0.06} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contributors.map((contributor, index) => (
              <MotionFadeIn key={contributor.id} direction="up">
                <div className="group hover:border-primary-500/30 hover:shadow-primary-500/10 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 hover:shadow-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="mb-1 font-semibold text-white">
                        {contributor.name}
                      </h3>
                      <p className="text-primary-400 mb-2 text-xs font-semibold">
                        {contributor.role}
                      </p>
                      <p className="text-xs text-gray-400">
                        {contributor.contribution}
                      </p>
                    </div>
                    <SocialLinkButton
                      href={contributor.github}
                      icon={<GitHubIcon className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </MotionFadeIn>
            ))}
          </MotionStagger>
        </div>
      </MotionSection>

      <MotionSection as="section" className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl md:text-4xl">
              Development Timeline
            </h2>
            <p className="text-sm text-gray-400 sm:text-base">
              Our journey of building this platform
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="from-primary-500/50 via-secondary-500/50 absolute top-0 bottom-0 left-4 w-0.5 bg-linear-to-b to-purple-500/50 sm:left-1/2" />

            <MotionStagger stagger={0.1} className="space-y-8">
              {timeline.map((item, index) => (
                <MotionFadeIn key={index} direction="up">
                  <div
                    className={cn(
                      'relative flex items-center gap-4',
                      index % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
                    )}
                  >
                    <TimelineDot status={item.status} />

                    <div className="ml-12 flex-1 sm:ml-0 sm:w-1/2">
                      <div
                        className={cn(
                          'hover:border-primary-500/30 hover:shadow-primary-500/10 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:shadow-lg',
                          index % 2 === 0 ? 'sm:mr-8' : 'sm:ml-8'
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="bg-primary-500/20 text-primary-300 rounded-full px-3 py-1 text-xs font-bold">
                            {item.year}
                          </span>
                          {item.status === 'current' && (
                            <span className="bg-secondary-500/20 text-secondary-300 rounded-full px-3 py-1 text-xs font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-white">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </MotionFadeIn>
              ))}
            </MotionStagger>
          </div>
        </div>
      </MotionSection>

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
    </PageShell>
  );
}
