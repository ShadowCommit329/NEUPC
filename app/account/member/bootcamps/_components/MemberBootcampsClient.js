/**
 * @file Member bootcamps client — displays all available bootcamps
 *   with enrollment status, progress tracking, and enrollment actions.
 * @module MemberBootcampsClient
 */

'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Clock,
  Play,
  Search,
  X,
  ChevronDown,
  CheckCircle2,
  LayoutGrid,
  List,
  TrendingUp,
  Target,
  Trophy,
  Flame,
  ArrowRight,
  Users,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { enrollUser } from '@/app/_lib/bootcamp-actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent = false }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          accent ? 'bg-emerald-500/15' : 'bg-white/8'
        }`}
      >
        <Icon
          className={`h-4 w-4 ${accent ? 'text-emerald-400' : 'text-gray-400'}`}
        />
      </div>
      <div>
        <p className="text-xl leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-600">{label}</p>
      </div>
    </div>
  );
}

// ─── Enrolled Bootcamp Card ───────────────────────────────────────────────────

function EnrolledBootcampCard({ bootcamp, enrollment }) {
  const progress = enrollment?.progress_percent || 0;
  const completedLessons = enrollment?.completed_lessons || 0;
  const totalLessons = bootcamp?.total_lessons || 0;

  return (
    <Link
      href={`/account/member/bootcamps/${bootcamp.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0d1117] transition-all hover:border-white/15 hover:bg-[#161b22]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
        {bootcamp.thumbnail ? (
          <img
            src={bootcamp.thumbnail}
            alt={bootcamp.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/20 to-violet-800/10">
            <GraduationCap className="h-12 w-12 text-violet-500/30" />
          </div>
        )}

        {/* Progress overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Continue button */}
        <div className="absolute right-3 bottom-3 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
            <Play className="h-3 w-3 fill-current" />
            Continue
          </span>
        </div>

        {/* Progress badge */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            {progress}% complete
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-emerald-400">
          {bootcamp.title || 'Untitled Bootcamp'}
        </h3>

        {/* Stats */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500/60" />
            {completedLessons}/{totalLessons} lessons
          </span>
          {bootcamp.total_duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(bootcamp.total_duration)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="font-mono text-[10px] text-gray-700">
              Last accessed {timeAgo(enrollment?.last_accessed_at)}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Available Bootcamp Card ──────────────────────────────────────────────────

function AvailableBootcampCard({ bootcamp, onEnroll, isEnrolling }) {
  const totalLessons = bootcamp.total_lessons || 0;
  const courseCount = bootcamp.course_count || 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0d1117] transition-all hover:border-white/15 hover:bg-[#161b22]">
      {/* Featured badge */}
      {bootcamp.is_featured && (
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Featured
          </span>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
        {bootcamp.thumbnail ? (
          <img
            src={bootcamp.thumbnail}
            alt={bootcamp.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/20 to-violet-800/10">
            <GraduationCap className="h-12 w-12 text-violet-500/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-violet-400">
          {bootcamp.title || 'Untitled Bootcamp'}
        </h3>

        {bootcamp.description && (
          <p className="mt-2 line-clamp-2 text-xs text-gray-500">
            {bootcamp.description}
          </p>
        )}

        {/* Stats */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-600">
          {courseCount > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {courseCount} {courseCount === 1 ? 'course' : 'courses'}
            </span>
          )}
          {totalLessons > 0 && (
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {totalLessons} lessons
            </span>
          )}
          {bootcamp.total_duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(bootcamp.total_duration)}
            </span>
          )}
        </div>

        {/* Batch info */}
        {bootcamp.batch_info && (
          <p className="mt-2 text-[10px] font-medium text-violet-400">
            {bootcamp.batch_info}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4">
          <button
            onClick={() => onEnroll(bootcamp.id)}
            disabled={isEnrolling}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/15 px-4 py-2.5 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEnrolling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enrolling...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Enroll Now
                {bootcamp.price > 0 && (
                  <span className="ml-1 text-gray-400">
                    (৳{bootcamp.price.toLocaleString()})
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Continue Watching Section ────────────────────────────────────────────────

function ContinueWatchingSection({ enrolledBootcamps }) {
  const continueWatching = useMemo(() => {
    return enrolledBootcamps
      .filter(
        (b) =>
          b.enrollment &&
          b.enrollment.progress_percent > 0 &&
          b.enrollment.progress_percent < 100
      )
      .sort(
        (a, b) =>
          new Date(b.enrollment?.last_accessed_at || 0) -
          new Date(a.enrollment?.last_accessed_at || 0)
      )
      .slice(0, 3);
  }, [enrolledBootcamps]);

  if (continueWatching.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-400" />
        <h2 className="text-sm font-semibold text-white">Continue Watching</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {continueWatching.map((item) => (
          <Link
            key={item.bootcamp.id}
            href={`/account/member/bootcamps/${item.bootcamp.id}`}
            className="group flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 p-3 transition-all hover:border-emerald-500/30 hover:bg-white/4"
          >
            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-900">
              {item.bootcamp.thumbnail ? (
                <img
                  src={item.bootcamp.thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-violet-900/20">
                  <GraduationCap className="h-5 w-5 text-violet-500/30" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-4 w-4 fill-current text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white group-hover:text-emerald-400">
                {item.bootcamp.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${item.enrollment?.progress_percent || 0}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium text-gray-500">
                  {item.enrollment?.progress_percent || 0}%
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ type, onSwitchTab }) {
  if (type === 'enrolled') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
          <GraduationCap className="h-8 w-8 text-violet-400" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-white">
          No Enrollments Yet
        </h3>
        <p className="mb-4 max-w-sm text-sm text-gray-500">
          You haven't enrolled in any bootcamps. Check out the available
          bootcamps below to start learning.
        </p>
        <button
          onClick={onSwitchTab}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/15 px-4 py-2.5 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/25"
        >
          <BookOpen className="h-4 w-4" />
          Browse Available Bootcamps
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-white">All Caught Up!</h3>
      <p className="max-w-sm text-sm text-gray-500">
        You're enrolled in all available bootcamps. Keep up the great work!
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemberBootcampsClient({
  bootcamps = [],
  enrollmentMap = {},
}) {
  const [activeTab, setActiveTab] = useState('enrolled');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('grid');
  const [isPending, startTransition] = useTransition();
  const [enrollingId, setEnrollingId] = useState(null);
  const [localEnrollmentMap, setLocalEnrollmentMap] = useState(enrollmentMap);

  // Categorize bootcamps
  const { enrolledBootcamps, availableBootcamps } = useMemo(() => {
    const enrolled = [];
    const available = [];

    for (const bootcamp of bootcamps) {
      const enrollment = localEnrollmentMap[bootcamp.id];
      if (enrollment) {
        enrolled.push({ bootcamp, enrollment });
      } else {
        available.push(bootcamp);
      }
    }

    return { enrolledBootcamps: enrolled, availableBootcamps: available };
  }, [bootcamps, localEnrollmentMap]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = enrolledBootcamps.length;
    const completed = enrolledBootcamps.filter(
      (e) => (e.enrollment?.progress_percent || 0) >= 100
    ).length;
    const inProgress = enrolledBootcamps.filter((e) => {
      const p = e.enrollment?.progress_percent || 0;
      return p > 0 && p < 100;
    }).length;
    const totalLessonsCompleted = enrolledBootcamps.reduce(
      (sum, e) => sum + (e.enrollment?.completed_lessons || 0),
      0
    );

    return {
      total,
      completed,
      inProgress,
      totalLessonsCompleted,
      available: availableBootcamps.length,
    };
  }, [enrolledBootcamps, availableBootcamps]);

  // Filter and sort enrolled bootcamps
  const filteredEnrolled = useMemo(() => {
    let filtered = [...enrolledBootcamps];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((e) =>
        e.bootcamp?.title?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'recent':
        filtered.sort(
          (a, b) =>
            new Date(
              b.enrollment?.last_accessed_at || b.enrollment?.enrolled_at
            ) -
            new Date(
              a.enrollment?.last_accessed_at || a.enrollment?.enrolled_at
            )
        );
        break;
      case 'progress':
        filtered.sort(
          (a, b) =>
            (b.enrollment?.progress_percent || 0) -
            (a.enrollment?.progress_percent || 0)
        );
        break;
      case 'title':
        filtered.sort((a, b) =>
          (a.bootcamp?.title || '').localeCompare(b.bootcamp?.title || '')
        );
        break;
      case 'enrolled':
        filtered.sort(
          (a, b) =>
            new Date(b.enrollment?.enrolled_at) -
            new Date(a.enrollment?.enrolled_at)
        );
        break;
      default:
        break;
    }

    return filtered;
  }, [enrolledBootcamps, search, sortBy]);

  // Filter available bootcamps
  const filteredAvailable = useMemo(() => {
    let filtered = [...availableBootcamps];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }

    // Sort: featured first, then by date
    filtered.sort((a, b) => {
      if (a.is_featured !== b.is_featured) return b.is_featured ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [availableBootcamps, search]);

  // Handle enrollment
  const handleEnroll = async (bootcampId) => {
    setEnrollingId(bootcampId);
    startTransition(async () => {
      try {
        const result = await enrollUser(bootcampId);
        if (result.success) {
          // Optimistically update local state
          setLocalEnrollmentMap((prev) => ({
            ...prev,
            [bootcampId]: {
              ...result.enrollment,
              progress_percent: 0,
              completed_lessons: 0,
            },
          }));
          // Switch to enrolled tab to show the new enrollment
          setActiveTab('enrolled');
        }
      } catch (error) {
        console.error('Enrollment failed:', error);
      } finally {
        setEnrollingId(null);
      }
    });
  };

  const currentItems =
    activeTab === 'enrolled' ? filteredEnrolled : filteredAvailable;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Bootcamps
          </h1>
          <p className="text-sm text-gray-500">
            {activeTab === 'enrolled'
              ? 'Track your learning progress and continue where you left off'
              : 'Browse and enroll in available bootcamps'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard icon={GraduationCap} label="Enrolled" value={stats.total} />
        <StatCard
          icon={TrendingUp}
          label="In Progress"
          value={stats.inProgress}
          accent
        />
        <StatCard icon={Trophy} label="Completed" value={stats.completed} />
        <StatCard
          icon={Target}
          label="Lessons Done"
          value={stats.totalLessonsCompleted}
        />
        <StatCard icon={BookOpen} label="Available" value={stats.available} />
      </div>

      {/* Continue Watching */}
      {activeTab === 'enrolled' && (
        <ContinueWatchingSection enrolledBootcamps={enrolledBootcamps} />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/3 p-1">
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'enrolled'
              ? 'bg-white/10 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          My Bootcamps ({enrolledBootcamps.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'available'
              ? 'bg-white/10 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Available ({availableBootcamps.length})
        </button>
      </div>

      {/* Filters */}
      {currentItems.length > 0 && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search bootcamps…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-9 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:bg-white/6 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Sort - only for enrolled tab */}
            {activeTab === 'enrolled' && (
              <div className="relative">
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-3.5 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
                >
                  <option value="recent">Recently Accessed</option>
                  <option value="progress">By Progress</option>
                  <option value="title">Title A-Z</option>
                  <option value="enrolled">Date Enrolled</option>
                </select>
              </div>
            )}

            {/* View Toggle */}
            <div className="flex rounded-xl border border-white/10 bg-white/4 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white/12 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white/12 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'enrolled' ? (
        enrolledBootcamps.length === 0 ? (
          <EmptyState
            type="enrolled"
            onSwitchTab={() => setActiveTab('available')}
          />
        ) : filteredEnrolled.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
            <Search className="mb-3 h-10 w-10 text-gray-700" />
            <p className="text-sm font-medium text-gray-500">
              No bootcamps match your search
            </p>
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-2'
            }
          >
            {filteredEnrolled.map(({ bootcamp, enrollment }) =>
              viewMode === 'grid' ? (
                <EnrolledBootcampCard
                  key={bootcamp.id}
                  bootcamp={bootcamp}
                  enrollment={enrollment}
                />
              ) : (
                <EnrolledBootcampListRow
                  key={bootcamp.id}
                  bootcamp={bootcamp}
                  enrollment={enrollment}
                />
              )
            )}
          </div>
        )
      ) : availableBootcamps.length === 0 ? (
        <EmptyState type="available" />
      ) : filteredAvailable.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-gray-700" />
          <p className="text-sm font-medium text-gray-500">
            No bootcamps match your search
          </p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
              : 'space-y-2'
          }
        >
          {filteredAvailable.map((bootcamp) =>
            viewMode === 'grid' ? (
              <AvailableBootcampCard
                key={bootcamp.id}
                bootcamp={bootcamp}
                onEnroll={handleEnroll}
                isEnrolling={enrollingId === bootcamp.id}
              />
            ) : (
              <AvailableBootcampListRow
                key={bootcamp.id}
                bootcamp={bootcamp}
                onEnroll={handleEnroll}
                isEnrolling={enrollingId === bootcamp.id}
              />
            )
          )}
        </div>
      )}
    </>
  );
}

// ─── List Row Components ──────────────────────────────────────────────────────

function EnrolledBootcampListRow({ bootcamp, enrollment }) {
  const progress = enrollment?.progress_percent || 0;
  const completedLessons = enrollment?.completed_lessons || 0;
  const totalLessons = bootcamp?.total_lessons || 0;

  return (
    <Link
      href={`/account/member/bootcamps/${bootcamp.id}`}
      className="group flex items-center gap-4 rounded-xl border border-white/6 bg-white/2 px-4 py-3 transition-all hover:border-white/12 hover:bg-white/4"
    >
      {/* Thumbnail */}
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-900">
        {bootcamp.thumbnail ? (
          <img
            src={bootcamp.thumbnail}
            alt={bootcamp.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/20 to-violet-800/10">
            <GraduationCap className="h-6 w-6 text-violet-500/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-white group-hover:text-emerald-400">
          {bootcamp.title || 'Untitled Bootcamp'}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500/60" />
            {completedLessons}/{totalLessons} lessons
          </span>
          {bootcamp.total_duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(bootcamp.total_duration)}
            </span>
          )}
          <span className="text-gray-700">
            Last: {timeAgo(enrollment?.last_accessed_at)}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="hidden w-32 shrink-0 sm:block">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium text-white">{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
          <Play className="h-3 w-3 fill-current" />
          Continue
        </span>
      </div>
    </Link>
  );
}

function AvailableBootcampListRow({ bootcamp, onEnroll, isEnrolling }) {
  const totalLessons = bootcamp.total_lessons || 0;
  const courseCount = bootcamp.course_count || 0;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/6 bg-white/2 px-4 py-3 transition-all hover:border-white/12 hover:bg-white/4">
      {/* Thumbnail */}
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-900">
        {bootcamp.thumbnail ? (
          <img
            src={bootcamp.thumbnail}
            alt={bootcamp.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/20 to-violet-800/10">
            <GraduationCap className="h-6 w-6 text-violet-500/30" />
          </div>
        )}
        {bootcamp.is_featured && (
          <div className="absolute top-1 left-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-white">
          {bootcamp.title || 'Untitled Bootcamp'}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-600">
          {courseCount > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {courseCount} courses
            </span>
          )}
          {totalLessons > 0 && (
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {totalLessons} lessons
            </span>
          )}
          {bootcamp.total_duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(bootcamp.total_duration)}
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      {bootcamp.price > 0 && (
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm font-semibold text-white">
            ৳{bootcamp.price.toLocaleString()}
          </p>
        </div>
      )}

      {/* Action */}
      <div className="shrink-0">
        <button
          onClick={() => onEnroll(bootcamp.id)}
          disabled={isEnrolling}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnrolling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Users className="h-3 w-3" />
          )}
          Enroll
        </button>
      </div>
    </div>
  );
}
