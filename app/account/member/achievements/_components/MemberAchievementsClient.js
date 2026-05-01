/**
 * @file Member achievements client — timeline inspired by the
 *   NEUPC member panel achievements layout.
 * @module MemberAchievementsClient
 */

'use client';

import { useMemo } from 'react';
import {
  Award,
  Calendar,
  Lock,
  Medal,
  Star,
  Trophy,
  Users,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtYear(y) {
  return y ?? '—';
}

function getResultTone(result) {
  const value = (result || '').toLowerCase();
  if (/1st|first|champion|winner|gold/.test(value)) {
    return {
      Icon: Trophy,
      tone: 'from-[#fbbf24] to-[#d97706]',
      label: 'Gold',
    };
  }
  if (/2nd|second|runner|silver/.test(value)) {
    return {
      Icon: Medal,
      tone: 'from-[#cbd5f5] to-[#64748b]',
      label: 'Silver',
    };
  }
  if (/3rd|third|bronze/.test(value)) {
    return {
      Icon: Award,
      tone: 'from-[#fdba74] to-[#f97316]',
      label: 'Bronze',
    };
  }
  return {
    Icon: Star,
    tone: 'from-[#a78bfa] to-[#7c3aed]',
    label: 'Badge',
  };
}

const PROGRESS_TONES = [
  {
    id: 'indigo',
    bar: 'bg-[#7c83ff]',
    ring: 'border-[rgba(124,131,255,0.20)]',
    glow: 'bg-[rgba(124,131,255,0.12)] text-[#aab0ff]',
  },
  {
    id: 'amber',
    bar: 'bg-[#fbbf24]',
    ring: 'border-[rgba(251,191,36,0.22)]',
    glow: 'bg-[rgba(251,191,36,0.12)] text-[#fcd34d]',
  },
  {
    id: 'cyan',
    bar: 'bg-[#22d3ee]',
    ring: 'border-[rgba(34,211,238,0.22)]',
    glow: 'bg-[rgba(34,211,238,0.12)] text-[#67e8f9]',
  },
  {
    id: 'rose',
    bar: 'bg-[#fb7185]',
    ring: 'border-[rgba(251,113,133,0.22)]',
    glow: 'bg-[rgba(251,113,133,0.12)] text-[#fda4af]',
  },
];

function StatCard({ label, value }) {
  return (
    <div className="rounded-[12px] border border-white/[0.06] bg-[#121317] px-4 py-[14px]">
      <p className="text-[11.5px] font-medium text-white/40">{label}</p>
      <p className="mt-1.5 font-['Inter'] text-[24px] leading-none font-semibold tracking-[-0.02em] text-white/90 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-[13px] font-medium text-white/90">{title}</h2>
        {subtitle && <p className="text-[12px] text-white/35">{subtitle}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, tone }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px] text-white/35">
        <span>
          {value} of {max}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/[0.06]">
        <div
          className={`h-1.5 rounded-full ${tone.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-[12px] border border-white/[0.06] bg-[#121317] py-14 text-center">
      <p className="text-[13px] font-medium text-white/50">{title}</p>
      {subtitle && <p className="mt-1 text-[12px] text-white/30">{subtitle}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemberAchievementsClient({
  memberAchievements = [],
  certificates = [],
}) {
  const years = useMemo(
    () =>
      [
        ...new Set(
          memberAchievements.map((a) => a.achievements?.year).filter(Boolean)
        ),
      ].sort((a, b) => b - a),
    [memberAchievements]
  );

  const categories = useMemo(
    () => [
      ...new Set(
        memberAchievements.map((a) => a.achievements?.category).filter(Boolean)
      ),
    ],
    [memberAchievements]
  );

  const teamCount = memberAchievements.filter(
    (a) => a.achievements?.is_team
  ).length;

  const earnedAchievements = memberAchievements.map((item) => {
    const ach = item.achievements ?? item;
    return {
      id: item.id ?? ach.id,
      title: ach.title,
      description: ach.description || ach.contest_name,
      date: ach.achievement_date,
      year: ach.year,
      result: ach.result,
    };
  });

  const progressItems = useMemo(() => {
    const counts = categories.map((category) => ({
      category,
      count: memberAchievements.filter(
        (a) => a.achievements?.category === category
      ).length,
    }));
    return counts.slice(0, 4).map((item, index) => {
      const target = Math.max(3, item.count + 2);
      return {
        id: item.category,
        title: `${item.category} milestone`,
        subtitle: `Earn ${target} achievements in ${item.category}`,
        value: item.count,
        target,
        tone: PROGRESS_TONES[index % PROGRESS_TONES.length],
      };
    });
  }, [categories, memberAchievements]);

  const lockedItems = useMemo(() => {
    return progressItems
      .filter((item) => item.value < item.target)
      .map((item) => ({
        id: item.id,
        title: `Complete ${item.target} ${item.id}`,
        subtitle: `${item.target - item.value} remaining`,
      }))
      .slice(0, 6);
  }, [progressItems]);

  return (
    <div className="space-y-6">
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">
            Achievements
          </h1>
          <p className="mt-1 text-[13px] text-white/40">
            Track badges, milestones, and contest highlights.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-4">
        <StatCard label="Earned" value={earnedAchievements.length} />
        <StatCard label="Certificates" value={certificates.length} />
        <StatCard label="Team Results" value={teamCount} />
        <StatCard label="Years Active" value={years.length} />
      </div>

      {/* Earned achievements */}
      <div className="space-y-3">
        <SectionHeader
          title="Earned Achievements"
          subtitle="Your latest badges and contest wins."
        />
        {earnedAchievements.length === 0 ? (
          <EmptyState
            title="No achievements yet"
            subtitle="Contest results added by admins will appear here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {earnedAchievements.map((ach) => {
              const tone = getResultTone(ach.result);
              const Icon = tone.Icon;
              const meta = ach.date ? fmtDate(ach.date) : fmtYear(ach.year);
              return (
                <div
                  key={ach.id}
                  className="flex flex-col items-center gap-2 rounded-[12px] border border-white/[0.06] bg-[#181a1f] px-3 py-4 text-center"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${tone.tone}`}
                  >
                    <Icon size={20} strokeWidth={1.6} className="text-white" />
                  </div>
                  <p className="line-clamp-2 text-[12.5px] font-semibold text-white/90">
                    {ach.title}
                  </p>
                  <p className="line-clamp-2 text-[11px] text-white/40">
                    {ach.description || `${tone.label} result`}
                  </p>
                  <p className="text-[10.5px] text-white/25">{meta}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <SectionHeader
          title="In Progress"
          subtitle="Keep pushing to unlock the next badge."
        />
        {progressItems.length === 0 ? (
          <EmptyState
            title="No progress data"
            subtitle="Earn achievements to see progress here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {progressItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-[12px] border ${item.tone.ring} bg-[#121317] p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-white/90">
                      {item.title}
                    </p>
                    <p className="text-[11.5px] text-white/35">
                      {item.subtitle}
                    </p>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${item.tone.glow}`}
                  >
                    <Users size={12} strokeWidth={1.6} />
                    {item.value}
                  </div>
                </div>
                <ProgressBar
                  value={item.value}
                  max={item.target}
                  tone={item.tone}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Locked achievements */}
      <div className="space-y-3">
        <SectionHeader
          title="Locked"
          subtitle="Goals waiting to be unlocked."
        />
        {lockedItems.length === 0 ? (
          <EmptyState
            title="No locked achievements"
            subtitle="Great job! You are all caught up."
          />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {lockedItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center gap-2 rounded-[10px] border border-white/[0.06] bg-[#121317] px-3 py-4 text-center opacity-60"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/40">
                  <Lock size={16} strokeWidth={1.6} />
                </div>
                <p className="line-clamp-2 text-[11px] font-medium text-white/70">
                  {item.title}
                </p>
                <p className="text-[10px] text-white/30">{item.subtitle}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
