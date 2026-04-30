'use client';

import { useState, useTransition } from 'react';
import {
  Check,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
  Trophy,
  Award,
  Users,
  Settings,
  ChevronDown,
  Search,
  Pencil,
  Code2,
  Globe,
  User,
  Activity,
  Sparkles,
  GraduationCap,
  IdCard,
  BookOpen,
  Hash,
} from 'lucide-react';
import { updateMemberProfileAction } from '@/app/_lib/member-profile-actions';

// ─── Platform registry ────────────────────────────────────────────────────────
const HANDLE_PLATFORMS = [
  { id: 'codeforces',        name: 'Codeforces',     short: 'CF', color: '#ef4444', profileUrl: (h) => `https://codeforces.com/profile/${h}`,              logo: 'https://codeforces.org/s/0/favicon-96x96.png',   category: 'cp' },
  { id: 'atcoder',           name: 'AtCoder',         short: 'AC', color: '#38bdf8', profileUrl: (h) => `https://atcoder.jp/users/${h}`,                    logo: 'https://img.atcoder.jp/assets/atcoder.png',       category: 'cp' },
  { id: 'leetcode',          name: 'LeetCode',        short: 'LC', color: '#fbbf24', profileUrl: (h) => `https://leetcode.com/${h}`,                        logo: 'https://assets.leetcode.com/static_assets/public/icons/favicon-96x96.png', category: 'cp' },
  { id: 'codechef',          name: 'CodeChef',        short: 'CC', color: '#fb923c', profileUrl: (h) => `https://www.codechef.com/users/${h}`,              logo: 'https://www.codechef.com/misc/favicon.ico',       category: 'cp' },
  { id: 'hackerrank',        name: 'HackerRank',      short: 'HR', color: '#4ade80', profileUrl: (h) => `https://www.hackerrank.com/profile/${h}`,          logo: 'https://www.hackerrank.com/wp-content/uploads/2020/05/hackerrank_cursor_favicon_480px-150x150.png', category: 'cp' },
  { id: 'spoj',              name: 'SPOJ',            short: 'SP', color: '#a3e635', profileUrl: (h) => `https://www.spoj.com/users/${h}`,                  logo: 'https://www.spoj.com/favicon.ico',                category: 'cp' },
  { id: 'cses',              name: 'CSES',            short: 'CS', color: '#818cf8', profileUrl: (h) => `https://cses.fi/user/${h}`,                        logo: 'https://cses.fi/favicon.ico',                     category: 'cp' },
  { id: 'vjudge',            name: 'VJudge',          short: 'VJ', color: '#2dd4bf', profileUrl: (h) => `https://vjudge.net/user/${h}`,                     logo: 'https://vjudge.net/favicon.ico',                  category: 'cp' },
  { id: 'toph',              name: 'Toph',            short: 'TP', color: '#34d399', profileUrl: (h) => `https://toph.co/u/${h}`,                           logo: 'https://toph.co/images/favicon.png',              category: 'cp' },
  { id: 'lightoj',           name: 'LightOJ',         short: 'LJ', color: '#22d3ee', profileUrl: (h) => `https://lightoj.com/user/${h}`,                    logo: 'https://static.lightoj.com/assets/loj-logo-inverted.png', category: 'cp' },
  { id: 'uva',               name: 'UVA',             short: 'UV', color: '#a78bfa', profileUrl: (h) => `https://uhunt.onlinejudge.org/id/${h}`,            logo: 'https://onlinejudge.org/favicon.ico',             category: 'cp' },
  { id: 'beecrowd',          name: 'Beecrowd',        short: 'BC', color: '#fde68a', profileUrl: (h) => `https://judge.beecrowd.com/en/profile/${h}`,       logo: 'https://www.beecrowd.com.br/favicon.ico',         category: 'cp' },
  { id: 'facebookhackercup', name: 'Meta Hacker Cup', short: 'MH', color: '#60a5fa', profileUrl: (h) => `https://www.facebook.com/codingcompetitions/hacker-cup/`, logo: 'https://www.facebook.com/favicon.ico', category: 'cp' },
  { id: 'github',   name: 'GitHub',      short: 'GH', color: '#e2e8f0', profileUrl: (h) => `https://github.com/${h}`,  logo: 'https://github.com/favicon.ico',       category: 'social' },
  { id: 'linkedin', name: 'LinkedIn',    short: 'LI', color: '#3b82f6', profileUrl: (h) => `https://linkedin.com/in/${h}`,   logo: 'https://www.linkedin.com/favicon.ico', category: 'social' },
  { id: 'facebook', name: 'Facebook',    short: 'FB', color: '#60a5fa', profileUrl: (h) => `https://facebook.com/${h}`,        logo: 'https://www.facebook.com/favicon.ico', category: 'social' },
  { id: 'x_handle', name: 'X (Twitter)', short: 'X',  color: '#e2e8f0', profileUrl: (h) => `https://x.com/${h}`,      logo: 'https://abs.twimg.com/favicons/twitter.3.ico', category: 'social' },
];

const CP_PLATFORMS  = HANDLE_PLATFORMS.filter(p => p.category === 'cp');
const SOC_PLATFORMS = HANDLE_PLATFORMS.filter(p => p.category === 'social');

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'handles',  label: 'Handles',  icon: Code2 },
  { id: 'activity', label: 'Activity', icon: Activity },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getHandleValue(profile, platform) {
  if (!profile) return null;
  if (platform.id === 'github')   return profile.github   ?? null;
  if (platform.id === 'linkedin') return profile.linkedin ?? null;
  if (platform.id === 'facebook') return profile.facebook ?? null;
  if (platform.id === 'x_handle') return profile.x_handle ?? null;
  return profile[`${platform.id}_handle`] ?? null;
}

function getDisplayHandle(platform, handle) {
  if (!handle) return null;
  return platform.isUrl ? (handle.split('/').filter(Boolean).pop() ?? handle) : handle;
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ children, tone = 'default', dot = false }) {
  const tones = {
    default: 'bg-white/[0.06] border-white/[0.10] text-white/50',
    accent:  'bg-[rgba(124,131,255,0.12)] border-[rgba(124,131,255,0.20)] text-[#aab0ff]',
    success: 'bg-[rgba(74,222,128,0.12)]  border-[rgba(74,222,128,0.20)]  text-[#86efac]',
    warning: 'bg-[rgba(251,191,36,0.12)]  border-[rgba(251,191,36,0.20)]  text-[#fcd34d]',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${tones[tone]} whitespace-nowrap`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function ProfileAvatar({ user, size = 72 }) {
  const isImage = user.avatar_url?.startsWith('/api/image/');
  const initials =
    user.avatar_url && user.avatar_url.length <= 3
      ? user.avatar_url
      : (user.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? 'M');

  if (isImage) {
    return (
      <img src={user.avatar_url} alt={user.full_name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-black/40 shrink-0" />
    );
  }
  return (
    <div style={{
      width: size, height: size,
      fontSize: Math.round(size * 0.36),
      background: 'linear-gradient(135deg, #4ade80, #22a360)',
      color: '#03200f',
    }} className="rounded-full shrink-0 flex items-center justify-center font-bold ring-2 ring-black/40">
      {initials}
    </div>
  );
}

// ─── Platform logo ────────────────────────────────────────────────────────────
function PlatformLogo({ platform, size = 16 }) {
  const [failed, setFailed] = useState(false);
  if (!platform.logo || failed) {
    return <span className="text-[9px] font-bold leading-none" style={{ color: platform.color }}>{platform.short}</span>;
  }
  return (
    <img src={platform.logo} alt={platform.name}
      style={{ width: size, height: size }}
      className="rounded-sm object-contain"
      onError={() => setFailed(true)} />
  );
}

// ─── Tag ─────────────────────────────────────────────────────────────────────
function Tag({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-white/[0.05] border-white/[0.07] text-white/50',
    blue:    'bg-[rgba(96,165,250,0.10)]  border-[rgba(96,165,250,0.18)]  text-[#93c5fd]',
    violet:  'bg-[rgba(167,139,250,0.10)] border-[rgba(167,139,250,0.18)] text-[#c4b5fd]',
  };
  return (
    <span className={`text-[11.5px] border px-2.5 py-0.5 rounded-full ${tones[tone]}`}>
      {children}
    </span>
  );
}

// ─── Tab nav (desktop sidebar item) ───────────────────────────────────────────
function TabSideItem({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
        active
          ? 'bg-white/[0.07] text-white'
          : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
      }`}
    >
      <Icon className={`size-[15px] shrink-0 ${active ? 'text-white/70' : 'text-white/30'}`} />
      <span className="flex-1 truncate">{tab.label}</span>
      {active && <ChevronRight className="size-3.5 text-white/30" />}
    </button>
  );
}

// ─── Tab nav (mobile pill) ────────────────────────────────────────────────────
function TabMobilePill({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
        active
          ? 'border-white/20 bg-white/[0.09] text-white'
          : 'border-white/[0.07] bg-transparent text-white/35 hover:border-white/15 hover:text-white/65'
      }`}
    >
      <Icon className="size-3.5 shrink-0" />
      {tab.label}
    </button>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ title, icon: Icon, action, children, padded = true }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-white/25 shrink-0" />}
            <p className="text-[13px] font-semibold text-white/75 truncate">{title}</p>
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'px-5 py-4' : ''}>{children}</div>
    </div>
  );
}

function EditButton({ onClick, label = 'Edit' }) {
  return (
    <button onClick={onClick}
      className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-white/35 transition hover:bg-white/[0.07] hover:text-white/65">
      <Pencil className="w-3 h-3" /> {label}
    </button>
  );
}

// ─── Handle row (view) ────────────────────────────────────────────────────────
function HandleRow({ platform, handle }) {
  const url     = handle ? platform.profileUrl(handle) : null;
  const display = getDisplayHandle(platform, handle);

  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
      handle
        ? 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.045] hover:border-white/[0.12]'
        : 'border-white/[0.04] bg-transparent opacity-30'
    }`}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: handle ? `${platform.color}15` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${handle ? platform.color + '30' : 'rgba(255,255,255,0.06)'}`,
        }}>
        <PlatformLogo platform={platform} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[11.5px] font-medium leading-none mb-0.5 ${handle ? 'text-white/60' : 'text-white/25'}`}>
          {platform.name}
        </p>
        {handle ? (
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] leading-none hover:underline underline-offset-2"
            style={{ color: platform.color + 'bb' }}
            onClick={e => e.stopPropagation()}>
            <span className="truncate max-w-[140px]">{display}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
          </a>
        ) : (
          <p className="text-[10.5px] text-white/18 leading-none">Not linked</p>
        )}
      </div>

      {handle && (
        <div className="shrink-0 size-5 flex items-center justify-center rounded-full"
          style={{ background: platform.color + '18', border: `1px solid ${platform.color}35` }}>
          <Check className="w-2.5 h-2.5" style={{ color: platform.color }} />
        </div>
      )}
    </div>
  );
}

// ─── Handle edit row ──────────────────────────────────────────────────────────
function HandleEditRow({ platform, handle }) {
  const fieldName =
    platform.id === 'github'   ? 'github'   :
    platform.id === 'linkedin' ? 'linkedin' :
    platform.id === 'facebook' ? 'facebook' :
    platform.id === 'x_handle' ? 'x_handle' :
    `${platform.id}_handle`;

  const placeholder = `${platform.short.toLowerCase()}_username`;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30` }}>
        <PlatformLogo platform={platform} />
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-[10px] font-medium text-white/30 mb-1">{platform.name}</label>
        <input
          name={fieldName}
          defaultValue={handle ?? ''}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 font-mono text-[12px] text-white placeholder-white/15 outline-none focus:border-white/25 focus:bg-white/[0.05] transition"
        />
      </div>
    </div>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────────
function FormField({ label, name, defaultValue, placeholder, hint, textarea }) {
  const cls = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 outline-none focus:border-white/25 focus:bg-white/[0.05] transition';
  return (
    <div>
      <label className="block mb-1.5 text-[10.5px] font-semibold tracking-[0.1em] uppercase text-white/35">
        {label}
        {hint && <span className="ml-1.5 normal-case tracking-normal text-white/20 font-normal">{hint}</span>}
      </label>
      {textarea
        ? <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={3} className={`${cls} resize-none`} />
        : <input    name={name} defaultValue={defaultValue} placeholder={placeholder} className={cls} />}
    </div>
  );
}

function FormAlert({ error, success }) {
  if (error)
    return <p className="rounded-xl border border-red-400/25 bg-red-400/[0.07] px-4 py-3 text-[12.5px] text-red-400">{error}</p>;
  if (success)
    return <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3 text-[12.5px] text-emerald-400">Profile saved.</p>;
  return null;
}

// ─── Edit form ────────────────────────────────────────────────────────────────
function EditProfileForm({ profile, onDone }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);
  const [query, setQuery]     = useState('');

  const filtered = query.trim()
    ? CP_PLATFORMS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : CP_PLATFORMS;

  function handleSubmit(formData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateMemberProfileAction(formData);
      if (result?.error) setError(result.error);
      else { setSuccess(true); setTimeout(onDone, 1200); }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <FormField label="Bio" name="bio" defaultValue={profile?.bio ?? ''} placeholder="Tell the club about yourself…" textarea />

      <div>
        <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-3">Social &amp; Dev</p>
        <div className="space-y-3">
          {SOC_PLATFORMS.map(p => (
            <HandleEditRow key={p.id} platform={p} handle={getHandleValue(profile, p)} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-white/25">Competitive Programming</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25 pointer-events-none" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Filter…"
              className="w-28 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-7 pr-2.5 py-1.5 text-[11.5px] text-white placeholder-white/20 outline-none focus:border-white/20 transition" />
          </div>
        </div>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map(p => (
              <HandleEditRow key={p.id} platform={p} handle={getHandleValue(profile, p)} />
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-[12px] text-white/25">No platforms match &ldquo;{query}&rdquo;</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Skills"    name="skills"    defaultValue={(profile?.skills    ?? []).join(', ')} placeholder="C++, Python, Algorithms…" hint="(comma-separated)" />
        <FormField label="Interests" name="interests" defaultValue={(profile?.interests ?? []).join(', ')} placeholder="CP, ML, Open Source…"      hint="(comma-separated)" />
      </div>

      <FormAlert error={error} success={success} />

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-white/[0.09] border border-white/[0.10] px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-white/[0.14] disabled:opacity-40">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Save changes
        </button>
        <button type="button" onClick={onDone} disabled={isPending}
          className="flex items-center gap-2 rounded-xl border border-white/[0.07] px-5 py-2.5 text-[12.5px] text-white/40 transition hover:bg-white/[0.04] hover:text-white/60 disabled:opacity-40">
          <X className="size-4" /> Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07]"
        style={{ background: accent ? `${accent}12` : 'rgba(255,255,255,0.03)' }}>
        <Icon className="w-4 h-4" style={{ color: accent ?? 'rgba(255,255,255,0.4)' }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.08em] text-white/30 font-medium">{label}</p>
        <p className="text-[14px] font-semibold text-white/85 font-mono tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Info row (membership facts) ──────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.05] py-3 last:border-0">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
        <Icon className="size-3.5 text-white/35" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10.5px] text-white/30">{label}</p>
        <div className="text-[13px] text-white/65 truncate">
          {value ?? <span className="italic text-white/20">Not set</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Handles tab content ──────────────────────────────────────────────────────
function HandlesTab({ cpHandles, socialHandles, onEdit }) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery]     = useState('');

  const connected   = cpHandles.filter(h => h.handle);
  const filteredCp  = query.trim()
    ? cpHandles.filter(h => h.platform.name.toLowerCase().includes(query.toLowerCase()))
    : cpHandles;
  const visible     = (showAll || query.trim()) ? filteredCp : filteredCp.slice(0, 8);
  const hiddenCount = filteredCp.length - visible.length;
  const pct         = cpHandles.length > 0 ? Math.round((connected.length / cpHandles.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card
        title="Social & Dev"
        icon={Globe}
        action={<EditButton onClick={onEdit} />}
        padded={false}
      >
        <div className="p-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {socialHandles.map(({ platform, handle }) => (
            <HandleRow key={platform.id} platform={platform} handle={handle} />
          ))}
        </div>
      </Card>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]">
          <Code2 className="w-4 h-4 text-white/25 shrink-0" />
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[13px] font-semibold text-white/75">Competitive handles</p>
              <span className="text-[11px] font-mono text-white/30 ml-2 shrink-0">{connected.length}/{cpHandles.length}</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: connected.length === 0 ? 'transparent'
                    : pct >= 70 ? 'linear-gradient(90deg,#4ade80,#22d3ee)'
                    : pct >= 30 ? 'linear-gradient(90deg,#fbbf24,#4ade80)'
                    : 'linear-gradient(90deg,#fb923c,#fbbf24)',
                }} />
            </div>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25 pointer-events-none" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Filter…"
              className="w-32 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-7 pr-2.5 py-1.5 text-[11.5px] text-white placeholder-white/20 outline-none focus:border-white/20 transition" />
          </div>
          <EditButton onClick={onEdit} />
        </div>
        <div className="p-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.length > 0 ? visible.map(({ platform, handle }) => (
            <HandleRow key={platform.id} platform={platform} handle={handle} />
          )) : (
            <p className="col-span-full text-center py-6 text-[12px] text-white/25">No platforms match &ldquo;{query}&rdquo;</p>
          )}
        </div>
        {!query.trim() && (hiddenCount > 0 || showAll) && (
          <div className="border-t border-white/[0.04] px-4 py-3">
            <button onClick={() => setShowAll(v => !v)}
              className="flex w-full items-center justify-center gap-1.5 text-[11.5px] text-white/30 hover:text-white/55 transition-colors">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} />
              {showAll ? 'Show less' : `Show ${hiddenCount} more`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ memberProfile, connectedCount, totalHandles, onEdit }) {
  const skills    = memberProfile?.skills    ?? [];
  const interests = memberProfile?.interests ?? [];
  const approved  = memberProfile?.approved === true;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={IdCard}        label="Student ID" value={memberProfile?.student_id ?? '—'} accent="#7c83ff" />
        <StatTile icon={GraduationCap} label="CGPA"       value={memberProfile?.cgpa ?? '—'}       accent="#4ade80" />
        <StatTile icon={Hash}          label="Handles"    value={`${connectedCount}/${totalHandles}`} accent="#22d3ee" />
        <StatTile icon={BookOpen}      label="Semester"   value={memberProfile?.semester ?? '—'}   accent="#fbbf24" />
      </div>

      <Card title="About" icon={User} action={<EditButton onClick={onEdit} />}>
        {memberProfile?.bio ? (
          <p className="text-[13px] text-white/55 leading-relaxed whitespace-pre-line">{memberProfile.bio}</p>
        ) : (
          <p className="text-[12.5px] italic text-white/20">No bio yet. Add one to introduce yourself.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Membership" icon={GraduationCap} padded={false}>
          <div className="px-5">
            <InfoRow icon={Check}         label="Status"     value={<Pill tone={approved ? 'success' : 'warning'} dot>{approved ? 'Active' : 'Pending'}</Pill>} />
            <InfoRow icon={IdCard}        label="Student ID" value={memberProfile?.student_id} />
            <InfoRow icon={BookOpen}      label="Department" value={memberProfile?.department} />
            <InfoRow icon={Hash}          label="Session"    value={memberProfile?.session} />
            <InfoRow icon={GraduationCap} label="Semester"   value={memberProfile?.semester} />
            {memberProfile?.cgpa != null && <InfoRow icon={Sparkles} label="CGPA" value={String(memberProfile.cgpa)} />}
          </div>
        </Card>

        <Card title="Skills & interests" icon={Sparkles} action={<EditButton onClick={onEdit} />}>
          {skills.length === 0 && interests.length === 0 ? (
            <p className="text-[12.5px] text-white/20 italic">No skills or interests listed yet.</p>
          ) : (
            <div className="space-y-3">
              {skills.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-white/30 mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => <Tag key={s} tone="blue">{s}</Tag>)}
                  </div>
                </div>
              )}
              {interests.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-white/30 mb-1.5">Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {interests.map(s => <Tag key={s} tone="violet">{s}</Tag>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────────────────────────
function ActivityTab() {
  const links = [
    { icon: Trophy,   label: 'Achievements',     desc: 'Awards, contest wins, milestones',     href: '/account/member/achievements' },
    { icon: Award,    label: 'Certificates',     desc: 'Earned certificates and credentials',  href: '/account/member/certificates' },
    { icon: Users,    label: 'Participation',    desc: 'Events, contests, bootcamps joined',   href: '/account/member/participation' },
    { icon: Settings, label: 'Account & avatar', desc: 'Personal info, security, appearance',  href: '/account/member/settings' },
  ];

  return (
    <Card title="Activity & links" icon={Activity} padded={false}>
      <div className="divide-y divide-white/[0.04]">
        {links.map(({ icon: Icon, label, desc, href }) => (
          <a key={href} href={href}
            className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03] group">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
              <Icon className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white/70 group-hover:text-white transition-colors">{label}</p>
              <p className="text-[11.5px] text-white/30 truncate">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors shrink-0" />
          </a>
        ))}
      </div>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MemberProfileClient({ user, memberProfile }) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab]         = useState('overview');

  const approved = memberProfile?.approved === true;

  const allHandles    = HANDLE_PLATFORMS.map(p => ({ platform: p, handle: getHandleValue(memberProfile, p) }));
  const cpHandles     = allHandles.filter(h => h.platform.category === 'cp');
  const socialHandles = allHandles.filter(h => h.platform.category === 'social');
  const connectedCount = allHandles.filter(h => h.handle).length;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Profile</h1>
        <p className="mt-0.5 text-[13px] text-white/35">Your public NEUPC identity</p>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="h-24 relative" style={{
          background: 'radial-gradient(ellipse at 80% 50%, rgba(124,131,255,0.20) 0%, transparent 65%), radial-gradient(ellipse at 20% 50%, rgba(74,222,128,0.10) 0%, transparent 65%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        }}>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-black/25 backdrop-blur-sm px-3.5 py-2 text-[12px] font-medium text-white/65 transition hover:bg-black/35 hover:text-white">
              <Pencil className="w-3.5 h-3.5" />
              Edit profile
            </button>
          )}
        </div>

        <div className="px-6 pb-5">
          <div className="flex flex-wrap items-end gap-4" style={{ marginTop: '-36px' }}>
            <div className="rounded-full ring-[3px] ring-[#0d0e11] shrink-0">
              <ProfileAvatar user={user} size={72} />
            </div>
            <div className="pb-1 min-w-0 flex-1">
              <h2 className="text-[20px] font-semibold text-white tracking-tight leading-tight truncate">
                {user.full_name}
              </h2>
              <p className="text-[12px] text-white/35 mt-0.5 mb-2 truncate">
                {user.email}
                {memberProfile?.session && <> · Session {memberProfile.session}</>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Pill tone="accent" dot>Member{memberProfile?.semester ? ` · ${memberProfile.semester}` : ''}</Pill>
                <Pill tone={approved ? 'success' : 'warning'} dot>{approved ? 'Active' : 'Pending approval'}</Pill>
                {memberProfile?.department && <Pill>{memberProfile.department}</Pill>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit overlay */}
      {editing && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
            <div>
              <p className="text-[13px] font-semibold text-white/80">Edit profile</p>
              <p className="mt-0.5 text-[11.5px] text-white/30">Bio · handles · skills &amp; interests</p>
            </div>
            <button onClick={() => setEditing(false)}
              className="flex items-center justify-center size-8 rounded-lg border border-white/[0.07] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition">
              <X className="size-4" />
            </button>
          </div>
          <div className="px-6 py-6">
            <EditProfileForm profile={memberProfile} onDone={() => setEditing(false)} />
          </div>
        </div>
      )}

      {/* Tab nav + content */}
      {!editing && (
        <>
          {/* Mobile pills */}
          <div className="lg:hidden -mx-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 px-1 py-1">
              {TABS.map(t => (
                <TabMobilePill key={t.id} tab={t} active={tab === t.id} onClick={setTab} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block">
              <nav className="sticky top-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2 space-y-0.5">
                {TABS.map(t => (
                  <TabSideItem key={t.id} tab={t} active={tab === t.id} onClick={setTab} />
                ))}
              </nav>
            </aside>

            {/* Content */}
            <div className="min-w-0">
              {tab === 'overview' && (
                <OverviewTab
                  memberProfile={memberProfile}
                  connectedCount={connectedCount}
                  totalHandles={allHandles.length}
                  onEdit={() => setEditing(true)}
                />
              )}
              {tab === 'handles'  && <HandlesTab cpHandles={cpHandles} socialHandles={socialHandles} onEdit={() => setEditing(true)} />}
              {tab === 'activity' && <ActivityTab />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
