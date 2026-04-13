/**
 * @file Empty State Component
 * @description Engaging empty state for when no platforms are connected
 */

'use client';

import { motion } from 'framer-motion';
import { Link2, TrendingUp, Trophy, BarChart3, Zap } from 'lucide-react';

const features = [
  {
    icon: TrendingUp,
    label: 'Track Progress',
    description: 'Monitor your rating changes',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Trophy,
    label: 'Compete',
    description: 'Join team leaderboards',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: BarChart3,
    label: 'Analyze',
    description: 'View detailed statistics',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative px-6 py-10 text-center sm:px-10 sm:py-14">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-blue-500/20"
        >
          <Link2 className="h-8 w-8 text-blue-400" />
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-xl font-semibold text-white sm:text-2xl"
        >
          Connect Your Accounts
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-3 max-w-md text-sm text-zinc-400 sm:text-base"
        >
          Link your competitive programming profiles to track your progress and
          compete with teammates.
        </motion.p>

        {/* Features */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.label}
              variants={itemVariants}
              className="group flex items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700 sm:flex-col sm:gap-2 sm:p-4"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.bg} transition-transform group-hover:scale-110 sm:h-11 sm:w-11`}
              >
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <div className="min-w-0 text-left sm:text-center">
                <div className="text-sm font-medium text-white">
                  {feature.label}
                </div>
                <div className="text-xs text-zinc-500">
                  {feature.description}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500"
        >
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Select a platform below to get started</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
