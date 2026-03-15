/**
 * @file Page Hero — Reusable hero section with Framer Motion animations.
 * @module PageHero
 */

'use client';

import { motion } from 'framer-motion';
import { fadeUp, scaleIn, staggerContainer, defaultEase } from '@/app/_components/motion/motion';
import { cn } from '@/app/_lib/utils';

/**
 * PageHero — Reusable hero section for all public pages.
 * Uses Framer Motion stagger for badge → title → description → stats cascade.
 *
 * @param {string}   badge       – Badge label text
 * @param {string}   badgeIcon   – Emoji or short string for badge icon
 * @param {string}   title       – Page heading
 * @param {string}   description – Sub-heading paragraph
 * @param {string}   [subtitle]  – Optional second description line
 * @param {Array}    [stats]     – Optional stats array [{value, label, color?}]
 * @param {React.ReactNode} [children] – Optional extra content below description
 */
export default function PageHero({
  badge,
  badgeIcon,
  title,
  description,
  subtitle,
  stats,
  children,
}) {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 z-0">
        <div className="from-primary-500/10 absolute -top-20 -left-20 h-96 w-96 rounded-full bg-linear-to-br to-transparent blur-3xl" />
        <div className="from-secondary-500/10 absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-linear-to-tl to-transparent blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8"
        variants={staggerContainer(0.12, 0.1)}
        initial="hidden"
        animate="visible"
      >
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2 text-sm font-medium backdrop-blur-sm"
          >
            <span className="text-2xl">{badgeIcon}</span>
            <span className="text-primary-300">{badge}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            className="from-primary-300 to-secondary-300 mb-6 bg-linear-to-r via-white bg-clip-text text-4xl leading-tight font-bold text-transparent md:text-5xl lg:text-6xl"
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mb-4 max-w-2xl text-lg leading-relaxed text-gray-300 md:text-xl"
          >
            {description}
          </motion.p>

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              variants={fadeUp}
              className="mx-auto max-w-xl text-base text-gray-400"
            >
              {subtitle}
            </motion.p>
          )}

          {/* Optional children (custom CTA buttons, etc.) */}
          {children && (
            <motion.div variants={fadeUp}>
              {children}
            </motion.div>
          )}

          {/* Stats Grid */}
          {stats && stats.length > 0 && (
            <motion.div
              variants={staggerContainer(0.1, 0.15)}
              initial="hidden"
              animate="visible"
              className={cn(
                'mt-12 grid gap-6',
                stats.length === 3
                  ? 'grid-cols-1 md:grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-4'
              )}
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  variants={scaleIn}
                  className="rounded-xl bg-white/10 p-4 backdrop-blur-md"
                >
                  {stat.icon && (
                    <div className="mb-2 text-3xl">{stat.icon}</div>
                  )}
                  <div
                    className={`text-3xl font-bold ${stat.color || (i % 2 === 0 ? 'text-primary-300' : 'text-secondary-300')}`}
                  >
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
