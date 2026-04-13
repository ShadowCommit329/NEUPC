/**
 * @file Rating Chart Component
 * @module RatingChart
 *
 * Interactive rating history chart showing rating changes over time
 * across multiple platforms with tooltips and platform filtering.
 */

'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Filter, Trophy, Activity } from 'lucide-react';
import { PROBLEM_SOLVING_PLATFORMS } from '@/app/_lib/problem-solving-platforms';

// Platform configurations
const PLATFORM_CONFIG = PROBLEM_SOLVING_PLATFORMS.reduce((acc, platform) => {
  acc[platform.id] = {
    name: platform.name,
    short: platform.ui.short,
    color: platform.ui.color,
    // Chart line color (hex for SVG)
    chartColor:
      {
        codeforces: '#ef4444',
        atcoder: '#0ea5e9',
        leetcode: '#f59e0b',
        codechef: '#f97316',
        topcoder: '#3b82f6',
        hackerrank: '#22c55e',
      }[platform.id] || '#8b5cf6',
  };
  return acc;
}, {});

// Time range options
const TIME_RANGES = [
  { id: 'all', label: 'All Time' },
  { id: '1y', label: '1 Year' },
  { id: '6m', label: '6 Months' },
  { id: '3m', label: '3 Months' },
  { id: '1m', label: '1 Month' },
];

// Tooltip Component
function ChartTooltip({ data, position, isClickable }) {
  if (!data || !position) return null;

  const config = PLATFORM_CONFIG[data.platform];
  const date = new Date(data.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="pointer-events-none fixed z-50 rounded-xl border border-white/10 bg-gray-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm"
      style={{
        left: Math.min(position.x + 10, window.innerWidth - 200),
        top: position.y - 80,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: config?.chartColor }}
        />
        <span className={`text-sm font-semibold ${config?.color}`}>
          {config?.name}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-400">Rating</span>
          <span className="text-sm font-bold text-white">{data.rating}</span>
        </div>
        {data.change !== undefined && data.change !== 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-gray-400">Change</span>
            <span
              className={`text-sm font-semibold ${data.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {data.change > 0 ? '+' : ''}
              {data.change}
            </span>
          </div>
        )}
        {data.contestName && (
          <div className="mt-1 max-w-[200px] truncate text-xs font-medium text-white">
            {data.contestName}
          </div>
        )}
        <div className="text-xs text-gray-600">{date}</div>
        {isClickable && data.contestId && (
          <div className="mt-1 border-t border-white/10 pt-1 text-[10px] text-blue-400">
            Click to view in Contest History
          </div>
        )}
      </div>
    </motion.div>
  );
}

// SVG Line Chart
function LineChart({
  data,
  width,
  height,
  selectedPlatforms,
  onHover,
  onLeave,
  onClick,
}) {
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Filter data by selected platforms
  const filteredData = useMemo(() => {
    return data.filter((d) => selectedPlatforms.includes(d.platform));
  }, [data, selectedPlatforms]);

  // Calculate scales
  const { xScale, yScale, yTicks } = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        xScale: () => 0,
        yScale: () => 0,
        yTicks: [],
      };
    }

    const dates = filteredData.map((d) => new Date(d.date).getTime());
    const ratings = filteredData.map((d) => d.rating);

    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);

    // Add padding to rating range
    const ratingPadding = (maxRating - minRating) * 0.1 || 100;
    const yMin = Math.floor((minRating - ratingPadding) / 100) * 100;
    const yMax = Math.ceil((maxRating + ratingPadding) / 100) * 100;

    const xScale = (date) => {
      const t = new Date(date).getTime();
      return (
        padding.left + ((t - minDate) / (maxDate - minDate || 1)) * chartWidth
      );
    };

    const yScale = (rating) => {
      return (
        padding.top +
        chartHeight -
        ((rating - yMin) / (yMax - yMin || 1)) * chartHeight
      );
    };

    // Generate Y-axis ticks
    const tickCount = 5;
    const tickStep = Math.ceil((yMax - yMin) / tickCount / 100) * 100;
    const yTicks = [];
    for (let i = yMin; i <= yMax; i += tickStep) {
      yTicks.push(i);
    }

    return { xScale, yScale, yTicks };
  }, [filteredData, chartWidth, chartHeight, padding]);

  // Group data by platform
  const platformData = useMemo(() => {
    const grouped = {};
    filteredData.forEach((d) => {
      if (!grouped[d.platform]) {
        grouped[d.platform] = [];
      }
      grouped[d.platform].push(d);
    });

    // Sort each platform's data by date
    Object.keys(grouped).forEach((platform) => {
      grouped[platform].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });

    return grouped;
  }, [filteredData]);

  // Generate path for each platform
  const paths = useMemo(() => {
    return Object.entries(platformData)
      .map(([platform, points]) => {
        if (points.length === 0) return null;

        const pathData = points
          .map((p, i) => {
            const x = xScale(p.date);
            const y = yScale(p.rating);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          })
          .join(' ');

        return {
          platform,
          path: pathData,
          points,
          color: PLATFORM_CONFIG[platform]?.chartColor || '#8b5cf6',
        };
      })
      .filter(Boolean);
  }, [platformData, xScale, yScale]);

  if (filteredData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ width, height }}
      >
        No rating data available
      </div>
    );
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Grid lines */}
      <g className="text-white/6">
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={padding.left}
            y1={yScale(tick)}
            x2={width - padding.right}
            y2={yScale(tick)}
            stroke="currentColor"
            strokeDasharray="4,4"
          />
        ))}
      </g>

      {/* Y-axis labels */}
      <g className="text-gray-500">
        {yTicks.map((tick) => (
          <text
            key={tick}
            x={padding.left - 10}
            y={yScale(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-[10px]"
            fill="currentColor"
          >
            {tick}
          </text>
        ))}
      </g>

      {/* Lines and points */}
      {paths.map(({ platform, path, points, color }) => (
        <g key={platform}>
          {/* Line */}
          <motion.path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Glow effect */}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.2}
            filter="blur(4px)"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <motion.circle
              key={i}
              cx={xScale(point.date)}
              cy={yScale(point.rating)}
              r={4}
              fill={color}
              stroke="#1a1a1a"
              strokeWidth={2}
              className="cursor-pointer"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.02 }}
              onMouseEnter={(e) =>
                onHover(point, { x: e.clientX, y: e.clientY })
              }
              onMouseLeave={onLeave}
              onClick={() => onClick && onClick(point)}
              whileHover={{ scale: 1.5 }}
            />
          ))}
        </g>
      ))}

      {/* Y-axis line */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="currentColor"
        className="text-white/10"
      />
    </svg>
  );
}

// Platform Filter Toggle
function PlatformToggle({ platform, isSelected, onToggle }) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) return null;

  return (
    <button
      onClick={() => onToggle(platform)}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
        isSelected
          ? `${config.color} bg-white/10`
          : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
      }`}
    >
      <div
        className={`h-2 w-2 rounded-full ${isSelected ? '' : 'opacity-30'}`}
        style={{ backgroundColor: config.chartColor }}
      />
      {config.short}
    </button>
  );
}

// Main Rating Chart Component
export default function RatingChart({
  ratingHistory = [],
  contestHistory = [],
  handles = [],
  className = '',
  onContestClick,
}) {
  const containerRef = useRef(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(() =>
    handles.map((h) => h.platform)
  );
  const [timeRange, setTimeRange] = useState('all');
  const [tooltip, setTooltip] = useState({ data: null, position: null });
  const [dimensions, setDimensions] = useState({ width: 0, height: 300 });

  useEffect(() => {
    const handlePlatforms = handles.map((h) => h.platform);
    setSelectedPlatforms((prev) => {
      if (prev.length > 0) return prev;
      return handlePlatforms;
    });
  }, [handles]);

  // Measure container
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setDimensions({
        width,
        height: width < 420 ? 240 : 300,
      });
    }
  }, []);

  // Update dimensions on mount and resize
  useEffect(() => {
    measureContainer();
    window.addEventListener('resize', measureContainer);
    return () => window.removeEventListener('resize', measureContainer);
  }, [measureContainer]);

  // Create a map of contests by date+platform for quick lookup
  const contestMap = useMemo(() => {
    const map = new Map();
    contestHistory.forEach((contest) => {
      const contestDate = new Date(contest.date || contest.contest_date);
      // Use date string + platform as key (allowing for some date variance)
      const dateKey = contestDate.toISOString().split('T')[0];
      const key = `${contest.platform}-${dateKey}`;
      map.set(key, contest);
      // Also try with newRating as additional match criteria
      if (contest.newRating) {
        const ratingKey = `${contest.platform}-${contest.newRating}`;
        if (!map.has(ratingKey)) {
          map.set(ratingKey, contest);
        }
      }
    });
    return map;
  }, [contestHistory]);

  // Enrich rating data with contest names
  const enrichedRatingHistory = useMemo(() => {
    return ratingHistory.map((rating) => {
      // Try to find matching contest
      const ratingDate = new Date(rating.date);
      const dateKey = ratingDate.toISOString().split('T')[0];
      const key = `${rating.platform}-${dateKey}`;

      let matchedContest = contestMap.get(key);

      // Fallback: try matching by rating value
      if (!matchedContest && rating.rating) {
        const ratingKey = `${rating.platform}-${rating.rating}`;
        matchedContest = contestMap.get(ratingKey);
      }

      // Fallback: search through contest history for close date match
      if (!matchedContest) {
        matchedContest = contestHistory.find((contest) => {
          if (contest.platform !== rating.platform) return false;
          const contestDate = new Date(contest.date || contest.contest_date);
          const timeDiff = Math.abs(ratingDate - contestDate);
          // Match if within 1 day and rating matches
          return (
            timeDiff < 86400000 &&
            (contest.newRating === rating.rating ||
              contest.new_rating === rating.rating)
          );
        });
      }

      return {
        ...rating,
        contestName:
          matchedContest?.name ||
          matchedContest?.contest_name ||
          rating.contestName,
        contestId:
          matchedContest?.contestId ||
          matchedContest?.external_contest_id ||
          rating.contestId,
      };
    });
  }, [ratingHistory, contestHistory, contestMap]);

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (!enrichedRatingHistory || enrichedRatingHistory.length === 0) return [];

    let cutoffDate = null;
    const now = new Date();

    switch (timeRange) {
      case '1m':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '3m':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '6m':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case '1y':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        cutoffDate = null;
    }

    if (!cutoffDate) return enrichedRatingHistory;

    return enrichedRatingHistory.filter((d) => new Date(d.date) >= cutoffDate);
  }, [enrichedRatingHistory, timeRange]);

  // Toggle platform selection
  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  // Calculate summary stats
  const _summaryStats = useMemo(() => {
    const currentRatings = {};
    const changes = {};

    handles.forEach((h) => {
      const platformData = filteredData.filter(
        (d) => d.platform === h.platform
      );
      if (platformData.length > 0) {
        const sorted = [...platformData].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        currentRatings[h.platform] = sorted[0]?.rating || 0;

        if (sorted.length > 1) {
          changes[h.platform] = sorted[0].rating - sorted[1].rating;
        }
      }
    });

    return { currentRatings, changes };
  }, [filteredData, handles]);

  // Available platforms (that have rating data)
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(ratingHistory.map((d) => d.platform));
    return handles
      .filter((h) => platforms.has(h.platform))
      .map((h) => h.platform);
  }, [ratingHistory, handles]);

  // Calculate detailed platform statistics
  const platformStats = useMemo(() => {
    const stats = {};

    availablePlatforms.forEach((platform) => {
      const platformData = ratingHistory.filter((d) => d.platform === platform);
      if (platformData.length === 0) return;

      const sorted = [...platformData].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const ratings = sorted.map((d) => d.rating).filter((r) => r != null);
      const changes = sorted.map((d) => d.change).filter((c) => c != null);

      if (ratings.length === 0) return;

      const maxRating = Math.max(...ratings);
      const minRating = Math.min(...ratings);
      const currentRating = ratings[ratings.length - 1];

      // Count only RATED contests where user got rated
      const platformContests = contestHistory.filter(
        (c) => c.platform === platform
      );
      const ratedContestCount = platformContests.filter(
        (c) =>
          c.isRated !== false && (c.ratingChange != null || c.newRating != null)
      ).length;

      const positiveChanges = changes.filter((c) => c > 0).length;
      const negativeChanges = changes.filter((c) => c < 0).length;
      const avgChange =
        changes.length > 0
          ? Math.round(changes.reduce((a, b) => a + b, 0) / changes.length)
          : 0;

      stats[platform] = {
        currentRating,
        maxRating,
        minRating,
        contestCount: ratedContestCount,
        positiveChanges,
        negativeChanges,
        avgChange,
        winRate:
          ratedContestCount > 0
            ? Math.round((positiveChanges / ratedContestCount) * 100)
            : 0,
      };
    });

    return stats;
  }, [ratingHistory, contestHistory, availablePlatforms]);

  const handleHover = useCallback((data, position) => {
    setTooltip({ data, position });
  }, []);

  const handleLeave = useCallback(() => {
    setTooltip({ data: null, position: null });
  }, []);

  // If no rating data, show placeholder
  if (!ratingHistory || ratingHistory.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative flex h-full flex-col rounded-2xl border border-white/6 bg-white/2 p-6 shadow-lg shadow-black/5 ${className}`}
      >
        {/* Top accent line */}
        <div className="absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl bg-linear-to-r from-blue-500 to-indigo-500" />

        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg ring-2 shadow-blue-500/20 ring-blue-400/20">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Rating History</h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/4">
            <Calendar className="h-7 w-7 text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-400">
            No rating history available
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Participate in rated contests to see your rating graph
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex h-full flex-col rounded-2xl border border-white/6 bg-white/2 p-4 shadow-lg shadow-black/5 sm:p-5 ${className}`}
    >
      {/* Top accent line */}
      <div className="absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl bg-linear-to-r from-blue-500 to-indigo-500" />

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg ring-2 shadow-blue-500/20 ring-blue-400/20">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Rating History</h3>
        </div>

        {/* Time Range Selector */}
        <div className="-mx-1 flex shrink-0 items-center gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-1 sm:mx-0 lg:w-auto">
          {TIME_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                timeRange === range.id
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-white/4 hover:text-gray-300'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform Filters */}
      {availablePlatforms.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 h-3.5 w-3.5 text-gray-500" />
          {availablePlatforms.map((platform) => (
            <PlatformToggle
              key={platform}
              platform={platform}
              isSelected={selectedPlatforms.includes(platform)}
              onToggle={togglePlatform}
            />
          ))}
        </div>
      )}

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-white/5 bg-white/1 p-1.5 sm:p-2"
        onMouseEnter={measureContainer}
      >
        {dimensions.width > 0 && (
          <LineChart
            data={filteredData}
            width={dimensions.width - 16}
            height={dimensions.height}
            selectedPlatforms={selectedPlatforms}
            onHover={handleHover}
            onLeave={handleLeave}
            onClick={onContestClick}
          />
        )}
      </div>

      {/* Tooltip */}
      {tooltip.data && (
        <ChartTooltip
          data={tooltip.data}
          position={tooltip.position}
          isClickable={!!onContestClick}
        />
      )}

      {/* Platform Statistics Section */}
      {Object.keys(platformStats).length > 0 && (
        <div className="mt-auto border-t border-white/6 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-400">
              Platform Statistics
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {availablePlatforms
              .filter((p) => selectedPlatforms.includes(p) && platformStats[p])
              .map((platform) => {
                const config = PLATFORM_CONFIG[platform];
                const stats = platformStats[platform];

                if (!stats) return null;

                return (
                  <div
                    key={platform}
                    className="rounded-xl border border-white/5 bg-white/2 p-3"
                  >
                    {/* Platform Header */}
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
                        style={{ backgroundColor: config?.chartColor }}
                      />
                      <span
                        className={`text-xs font-semibold ${config?.color}`}
                      >
                        {config?.name}
                      </span>
                      <span className="ml-auto text-lg font-bold text-white tabular-nums">
                        {stats.currentRating}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Max</span>
                        <span className="font-medium text-amber-400 tabular-nums">
                          <Trophy className="mr-0.5 inline h-3 w-3" />
                          {stats.maxRating}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Min</span>
                        <span className="font-medium text-gray-400 tabular-nums">
                          {stats.minRating}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Contests</span>
                        <span className="font-medium text-white tabular-nums">
                          {stats.contestCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Win Rate</span>
                        <span
                          className={`font-medium tabular-nums ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-gray-400'}`}
                        >
                          {stats.winRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">+Rating</span>
                        <span className="font-medium text-emerald-400 tabular-nums">
                          {stats.positiveChanges}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">-Rating</span>
                        <span className="font-medium text-red-400 tabular-nums">
                          {stats.negativeChanges}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
