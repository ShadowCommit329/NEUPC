'use client';

import { useState, useMemo } from 'react';
import {
  CalendarDays,
  Trophy,
  Award,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Medal,
  BarChart3,
  Download,
  Eye,
  ChevronRight,
  Users,
  Check,
  MapPin,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtMonthDay(str) {
  if (!str) return { mo: '—', d: '—' };
  const d = new Date(str);
  return {
    mo: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    d: d.getDate().toString().padStart(2, '0'),
  };
}

function timeAgo(str) {
  if (!str) return '';
  const diff = Math.floor((Date.now() - new Date(str)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(str);
}

// ─── Design tokens (matching the HTML system) ─────────────────────────────────

const REG_STATUS = {
  attended: {
    label: 'Attended',
    pill: 'bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.2)] text-[#86efac]',
    icon: CheckCircle2,
  },
  confirmed: {
    label: 'Confirmed',
    pill: 'bg-[rgba(96,165,250,0.12)] border-[rgba(96,165,250,0.2)] text-[#93c5fd]',
    icon: CheckCircle2,
  },
  registered: {
    label: 'Registered',
    pill: 'bg-[rgba(124,131,255,0.12)] border-[rgba(124,131,255,0.20)] text-[#aab0ff]',
    icon: Clock,
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-[rgba(248,113,113,0.12)] border-[rgba(248,113,113,0.2)] text-[#fca5a5]',
    icon: XCircle,
  },
};

const CERT_TYPE = {
  participation: {
    label: 'Participation',
    pill: 'bg-[rgba(96,165,250,0.12)] border-[rgba(96,165,250,0.2)] text-[#93c5fd]',
    bannerGlow: 'rgba(96,165,250,0.18)',
    sealGradient: 'linear-gradient(135deg,#60a5fa,#2563eb)',
  },
  completion: {
    label: 'Completion',
    pill: 'bg-[rgba(124,131,255,0.12)] border-[rgba(124,131,255,0.20)] text-[#aab0ff]',
    bannerGlow: 'rgba(124,131,255,0.18)',
    sealGradient: 'linear-gradient(135deg,#7c83ff,#5b62cc)',
  },
  achievement: {
    label: 'Achievement',
    pill: 'bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.2)] text-[#fcd34d]',
    bannerGlow: 'rgba(251,191,36,0.18)',
    sealGradient: 'linear-gradient(135deg,#fbbf24,#d97706)',
  },
  appreciation: {
    label: 'Appreciation',
    pill: 'bg-[rgba(167,139,250,0.12)] border-[rgba(167,139,250,0.2)] text-[#c4b5fd]',
    bannerGlow: 'rgba(167,139,250,0.18)',
    sealGradient: 'linear-gradient(135deg,#a78bfa,#7c3aed)',
  },
};

const EVT_CAT = {
  Workshop: 'bg-[rgba(96,165,250,0.12)] border-[rgba(96,165,250,0.2)] text-[#93c5fd]',
  Contest: 'bg-[rgba(124,131,255,0.12)] border-[rgba(124,131,255,0.20)] text-[#aab0ff]',
  Seminar: 'bg-[rgba(34,211,238,0.12)] border-[rgba(34,211,238,0.2)] text-[#67e8f9]',
  Bootcamp: 'bg-[rgba(251,146,60,0.12)] border-[rgba(251,146,60,0.2)] text-[#fdba74]',
  Hackathon: 'bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.2)] text-[#fcd34d]',
  Meetup: 'bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.2)] text-[#86efac]',
  Other: 'bg-white/[0.06] border-white/[0.09] text-white/40',
};

const TIMELINE_ICON = {
  event: { bg: 'bg-[rgba(124,131,255,0.12)] border-[rgba(124,131,255,0.20)] text-[#aab0ff]', icon: CalendarDays },
  contest: { bg: 'bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.2)] text-[#fcd34d]', icon: Trophy },
  discussion: { bg: 'bg-[rgba(34,211,238,0.12)] border-[rgba(34,211,238,0.2)] text-[#67e8f9]', icon: MessageSquare },
};

function regStatus(s) { return REG_STATUS[s] ?? REG_STATUS.registered; }
function certTypeMeta(t) { return CERT_TYPE[t] ?? CERT_TYPE.participation; }
function evtCat(c) { return EVT_CAT[c] ?? EVT_CAT.Other; }

// ─── Primitives ───────────────────────────────────────────────────────────────

function Pill({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-[7px] py-0.5 text-[11px] font-medium leading-[1.4] whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-[12px] border"
        style={{ background: '#181a1f', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Icon size={22} className="text-white/20" strokeWidth={1.6} />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-[13px] font-medium text-white/50">{title}</p>
        {subtitle && <p className="text-[12px] text-white/30">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div
      className="rounded-[12px] border p-[14px_16px]"
      style={{ background: '#121317', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="mb-1.5 text-[11.5px] font-medium text-white/40">{label}</div>
      <div className="flex items-end justify-between">
        <div
          className="font-[var(--font-display)] text-[26px] font-semibold leading-none tracking-[-0.025em] text-white/90 tabular-nums"
        >
          {value}
        </div>
      </div>
      {sub && <div className="mt-1.5 text-[11.5px] text-white/30">{sub}</div>}
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ registrations, contestParticipations, myThreads }) {
  const items = useMemo(() => {
    const list = [
      ...registrations.map((r) => ({
        id: `e-${r.id}`,
        type: 'event',
        kind: 'Registered',
        title: r.events?.title ?? 'Event',
        date: r.registered_at,
      })),
      ...contestParticipations.map((c) => ({
        id: `c-${c.id}`,
        type: 'contest',
        kind: c.rank != null ? `Rank #${c.rank}` : 'Participated',
        title: c.contests?.title ?? 'Contest',
        date: c.registered_at,
      })),
      ...myThreads.map((t) => ({
        id: `d-${t.id}`,
        type: 'discussion',
        kind: 'Thread authored',
        title: t.title,
        date: t.created_at,
      })),
    ];
    return list.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
  }, [registrations, contestParticipations, myThreads]);

  if (!items.length)
    return (
      <EmptyState
        icon={TrendingUp}
        title="No activity yet"
        subtitle="Join events and contests to see your timeline."
      />
    );

  return (
    <div className="timeline">
      {items.map((item) => {
        const cfg = TIMELINE_ICON[item.type] ?? TIMELINE_ICON.event;
        const Icon = cfg.icon;
        return (
          <div
            key={item.id}
            className="grid gap-[14px] border-b py-3"
            style={{
              gridTemplateColumns: '28px 1fr',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            {/* Icon */}
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border ${cfg.bg}`}
            >
              <Icon size={12} strokeWidth={1.6} />
            </div>
            {/* Body */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-white/35"
                >
                  {item.kind}
                </span>
                <span className="shrink-0 text-[11.5px] tabular-nums text-white/30">
                  {fmtDate(item.date)}
                </span>
              </div>
              <div className="text-[13px] font-medium leading-snug text-white/80">
                {item.title}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({ registrations }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return registrations;
    return registrations.filter((r) => r.status === filter);
  }, [registrations, filter]);

  if (!registrations.length)
    return (
      <EmptyState
        icon={CalendarDays}
        title="No event registrations"
        subtitle="Register for upcoming events to track your participation."
      />
    );

  const filterOpts = ['all', 'attended', 'confirmed', 'registered', 'cancelled'];

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterOpts.map((s) => {
          const count = s === 'all' ? registrations.length : registrations.filter((r) => r.status === s).length;
          if (s !== 'all' && count === 0) return null;
          const conf = s !== 'all' ? regStatus(s) : null;
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors duration-150 ${
                active
                  ? 'bg-[rgba(124,131,255,0.20)] border-[rgba(124,131,255,0.30)] text-[#aab0ff]'
                  : 'bg-[#181a1f] border-[rgba(255,255,255,0.06)] text-white/40 hover:text-white/70 hover:bg-[#1f2127]'
              }`}
            >
              {s === 'all' ? 'All' : conf.label} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex flex-col">
        {filtered.map((reg) => {
          const sConf = regStatus(reg.status);
          const SIcon = sConf.icon;
          const { mo, d } = fmtMonthDay(reg.events?.start_date);
          return (
            <div
              key={reg.id}
              className="grid items-center gap-[14px] border-b py-3 last:border-b-0"
              style={{ gridTemplateColumns: '56px 1fr auto', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              {/* Date block */}
              <div
                className="flex flex-col items-center rounded-[8px] border py-1.5 text-center"
                style={{ background: '#181a1f', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#aab0ff]">
                  {mo}
                </span>
                <span className="text-[18px] font-semibold leading-none tabular-nums text-white/90">
                  {d}
                </span>
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  {reg.events?.category && (
                    <Pill className={evtCat(reg.events.category)}>
                      {reg.events.category}
                    </Pill>
                  )}
                  {reg.attended && (
                    <Pill className="bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.2)] text-[#86efac]">
                      <Check size={9} strokeWidth={2.5} /> Attended
                    </Pill>
                  )}
                </div>
                <div className="text-[13.5px] font-medium leading-snug text-white/90">
                  {reg.events?.title ?? 'Unknown Event'}
                </div>
                <div className="flex flex-wrap gap-3 text-[11.5px] text-white/35">
                  {reg.events?.start_date && (
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} strokeWidth={1.6} />
                      {fmtDate(reg.events.start_date)}
                    </span>
                  )}
                  {reg.registered_at && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} strokeWidth={1.6} />
                      Registered {timeAgo(reg.registered_at)}
                    </span>
                  )}
                  {reg.team_name && (
                    <span className="flex items-center gap-1">
                      <Users size={11} strokeWidth={1.6} />
                      {reg.team_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Status + link */}
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Pill className={sConf.pill}>
                  <SIcon size={9} strokeWidth={1.6} /> {sConf.label}
                </Pill>
                {reg.events?.slug && (
                  <a
                    href={`/events/${reg.events.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/25 transition-colors hover:text-white/60"
                  >
                    <ExternalLink size={13} strokeWidth={1.6} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Contests Tab ─────────────────────────────────────────────────────────────

function ContestsTab({ contestParticipations }) {
  if (!contestParticipations.length)
    return (
      <EmptyState
        icon={Trophy}
        title="No contest participations"
        subtitle="Participate in contests to track your performance."
      />
    );

  return (
    <div className="flex flex-col">
      {contestParticipations.map((cp) => {
        const hasPerfData = cp.rank != null || cp.score != null || cp.problems_solved != null;
        const statusPill =
          cp.contests?.status === 'finished'
            ? 'bg-[#181a1f] border-[rgba(255,255,255,0.06)] text-white/35'
            : cp.contests?.status === 'running'
              ? 'bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.2)] text-[#86efac]'
              : 'bg-[rgba(96,165,250,0.12)] border-[rgba(96,165,250,0.2)] text-[#93c5fd]';

        return (
          <div
            key={cp.id}
            className="grid items-start gap-[14px] border-b py-3 last:border-b-0"
            style={{ gridTemplateColumns: '28px 1fr', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {/* Icon */}
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.2)] text-[#fcd34d]">
              <Trophy size={12} strokeWidth={1.6} />
            </div>

            {/* Body */}
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-[13.5px] font-medium leading-snug text-white/90">
                  {cp.contests?.title ?? 'Unknown Contest'}
                </span>
                {cp.contests?.status && (
                  <Pill className={statusPill}>{cp.contests.status}</Pill>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-[11.5px] text-white/35">
                {cp.contests?.platform && (
                  <span className="font-medium text-white/50">{cp.contests.platform}</span>
                )}
                {cp.contests?.start_time && (
                  <span className="flex items-center gap-1">
                    <CalendarDays size={11} strokeWidth={1.6} />
                    {fmtDate(cp.contests.start_time)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock size={11} strokeWidth={1.6} />
                  Joined {timeAgo(cp.registered_at)}
                </span>
              </div>

              {hasPerfData && (
                <div className="mt-0.5 flex flex-wrap gap-2">
                  {cp.rank != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-[6px] border bg-[rgba(251,191,36,0.10)] border-[rgba(251,191,36,0.2)] px-2.5 py-1 text-[11.5px] font-semibold text-[#fcd34d]">
                      <Medal size={11} strokeWidth={1.6} /> Rank #{cp.rank}
                    </span>
                  )}
                  {cp.score != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-[6px] border bg-[rgba(96,165,250,0.10)] border-[rgba(96,165,250,0.2)] px-2.5 py-1 text-[11.5px] text-[#93c5fd]">
                      <BarChart3 size={11} strokeWidth={1.6} /> Score {cp.score}
                    </span>
                  )}
                  {cp.problems_solved != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-[6px] border bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.2)] px-2.5 py-1 text-[11.5px] text-[#86efac]">
                      <CheckCircle2 size={11} strokeWidth={1.6} /> {cp.problems_solved} solved
                    </span>
                  )}
                </div>
              )}
            </div>

            {cp.contests?.slug && (
              <a
                href={`/events/${cp.contests.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="col-start-2 w-fit text-white/25 transition-colors hover:text-white/60"
              >
                <ExternalLink size={13} strokeWidth={1.6} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Certificates Tab ─────────────────────────────────────────────────────────

function CertificatesTab({ certificates }) {
  if (!certificates.length)
    return (
      <EmptyState
        icon={Award}
        title="No certificates yet"
        subtitle="Attend events and contests to earn certificates."
      />
    );

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {certificates.map((cert) => {
        const meta = certTypeMeta(cert.certificate_type);
        const linkedTo = cert.events?.title ?? cert.contests?.title ?? null;
        return (
          <div
            key={cert.id}
            className="overflow-hidden rounded-[12px] border"
            style={{ background: '#121317', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {/* Banner */}
            <div
              className="flex items-center justify-between gap-4 border-b px-[22px] py-[22px]"
              style={{
                background: `radial-gradient(circle at 80% 30%, ${meta.bannerGlow}, transparent 60%), #181a1f`,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
                style={{
                  background: meta.sealGradient,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.10) inset, 0 4px 12px rgba(0,0,0,0.30)',
                }}
              >
                <Award size={28} strokeWidth={1.6} />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[12px] font-medium text-white/70">NEUPC</span>
                {cert.verified && (
                  <Pill className="bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.2)] text-[#86efac]">
                    <Check size={9} strokeWidth={2.5} /> Verified
                  </Pill>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-3 px-[18px] py-4">
              <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white/90">
                {cert.title}
              </h3>
              {linkedTo && (
                <p className="truncate text-[12px] text-white/40">{linkedTo}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Pill className={meta.pill}>{meta.label}</Pill>
              </div>
              <div className="space-y-1 text-[12px] text-white/35">
                <div className="font-mono select-all">{cert.certificate_number}</div>
                <div>Issued {fmtDate(cert.issue_date)}</div>
              </div>
              {cert.certificate_url && (
                <div className="flex gap-2 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <a
                    href={cert.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150"
                    style={{
                      background: '#181a1f',
                      borderColor: 'rgba(255,255,255,0.09)',
                      color: 'rgba(255,255,255,0.75)',
                    }}
                  >
                    <Download size={13} strokeWidth={1.6} /> Download PDF
                  </a>
                  <a
                    href={cert.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12.5px] font-medium text-white/40 transition-colors duration-150 hover:text-white/70"
                  >
                    <ExternalLink size={13} strokeWidth={1.6} /> Verify
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Discussions Tab ──────────────────────────────────────────────────────────

function DiscussionsTab({ myThreads }) {
  if (!myThreads.length)
    return (
      <EmptyState
        icon={MessageSquare}
        title="No discussion threads"
        subtitle="Start a thread in Discussions to see it here."
      />
    );

  return (
    <div className="flex flex-col">
      {myThreads.map((thread) => (
        <div
          key={thread.id}
          className="grid items-center gap-[14px] border-b py-3 last:border-b-0"
          style={{ gridTemplateColumns: '32px 1fr auto', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(34,211,238,0.12)] text-[11px] font-semibold text-[#67e8f9]">
            <MessageSquare size={13} strokeWidth={1.6} />
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {thread.is_solved && (
                <Pill className="bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.2)] text-[#86efac]">
                  <CheckCircle2 size={9} strokeWidth={1.6} /> Solved
                </Pill>
              )}
              {thread.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded border bg-[#181a1f] border-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[10.5px] text-white/30"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <div className="text-[13.5px] font-medium leading-snug text-white/90">
              {thread.title}
            </div>
            <div className="flex flex-wrap gap-3 text-[11.5px] text-white/35">
              <span className="flex items-center gap-1">
                <Eye size={11} strokeWidth={1.6} /> {thread.views ?? 0} views
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} strokeWidth={1.6} /> {timeAgo(thread.created_at)}
              </span>
            </div>
          </div>

          {/* Chevron */}
          <a
            href="/account/member/discussions"
            className="text-white/20 transition-colors hover:text-white/50"
          >
            <ChevronRight size={15} strokeWidth={1.6} />
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'timeline', label: 'Timeline', icon: TrendingUp },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'contests', label: 'Contests', icon: Trophy },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
];

export default function MemberParticipationClient({
  registrations = [],
  contestParticipations = [],
  certificates = [],
  myThreads = [],
}) {
  const [activeTab, setActiveTab] = useState('timeline');

  const stats = useMemo(() => {
    const attended = registrations.filter((r) => r.attended || r.status === 'attended').length;
    const topRank =
      contestParticipations.filter((c) => c.rank != null).sort((a, b) => a.rank - b.rank)[0]?.rank ?? null;
    return {
      events: registrations.length,
      attended,
      contests: contestParticipations.length,
      certificates: certificates.length,
      discussions: myThreads.length,
      topRank,
    };
  }, [registrations, contestParticipations, certificates, myThreads]);

  const tabCounts = {
    timeline: registrations.length + contestParticipations.length + myThreads.length,
    events: registrations.length,
    contests: contestParticipations.length,
    certificates: certificates.length,
    discussions: myThreads.length,
  };

  const isEmpty =
    !registrations.length &&
    !contestParticipations.length &&
    !certificates.length &&
    !myThreads.length;

  return (
    <div className="space-y-5">
      {/* Page head */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">
            Participation
          </h1>
          <p className="mt-1 text-[13px] text-white/40">
            A complete record of everything you've done at NEUPC
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Events attended" value={stats.events} sub="since joining" />
        <StatCard label="Contests joined" value={stats.contests} sub={stats.contests === 0 ? undefined : `${Math.round((contestParticipations.filter(c=>c.rank!=null).length/Math.max(stats.contests,1))*100)}% ranked`} />
        <StatCard label="Certificates" value={stats.certificates} sub="all verified" />
        <StatCard label="Threads authored" value={stats.discussions} />
      </div>

      {/* Best rank callout */}
      {stats.topRank != null && (
        <div
          className="flex items-center gap-3 rounded-[12px] border p-4"
          style={{
            background: 'rgba(251,191,36,0.05)',
            borderColor: 'rgba(251,191,36,0.20)',
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border text-[#fcd34d]"
            style={{ background: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.2)' }}
          >
            <Medal size={20} strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-[12.5px] font-medium text-[#fcd34d]">Best Contest Rank</p>
            <p className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-white/90">
              #{stats.topRank}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-0.5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tabCounts[tab.id];
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-[1.5px] px-3.5 pb-[11px] pt-[10px] text-[12.5px] font-medium transition-colors duration-150 ${
                active
                  ? 'border-[#7c83ff] text-white/90'
                  : 'border-transparent text-white/35 hover:text-white/70'
              }`}
            >
              <Icon size={14} strokeWidth={1.6} />
              {tab.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-[6px] py-0.5 text-[10.5px] font-medium tabular-nums ${
                    active
                      ? 'bg-[rgba(124,131,255,0.20)] text-[#aab0ff]'
                      : 'bg-[#181a1f] text-white/30'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panel */}
      <div
        className="rounded-[12px] border p-[18px]"
        style={{ background: '#121317', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {isEmpty ? (
          <EmptyState
            icon={TrendingUp}
            title="Start your journey!"
            subtitle="Join events and contests to build your participation profile."
          />
        ) : (
          <>
            {activeTab === 'timeline' && (
              <Timeline
                registrations={registrations}
                contestParticipations={contestParticipations}
                myThreads={myThreads}
              />
            )}
            {activeTab === 'events' && <EventsTab registrations={registrations} />}
            {activeTab === 'contests' && <ContestsTab contestParticipations={contestParticipations} />}
            {activeTab === 'certificates' && <CertificatesTab certificates={certificates} />}
            {activeTab === 'discussions' && <DiscussionsTab myThreads={myThreads} />}
          </>
        )}
      </div>
    </div>
  );
}
