'use client';

import Link from 'next/link';
import {
  Calendar,
  Sparkles,
  Bell,
  CheckCircle,
  Flame,
  Clock,
  MapPin,
  Lock,
  Trophy,
  Check,
  ChevronRight,
  BookOpen,
  Target,
  User,
  Award,
} from 'lucide-react';
import {
  PageHead,
  CardHead,
  Stat,
  StatRow,
  Badge,
  Btn,
  Locked,
} from './ui';

const STAT_DEFS = [
  { key: 'registeredEvents', icon: Calendar, label: 'Registered', unit: 'active', trend: '+1 this week' },
  { key: 'participationCount', icon: CheckCircle, label: 'Attended', unit: 'events', trend: 'Last: Apr 26' },
  { key: 'upcomingEvents', icon: Flame, label: 'Upcoming', unit: 'available', trend: '2 closing soon' },
  { key: 'notifications', icon: Bell, label: 'Alerts', unit: 'unread', trend: '1 urgent' },
];

const NOTIF_ICON = { success: CheckCircle, event: Calendar, resource: BookOpen };
const NOTIF_TINT = {
  success: 'oklch(0.85 0.14 155)',
  event: 'var(--gp-accent-text)',
  resource: 'oklch(0.85 0.13 75)',
};

const FEATURE_ICON = { calendar: Calendar, bookOpen: BookOpen, target: Target };
const QA_ICON = { user: User, award: Award, calendar: Calendar };

export default function GuestDashboardClient({ session }) {
  const stats = {
    registeredEvents: 3,
    upcomingEvents: 5,
    participationCount: 7,
    notifications: 2,
  };

  const notifications = [
    { id: 1, title: 'Registration confirmed', message: 'Web Dev Workshop · Feb 20', time: '2h ago', type: 'success', unread: true },
    { id: 2, title: 'New event: CP Contest #12', message: 'Registration open until Feb 21.', time: '5h ago', type: 'event', unread: true },
    { id: 3, title: 'Resource added: DP Cheatsheet', message: 'Public · CSE Lab', time: '1d ago', type: 'resource', unread: false },
  ];

  const upcomingEvents = [
    { id: 1, title: 'Web Development Workshop', date: 'Feb 20', time: '2:00 PM', venue: 'CSE Lab-B', tag: 'Workshop', status: 'registered' },
    { id: 2, title: 'CP Contest #12', date: 'Feb 22', time: '4:00 PM', venue: 'Online', tag: 'Contest', status: 'open' },
    { id: 3, title: 'Advanced Algorithms Bootcamp', date: 'Feb 25', time: '3:00 PM', venue: 'CSE Lab-A', tag: 'Bootcamp', status: 'members-only' },
  ];

  const recentParticipation = [
    { id: 1, event: 'JavaScript Fundamentals', date: 'Feb 10, 2026', certificate: true },
    { id: 2, event: 'Git & GitHub Workshop', date: 'Feb 5, 2026', certificate: true },
    { id: 3, event: 'Intro to Competitive Programming', date: 'Jan 28, 2026', certificate: false },
  ];

  const publicFeatures = [
    { id: 1, title: 'Public Events', description: 'Attend free workshops and seminars', iconKey: 'calendar', link: '/events' },
    { id: 2, title: 'Blog Posts', description: 'Read tech articles and tutorials', iconKey: 'bookOpen', link: '/blogs' },
    { id: 3, title: 'Roadmaps', description: 'Preview learning paths', iconKey: 'target', link: '/roadmaps' },
  ];

  const quickActions = [
    { id: 1, label: 'Profile Settings', iconKey: 'user', link: '/account/guest/profile' },
    { id: 2, label: 'My Certificates', iconKey: 'award', link: '/account/guest/participation' },
    { id: 3, label: 'Browse Events', iconKey: 'calendar', link: '/events' },
  ];

  const userName = session?.user?.name?.split(' ')[0] || 'Guest';

  return (
    <div className="gp-page">
      <PageHead
        eyebrow="Guest dashboard"
        title={`Welcome back, ${userName}`}
        sub={`${stats.upcomingEvents} new events this month · ${stats.participationCount} attended so far`}
        actions={
          <>
            <Btn href="/events">
              <Calendar size={14} /> Browse events
            </Btn>
            <Btn href="/account/guest/membership-application" variant="primary">
              <Sparkles size={14} /> Apply for membership
            </Btn>
          </>
        }
      />

      <StatRow cols={4}>
        {STAT_DEFS.map((s) => (
          <Stat
            key={s.key}
            icon={s.icon}
            label={s.label}
            value={stats[s.key]}
            unit={s.unit}
            trend={s.trend}
          />
        ))}
      </StatRow>

      <div className="grid gap-4 mb-4 grid-cols-1 lg:grid-cols-[1.6fr_1fr] xl:gap-5">
        {/* Upcoming events */}
        <div className="gp-card">
          <CardHead
            icon={Calendar}
            title="Upcoming events"
            action={
              <Btn href="/events" variant="ghost" size="sm">
                View all <ChevronRight size={12} />
              </Btn>
            }
          />
          <div>
            {upcomingEvents.map((e, i) => {
              const [m, d] = e.date.split(' ');
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3.5 px-4 py-3.5"
                  style={{ borderBottom: i < upcomingEvents.length - 1 ? '1px solid var(--gp-line)' : 'none' }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 flex-col items-center justify-center"
                    style={{ borderRadius: 8, background: 'var(--gp-surface-2)', border: '1px solid var(--gp-line)' }}
                  >
                    <div className="gp-mono" style={{ fontSize: 9, color: 'var(--gp-text-3)', lineHeight: 1, textTransform: 'uppercase' }}>
                      {m}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, marginTop: 3 }}>{d}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{e.title}</div>
                    <div className="flex flex-wrap items-center gap-3" style={{ fontSize: 11.5, color: 'var(--gp-text-3)' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {e.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {e.venue}
                      </span>
                      <Badge mono style={{ fontSize: 9.5, padding: '1px 6px' }}>
                        {e.tag.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {e.status === 'registered' && (
                      <Badge variant="success">
                        <Check size={11} /> Registered
                      </Badge>
                    )}
                    {e.status === 'open' && (
                      <Btn variant="primary" size="sm">
                        Register
                      </Btn>
                    )}
                    {e.status === 'members-only' && (
                      <Locked feature="Bootcamps and contest sessions are reserved for members.">
                        <Badge>
                          <Lock size={11} /> Members only
                        </Badge>
                      </Locked>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notifications */}
        <div className="gp-card">
          <CardHead
            icon={Bell}
            title="Recent activity"
            action={
              <Btn href="/account/guest/notifications" variant="ghost" size="sm">
                All <ChevronRight size={12} />
              </Btn>
            }
          />
          <ul className="divide-y" style={{ borderColor: 'var(--gp-line)' }}>
            {notifications.map((n) => {
              const Ico = NOTIF_ICON[n.type] || Bell;
              return (
                <li
                  key={n.id}
                  className="gp-row-link relative flex items-start gap-3 px-4 py-3"
                  style={{
                    borderColor: 'var(--gp-line)',
                    background: n.unread ? 'oklch(0.18 0.005 240 / 0.4)' : 'transparent',
                  }}
                >
                  {n.unread && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full"
                      style={{ background: 'var(--gp-accent)' }}
                    />
                  )}
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center"
                    style={{ borderRadius: 7, background: 'var(--gp-surface-3)', color: NOTIF_TINT[n.type] }}
                  >
                    <Ico size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2 }}>{n.title}</div>
                    <div className="line-clamp-2" style={{ fontSize: 11.5, color: 'var(--gp-text-3)', lineHeight: 1.4 }}>{n.message}</div>
                    <div className="gp-mono" style={{ fontSize: 10.5, color: 'var(--gp-text-4)', marginTop: 4 }}>
                      {n.time}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 mb-4 grid-cols-1 lg:grid-cols-[1.3fr_1fr] xl:gap-5">
        {/* Application progress */}
        <div className="gp-card">
          <CardHead
            icon={Sparkles}
            title="Membership application"
            action={<Badge variant="warn">Not started</Badge>}
          />
          <div className="gp-card-body">
            <div className="flex items-end justify-between" style={{ marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>You&apos;re 0% applied</div>
                <div style={{ fontSize: 11.5, color: 'var(--gp-text-3)' }}>Takes ~3 minutes · 4 short steps</div>
              </div>
              <div className="gp-mono gp-tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
                0/4
              </div>
            </div>
            <div className="gp-progress" style={{ marginBottom: 14 }}>
              <div className="gp-progress-fill" style={{ width: '0%' }} />
            </div>
            <div className="grid grid-cols-4 gap-2" style={{ marginBottom: 14 }}>
              {['Basics', 'Academic', 'Experience', 'Review'].map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-1.5"
                  style={{
                    fontSize: 11,
                    color: 'var(--gp-text-3)',
                    padding: '8px 10px',
                    borderRadius: 7,
                    background: 'var(--gp-surface-2)',
                    border: '1px solid var(--gp-line)',
                  }}
                >
                  <span className="gp-mono" style={{ color: 'var(--gp-text-4)', fontSize: 9.5 }}>
                    0{i + 1}
                  </span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <Btn
              href="/account/guest/membership-application"
              variant="primary"
              size="lg"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Start application <ChevronRight size={13} />
            </Btn>
          </div>
        </div>

        {/* Recent attendance */}
        <div className="gp-card">
          <CardHead
            icon={Trophy}
            title="Recent attendance"
            action={
              <Btn href="/account/guest/participation" variant="ghost" size="sm">
                All <ChevronRight size={12} />
              </Btn>
            }
          />
          <div>
            {recentParticipation.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < recentParticipation.length - 1 ? '1px solid var(--gp-line)' : 'none' }}
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center"
                  style={{
                    borderRadius: 6,
                    background: 'oklch(0.74 0.14 155 / 0.12)',
                    border: '1px solid oklch(0.74 0.14 155 / 0.3)',
                    color: 'oklch(0.85 0.14 155)',
                  }}
                >
                  <Check size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.event}</div>
                  <div className="gp-mono" style={{ fontSize: 11, color: 'var(--gp-text-4)' }}>
                    {r.date}
                  </div>
                </div>
                {r.certificate && (
                  <Locked feature="Members can download attendance certificates for any event.">
                    <Btn size="sm" disabled style={{ opacity: 0.5, cursor: 'help' }}>
                      <Lock size={11} /> Cert
                    </Btn>
                  </Locked>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explore */}
      <div className="gp-card mb-4">
        <CardHead title="Explore" />
        <ul className="divide-y" style={{ borderColor: 'var(--gp-line)' }}>
          {publicFeatures.map((f) => {
            const Ico = FEATURE_ICON[f.iconKey] || Calendar;
            return (
              <li key={f.id}>
                <Link
                  href={f.link}
                  className="gp-row-link group flex items-center gap-3 px-4 py-3"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center transition-colors"
                    style={{ borderRadius: 8, background: 'var(--gp-surface-2)', color: 'var(--gp-text-2)' }}
                  >
                    <Ico size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--gp-text-3)' }}>{f.description}</div>
                  </div>
                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--gp-text-4)' }} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Quick actions */}
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 xl:gap-3">
        {quickActions.map((a) => {
          const Ico = QA_ICON[a.iconKey] || Calendar;
          return (
            <Link
              key={a.id}
              href={a.link}
              className="gp-card gp-card-interactive group flex items-center gap-3 px-4 py-3.5 no-underline"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center transition-colors"
                style={{ borderRadius: 8, background: 'var(--gp-surface-2)', color: 'var(--gp-text-2)' }}
              >
                <Ico size={15} />
              </div>
              <span className="flex-1" style={{ fontSize: 13, fontWeight: 500 }}>
                {a.label}
              </span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--gp-text-4)' }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
