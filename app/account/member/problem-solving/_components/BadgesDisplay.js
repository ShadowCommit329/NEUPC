/**
 * @file Badges Display Component
 * @module BadgesDisplay
 *
 * Displays user's earned badges and achievements.
 */

'use client';

import {
  Award,
  Flame,
  Target,
  Trophy,
  Zap,
  Star,
  Crown,
  Sparkles,
  Medal,
  TrendingUp,
  Calendar,
  Code2,
} from 'lucide-react';

// Badge configuration
const BADGE_CONFIG = {
  // Streak badges
  streak_7: {
    name: '7-Day Streak',
    description: 'Solved problems for 7 consecutive days',
    icon: Flame,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/25',
  },
  streak_30: {
    name: '30-Day Streak',
    description: 'Solved problems for 30 consecutive days',
    icon: Flame,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/25',
  },
  streak_100: {
    name: '100-Day Streak',
    description: 'Solved problems for 100 consecutive days',
    icon: Crown,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/25',
  },

  // Problem count badges
  solved_10: {
    name: 'Getting Started',
    description: 'Solved 10 problems',
    icon: Star,
    color: 'text-green-400',
    bg: 'bg-green-500/15',
    border: 'border-green-500/25',
  },
  solved_50: {
    name: 'Problem Solver',
    description: 'Solved 50 problems',
    icon: Target,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
  },
  solved_100: {
    name: 'Century',
    description: 'Solved 100 problems',
    icon: Trophy,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/25',
  },
  solved_500: {
    name: 'Dedicated',
    description: 'Solved 500 problems',
    icon: Medal,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/25',
  },
  solved_1000: {
    name: 'Grinder',
    description: 'Solved 1000 problems',
    icon: Crown,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/25',
  },

  // Difficulty badges
  hard_10: {
    name: 'Hard Worker',
    description: 'Solved 10 hard problems',
    icon: Zap,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/25',
  },
  hard_50: {
    name: 'Challenge Seeker',
    description: 'Solved 50 hard problems',
    icon: Sparkles,
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/25',
  },
  expert_10: {
    name: 'Expert Hunter',
    description: 'Solved 10 expert-level problems',
    icon: Crown,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/25',
  },

  // Platform badges
  codeforces_specialist: {
    name: 'CF Specialist',
    description: 'Reached Specialist rank on Codeforces',
    icon: Code2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/25',
  },
  codeforces_expert: {
    name: 'CF Expert',
    description: 'Reached Expert rank on Codeforces',
    icon: Code2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
  },
  leetcode_guardian: {
    name: 'LC Guardian',
    description: 'Reached Guardian rank on LeetCode',
    icon: Code2,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/25',
  },

  // Weekly/Monthly badges
  weekly_champion: {
    name: 'Weekly Champion',
    description: 'Top solver of the week',
    icon: TrendingUp,
    color: 'text-green-400',
    bg: 'bg-green-500/15',
    border: 'border-green-500/25',
  },
  monthly_champion: {
    name: 'Monthly Champion',
    description: 'Top solver of the month',
    icon: Calendar,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
  },

  // Special badges
  first_solve: {
    name: 'First Steps',
    description: 'Solved your first problem',
    icon: Star,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/25',
  },
  all_platforms: {
    name: 'Polyglot',
    description: 'Connected all supported platforms',
    icon: Sparkles,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/25',
  },
};

function getBadgeConfig(badgeId) {
  return (
    BADGE_CONFIG[badgeId] || {
      name: badgeId ? badgeId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown Badge',
      description: 'Achievement unlocked',
      icon: Award,
      color: 'text-gray-400',
      bg: 'bg-gray-500/15',
      border: 'border-gray-500/25',
    }
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function BadgeCard({ badge }) {
  const config = getBadgeConfig(badge.code || badge.badge || '');
  const Icon = config.icon;

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border ${config.border} ${config.bg} px-3 py-3 transition-all duration-200 hover:border-white/15 hover:shadow-md`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/6 ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-105`}
      >
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${config.color}`}>{config.name}</p>
        <p className="line-clamp-2 text-xs text-gray-500">
          {config.description}
        </p>
        {badge.earned_at && (
          <p className="mt-0.5 text-[10px] text-gray-600">
            Earned {formatDate(badge.earned_at)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BadgesDisplay({ badges = [], compact = false }) {
  if (badges.length === 0) {
    return (
      <div className="relative rounded-2xl border border-white/6 bg-white/2 p-4 shadow-lg shadow-black/5 sm:p-5">
        {/* Top accent line */}
        <div className="absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl bg-linear-to-r from-yellow-500 to-amber-500" />

        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-yellow-500 to-amber-500 shadow-lg ring-2 shadow-yellow-500/20 ring-yellow-400/20">
            <Award className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-white">Badges</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/4">
            <Award className="h-7 w-7 text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-400">
            No badges earned yet
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            Keep solving problems to unlock achievements!
          </p>
        </div>
      </div>
    );
  }

  const displayBadges = compact ? badges.slice(0, 4) : badges;

  return (
    <div className="relative rounded-2xl border border-white/6 bg-white/2 p-4 shadow-lg shadow-black/5 sm:p-5">
      {/* Top accent line */}
      <div className="absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl bg-linear-to-r from-yellow-500 to-amber-500" />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-yellow-500 to-amber-500 shadow-lg ring-2 shadow-yellow-500/20 ring-yellow-400/20">
            <Award className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Badges</h3>
            <span className="text-[10px] font-medium text-yellow-400">
              {badges.length} earned
            </span>
          </div>
        </div>
      </div>

      <div
        className={`grid gap-2.5 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}
      >
        {displayBadges.map((badge) => (
          <BadgeCard key={badge.id || badge.code || badge.badge} badge={badge} />
        ))}
      </div>

      {compact && badges.length > 4 && (
        <div className="mt-3 text-center">
          <span className="text-[11px] text-gray-500">
            +{badges.length - 4} more badges
          </span>
        </div>
      )}
    </div>
  );
}
