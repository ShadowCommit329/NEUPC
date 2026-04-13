/**
 * @file Shared header component for all resources pages (guest/member/admin).
 * Provides a consistent, synced UI across all three role views with
 * role-aware stat cards, breadcrumb, CTA banner, and action buttons.
 *
 * @module ResourcesPageHeader
 */

import Link from 'next/link';
import {
  BookOpen,
  Layers,
  FolderOpen,
  Pin,
  Sparkles,
  Globe,
  Lock,
  ChevronRight,
  PlusCircle,
  BarChart3,
  Eye,
  Star,
  FileEdit,
  Clock,
  CheckCircle2,
  Archive,
} from 'lucide-react';

// ─── Stat card sub-component ─────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, iconBg, iconColor, sub }) {
  return (
    <div className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
      <div
        className={`absolute -top-8 -right-8 h-20 w-20 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-500 group-hover:opacity-15 ${iconBg}`}
      />
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-105`}
      >
        <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
      </div>
      <div className="relative min-w-0">
        <p className="text-xl leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] font-medium text-gray-500">
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 truncate text-[10px] text-gray-600">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main header component ───────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {'guest'|'member'|'admin'} props.role
 * @param {number} props.total - Total number of visible resources
 * @param {number} props.categoryCount - Number of categories
 * @param {number} [props.pinnedCount] - Number of pinned resources (member/admin)
 * @param {number} [props.publicCount] - Number of public resources (admin)
 * @param {number} [props.membersCount] - Number of members-only resources (admin)
 * @param {number} [props.draftCount] - Number of draft resources (admin)
 * @param {number} [props.scheduledCount] - Number of scheduled resources (admin)
 * @param {number} [props.publishedCount] - Number of published resources (admin)
 * @param {number} [props.archivedCount] - Number of archived resources (admin)
 * @param {Function} [props.onCreateNew] - Admin create-new handler
 * @param {React.ReactNode} [props.children] - Additional content below header
 */
export default function ResourcesPageHeader({
  role,
  total = 0,
  categoryCount = 0,
  pinnedCount = 0,
  publicCount,
  membersCount,
  draftCount,
  scheduledCount,
  publishedCount,
  archivedCount,
  onCreateNew,
  children,
}) {
  const isGuest = role === 'guest';
  const isMember = role === 'member';
  const isAdmin = role === 'admin';

  const dashboardHref = `/account/${role}`;
  const subtitle = isGuest
    ? 'Explore public guides, tutorials, and curated materials shared by the club'
    : isAdmin
      ? 'Manage and distribute educational resources across the platform'
      : 'Browse guides, tutorials, and curated materials shared by the club';

  return (
    <div className="space-y-5">
      {/* ── Hero section ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-white/[0.03] p-5 sm:p-7">
        {/* Decorative blurs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-blue-500/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-500/[0.05] blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500"
            >
              <Link
                href={dashboardHref}
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">Resources</span>
            </nav>

            {/* Title */}
            <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/12 ring-1 ring-blue-500/20">
                <BookOpen className="h-5 w-5 text-blue-400" />
              </div>
              <span>{isAdmin ? 'Resource Management' : 'Resources'}</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-500">
              {subtitle}
              {isAdmin && (
                <span className="ml-2 inline-flex items-center gap-1 text-gray-600">
                  <BarChart3 className="h-3 w-3" />
                  {total} resource{total !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          {/* Admin create button */}
          {isAdmin && onCreateNew && (
            <button
              onClick={onCreateNew}
              className="group flex shrink-0 items-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-900/35 sm:self-auto"
            >
              <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              New Resource
            </button>
          )}
        </div>
      </div>

      {/* ── Stats grid ────────────────────────────────────────── */}
      {isGuest && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Layers}
            label="Public Resources"
            value={total}
            iconBg="bg-cyan-500/10"
            iconColor="text-cyan-400"
          />
          <StatCard
            icon={FolderOpen}
            label="Categories"
            value={categoryCount}
            iconBg="bg-purple-500/10"
            iconColor="text-purple-400"
          />
        </div>
      )}

      {isMember && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            icon={Layers}
            label="Total Resources"
            value={total}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-400"
          />
          <StatCard
            icon={Pin}
            label="Pinned"
            value={pinnedCount}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-400"
          />
          <StatCard
            icon={FolderOpen}
            label="Categories"
            value={categoryCount}
            iconBg="bg-purple-500/10"
            iconColor="text-purple-400"
          />
        </div>
      )}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={BookOpen}
            label="Total Resources"
            value={total}
            iconBg="bg-blue-500/12"
            iconColor="text-blue-400"
          />
          <StatCard
            icon={CheckCircle2}
            label="Published"
            value={publishedCount ?? 0}
            iconBg="bg-emerald-500/12"
            iconColor="text-emerald-400"
          />
          <StatCard
            icon={Star}
            label="Pinned"
            value={pinnedCount}
            sub={`${draftCount ?? 0} draft · ${scheduledCount ?? 0} scheduled`}
            iconBg="bg-amber-500/12"
            iconColor="text-amber-400"
          />
          <StatCard
            icon={Eye}
            label="Public"
            value={publicCount ?? 0}
            sub={`${membersCount ?? 0} members-only`}
            iconBg="bg-purple-500/12"
            iconColor="text-purple-400"
          />
        </div>
      )}

      {/* ── Guest membership CTA ──────────────────────────────── */}
      {isGuest && (
        <div className="rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 sm:items-center">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-400 sm:mt-0" />
              <p className="text-sm leading-relaxed text-white/60">
                Join as a member to unlock the full resource library, including
                members-only guides and materials.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-300 transition-all hover:bg-violet-500/25 hover:shadow-lg hover:shadow-violet-900/20"
            >
              Become a Member
            </Link>
          </div>
        </div>
      )}

      {/* ── Additional content slot ───────────────────────────── */}
      {children}
    </div>
  );
}
