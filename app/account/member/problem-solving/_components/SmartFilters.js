/**
 * @file Smart Filters Component
 * @module SmartFilters
 *
 * Quick filter chips for categorizing problems by smart criteria.
 */

'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Sparkles, Star, RotateCcw } from 'lucide-react';

const SMART_FILTERS = [
  {
    id: 'recent',
    label: 'Recent',
    icon: Sparkles,
    description: 'Solved in last 7 days',
    color: 'blue',
  },
  {
    id: 'needs-review',
    label: 'Needs Review',
    icon: RotateCcw,
    description: 'Solved >30 days ago',
    color: 'orange',
  },
  {
    id: 'struggled',
    label: 'Struggled',
    icon: AlertTriangle,
    description: 'Multiple attempts',
    color: 'red',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: Star,
    description: 'Starred problems',
    color: 'yellow',
  },
];

/**
 * Calculate problem counts for each filter
 */
function calculateFilterCounts(problems) {
  const now = new Date();
  const counts = {
    recent: 0,
    'needs-review': 0,
    struggled: 0,
    favorites: 0,
  };

  problems.forEach((problem) => {
    const solveDate = new Date(problem.first_solved_at);
    const daysDiff = Math.floor((now - solveDate) / (1000 * 60 * 60 * 24));

    // Recent: last 7 days
    if (daysDiff <= 7) {
      counts.recent++;
    }

    // Needs review: >30 days
    if (daysDiff > 30) {
      counts['needs-review']++;
    }

    // Struggled: multiple attempts (placeholder - need to track this)
    // For now, we'll mark it as 0 since we don't have attempt count yet

    // Favorites: marked as favorite (placeholder)
    if (problem.is_favorite) {
      counts.favorites++;
    }
  });

  return counts;
}

export default function SmartFilters({
  problems = [],
  activeFilter,
  onFilterChange,
}) {
  const counts = calculateFilterCounts(problems);

  return (
    <div className="flex flex-wrap gap-2">
      {SMART_FILTERS.map((filter) => {
        const isActive = activeFilter === filter.id;
        const count = counts[filter.id];

        // Don't show filters with 0 count
        if (count === 0 && !isActive) return null;

        const colorClasses = {
          blue: {
            active: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
            inactive: 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10',
          },
          orange: {
            active: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
            inactive:
              'border-orange-500/20 text-orange-400 hover:bg-orange-500/10',
          },
          red: {
            active: 'bg-red-500/20 border-red-500/40 text-red-300',
            inactive: 'border-red-500/20 text-red-400 hover:bg-red-500/10',
          },
          yellow: {
            active: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
            inactive:
              'border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10',
          },
        };

        const colors = colorClasses[filter.color] || colorClasses.blue;

        return (
          <motion.button
            key={filter.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onFilterChange(isActive ? null : filter.id)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              isActive ? colors.active : colors.inactive
            }`}
            title={filter.description}
          >
            <filter.icon className="h-3.5 w-3.5" />
            <span>{filter.label}</span>
            {count > 0 && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? 'bg-white/20' : 'bg-white/10'
                }`}
              >
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
