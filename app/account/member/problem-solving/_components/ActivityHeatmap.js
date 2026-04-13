/**
 * @file Activity Heatmap Component
 * @module ActivityHeatmap
 *
 * Professional GitHub-style activity heatmap with enhanced UI/UX.
 * Features interactive tooltips, year navigation, streak tracking,
 * and responsive full-width layout that adapts to container size.
 *
 * Responsive breakpoints:
 * - Mobile (<640px): Compact stats, scrollable heatmap, touch-friendly
 * - Tablet (640-1023px): 3-column stats, full heatmap
 * - Laptop (1024-1279px): 6-column stats, larger cells
 * - Desktop (1280-1535px): Optimized spacing
 * - FHD+ (≥1536px): Maximum cell size, enhanced visual details
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  TrendingUp,
  Zap,
  Award,
  Activity,
  Info,
} from 'lucide-react';

// Intensity color palette - emerald/green theme
const INTENSITY_COLORS = [
  'bg-white/[0.04]', // Level 0 - empty
  'bg-emerald-900/60', // Level 1 - light
  'bg-emerald-600/70', // Level 2
  'bg-emerald-500/80', // Level 3
  'bg-emerald-400', // Level 4 - intense
];

const INTENSITY_BORDERS = [
  'border-white/6',
  'border-emerald-700/50',
  'border-emerald-500/50',
  'border-emerald-400/50',
  'border-emerald-300/60',
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (n) => String(n).padStart(2, '0');

// Build stable local date key (YYYY-MM-DD) without UTC conversion side effects.
const toDateKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// Parse YYYY-MM-DD as local date to avoid off-by-one issues in some timezones.
const fromDateKey = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

// Get intensity level based on count
const getIntensity = (count) => {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
};

// Format date for display
const formatDate = (dateStr) => {
  const date = fromDateKey(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format date short for mobile
const formatDateShort = (dateStr) => {
  const date = fromDateKey(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Tooltip Component - Enhanced for touch and different screen sizes
function Tooltip({ day, position, isMobile }) {
  if (!day || !position) return null;

  // Mobile tooltip - positioned at bottom of screen
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-white/10 bg-gray-900/98 px-4 py-3 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400">
              {formatDateShort(day.date)}
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">
              {day.count === 0 ? (
                <span className="text-gray-500">No activity</span>
              ) : (
                <>
                  <span className="text-emerald-400">{day.count}</span>{' '}
                  {day.count === 1 ? 'problem' : 'problems'} solved
                </>
              )}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Desktop tooltip - follows cursor
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      className="pointer-events-none fixed z-50 rounded-xl border border-white/10 bg-gray-900/95 px-3 py-2 shadow-2xl backdrop-blur-sm sm:px-4 sm:py-2.5"
      style={{
        left: Math.max(80, Math.min(position.x, window.innerWidth - 80)),
        top: position.y - 75,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="text-center">
        <p className="text-[10px] font-medium text-gray-400 sm:text-xs">
          {formatDate(day.date)}
        </p>
        <p className="mt-0.5 text-xs font-bold text-white sm:mt-1 sm:text-sm">
          {day.count === 0 ? (
            <span className="text-gray-500">No activity</span>
          ) : (
            <>
              <span className="text-emerald-400">{day.count}</span>{' '}
              {day.count === 1 ? 'problem' : 'problems'} solved
            </>
          )}
        </p>
      </div>
      {/* Arrow */}
      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-white/10 bg-gray-900/95" />
    </motion.div>
  );
}

// Stat Card Component - Responsive with different layouts per breakpoint
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  delay = 0,
  compact = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      className={`group flex items-center rounded-lg border border-white/[0.06] bg-white/[0.02] transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:shadow-sm ${
        compact
          ? 'gap-2 p-2 sm:gap-2.5 sm:p-2.5'
          : 'gap-2 p-2.5 sm:gap-2.5 sm:p-3 md:gap-3 md:p-3.5 xl:gap-3.5 xl:p-4'
      } `}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg ${color} shadow-lg ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-105 ${
          compact
            ? 'h-8 w-8 sm:h-9 sm:w-9'
            : 'h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 xl:h-11 xl:w-11'
        } `}
      >
        <Icon
          className={`text-white ${
            compact
              ? 'h-3.5 w-3.5 sm:h-4 sm:w-4'
              : 'h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 xl:h-5 xl:w-5'
          } `}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`font-bold text-white tabular-nums ${
            compact
              ? 'text-sm sm:text-base'
              : 'text-sm sm:text-base md:text-lg xl:text-xl'
          } `}
        >
          {value}
          {suffix && (
            <span
              className={`ml-0.5 text-gray-500 ${
                compact
                  ? 'text-[9px] sm:text-[10px]'
                  : 'text-[9px] sm:text-[10px] md:text-xs'
              } `}
            >
              {suffix}
            </span>
          )}
        </p>
        <p
          className={`truncate font-medium text-gray-500 ${
            compact
              ? 'text-[9px] sm:text-[10px]'
              : 'text-[9px] sm:text-[10px] md:text-xs xl:text-xs'
          } `}
        >
          {label}
        </p>
      </div>
    </motion.div>
  );
}

// Year Selector Component - Enhanced touch targets for mobile
function YearSelector({ year, onChange, minYear, maxYear }) {
  const canGoPrev = year > minYear;
  const canGoNext = year < maxYear;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        onClick={() => canGoPrev && onChange(year - 1)}
        disabled={!canGoPrev}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-gray-400 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:h-9 sm:w-9 md:h-10 md:w-10"
        aria-label="Previous year"
      >
        <ChevronLeft className="h-4 w-4 sm:h-4 sm:w-4" />
      </button>
      <div className="flex min-w-20 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 shadow-sm sm:min-w-22.5 sm:px-3.5">
        <Calendar className="hidden h-4 w-4 text-emerald-400 sm:block" />
        <span className="text-sm font-bold text-white tabular-nums sm:text-sm">
          {year}
        </span>
      </div>
      <button
        onClick={() => canGoNext && onChange(year + 1)}
        disabled={!canGoNext}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-gray-400 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:h-9 sm:w-9 md:h-10 md:w-10"
        aria-label="Next year"
      >
        <ChevronRight className="h-4 w-4 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}

// Legend Component - Responsive sizing
function Legend({ cellSize, compact = false }) {
  const displaySize = compact ? Math.max(8, cellSize - 2) : cellSize;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 sm:gap-1.5">
      <span className="text-[9px] sm:text-[10px] md:text-xs">Less</span>
      {INTENSITY_COLORS.map((color, i) => (
        <div
          key={i}
          className={`rounded-sm border ${color} ${INTENSITY_BORDERS[i]}`}
          style={{ width: displaySize, height: displaySize }}
        />
      ))}
      <span className="text-[9px] sm:text-[10px] md:text-xs">More</span>
    </div>
  );
}

// Mobile Stats Summary - Compact horizontal scroll
function MobileStatsSummary({ stats }) {
  return (
    <div className="mb-4 sm:hidden">
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500">
            <Target className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tabular-nums">
              {stats.total}
            </p>
            <p className="text-[9px] text-gray-500">Solved</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500">
            <Flame className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tabular-nums">
              {stats.currentStreak}
              <span className="ml-0.5 text-[9px] text-gray-500">d</span>
            </p>
            <p className="text-[9px] text-gray-500">Streak</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500">
            <Award className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tabular-nums">
              {stats.longestStreak}
              <span className="ml-0.5 text-[9px] text-gray-500">d</span>
            </p>
            <p className="text-[9px] text-gray-500">Best</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tabular-nums">
              {stats.max}
            </p>
            <p className="text-[9px] text-gray-500">Max/Day</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Activity Heatmap Component
export default function ActivityHeatmap({ data = [], onDayClick }) {
  const currentYearNum = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYearNum);
  const [tooltip, setTooltip] = useState({ day: null, position: null });
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null); // For mobile tap
  const containerRef = useRef(null);
  const heatmapRef = useRef(null);

  // Detect viewport breakpoints
  useEffect(() => {
    const updateViewport = () => {
      setViewportWidth(window.innerWidth);
      setIsMobile(window.innerWidth < 640);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Track container width accurately (including layout shifts not triggered by window resize)
  useEffect(() => {
    if (!containerRef.current) return;

    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateContainerWidth();

    const observer = new ResizeObserver(updateContainerWidth);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Calculate cell size based on container width and screen size
  const { cellSize, gap, showDayLabels } = useMemo(() => {
    const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
    const isLaptop = viewportWidth >= 1024 && viewportWidth < 1280;
    const isDesktop = viewportWidth >= 1280 && viewportWidth < 1536;
    const isFhdPlus = viewportWidth >= 1536;

    // Different padding for different screen sizes
    const padding = isMobile ? 24 : 48; // 12px or 24px each side
    const dayLabelWidth = isMobile ? 0 : 32; // Hide day labels on mobile
    const availableWidth = containerWidth - padding - dayLabelWidth;
    const numWeeks = 54;

    // Gap ratio varies by screen size for visual balance
    const gapRatio = isMobile ? 0.12 : isTablet ? 0.14 : isLaptop ? 0.16 : 0.18;
    const calculatedCellSize =
      availableWidth / (numWeeks + (numWeeks - 1) * gapRatio);

    // Different min/max cell sizes per screen size
    const minSize = isMobile ? 8 : isTablet ? 9 : 10;
    const maxSize = isMobile
      ? 12
      : isTablet
        ? 14
        : isLaptop
          ? 16
          : isDesktop
            ? 18
            : isFhdPlus
              ? 22
              : 18;
    const clampedCellSize = Math.max(
      minSize,
      Math.min(maxSize, calculatedCellSize)
    );
    const calculatedGap = Math.max(1, Math.round(clampedCellSize * gapRatio));

    return {
      cellSize: Math.floor(clampedCellSize),
      gap: calculatedGap,
      showDayLabels: !isMobile,
    };
  }, [containerWidth, isMobile, viewportWidth]);

  // Calculate min year from data or default to current year - 2
  const minYear = useMemo(() => {
    if (data.length === 0) return currentYearNum - 2;
    const years = data.map((d) => new Date(d.activity_date).getFullYear());
    return Math.min(...years, currentYearNum - 2);
  }, [data, currentYearNum]);

  // Build calendar data for selected year
  const calendarData = useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const today = new Date();

    // Build activity map
    const activityMap = {};
    data.forEach((item) => {
      activityMap[item.activity_date] = item.problems_solved;
    });

    const weeks = [];
    let currentWeek = [];

    // Pad the first week
    const startDay = startDate.getDay();
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    // Fill in days
    const current = new Date(startDate);
    while (current <= endDate) {
      // Don't show future dates as active
      if (current > today) {
        currentWeek.push({
          date: toDateKey(current),
          count: 0,
          future: true,
        });
      } else {
        const dateStr = toDateKey(current);
        currentWeek.push({
          date: dateStr,
          count: activityMap[dateStr] || 0,
        });
      }

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    // Pad the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [data, selectedYear]);

  // Calculate statistics for selected year
  const stats = useMemo(() => {
    const yearData = data.filter((d) => {
      const year = fromDateKey(d.activity_date).getFullYear();
      return year === selectedYear;
    });

    let total = 0;
    let max = 0;
    let activeDays = 0;

    yearData.forEach((item) => {
      total += item.problems_solved;
      max = Math.max(max, item.problems_solved);
      if (item.problems_solved > 0) activeDays++;
    });

    const average = activeDays > 0 ? (total / activeDays).toFixed(1) : 0;

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedData = [...data]
      .filter(
        (d) => fromDateKey(d.activity_date) <= today && d.problems_solved > 0
      )
      .sort(
        (a, b) =>
          fromDateKey(b.activity_date).getTime() -
          fromDateKey(a.activity_date).getTime()
      );

    if (sortedData.length > 0) {
      const mostRecentDate = fromDateKey(sortedData[0].activity_date);
      mostRecentDate.setHours(0, 0, 0, 0);

      // Check if most recent activity is today or yesterday
      const diffFromToday = Math.floor(
        (today - mostRecentDate) / (1000 * 60 * 60 * 24)
      );

      if (diffFromToday <= 1) {
        let expectedDate = new Date(mostRecentDate);

        for (const item of sortedData) {
          const itemDate = fromDateKey(item.activity_date);
          itemDate.setHours(0, 0, 0, 0);

          if (itemDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    const allSortedData = [...data]
      .filter((d) => d.problems_solved > 0)
      .sort(
        (a, b) =>
          fromDateKey(a.activity_date).getTime() -
          fromDateKey(b.activity_date).getTime()
      );

    for (const item of allSortedData) {
      const itemDate = fromDateKey(item.activity_date);
      itemDate.setHours(0, 0, 0, 0);

      if (prevDate) {
        const diffDays = Math.round(
          (itemDate - prevDate) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }

      prevDate = itemDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { total, max, activeDays, average, currentStreak, longestStreak };
  }, [data, selectedYear]);

  // Handle tooltip for desktop hover
  const handleDayHover = useCallback(
    (day, event) => {
      if (day.future || isMobile) return;
      const rect = event.target.getBoundingClientRect();
      setTooltip({
        day,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top,
        },
      });
    },
    [isMobile]
  );

  const handleDayLeave = useCallback(() => {
    setTooltip({ day: null, position: null });
  }, []);

  // Handle mobile tap
  const handleDayTap = useCallback(
    (day, event) => {
      if (day.future) return;

      // If parent provides click handler, use it to navigate/filter like Topic Mastery.
      if (onDayClick) {
        onDayClick(day.date);
        return;
      }

      if (isMobile) {
        event.preventDefault();
        setSelectedDay(day);
        setTooltip({
          day,
          position: { x: 0, y: 0 }, // Position doesn't matter for mobile
        });
        // Auto-hide after 3 seconds
        setTimeout(() => {
          setSelectedDay(null);
          setTooltip({ day: null, position: null });
        }, 3000);
      }
    },
    [isMobile, onDayClick]
  );

  // Calculate month label positions based on cell size
  const monthLabels = useMemo(() => {
    const labels = [];
    const cellWithGap = cellSize + gap;

    for (let month = 0; month < 12; month++) {
      // Reduce visual clutter on very small screens.
      if (isMobile && month % 2 !== 0) continue;

      const firstDayOfMonth = new Date(selectedYear, month, 1);
      const dayOfYear = Math.floor(
        (firstDayOfMonth - new Date(selectedYear, 0, 1)) / (1000 * 60 * 60 * 24)
      );
      const startDayOffset = new Date(selectedYear, 0, 1).getDay();
      const weekIndex = Math.floor((dayOfYear + startDayOffset) / 7);

      labels.push({
        month: MONTHS[month],
        position: weekIndex * cellWithGap,
      });
    }

    return labels;
  }, [selectedYear, cellSize, gap, isMobile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent shadow-lg shadow-black/5 sm:rounded-2xl md:rounded-2xl"
    >
      {/* Top accent line */}
      <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500" />

      {/* Background decoration */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-emerald-500/3 blur-3xl" />

      <div className="relative p-3 sm:p-4 md:p-5 xl:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg ring-2 shadow-emerald-500/20 ring-emerald-400/20 sm:h-11 sm:w-11 md:h-12 md:w-12">
              <Activity className="h-5 w-5 text-white sm:h-5 sm:w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white sm:text-lg md:text-xl">
                Activity Calendar
              </h3>
              <p className="text-[10px] text-gray-500 sm:text-xs md:text-sm">
                Your problem solving journey
              </p>
            </div>
          </div>
          <YearSelector
            year={selectedYear}
            onChange={setSelectedYear}
            minYear={minYear}
            maxYear={currentYearNum}
          />
        </div>

        {/* Mobile Stats Summary - Horizontal scroll */}
        <MobileStatsSummary stats={stats} />

        {/* Desktop Stats Grid - Hidden on mobile */}
        <div className="mb-4 hidden grid-cols-3 gap-2 sm:grid md:mb-5 md:gap-2.5 lg:grid-cols-6 lg:gap-3 xl:gap-3.5">
          <StatCard
            icon={Target}
            label="Total Solved"
            value={stats.total}
            color="bg-emerald-500"
            delay={0}
          />
          <StatCard
            icon={Flame}
            label="Current Streak"
            value={stats.currentStreak}
            suffix="days"
            color="bg-orange-500"
            delay={1}
          />
          <StatCard
            icon={Award}
            label="Best Streak"
            value={stats.longestStreak}
            suffix="days"
            color="bg-purple-500"
            delay={2}
          />
          <StatCard
            icon={Zap}
            label="Max in Day"
            value={stats.max}
            color="bg-amber-500"
            delay={3}
          />
          <StatCard
            icon={TrendingUp}
            label="Active Days"
            value={stats.activeDays}
            color="bg-blue-500"
            delay={4}
          />
          <StatCard
            icon={Calendar}
            label="Daily Avg"
            value={stats.average}
            color="bg-cyan-500"
            delay={5}
          />
        </div>

        {/* Heatmap Container */}
        <div
          ref={containerRef}
          className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-2 sm:rounded-xl sm:p-3 md:p-4"
        >
          {containerWidth > 0 && (
            <div className="flex flex-col">
              {/* Month labels */}
              <div
                className="relative mb-1.5 h-4 sm:mb-2 sm:h-5"
                style={{ marginLeft: showDayLabels ? 32 + gap : gap }}
              >
                {monthLabels.map(({ month, position }, index) => (
                  <span
                    key={month + index}
                    className="absolute text-[8px] font-medium text-gray-500 sm:text-[10px] md:text-xs"
                    style={{ left: position }}
                  >
                    {month}
                  </span>
                ))}
              </div>

              {/* Grid with day labels */}
              <div
                ref={heatmapRef}
                className="scrollbar-hide flex overflow-x-auto sm:overflow-visible"
              >
                {/* Day labels - Hidden on mobile */}
                {showDayLabels && (
                  <div
                    className="hidden flex-col justify-between pr-1.5 sm:flex sm:pr-2"
                    style={{
                      width: 32,
                      height: 7 * cellSize + 6 * gap,
                      paddingTop: cellSize * 0.1,
                      paddingBottom: cellSize * 0.1,
                    }}
                  >
                    {DAYS.map((day, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-end text-[9px] font-medium text-gray-500 sm:text-[10px]"
                        style={{ height: cellSize }}
                      >
                        {i % 2 === 1 ? day.slice(0, 3) : ''}
                      </div>
                    ))}
                  </div>
                )}

                {/* Weeks grid - Full width */}
                <div className="flex flex-1" style={{ gap: gap }}>
                  {calendarData.map((week, weekIndex) => (
                    <div
                      key={weekIndex}
                      className="flex flex-col"
                      style={{ gap: gap }}
                    >
                      {week.map((day, dayIndex) => {
                        if (!day) {
                          return (
                            <div
                              key={`${weekIndex}-${dayIndex}`}
                              style={{ width: cellSize, height: cellSize }}
                            />
                          );
                        }

                        const intensity = day.future
                          ? 0
                          : getIntensity(day.count);
                        const colorClass = INTENSITY_COLORS[intensity];
                        const borderClass = INTENSITY_BORDERS[intensity];
                        const isSelected = selectedDay?.date === day.date;

                        return (
                          <motion.div
                            key={`${weekIndex}-${dayIndex}`}
                            whileHover={
                              day.future || isMobile ? {} : { scale: 1.2 }
                            }
                            whileTap={day.future ? {} : { scale: 0.95 }}
                            onMouseEnter={(e) => handleDayHover(day, e)}
                            onMouseLeave={handleDayLeave}
                            onClick={(e) => handleDayTap(day, e)}
                            className={`rounded-sm border ${colorClass} ${borderClass} ${
                              day.future
                                ? 'cursor-default opacity-30'
                                : `cursor-pointer transition-all duration-150 ${
                                    isSelected
                                      ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-gray-900'
                                      : 'hover:border-emerald-400/70 hover:shadow-sm hover:shadow-emerald-500/20'
                                  }`
                            }`}
                            style={{ width: cellSize, height: cellSize }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-3 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] pt-3 sm:mt-4 sm:flex-row sm:gap-0 sm:pt-4">
                <p className="text-[10px] text-gray-500 sm:text-xs md:text-sm">
                  <span className="font-bold text-emerald-400">
                    {stats.total}
                  </span>{' '}
                  problems solved in{' '}
                  <span className="font-semibold text-white">
                    {selectedYear}
                  </span>
                </p>
                <Legend cellSize={cellSize} compact={isMobile} />
              </div>

              {/* Mobile tap hint */}
              {isMobile && (
                <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-gray-600">
                  <Info className="h-3 w-3" />
                  <span>Tap a cell to see details</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.day && !tooltip.day.future && (
          <Tooltip
            day={tooltip.day}
            position={tooltip.position}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
