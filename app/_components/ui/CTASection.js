/**
 * @file CTA Section — Reusable call-to-action with Framer Motion animations.
 * @module CTASection
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useIsMember } from './UserRoleProvider';
import { fadeUp, scaleIn, staggerContainer, viewportConfig, buttonHover, buttonTap } from '@/app/_components/motion/motion';
import { cn } from '@/app/_lib/utils';

/**
 * CTASection — Reusable call-to-action section for page bottoms.
 *
 * @param {string} icon           – Emoji icon
 * @param {string} title          – CTA heading
 * @param {string} description    – CTA body text
 * @param {object} primaryAction  – { label: string, href: string }
 * @param {object} secondaryAction – { label: string, href: string }
 */
export default function CTASection({
  icon = '🎯',
  title,
  description,
  primaryAction = { label: 'Join the Club', href: '/join' },
  secondaryAction = { label: 'Contact Us', href: '/contact' },
}) {
  const isLoggedIn = useIsMember();
  const isExternal = primaryAction.href?.startsWith('http');
  const isJoinAction = primaryAction.href === '/join';

  // Hide join-related primary action for logged in users
  const showPrimary = !(isJoinAction && isLoggedIn);

  return (
    <section className="relative overflow-hidden py-20">
      <div className="via-primary-500/5 absolute inset-0 bg-linear-to-b from-transparent to-transparent" />
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          variants={staggerContainer(0.12, 0)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <motion.div
            variants={scaleIn}
            className="mb-6 text-5xl"
          >
            {icon}
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="mb-4 text-3xl font-bold text-white md:text-4xl"
          >
            {title}
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mb-8 text-lg text-gray-300"
          >
            {description}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col justify-center gap-4 sm:flex-row"
          >
            {showPrimary &&
              (isExternal ? (
                <motion.a
                  href={primaryAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="from-primary-500 to-secondary-500 group inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-r px-8 py-3 font-semibold text-white shadow-lg"
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                >
                  {primaryAction.label}
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </motion.a>
              ) : (
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Link
                    href={primaryAction.href}
                    className="from-primary-500 to-secondary-500 group inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-r px-8 py-3 font-semibold text-white shadow-lg"
                  >
                    {primaryAction.label}
                    <svg
                      className="h-5 w-5 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </motion.div>
              ))}

            <motion.div whileHover={buttonHover} whileTap={buttonTap}>
              <Link
                href={secondaryAction.href}
                className="group inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/20 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur-sm"
              >
                {secondaryAction.label}
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
