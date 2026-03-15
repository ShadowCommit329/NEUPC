/**
 * @file Analytics client — renders platform-wide analytics dashboards
 *   with charts, trend lines, and key performance indicators for the
 *   admin overview.
 * @module AdminAnalyticsClient
 */

'use client';

import {
  Users,
  GraduationCap,
  CalendarDays,
  BookOpen,
  MessageSquare,
  Trophy,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  Image,
  Library,
  Bell,
  Eye,
  Heart,
  TrendingUp,
  AlertCircle,
  BarChart2,
  Zap,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const ACTIVITY_ICONS = {
  user: Users,
  join_request: GraduationCap,
  blog: BookOpen,
  event: CalendarDays,
  contact_submission: MessageSquare,
  achievement: Trophy,
  notice: Bell,
  resource: Library,
  gallery: Image,
  default: Activity,
};

function activityIcon(entityType) {
  const key = Object.keys(ACTIVITY_ICONS).find((k) =>
    entityType?.toLowerCase().includes(k)
  );
  return ACTIVITY_ICONS[key] || ACTIVITY_ICONS.default;
}

const ACTIVITY_COLORS = {
  create: 'text-blue-400',
  update: 'text-yellow-400',
  delete: 'text-red-400',
  approve: 'text-green-400',
  reject: 'text-red-400',
  login: 'text-purple-400',
  default: 'text-gray-400',
};

function activityColor(action) {
  const key = Object.keys(ACTIVITY_COLORS).find((k) =>
    action?.toLowerCase().includes(k)
  );
  return ACTIVITY_COLORS[key] || ACTIVITY_COLORS.default;
}

// ─── Overview Card ────────────────────────────────────────────────────────────

function OverviewCard({ icon: Icon, label, value, sub, colorClass, trend }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/3 px-4 py-4 backdrop-blur-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wider text-gray-500 uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-2xl leading-none font-bold text-white tabular-nums">
          {fmt(value)}
        </p>
        {sub && (
          <p className="mt-1 truncate text-[11px] text-gray-600">{sub}</p>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
          <TrendingUp className="h-2.5 w-2.5" /> {trend}
        </div>
      )}
    </div>
  );
}

// ─── Section Card Shell ───────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-white/8 bg-white/3 p-5 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2">
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
            <Icon className="h-3.5 w-3.5 text-gray-400" />
          </div>
        )}
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Stacked Bar ─────────────────────────────────────────────────────────────

function StackedBar({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total)
    return (
      <div className="h-2.5 overflow-hidden rounded-full bg-white/6">
        <div className="h-full w-full bg-white/4" />
      </div>
    );
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full">
      {segments
        .filter((s) => s.value > 0)
        .map((seg, i) => (
          <div
            key={i}
            className={`h-full transition-all ${seg.color}`}
            style={{ width: `${pct(seg.value, total)}%` }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
    </div>
  );
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, total, barColor, dotColor }) {
  const p = pct(value, total);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${dotColor || 'bg-gray-500'}`}
          />
          <span className="text-gray-300">{label}</span>
        </div>
        <div className="flex items-center gap-2 tabular-nums">
          <span className="font-semibold text-white">{value}</span>
          <span className="w-7 text-right text-gray-600">{p}%</span>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
        <div
          className={`h-full rounded-full transition-all ${barColor || 'bg-gray-500'}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

// ─── No Data State ────────────────────────────────────────────────────────────

function NoData({ message = 'No data available' }) {
  return (
    <div className="flex items-center justify-center py-8 text-center">
      <div>
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-700" />
        <p className="text-xs text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsClient({ data }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-yellow-600" />
        <h2 className="text-lg font-semibold text-white">
          Analytics Unavailable
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Unable to load analytics data. Check your database connection.
        </p>
      </div>
    );
  }

  const {
    users,
    applications,
    events,
    blogs,
    contact,
    content,
    members,
    recentActivity,
    generatedAt,
  } = data;

  return (
    <>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">Analytics</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/25">
                <BarChart2 className="h-5 w-5 text-indigo-400" />
              </div>
              Analytics
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Club platform overview and statistics
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
            {generatedAt && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-[11px] text-gray-600">
                <RefreshCw className="h-3 w-3" />
                Updated {timeAgo(generatedAt)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Overview Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <OverviewCard
          icon={Users}
          label="Total Users"
          value={users.total}
          sub={`${users.active} active`}
          colorClass="bg-blue-500/15 text-blue-400"
        />
        <OverviewCard
          icon={GraduationCap}
          label="Applications"
          value={applications.total}
          sub={`${applications.pending} pending`}
          colorClass="bg-yellow-500/15 text-yellow-400"
        />
        <OverviewCard
          icon={CalendarDays}
          label="Events"
          value={events.total}
          sub={`${events.upcoming} upcoming`}
          colorClass="bg-purple-500/15 text-purple-400"
        />
        <OverviewCard
          icon={BookOpen}
          label="Blog Posts"
          value={blogs.total}
          sub={`${blogs.published} published`}
          colorClass="bg-green-500/15 text-green-400"
        />
        <OverviewCard
          icon={MessageSquare}
          label="Messages"
          value={contact.total}
          sub={`${contact.new} unread`}
          colorClass={
            contact.new > 0
              ? 'bg-red-500/15 text-red-400'
              : 'bg-gray-500/15 text-gray-400'
          }
        />
        <OverviewCard
          icon={Trophy}
          label="Achievements"
          value={content.achievements}
          sub="recorded"
          colorClass="bg-orange-500/15 text-orange-400"
        />
      </div>

      {/* ── Middle Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Users Breakdown */}
        <SectionCard title="User Accounts" icon={Users}>
          <StackedBar
            segments={[
              { value: users.active, color: 'bg-green-500', label: 'Active' },
              {
                value: users.pending,
                color: 'bg-yellow-500',
                label: 'Pending',
              },
              {
                value: users.suspended,
                color: 'bg-orange-500',
                label: 'Suspended',
              },
              { value: users.banned, color: 'bg-red-500', label: 'Banned' },
              {
                value: users.rejected,
                color: 'bg-gray-600',
                label: 'Rejected',
              },
            ]}
          />
          <div className="mt-4 space-y-3">
            <StatRow
              label="Active"
              value={users.active}
              total={users.total}
              barColor="bg-green-500"
              dotColor="bg-green-500"
            />
            <StatRow
              label="Pending"
              value={users.pending}
              total={users.total}
              barColor="bg-yellow-500"
              dotColor="bg-yellow-500"
            />
            <StatRow
              label="Suspended"
              value={users.suspended}
              total={users.total}
              barColor="bg-orange-500"
              dotColor="bg-orange-500"
            />
            <StatRow
              label="Banned"
              value={users.banned}
              total={users.total}
              barColor="bg-red-500"
              dotColor="bg-red-500"
            />
            <StatRow
              label="Rejected"
              value={users.rejected}
              total={users.total}
              barColor="bg-gray-500"
              dotColor="bg-gray-600"
            />
          </div>
        </SectionCard>

        {/* Applications Breakdown */}
        <SectionCard title="Membership Applications" icon={GraduationCap}>
          {applications.total === 0 ? (
            <NoData message="No applications yet" />
          ) : (
            <>
              <StackedBar
                segments={[
                  {
                    value: applications.approved,
                    color: 'bg-green-500',
                    label: 'Approved',
                  },
                  {
                    value: applications.pending,
                    color: 'bg-yellow-500',
                    label: 'Pending',
                  },
                  {
                    value: applications.rejected,
                    color: 'bg-red-500',
                    label: 'Rejected',
                  },
                ]}
              />
              <div className="mt-4 space-y-3">
                <StatRow
                  label="Approved"
                  value={applications.approved}
                  total={applications.total}
                  barColor="bg-green-500"
                  dotColor="bg-green-500"
                />
                <StatRow
                  label="Pending"
                  value={applications.pending}
                  total={applications.total}
                  barColor="bg-yellow-500"
                  dotColor="bg-yellow-500"
                />
                <StatRow
                  label="Rejected"
                  value={applications.rejected}
                  total={applications.total}
                  barColor="bg-red-500"
                  dotColor="bg-red-500"
                />
              </div>
              {applications.pending > 0 && (
                <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-yellow-500/20 bg-yellow-500/8 px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs font-medium text-yellow-300">
                    {applications.pending} awaiting review
                  </span>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* Events Breakdown */}
        <SectionCard title="Events" icon={CalendarDays}>
          {events.total === 0 ? (
            <NoData message="No events yet" />
          ) : (
            <>
              <StackedBar
                segments={[
                  {
                    value: events.upcoming,
                    color: 'bg-blue-500',
                    label: 'Upcoming',
                  },
                  {
                    value: events.ongoing,
                    color: 'bg-green-500',
                    label: 'Ongoing',
                  },
                  {
                    value: events.completed,
                    color: 'bg-gray-500',
                    label: 'Completed',
                  },
                  {
                    value: events.cancelled,
                    color: 'bg-red-500',
                    label: 'Cancelled',
                  },
                ]}
              />
              <div className="mt-4 space-y-3">
                <StatRow
                  label="Upcoming"
                  value={events.upcoming}
                  total={events.total}
                  barColor="bg-blue-500"
                  dotColor="bg-blue-500"
                />
                <StatRow
                  label="Ongoing"
                  value={events.ongoing}
                  total={events.total}
                  barColor="bg-green-500"
                  dotColor="bg-green-500"
                />
                <StatRow
                  label="Completed"
                  value={events.completed}
                  total={events.total}
                  barColor="bg-gray-500"
                  dotColor="bg-gray-500"
                />
                <StatRow
                  label="Cancelled"
                  value={events.cancelled}
                  total={events.total}
                  barColor="bg-red-500"
                  dotColor="bg-red-500"
                />
              </div>
              {events.byCategory?.length > 0 && (
                <div className="mt-4 border-t border-white/6 pt-3">
                  <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                    By Category
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {events.byCategory.slice(0, 6).map(({ name, count }) => (
                      <span
                        key={name}
                        className="flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[11px] text-gray-300"
                      >
                        {name}
                        <span className="font-semibold text-white">
                          {count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* Blogs Engagement */}
        <SectionCard title="Blog Engagement" icon={BookOpen}>
          {blogs.total === 0 ? (
            <NoData message="No blog posts yet" />
          ) : (
            <>
              <StackedBar
                segments={[
                  {
                    value: blogs.published,
                    color: 'bg-green-500',
                    label: 'Published',
                  },
                  {
                    value: blogs.draft,
                    color: 'bg-yellow-500',
                    label: 'Draft',
                  },
                  {
                    value: blogs.total - blogs.published - blogs.draft,
                    color: 'bg-gray-600',
                    label: 'Archived',
                  },
                ]}
              />
              <div className="mt-4 space-y-3">
                <StatRow
                  label="Published"
                  value={blogs.published}
                  total={blogs.total}
                  barColor="bg-green-500"
                  dotColor="bg-green-500"
                />
                <StatRow
                  label="Draft"
                  value={blogs.draft}
                  total={blogs.total}
                  barColor="bg-yellow-500"
                  dotColor="bg-yellow-500"
                />
                <StatRow
                  label="Archived"
                  value={blogs.total - blogs.published - blogs.draft}
                  total={blogs.total}
                  barColor="bg-gray-600"
                  dotColor="bg-gray-600"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/6 pt-3">
                <div className="flex items-center gap-2 rounded-xl bg-white/4 px-3 py-2.5">
                  <Eye className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-[10px] text-gray-600">Total Views</p>
                    <p className="text-sm font-bold text-white tabular-nums">
                      {fmt(blogs.totalViews)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/4 px-3 py-2.5">
                  <Heart className="h-4 w-4 text-red-400" />
                  <div>
                    <p className="text-[10px] text-gray-600">Total Likes</p>
                    <p className="text-sm font-bold text-white tabular-nums">
                      {fmt(blogs.totalLikes)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* ── Bottom Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Content Overview */}
        <SectionCard title="Content Overview" icon={BarChart2}>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                icon: Bell,
                label: 'Notices',
                value: content.notices,
                color: 'bg-blue-500/15 text-blue-400',
              },
              {
                icon: Image,
                label: 'Gallery',
                value: content.gallery,
                color: 'bg-pink-500/15 text-pink-400',
              },
              {
                icon: Library,
                label: 'Resources',
                value: content.resources,
                color: 'bg-green-500/15 text-green-400',
              },
              {
                icon: Trophy,
                label: 'Achievements',
                value: content.achievements,
                color: 'bg-orange-500/15 text-orange-400',
              },
            ].map(({ icon: Icon2, label, value, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-3"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}
                >
                  <Icon2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {value}
                  </p>
                  <p className="text-[10px] text-gray-600">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact messages */}
          <div className="mt-3 space-y-2 border-t border-white/6 pt-3">
            <p className="text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
              Contact Messages
            </p>
            <StackedBar
              segments={[
                { value: contact.new, color: 'bg-red-500', label: 'New' },
                {
                  value: contact.replied,
                  color: 'bg-green-500',
                  label: 'Replied',
                },
                {
                  value: contact.total - contact.new - contact.replied,
                  color: 'bg-gray-600',
                  label: 'Other',
                },
              ]}
            />
            <div className="flex gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                New:{' '}
                <span className="font-semibold text-white">{contact.new}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Replied:{' '}
                <span className="font-semibold text-white">
                  {contact.replied}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-600" />
                Total:{' '}
                <span className="font-semibold text-white">
                  {contact.total}
                </span>
              </span>
            </div>
          </div>

          {/* Members */}
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Member Profiles</p>
              <p className="text-sm font-bold text-white">
                {members.approved} approved
                <span className="ml-1.5 text-[11px] font-normal text-gray-600">
                  / {members.total} total
                </span>
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Recent Activity — spans 2 cols */}
        <SectionCard
          title="Recent Activity"
          icon={Zap}
          className="lg:col-span-2"
        >
          {recentActivity.length === 0 ? (
            <NoData message="No recent activity" />
          ) : (
            <div className="scrollbar-none max-h-96 space-y-1 overflow-y-auto pr-1">
              {recentActivity.map((log) => {
                const Icon = activityIcon(log.entity_type);
                const color = activityColor(log.action);
                const label =
                  log.details?.summary ||
                  `${log.action}${log.entity_type ? ` ${log.entity_type.replace(/_/g, ' ')}` : ''}`;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/2 px-3 py-2.5 transition-colors hover:bg-white/4"
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 ${color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-300 capitalize">
                        {label}
                      </p>
                      {log.details?.name && (
                        <p className="truncate text-[11px] text-gray-600">
                          {log.details.name}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-700 tabular-nums">
                      {timeAgo(log.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
