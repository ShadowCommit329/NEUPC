/**
 * @file Achievement form modal — create / edit dialog for club
 *   achievements with fields for name, description, icon, criteria,
 *   tier, and point value.
 * @module AdminAchievementFormModal
 */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  ACHIEVEMENT_CATEGORIES,
  CONTEST_PLATFORMS,
  COMMON_RESULTS,
  generateYearOptions,
} from './achievementConfig';
import {
  createAchievementAction,
  updateAchievementAction,
  uploadAchievementFeaturedPhotoAction,
  deleteAchievementFeaturedPhotoAction,
} from '@/app/_lib/achievement-actions';
import { useScrollLock } from '@/app/_lib/hooks';

export default function AchievementFormModal({ achievement, onClose }) {
  const isEdit = Boolean(achievement);
  useScrollLock();
  const formRef = useRef(null);

  const [isTeam, setIsTeam] = useState(achievement?.is_team ?? false);
  const [isFeatured, setIsFeatured] = useState(
    achievement?.is_featured ?? false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(() =>
    achievement?.category
      ? achievement.category
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  );
  const [featuredPhotoFile, setFeaturedPhotoFile] = useState(null);
  const [featuredPhotoPreviewUrl, setFeaturedPhotoPreviewUrl] = useState(
    achievement?.featured_photo?.url ?? null
  );
  const [clearFeaturedPhoto, setClearFeaturedPhoto] = useState(false);
  const featuredPhotoInputRef = useRef(null);

  const years = generateYearOptions();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fd = new FormData(formRef.current);
    fd.set('is_team', String(isTeam));
    fd.set('is_featured', String(isFeatured));
    fd.set('category', selectedCategories.join(', '));

    const res = isEdit
      ? await updateAchievementAction(fd)
      : await createAchievementAction(fd);

    if (!res?.error) {
      // Handle featured photo changes
      const targetId = isEdit ? achievement.id : res.id;
      if (targetId) {
        if (clearFeaturedPhoto && !featuredPhotoFile) {
          const dfd = new FormData();
          dfd.set('achievement_id', targetId);
          await deleteAchievementFeaturedPhotoAction(dfd);
        } else if (featuredPhotoFile) {
          const ufd = new FormData();
          ufd.set('achievement_id', targetId);
          ufd.set('file', featuredPhotoFile);
          await uploadAchievementFeaturedPhotoAction(ufd);
        }
      }
    }

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/50 bg-slate-900 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? '✏️ Edit Achievement' : '➕ Add Achievement'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* ── Form ────────────────────────────────────────────────────── */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 p-6">
          {isEdit && <input type="hidden" name="id" value={achievement.id} />}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              name="title"
              required
              defaultValue={achievement?.title ?? ''}
              placeholder="ICPC Asia Regional 2025 – Champion"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Contest Name + URL */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Contest / Event Name <span className="text-red-400">*</span>
              </label>
              <input
                name="contest_name"
                required
                defaultValue={achievement?.contest_name ?? ''}
                placeholder="ICPC Asia Regional"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Contest URL
              </label>
              <input
                name="contest_url"
                type="url"
                defaultValue={achievement?.contest_url ?? ''}
                placeholder="https://icpc.global/…"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Platform + Profile URL */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Platform
              </label>
              <select
                name="platform"
                defaultValue={achievement?.platform ?? ''}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">— Select platform —</option>
                {CONTEST_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Profile / Submission URL
              </label>
              <input
                name="profile_url"
                type="url"
                defaultValue={achievement?.profile_url ?? ''}
                placeholder="https://codeforces.com/profile/handle"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Result + Year + Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Result <span className="text-red-400">*</span>
              </label>
              <input
                name="result"
                list="result-options"
                required
                defaultValue={achievement?.result ?? ''}
                placeholder="Champion"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <datalist id="result-options">
                {COMMON_RESULTS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Year <span className="text-red-400">*</span>
              </label>
              <select
                name="year"
                required
                defaultValue={achievement?.year ?? new Date().getFullYear()}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Achievement Date
              </label>
              <input
                name="achievement_date"
                type="date"
                defaultValue={achievement?.achievement_date ?? ''}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category — multi-select tag picker */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Categories
              {selectedCategories.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  {selectedCategories.length} selected
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENT_CATEGORIES.map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        active ? prev.filter((c) => c !== cat) : [...prev, cat]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                        : 'border-slate-700/60 bg-slate-800/60 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={achievement?.description ?? ''}
              placeholder="Briefly describe the achievement…"
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Featured Photo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Featured Photo{' '}
              <span className="text-xs font-normal text-slate-500">
                (shown on public page)
              </span>
            </label>
            {featuredPhotoPreviewUrl ? (
              <div className="relative inline-block">
                <div className="relative h-32 w-48 overflow-hidden rounded-xl border border-slate-700/60">
                  <Image
                    src={featuredPhotoPreviewUrl}
                    alt="Featured photo preview"
                    fill
                    className="object-cover"
                    sizes="192px"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFeaturedPhotoFile(null);
                    setFeaturedPhotoPreviewUrl(null);
                    setClearFeaturedPhoto(true);
                    if (featuredPhotoInputRef.current)
                      featuredPhotoInputRef.current.value = '';
                  }}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                  title="Remove featured photo"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3 w-3"
                  >
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => featuredPhotoInputRef.current?.click()}
                  className="mt-2 block text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300"
                >
                  Replace photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => featuredPhotoInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-400 transition-colors hover:border-amber-500/50 hover:text-amber-400"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Upload featured photo
              </button>
            )}
            <input
              ref={featuredPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFeaturedPhotoFile(f);
                  setFeaturedPhotoPreviewUrl(URL.createObjectURL(f));
                  setClearFeaturedPhoto(false);
                }
              }}
            />
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">
                ⭐ Featured achievement
              </p>
              <p className="text-xs text-slate-500">
                Shown in the highlighted section on the public page
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFeatured((f) => !f)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${isFeatured ? 'bg-amber-500' : 'bg-slate-700'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${isFeatured ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Team toggle */}
          <div className="space-y-3 rounded-xl border border-slate-700/40 bg-slate-800/30 p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsTeam((t) => !t)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${isTeam ? 'bg-violet-600' : 'bg-slate-700'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${isTeam ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
              <span className="text-sm text-slate-300">
                {isTeam ? '👥 Team achievement' : '👤 Individual achievement'}
              </span>
            </div>

            {isTeam && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Team Name
                </label>
                <input
                  name="team_name"
                  defaultValue={achievement?.team_name ?? ''}
                  placeholder="NEU Coders Alpha"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Participants (plain text) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Participants{' '}
              <span className="text-xs text-slate-500">
                (comma-separated names)
              </span>
            </label>
            <input
              name="participants"
              defaultValue={achievement?.participants?.join(', ') ?? ''}
              placeholder="Alice, Bob, Charlie"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              These are informal labels. Link registered members via the
              "Members" button on the card.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-700/50 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-900/30 transition-colors hover:bg-amber-700 disabled:opacity-60"
            >
              {loading
                ? 'Saving…'
                : isEdit
                  ? 'Update Achievement'
                  : 'Create Achievement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
