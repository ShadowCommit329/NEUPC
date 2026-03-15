/**
 * @file Guest profile client — editable profile view for updating
 *   personal information, avatar, and contact details.
 * @module GuestProfileClient
 */

'use client';

import { useState, useTransition } from 'react';
import { useScrollLock } from '@/app/_lib/hooks';
import {
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  XCircle,
  Calendar,
  Edit3,
  Save,
  X,
  Sparkles,
  Star,
  Bell,
  Trophy,
  CalendarDays,
  Lock,
  LogOut,
  AlertTriangle,
  ExternalLink,
  Link as LinkIcon,
  Clock,
  ArrowRight,
  Upload,
  Trash2,
  Camera,
  Loader2,
} from 'lucide-react';
import { updateGuestInfoAction } from '@/app/_lib/guest-actions';
import {
  uploadAvatarAction,
  removeAvatarAction,
} from '@/app/_lib/avatar-actions';
import { signOutAction } from '@/app/_lib/actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function profileCompletion(user) {
  const fields = [
    !!user.full_name,
    !!user.email,
    !!user.phone,
    !!user.avatar_url,
    !!(user.email_verified || user.is_email_verified),
  ];
  const done = fields.filter(Boolean).length;
  return Math.round((done / fields.length) * 100);
}

function StatusBadge({ status }) {
  const map = {
    active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    suspended: 'text-red-400 bg-red-400/10 border-red-400/20',
    banned: 'text-red-500 bg-red-500/10 border-red-500/20',
    locked: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? 'border-white/10 bg-white/5 text-white/40'}`}
    >
      {status ?? 'active'}
    </span>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({ onClose }) {
  const [confirmed, setConfirmed] = useState('');
  useScrollLock();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-red-400/20 bg-[#0d0d0f] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-red-400/25 bg-red-400/12">
            <AlertTriangle className="size-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Delete Account</h3>
            <p className="text-xs text-white/40">This action is irreversible</p>
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/55">
          Deleting your account will permanently remove all your data,
          registrations, and any pending membership applications. To confirm,
          type <span className="font-mono text-red-400">DELETE</span> below.
        </p>
        <input
          value={confirmed}
          onChange={(e) => setConfirmed(e.target.value)}
          placeholder="Type DELETE to confirm"
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-red-400/30"
        />
        <div className="flex gap-2">
          <button
            disabled={confirmed !== 'DELETE'}
            className="flex-1 rounded-xl border border-red-400/25 bg-red-400/12 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Delete Account
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/8 bg-white/4 py-2.5 text-sm text-white/50 transition hover:bg-white/8"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────
function EditInfoForm({ user, onCancel, onSaved }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateGuestInfoAction(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(onSaved, 600);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/40">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            name="full_name"
            defaultValue={user.full_name ?? ''}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/25 focus:bg-white/8"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/40">
            Phone
          </label>
          <input
            name="phone"
            defaultValue={user.phone ?? ''}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/25 focus:bg-white/8"
            placeholder="+880 1xxx xxxxxx"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/8 px-3 py-2 text-xs text-red-400">
          <XCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2 text-xs text-emerald-400">
          <CheckCircle2 className="size-3.5 shrink-0" />
          Profile updated successfully
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2.5 text-sm font-medium text-blue-300 transition hover:bg-blue-500/30 disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-white/50 transition hover:text-white/70"
        >
          <X className="size-3.5" />
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, iconColor, title, action, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-8 items-center justify-center rounded-lg border border-white/8 bg-white/5 ${iconColor}`}
          >
            <Icon className="size-4" />
          </div>
          <h3 className="text-sm font-semibold text-white/70">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Guest Avatar Uploader ────────────────────────────────────────────────────
function GuestAvatarUploader({ user, initials }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const isImage = user.avatar_url?.startsWith('/api/image/');

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const result = await uploadAvatarAction(fd);
      if (result?.error) setError(result.error);
    } catch {
      setError('Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      const result = await removeAvatarAction();
      if (result?.error) setError(result.error);
    } catch {
      setError('Failed to remove avatar.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="group relative">
        {isImage ? (
          <img
            src={user.avatar_url}
            alt={user.full_name ?? 'Avatar'}
            className="size-24 rounded-2xl border border-white/12 object-cover"
          />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-2xl border border-white/10 bg-linear-to-br from-violet-500/35 to-blue-500/35">
            <span className="text-3xl font-bold text-white">{initials}</span>
          </div>
        )}
        <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/50 opacity-0 transition group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-white" />
          ) : (
            <Camera className="size-6 text-white" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/50 transition hover:bg-white/8 hover:text-white/70">
          {uploading ? (
            <Loader2 className="size-2.5 animate-spin" />
          ) : (
            <Upload className="size-2.5" />
          )}
          Upload
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
        {isImage && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="flex items-center gap-1 rounded-lg border border-red-400/15 bg-red-400/5 px-2 py-1 text-[10px] text-red-400/60 transition hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 className="size-2.5" />
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuestProfileClient({ user, stats }) {
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const initials = (user.full_name ?? user.email ?? 'G')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const completion = profileCompletion(user);

  const ACTIVITY = [
    {
      label: 'Events Registered',
      value: stats.eventsRegistered,
      icon: CalendarDays,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10 border-blue-400/15',
      href: '/account/guest/participation',
    },
    {
      label: 'Events Attended',
      value: stats.eventsAttended,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10 border-emerald-400/15',
      href: '/account/guest/participation',
    },
    {
      label: 'Certificates',
      value: stats.certificates,
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10 border-amber-400/15',
      href: '/account/guest/participation',
    },
    {
      label: 'Notifications',
      value: stats.notices,
      icon: Bell,
      color: 'text-violet-400',
      bg: 'bg-violet-400/10 border-violet-400/15',
      href: '/account/guest/notifications',
    },
  ];

  return (
    <>
      {showDelete && <DeleteModal onClose={() => setShowDelete(false)} />}

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            My Profile
          </h1>
          <p className="text-sm text-white/40">
            Manage your account information and preferences
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="mt-3 flex w-fit items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/10 hover:text-white/80 sm:mt-0"
          >
            <Edit3 className="size-3.5" />
            Edit Profile
          </button>
        )}
      </div>

      {/* ── Profile Overview Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6">
        <div className="absolute inset-0 bg-linear-to-br from-violet-500/6 via-transparent to-blue-500/4" />

        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            <GuestAvatarUploader user={user} initials={initials} />
            <div className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/20">
              <Star className="size-3.5 text-amber-400" />
            </div>
          </div>

          {/* Name & badges */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              {user.full_name || 'Guest User'}
            </h2>
            <p className="mt-0.5 text-sm text-white/45">{user.email}</p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <StatusBadge status={user.account_status ?? 'active'} />
              <span className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-xs text-amber-400">
                <Star className="size-2.5" />
                Guest Account
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/40">
                <Calendar className="size-2.5" />
                Since{' '}
                {new Date(user.created_at ?? Date.now()).toLocaleDateString(
                  'en-US',
                  { month: 'short', year: 'numeric' }
                )}
              </span>
            </div>

            {/* Profile completion bar */}
            <div className="mx-auto mt-4 max-w-xs sm:mx-0">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-white/30">Profile completion</span>
                <span
                  className={
                    completion >= 80
                      ? 'text-emerald-400'
                      : completion >= 50
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }
                >
                  {completion}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    completion >= 80
                      ? 'bg-emerald-400'
                      : completion >= 50
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                  }`}
                  style={{ width: `${completion}%` }}
                />
              </div>
              {completion < 100 && (
                <p className="mt-1 text-[10px] text-white/25">
                  {!user.phone && 'Add phone • '}
                  {!user.avatar_url && 'Upload avatar • '}
                  {!(user.email_verified || user.is_email_verified) &&
                    'Verify email'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Inline edit form */}
        {editing && (
          <div className="relative mt-6 border-t border-white/8 pt-5">
            <EditInfoForm
              user={user}
              onCancel={() => setEditing(false)}
              onSaved={() => setEditing(false)}
            />
          </div>
        )}
      </div>

      {/* ── Activity Summary ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIVITY.map(({ label, value, icon: Icon, color, bg, href }) => (
          <a
            key={label}
            href={href}
            className="group flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 p-4 transition hover:border-white/12 hover:bg-white/5"
          >
            <div
              className={`flex size-9 items-center justify-center rounded-xl border ${bg}`}
            >
              <Icon className={`size-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="mt-0.5 text-xs leading-tight text-white/40">
                {label}
              </p>
            </div>
            <ArrowRight
              className={`size-3.5 ${color} -mt-1 opacity-0 transition-opacity group-hover:opacity-100`}
            />
          </a>
        ))}
      </div>

      {/* ── Personal Information ── */}
      <SectionCard
        icon={User}
        iconColor="text-blue-400"
        title="Personal Information"
        action={
          !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white/45 transition hover:bg-white/8 hover:text-white/70"
            >
              <Edit3 className="size-3" />
              Edit
            </button>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              label: 'Full Name',
              value: user.full_name || '—',
              editable: true,
            },
            {
              label: 'Email Address',
              value: user.email,
              suffix:
                user.email_verified || user.is_email_verified ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-white/30">
                    <XCircle className="size-3" />
                    Unverified
                  </span>
                ),
              editable: false,
            },
            {
              label: 'Phone Number',
              value: user.phone || '—',
              suffix:
                user.phone &&
                (user.phone_verified ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    Verified
                  </span>
                ) : (
                  <span className="text-[11px] text-white/25">Unverified</span>
                )),
              editable: true,
            },
            {
              label: 'Account Role',
              value: 'Guest',
              editable: false,
              suffix: (
                <span className="text-[11px] text-amber-400/60">
                  Upgrade available
                </span>
              ),
            },
          ].map(({ label, value, editable, suffix }) => (
            <div
              key={label}
              className="rounded-xl border border-white/6 bg-white/2 px-4 py-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[11px] tracking-wider text-white/25 uppercase">
                  {label}
                </p>
                {!editable && (
                  <Lock className="size-3 shrink-0 text-white/15" />
                )}
              </div>
              <p className="text-sm font-medium text-white/70">{value}</p>
              {suffix && <div className="mt-0.5">{suffix}</div>}
            </div>
          ))}
        </div>

        {editing && (
          <div className="mt-5 border-t border-white/6 pt-5">
            <EditInfoForm
              user={user}
              onCancel={() => setEditing(false)}
              onSaved={() => setEditing(false)}
            />
          </div>
        )}
      </SectionCard>

      {/* ── Security ── */}
      <SectionCard icon={Shield} iconColor="text-emerald-400" title="Security">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/6 bg-white/2 px-4 py-3">
              <p className="mb-1 text-[11px] tracking-wider text-white/25 uppercase">
                Last Login
              </p>
              <p className="text-sm text-white/60">
                {formatDateTime(user.last_login)}
              </p>
            </div>
            <div className="rounded-xl border border-white/6 bg-white/2 px-4 py-3">
              <p className="mb-1 text-[11px] tracking-wider text-white/25 uppercase">
                Authentication
              </p>
              <p className="text-sm text-white/60">Google OAuth</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/2 px-4 py-3">
            <p className="mb-1 text-[11px] tracking-wider text-white/25 uppercase">
              Two-Factor Authentication
            </p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">
                Not available for guest accounts
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/30">
                Member only
              </span>
            </div>
          </div>
          {user.suspension_expires_at &&
            new Date(user.suspension_expires_at) > new Date() && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/6 px-4 py-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-300">
                    Account Suspended
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">
                    Expires: {formatDateTime(user.suspension_expires_at)}
                  </p>
                </div>
              </div>
            )}
        </div>
      </SectionCard>

      {/* ── Upgrade CTA ── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-violet-400/5 p-6">
        <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-blue-500/5" />
        <div className="relative">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/15">
              <Sparkles className="size-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                🚀 Upgrade to Full Membership
              </h3>
              <p className="mt-0.5 text-sm text-white/45">
                Unlock the complete NEUPC experience
              </p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              'Contest participation & rankings',
              'Performance analytics dashboard',
              'Member-only resources & materials',
              'Achievement badges & certificates',
              'Advanced notification system',
              'Mentor access & guidance',
            ].map((feat) => (
              <div
                key={feat}
                className="flex items-center gap-2.5 rounded-xl border border-violet-400/10 bg-violet-400/5 px-3.5 py-2.5"
              >
                <CheckCircle2 className="size-3.5 shrink-0 text-violet-400" />
                <span className="text-sm text-white/60">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="overflow-hidden rounded-2xl border border-red-400/12">
        <div className="flex items-center gap-3 border-b border-red-400/10 px-5 py-4">
          <AlertTriangle className="size-4 text-red-400/70" />
          <h3 className="text-sm font-semibold text-red-400/70">Danger Zone</h3>
        </div>
        <div className="divide-y divide-white/5">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-white/60">Sign Out</p>
              <p className="text-xs text-white/30">End your current session</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl border border-red-400/18 bg-red-400/7 px-4 py-2 text-sm font-medium text-red-400/80 transition hover:bg-red-400/14"
              >
                <LogOut className="size-3.5" />
                Sign Out
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-white/60">
                Delete Account
              </p>
              <p className="text-xs text-white/30">
                Permanently remove your account and all data
              </p>
            </div>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 rounded-xl border border-red-400/18 bg-red-400/7 px-4 py-2 text-sm font-medium text-red-400/80 transition hover:bg-red-400/14"
            >
              <AlertTriangle className="size-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
