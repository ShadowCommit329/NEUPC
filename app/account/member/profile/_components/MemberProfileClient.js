/**
 * @file Member profile client — editable profile form displaying
 *   personal info, student details, competitive handles, and linked
 *   social accounts.
 * @module MemberProfileClient
 */

'use client';

import { useState, useTransition } from 'react';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Code2,
  Globe,
  Github,
  Linkedin,
  Trophy,
  Pencil,
  Check,
  X,
  Loader2,
  Layers,
  Tag,
  FileText,
  BadgeCheck,
  Upload,
  Trash2,
  Camera,
} from 'lucide-react';
import {
  updateMemberInfoAction,
  updateMemberProfileAction,
} from '@/app/_lib/member-profile-actions';
import {
  uploadAvatarAction,
  removeAvatarAction,
} from '@/app/_lib/avatar-actions';

// ─── Field Row ─────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/5 py-3 last:border-0">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/4">
        <Icon className="size-3.5 text-white/40" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] tracking-wider text-white/30 uppercase">
          {label}
        </p>
        <p
          className={`text-sm wrap-break-word text-white/70 ${mono ? 'font-mono' : ''}`}
        >
          {value || <span className="text-white/25 italic">Not set</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Handle Chip ────────────────────────────────────────────────────────────
function HandleChip({ label, value, href }) {
  if (!value) return null;
  const inner = (
    <span className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/16 hover:bg-white/8 hover:text-white/80">
      <Code2 className="size-3 shrink-0" />
      <span className="font-medium text-white/40">{label}:</span> {value}
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2.5 border-b border-white/6 px-5 py-3.5">
        <Icon className="size-4 text-white/40" />
        <h3 className="text-sm font-semibold text-white/70">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

// ─── Tags display ────────────────────────────────────────────────────────────
function TagList({ items, color = 'bg-white/6 text-white/50 border-white/8' }) {
  if (!items?.length)
    return <span className="text-sm text-white/25 italic">None listed</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className={`rounded-full border px-2.5 py-0.5 text-xs ${color}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Edit Account Form ───────────────────────────────────────────────────────
function EditAccountForm({ user, onDone }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData) {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberInfoAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(onDone, 800);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Full Name
          </label>
          <input
            name="full_name"
            defaultValue={user.full_name}
            required
            className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20 focus:bg-white/6"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Phone
          </label>
          <input
            name="phone"
            defaultValue={user.phone ?? ''}
            placeholder="+880…"
            className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20 focus:bg-white/6"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-400">
          Account info updated successfully!
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Save Changes
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-2 text-sm text-white/50 transition hover:bg-white/6"
        >
          <X className="size-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Edit Profile Form ───────────────────────────────────────────────────────
function EditProfileForm({ profile, onDone }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData) {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberProfileAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(onDone, 800);
      }
    });
  }

  const field = (name, label, placeholder = '', defaultVal = '') => (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-white/50">
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultVal}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20 focus:bg-white/6"
      />
    </div>
  );

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">
          Bio
        </label>
        <textarea
          name="bio"
          defaultValue={profile?.bio ?? ''}
          placeholder="Tell us about yourself…"
          rows={3}
          className="w-full resize-none rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20 focus:bg-white/6"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field('github', 'GitHub Username', 'username', profile?.github ?? '')}
        {field(
          'linkedin',
          'LinkedIn URL',
          'https://linkedin.com/in/…',
          profile?.linkedin ?? ''
        )}
        {field(
          'codeforces_handle',
          'Codeforces Handle',
          'handle',
          profile?.codeforces_handle ?? ''
        )}
        {field(
          'vjudge_handle',
          'VJudge Handle',
          'handle',
          profile?.vjudge_handle ?? ''
        )}
        {field(
          'atcoder_handle',
          'AtCoder Handle',
          'handle',
          profile?.atcoder_handle ?? ''
        )}
        {field(
          'leetcode_handle',
          'LeetCode Handle',
          'handle',
          profile?.leetcode_handle ?? ''
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Skills <span className="text-white/25">(comma-separated)</span>
          </label>
          <input
            name="skills"
            defaultValue={(profile?.skills ?? []).join(', ')}
            placeholder="C++, Python, Data Structures…"
            className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20 focus:bg-white/6"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Interests <span className="text-white/25">(comma-separated)</span>
          </label>
          <input
            name="interests"
            defaultValue={(profile?.interests ?? []).join(', ')}
            placeholder="Competitive Programming, ML…"
            className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-white placeholder-white/25 transition outline-none focus:border-white/20 focus:bg-white/6"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-400">
          Profile updated successfully!
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Save Profile
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-2 text-sm text-white/50 transition hover:bg-white/6"
        >
          <X className="size-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Avatar Upload Widget ────────────────────────────────────────────────────
function AvatarUploader({ user }) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
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
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemove() {
    setError(null);
    setRemoving(true);
    try {
      const result = await removeAvatarAction();
      if (result?.error) setError(result.error);
    } catch {
      setError('Failed to remove avatar.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      {/* avatar with overlay */}
      <div className="group relative shrink-0">
        {isImage ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="size-20 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full border border-white/10 bg-white/8 text-2xl font-bold text-white/60">
            {user.avatar_url && user.avatar_url.length <= 3
              ? user.avatar_url
              : user.full_name?.charAt(0)?.toUpperCase() ?? 'M'}
          </div>
        )}
        <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-white" />
          ) : (
            <Camera className="size-5 text-white" />
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

      <div className="flex flex-col items-center gap-1.5 sm:items-start">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/8 hover:text-white/80">
          {uploading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Upload className="size-3" />
          )}
          {uploading ? 'Uploading…' : 'Upload new avatar'}
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
            disabled={removing}
            className="flex items-center gap-1.5 rounded-lg border border-red-400/15 bg-red-400/5 px-3 py-1.5 text-xs text-red-400/70 transition hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
          >
            {removing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
            {removing ? 'Removing…' : 'Remove avatar'}
          </button>
        )}
        <p className="text-[10px] text-white/25">
          JPEG, PNG, WebP, or GIF · Max 5 MB
        </p>
        {error && (
          <p className="text-[11px] text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MemberProfileClient({ user, memberProfile }) {
  const [editingAccount, setEditingAccount] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const approved = memberProfile?.approved === true;
  const isImage = user.avatar_url?.startsWith('/api/image/');

  return (
    <div className="space-y-6">
      {/* page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            My Profile
          </h1>
          <p className="text-sm text-white/40">
            Manage your personal information and competitive programming handles
          </p>
        </div>
        {approved && (
          <span className="flex items-center gap-1.5 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400 sm:self-auto">
            <BadgeCheck className="size-3.5" />
            Approved Member
          </span>
        )}
      </div>

      {/* avatar + name hero */}
      <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/3 p-5">
        {isImage ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="size-16 shrink-0 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-xl font-bold text-white/60">
            {user.avatar_url && user.avatar_url.length <= 3
              ? user.avatar_url
              : user.full_name?.charAt(0)?.toUpperCase() ?? 'M'}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">
            {user.full_name}
          </h2>
          <p className="truncate text-sm text-white/40">{user.email}</p>
          {memberProfile && (
            <p className="mt-0.5 text-xs text-white/30">
              {memberProfile.department} · Session {memberProfile.session}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Account Info ── */}
        <SectionCard title="Account Information" icon={User}>
          {editingAccount ? (
            <div className="py-4">
              <EditAccountForm
                user={user}
                onDone={() => setEditingAccount(false)}
              />
            </div>
          ) : (
            <>
              <InfoRow icon={User} label="Full Name" value={user.full_name} />
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={Phone} label="Phone" value={user.phone} />
              <div className="border-t border-white/5 py-4">
                <p className="mb-3 text-[10px] tracking-wider text-white/30 uppercase">
                  Avatar
                </p>
                <AvatarUploader user={user} />
              </div>
              <div className="flex justify-end py-3">
                <button
                  onClick={() => setEditingAccount(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/8 hover:text-white/80"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Academic Info ── */}
        <SectionCard title="Academic Information" icon={GraduationCap}>
          {memberProfile ? (
            <>
              <InfoRow
                icon={BookOpen}
                label="Student ID"
                value={memberProfile.student_id}
                mono
              />
              <InfoRow
                icon={GraduationCap}
                label="Department"
                value={memberProfile.department}
              />
              <InfoRow
                icon={Layers}
                label="Session"
                value={memberProfile.session}
              />
              <InfoRow
                icon={BookOpen}
                label="Semester"
                value={memberProfile.semester}
              />
              {memberProfile.cgpa != null && (
                <InfoRow
                  icon={Trophy}
                  label="CGPA"
                  value={String(memberProfile.cgpa)}
                />
              )}
            </>
          ) : (
            <p className="py-6 text-center text-sm text-white/30 italic">
              No academic profile found.
            </p>
          )}
        </SectionCard>
      </div>

      {/* ── Bio & Interests & Skills ── */}
      <SectionCard title="Bio & Interests" icon={FileText}>
        {editingProfile ? (
          <div className="py-4">
            <EditProfileForm
              profile={memberProfile}
              onDone={() => setEditingProfile(false)}
            />
          </div>
        ) : (
          <div className="space-y-5 py-4">
            <div>
              <p className="mb-2 text-xs tracking-wider text-white/30 uppercase">
                Bio
              </p>
              {memberProfile?.bio ? (
                <p className="text-sm leading-relaxed text-white/60">
                  {memberProfile.bio}
                </p>
              ) : (
                <p className="text-sm text-white/25 italic">No bio set</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs tracking-wider text-white/30 uppercase">
                  <Tag className="size-3" /> Skills
                </p>
                <TagList
                  items={memberProfile?.skills}
                  color="bg-blue-400/10 text-blue-400/80 border-blue-400/20"
                />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs tracking-wider text-white/30 uppercase">
                  <Tag className="size-3" /> Interests
                </p>
                <TagList
                  items={memberProfile?.interests}
                  color="bg-violet-400/10 text-violet-400/80 border-violet-400/20"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/8 hover:text-white/80"
              >
                <Pencil className="size-3" />
                Edit
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Competitive Programming Handles ── */}
      <SectionCard title="Competitive Programming Handles" icon={Code2}>
        {editingProfile ? null : (
          <div className="space-y-3 py-4">
            <div className="flex flex-wrap gap-2">
              <HandleChip
                label="Codeforces"
                value={memberProfile?.codeforces_handle}
                href={
                  memberProfile?.codeforces_handle
                    ? `https://codeforces.com/profile/${memberProfile.codeforces_handle}`
                    : undefined
                }
              />
              <HandleChip
                label="VJudge"
                value={memberProfile?.vjudge_handle}
                href={
                  memberProfile?.vjudge_handle
                    ? `https://vjudge.net/user/${memberProfile.vjudge_handle}`
                    : undefined
                }
              />
              <HandleChip
                label="AtCoder"
                value={memberProfile?.atcoder_handle}
                href={
                  memberProfile?.atcoder_handle
                    ? `https://atcoder.jp/users/${memberProfile.atcoder_handle}`
                    : undefined
                }
              />
              <HandleChip
                label="LeetCode"
                value={memberProfile?.leetcode_handle}
                href={
                  memberProfile?.leetcode_handle
                    ? `https://leetcode.com/${memberProfile.leetcode_handle}`
                    : undefined
                }
              />
              <HandleChip
                label="GitHub"
                value={memberProfile?.github}
                href={
                  memberProfile?.github
                    ? `https://github.com/${memberProfile.github}`
                    : undefined
                }
              />
              <HandleChip
                label="LinkedIn"
                value={
                  memberProfile?.linkedin
                    ? memberProfile.linkedin.split('/').filter(Boolean).pop()
                    : null
                }
                href={memberProfile?.linkedin ?? undefined}
              />
            </div>
            {!memberProfile?.codeforces_handle &&
              !memberProfile?.vjudge_handle &&
              !memberProfile?.atcoder_handle &&
              !memberProfile?.leetcode_handle &&
              !memberProfile?.github &&
              !memberProfile?.linkedin && (
                <p className="text-sm text-white/25 italic">
                  No handles set yet.
                </p>
              )}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/8 hover:text-white/80"
              >
                <Pencil className="size-3" />
                Edit Handles
              </button>
            </div>
          </div>
        )}
        {editingProfile && (
          <p className="py-4 text-center text-xs text-white/30 italic">
            Use the Bio & Interests edit form above to update your handles.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
