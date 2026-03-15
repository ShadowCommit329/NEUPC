/**
 * @file Guest settings client — account preferences panel for
 *   notification settings, theme, and privacy options.
 * @module GuestSettingsClient
 */

'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Settings,
  User,
  Bell,
  Shield,
  LogOut,
  Save,
  X,
  Edit3,
  CheckCircle2,
  XCircle,
  Toggle,
  Sparkles,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { updateGuestInfoAction } from '@/app/_lib/guest-actions';
import { signOutAction } from '@/app/_lib/actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NOTIF_KEY = 'neupc_guest_notif_prefs';

const DEFAULT_PREFS = {
  emailNotices: true,
  browserNotices: false,
  eventReminders: true,
  weeklyDigest: false,
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  const map = {
    active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    suspended: 'text-red-400 bg-red-400/10 border-red-400/20',
    banned: 'text-red-500 bg-red-500/10 border-red-500/20',
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? 'border-white/10 bg-white/5 text-white/40'}`}
    >
      {status}
    </span>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-white/70">{label}</p>
        {desc && <p className="text-xs text-white/30">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 ${
          checked
            ? 'border-blue-400/40 bg-blue-400/25'
            : 'border-white/12 bg-white/6'
        }`}
      >
        <span
          className={`absolute top-0.5 size-3.5 rounded-full transition-all duration-200 ${
            checked ? 'left-4 bg-blue-400' : 'left-0.5 bg-white/30'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Edit Form ─────────────────────────────────────────────────────────────────
function EditPersonalForm({ user, onCancel, onSaved }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateGuestInfoAction(fd);
      if (result?.error) setError(result.error);
      else onSaved();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 border-t border-white/6 pt-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/35">Full Name</label>
          <input
            name="full_name"
            defaultValue={user.full_name ?? ''}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/35">Phone</label>
          <input
            name="phone"
            defaultValue={user.phone ?? ''}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20"
            placeholder="+880 1xxx xxxxxx"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/35">Avatar URL</label>
        <input
          name="avatar_url"
          defaultValue={user.avatar_url ?? ''}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20"
          placeholder="https://..."
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-blue-500/18 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/26 disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white/40 transition hover:text-white/60"
        >
          <X className="size-3.5" />
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon: Icon, iconColor = 'text-blue-400', title, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4">
        <div
          className={`flex size-8 items-center justify-center rounded-lg border border-white/8 bg-white/5 ${iconColor}`}
        >
          <Icon className="size-4" />
        </div>
        <h3 className="text-sm font-semibold text-white/70">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuestSettingsClient({ user }) {
  const [editing, setEditing] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Load prefs from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  function togglePref(key, val) {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    } catch {}
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  }

  return (
    <>
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Settings</h1>
        <p className="text-sm text-white/40">Manage your account preferences</p>
      </div>

      {/* ── Account status card ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Account Status',
            value: <StatusBadge status={user.account_status ?? 'active'} />,
          },
          {
            label: 'Email',
            value: (
              <span className="flex items-center gap-1.5 text-sm text-white/60">
                {user.email_verified || user.is_email_verified ? (
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="size-3.5 text-white/20" />
                )}
                {user.email_verified || user.is_email_verified
                  ? 'Verified'
                  : 'Unverified'}
              </span>
            ),
          },
          {
            label: 'Last Login',
            value: (
              <span className="text-xs text-white/55">
                {user.last_login
                  ? new Date(user.last_login).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            ),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
          >
            <p className="mb-1 text-[11px] tracking-wider text-white/25 uppercase">
              {label}
            </p>
            {value}
          </div>
        ))}
      </div>

      {/* ── Personal Info ── */}
      <Section
        icon={User}
        iconColor="text-blue-400"
        title="Personal Information"
      >
        <div className="space-y-2">
          {[
            { label: 'Full Name', value: user.full_name },
            { label: 'Email', value: user.email },
            { label: 'Phone', value: user.phone || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-white/30">{label}</span>
              <span className="text-sm text-white/65">{value}</span>
            </div>
          ))}
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white/50 transition hover:bg-white/8 hover:text-white/70"
          >
            <Edit3 className="size-3.5" />
            Edit Personal Info
          </button>
        ) : (
          <EditPersonalForm
            user={user}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        )}
      </Section>

      {/* ── Notification Preferences ── */}
      <Section
        icon={Bell}
        iconColor="text-violet-400"
        title="Notification Preferences"
      >
        {prefsSaved && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2 text-xs text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Preferences saved
          </div>
        )}
        <p className="mb-1 text-xs text-white/30">
          Stored locally on this device.
        </p>
        <div className="divide-y divide-white/5">
          <ToggleRow
            label="Email Notices"
            desc="Receive important notices by email"
            checked={prefs.emailNotices}
            onChange={(v) => togglePref('emailNotices', v)}
          />
          <ToggleRow
            label="Browser Notifications"
            desc="Push notifications when on site"
            checked={prefs.browserNotices}
            onChange={(v) => togglePref('browserNotices', v)}
          />
          <ToggleRow
            label="Event Reminders"
            desc="Reminders before events start"
            checked={prefs.eventReminders}
            onChange={(v) => togglePref('eventReminders', v)}
          />
          <ToggleRow
            label="Weekly Digest"
            desc="Summary of club activity each week"
            checked={prefs.weeklyDigest}
            onChange={(v) => togglePref('weeklyDigest', v)}
          />
        </div>
      </Section>

      {/* ── Security ── */}
      <Section
        icon={Shield}
        iconColor="text-emerald-400"
        title="Account Security"
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-white/50">
            Account authenticated via Google OAuth. Password management is
            handled by your Google account.
          </div>
          {user.suspension_expires_at &&
            new Date(user.suspension_expires_at) > new Date() && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/6 px-4 py-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-300">
                    Account Suspended
                  </p>
                  <p className="text-xs text-white/40">
                    Suspension ends: {formatDate(user.suspension_expires_at)}
                  </p>
                  {user.suspension_reason && (
                    <p className="mt-0.5 text-xs text-white/30">
                      Reason: {user.suspension_reason}
                    </p>
                  )}
                </div>
              </div>
            )}
        </div>
      </Section>

      {/* ── Membership CTA ── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-violet-400/5 p-5">
        <div className="absolute inset-0 bg-linear-to-r from-violet-500/8 to-transparent" />
        <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/12">
              <Sparkles className="size-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">
                Ready to upgrade?
              </p>
              <p className="text-xs text-white/35">
                Apply for full club membership today.
              </p>
            </div>
          </div>

      </div>

      {/* ── Danger Zone ── */}
      <div className="rounded-2xl border border-red-400/15 bg-red-400/3">
        <div className="flex items-center gap-3 border-b border-red-400/10 px-5 py-4">
          <AlertTriangle className="size-4 text-red-400" />
          <h3 className="text-sm font-semibold text-red-400/80">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-white/60">Sign Out</p>
            <p className="text-xs text-white/30">End your current session</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-400/15"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
