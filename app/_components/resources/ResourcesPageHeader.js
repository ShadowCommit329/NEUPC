import Link from 'next/link';
import {
  BookOpen,
  Layers,
  FolderOpen,
  Pin,
  Sparkles,
  ChevronRight,
  PlusCircle,
  BarChart3,
  Eye,
  Star,
  CheckCircle2,
  Filter,
  Search,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, iconBg, iconColor, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-white/[0.06] bg-[#121317] px-4 py-[14px] transition-colors hover:border-white/[0.09] hover:bg-[#181a1f]">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${iconBg}`}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[22px] leading-none font-semibold tracking-tight text-white tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-[11.5px] font-medium text-white/40">
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 truncate text-[10.5px] text-white/25">{sub}</p>
        )}
      </div>
    </div>
  );
}

/**
 * @param {'guest'|'member'|'admin'} props.role
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

  return (
    <div className="space-y-5">
      {/* Page head */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">
            {isAdmin ? 'Resource Management' : 'Resources'}
          </h1>
          <p className="mt-1 text-[13px] text-white/40">
            {isGuest
              ? 'Public guides and materials from the club'
              : isAdmin
                ? `Manage and distribute educational resources · ${total} total`
                : `Learning materials curated for members · ${pinnedCount} bookmarked`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && onCreateNew && (
            <button
              onClick={onCreateNew}
              className="font-500 flex items-center gap-2 rounded-[8px] border border-white/[0.09] bg-white/[0.06] px-[11px] py-[6px] text-[12.5px] text-white/80 transition-all hover:border-white/[0.14] hover:bg-white/[0.09] hover:text-white"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Resource
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {isGuest && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
          <StatCard
            icon={Layers}
            label="Public Resources"
            value={total}
            iconBg="bg-[#1a2535]"
            iconColor="text-[#60a5fa]"
          />
          <StatCard
            icon={FolderOpen}
            label="Categories"
            value={categoryCount}
            iconBg="bg-[#1e1a2e]"
            iconColor="text-[#a78bfa]"
          />
        </div>
      )}

      {isMember && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <StatCard
            icon={Layers}
            label="Total Resources"
            value={total}
            iconBg="bg-[#1a2535]"
            iconColor="text-[#60a5fa]"
          />
          <StatCard
            icon={Pin}
            label="Pinned"
            value={pinnedCount}
            iconBg="bg-[#231e14]"
            iconColor="text-[#fbbf24]"
          />
          <StatCard
            icon={FolderOpen}
            label="Categories"
            value={categoryCount}
            iconBg="bg-[#1e1a2e]"
            iconColor="text-[#a78bfa]"
          />
        </div>
      )}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard
            icon={BookOpen}
            label="Total"
            value={total}
            iconBg="bg-[#1a2535]"
            iconColor="text-[#60a5fa]"
          />
          <StatCard
            icon={CheckCircle2}
            label="Published"
            value={publishedCount ?? 0}
            iconBg="bg-[#14261e]"
            iconColor="text-[#4ade80]"
          />
          <StatCard
            icon={Star}
            label="Pinned"
            value={pinnedCount}
            sub={`${draftCount ?? 0} draft · ${scheduledCount ?? 0} scheduled`}
            iconBg="bg-[#231e14]"
            iconColor="text-[#fbbf24]"
          />
          <StatCard
            icon={Eye}
            label="Public"
            value={publicCount ?? 0}
            sub={`${membersCount ?? 0} members-only`}
            iconBg="bg-[#1e1a2e]"
            iconColor="text-[#a78bfa]"
          />
        </div>
      )}

      {/* Guest CTA */}
      {isGuest && (
        <div className="rounded-[10px] border border-[rgba(167,139,250,0.18)] bg-[rgba(124,83,255,0.06)] px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#a78bfa]" />
              <p className="text-[12.5px] leading-relaxed text-white/50">
                Join as a member to unlock the full resource library.
              </p>
            </div>
            <Link
              href="/register"
              className="shrink-0 rounded-[7px] border border-[rgba(167,139,250,0.28)] bg-[rgba(124,83,255,0.12)] px-3.5 py-1.5 text-[11.5px] font-semibold text-[#c4b5fd] transition-all hover:bg-[rgba(124,83,255,0.22)]"
            >
              Become a Member
            </Link>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
