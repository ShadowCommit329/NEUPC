/**
 * @file Guest participation client — detailed view of the guest’s
 *   event attendance history and participation records.
 * @module GuestParticipationClient
 */

'use client';

import { useState } from 'react';
import {
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  ExternalLink,
  Sparkles,
  Trophy,
  Shield,
  Star,
  Lock,
  ChevronRight,
  Hash,
  Tag,
  Users,
  TrendingUp,
  ListChecks,
  BarChart3,
} from 'lucide-react';
import { driveImageUrl } from '@/app/_lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REG_STATUS_META = {
  registered: {
    label: 'Registered',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    icon: CheckCircle2,
  },
  attended: {
    label: 'Attended',
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
    icon: XCircle,
  },
};

const CAT_COLOR = {
  Workshop: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Contest: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  Seminar: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Bootcamp: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Hackathon: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  Meetup: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  Other: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const CERT_TYPE_META = {
  participation: {
    label: 'Participation',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    icon: Award,
  },
  completion: {
    label: 'Completion',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    icon: CheckCircle2,
  },
  achievement: {
    label: 'Achievement',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    icon: Trophy,
  },
  appreciation: {
    label: 'Appreciation',
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    icon: Star,
  },
};

// ─── Registration Card ────────────────────────────────────────────────────────
function RegistrationCard({ reg }) {
  const sm = REG_STATUS_META[reg.status] ?? REG_STATUS_META.registered;
  const StatusIcon = sm.icon;
  const catColor = CAT_COLOR[reg.events?.category] ?? CAT_COLOR.Other;
  const eventStatus = reg.events?.status;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-all duration-200 hover:border-white/14 hover:bg-white/5">
      {/* cover */}
      <div className="relative h-36 overflow-hidden bg-white/4">
        {reg.events?.cover_image ? (
          <img
            src={driveImageUrl(reg.events.cover_image)}
            alt={reg.events.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/placeholder-event.svg';
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-linear-to-br from-white/4 to-white/2">
            <Calendar className="size-9 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

        {/* overlaid badges */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {reg.events?.category && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${catColor}`}
            >
              {reg.events.category}
            </span>
          )}
          <span
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${sm.color}`}
          >
            <StatusIcon className="size-3" />
            {sm.label}
          </span>
        </div>

        {reg.certificate_issued && (
          <div className="absolute right-2 bottom-2">
            <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/50 px-2 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm">
              <Award className="size-2.5" />
              Certificate
            </span>
          </div>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 line-clamp-2 text-sm leading-snug font-semibold text-white/90">
          {reg.events?.title ?? 'Untitled Event'}
        </h3>

        <div className="mt-auto space-y-1.5 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Calendar className="size-3.5 shrink-0" />
            <span>
              {reg.events?.start_date ? formatDate(reg.events.start_date) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Clock className="size-3.5 shrink-0" />
            <span>Registered {timeAgo(reg.registered_at)}</span>
          </div>
          {reg.team_name && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Users className="size-3.5 shrink-0" />
              <span className="truncate">{reg.team_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-white/6 px-4 py-3">
        {reg.events?.slug ? (
          <a
            href={`/events/${reg.events.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-white/40 transition hover:text-white/70"
          >
            View event
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span />
        )}
        {reg.attended && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle2 className="size-3" />
            Attended
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertificateCard({ cert }) {
  const meta =
    CERT_TYPE_META[cert.certificate_type] ?? CERT_TYPE_META.participation;
  const TypeIcon = meta.icon;
  const linkedName = cert.events?.title ?? cert.contests?.title ?? null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/3 p-5 transition-all duration-200 hover:border-white/14 hover:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5">
          <TypeIcon className="size-4.5 text-white/60" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color}`}
          >
            {meta.label}
          </span>
          {cert.verified && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400">
              <Shield className="size-3" />
              Verified
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm leading-snug font-semibold text-white/90">
          {cert.title}
        </h3>
        {linkedName && (
          <p className="mt-0.5 truncate text-xs text-white/40">{linkedName}</p>
        )}
      </div>

      <div className="flex items-end justify-between border-t border-white/6 pt-3">
        <div>
          <p className="text-[10px] tracking-wider text-white/25 uppercase">
            Cert #
          </p>
          <p className="max-w-28 truncate font-mono text-xs text-white/45">
            {cert.certificate_number}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-wider text-white/25 uppercase">
            Issued
          </p>
          <p className="text-xs text-white/45">{formatDate(cert.issue_date)}</p>
        </div>
      </div>

      {cert.certificate_url && (
        <a
          href={cert.certificate_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/4 py-2 text-xs font-medium text-white/60 transition hover:bg-white/8 hover:text-white/80"
        >
          <Download className="size-3.5" />
          Download Certificate
        </a>
      )}
    </div>
  );
}

// ─── Timeline Item ────────────────────────────────────────────────────────────
function TimelineItem({ icon: Icon, iconColor, title, sub, date, isLast }) {
  return (
    <div className="relative flex gap-4">
      {/* line */}
      {!isLast && (
        <div className="absolute top-8 bottom-0 left-4 w-px bg-white/6" />
      )}
      <div
        className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/8 bg-[#0d0d0f] ${iconColor}`}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <p className="text-sm leading-snug font-medium text-white/80">
          {title}
        </p>
        {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
        <p className="mt-1 text-[11px] text-white/25">{date}</p>
      </div>
    </div>
  );
}

// ─── Locked Feature Row ───────────────────────────────────────────────────────
function LockedFeature({ label }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-4 py-3">
      <Lock className="size-4 shrink-0 text-white/20" />
      <span className="text-sm text-white/35">{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuestParticipationClient({
  registrations,
  certificates,
  userName,
}) {
  const [activeTab, setActiveTab] = useState('events');

  // derived stats
  const attended = registrations.filter(
    (r) => r.attended || r.status === 'attended'
  ).length;
  const confirmed = registrations.filter(
    (r) => r.status === 'confirmed'
  ).length;
  const cancelled = registrations.filter(
    (r) => r.status === 'cancelled'
  ).length;
  const certCount = certificates.length;

  // timeline items — merge registrations + certificates sorted by date
  const timelineItems = [
    ...registrations.map((r) => ({
      date: r.registered_at,
      type: r.status === 'attended' ? 'attended' : 'registered',
      title:
        r.status === 'attended'
          ? `Attended: ${r.events?.title ?? 'Event'}`
          : `Registered for: ${r.events?.title ?? 'Event'}`,
      sub: r.events?.category ?? null,
    })),
    ...certificates.map((c) => ({
      date: c.created_at,
      type: 'certificate',
      title: `Certificate earned: ${c.title}`,
      sub: c.events?.title ?? c.contests?.title ?? null,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const isEmpty = registrations.length === 0 && certificates.length === 0;

  const TABS = [
    { key: 'events', label: 'Events', count: registrations.length },
    { key: 'certificates', label: 'Certificates', count: certCount },
    { key: 'timeline', label: 'Timeline', count: timelineItems.length },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            My Participation
          </h1>
          <p className="text-sm text-white/40">
            Track your event registrations and activity history
          </p>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Registered',
            value: registrations.length,
            icon: Calendar,
            color: 'text-blue-400',
          },
          {
            label: 'Attended',
            value: attended,
            icon: CheckCircle2,
            color: 'text-emerald-400',
          },
          {
            label: 'Confirmed',
            value: confirmed,
            icon: ListChecks,
            color: 'text-cyan-400',
          },
          {
            label: 'Certificates',
            value: certCount,
            icon: Award,
            color: 'text-amber-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5">
              <Icon className={`size-4 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {isEmpty ? (
        /* ── Full empty state ── */
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/8 bg-white/3 px-6 py-16">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
            <Calendar className="size-7 text-white/20" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-white/60">
              No participation yet
            </p>
            <p className="mt-1 text-sm text-white/30">
              Register for events to start tracking your journey.
            </p>
          </div>
          <a
            href="/account/guest/events"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-5 py-2.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white/80"
          >
            Browse Events
            <ChevronRight className="size-4" />
          </a>
        </div>
      ) : (
        <>
          {/* ── Tabs ── */}
          <div className="flex w-fit gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    activeTab === tab.key
                      ? 'bg-white/15 text-white/80'
                      : 'bg-white/6 text-white/30'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── Events Tab ── */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {/* status filter row */}
              {registrations.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    {
                      status: 'attended',
                      count: attended,
                      color: 'text-violet-400',
                    },
                    {
                      status: 'confirmed',
                      count: confirmed,
                      color: 'text-emerald-400',
                    },
                    {
                      status: 'registered',
                      count: registrations.filter(
                        (r) => r.status === 'registered'
                      ).length,
                      color: 'text-blue-400',
                    },
                    {
                      status: 'cancelled',
                      count: cancelled,
                      color: 'text-red-400',
                    },
                  ]
                    .filter((s) => s.count > 0)
                    .map(({ status, count, color }) => (
                      <span
                        key={status}
                        className={`rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5 capitalize ${color}`}
                      >
                        {count} {status}
                      </span>
                    ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {registrations.map((reg) => (
                  <RegistrationCard key={reg.id} reg={reg} />
                ))}
              </div>
            </div>
          )}

          {/* ── Certificates Tab ── */}
          {activeTab === 'certificates' && (
            <>
              {certificates.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/3 py-14">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                    <Award className="size-5 text-white/20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/50">
                      No certificates yet
                    </p>
                    <p className="mt-0.5 text-xs text-white/30">
                      Attend events to earn your first certificate.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {certificates.map((cert) => (
                    <CertificateCard key={cert.id} cert={cert} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Timeline Tab ── */}
          {activeTab === 'timeline' && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
              {timelineItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/30">
                  No activity yet.
                </p>
              ) : (
                <div className="space-y-0">
                  {timelineItems.map((item, idx) => {
                    const isLast = idx === timelineItems.length - 1;
                    const icon =
                      item.type === 'attended'
                        ? CheckCircle2
                        : item.type === 'certificate'
                          ? Award
                          : Calendar;
                    const iconColor =
                      item.type === 'attended'
                        ? 'text-violet-400'
                        : item.type === 'certificate'
                          ? 'text-amber-400'
                          : 'text-blue-400';
                    return (
                      <TimelineItem
                        key={idx}
                        icon={icon}
                        iconColor={iconColor}
                        title={item.title}
                        sub={item.sub}
                        date={formatDateTime(item.date)}
                        isLast={isLast}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Locked member features ── */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/2">
        <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10">
            <Lock className="size-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/70">
              Unlock Full Participation Insights
            </h3>
            <p className="text-xs text-white/35">Available for club members</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          <LockedFeature label="Contest participation & rankings" />
          <LockedFeature label="Performance analytics & trends" />
          <LockedFeature label="Achievement badges & levels" />
          <LockedFeature label="Participation reports & exports" />
          <LockedFeature label="Leaderboard standings" />
          <LockedFeature label="Exclusive workshop access" />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-white/6 px-5 py-4">
          <p className="text-xs text-white/35">
            Members unlock complete participation tracking, ratings, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
