/**
 * @file Achievement card — displays a single achievement badge with
 *   icon, name, criteria, earned-count, and edit / delete actions.
 * @module AdminAchievementCard
 */

'use client';

import { useState, useTransition } from 'react';
import {
  getCategoryConfig,
  TYPE_CONFIG,
  formatDate,
} from './achievementConfig';
import {
  deleteAchievementAction,
  toggleAchievementFeaturedAction,
} from '@/app/_lib/achievement-actions';

export default function AchievementCard({
  achievement,
  onEdit,
  onManageMembers,
  onManageGallery,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFeatured, setIsFeatured] = useState(
    achievement?.is_featured ?? false
  );
  const [featuredPending, setFeaturedPending] = useState(false);
  const [, startTransition] = useTransition();

  const cats = achievement.category
    ? achievement.category
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const catConf = getCategoryConfig(cats[0] ?? null);
  const typeConf = achievement.is_team
    ? TYPE_CONFIG.team
    : TYPE_CONFIG.individual;
  const memberCount = achievement.member_achievements?.length ?? 0;
  const creatorName = achievement.users?.full_name ?? 'Admin';

  async function handleToggleFeatured(e) {
    e.stopPropagation();
    setFeaturedPending(true);
    const fd = new FormData();
    fd.set('id', achievement.id);
    fd.set('featured', String(!isFeatured));
    const res = await toggleAchievementFeaturedAction(fd);
    setFeaturedPending(false);
    if (!res?.error) setIsFeatured((f) => !f);
  }

  async function handleDelete(e) {
    e.stopPropagation();
    setDeleting(true);
    const fd = new FormData();
    fd.set('id', achievement.id);
    startTransition(async () => {
      await deleteAchievementAction(fd);
      setDeleting(false);
    });
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-slate-800/60 transition-all duration-200 hover:shadow-lg ${isFeatured ? 'border-amber-500/50 hover:shadow-amber-900/20' : 'border-slate-700/50 hover:border-amber-500/30 hover:shadow-amber-900/10'}`}
    >
      {/* Top accent bar */}
      <div
        className={`h-1 bg-linear-to-r ${isFeatured ? 'from-amber-400 via-yellow-400 to-amber-300/60' : 'from-amber-500/60 via-yellow-500/40 to-transparent'}`}
      />

      {/* Featured star button */}
      <button
        onClick={handleToggleFeatured}
        disabled={featuredPending}
        title={isFeatured ? 'Remove from featured' : 'Mark as featured'}
        className={`absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
          isFeatured
            ? 'border-amber-400/60 bg-amber-400/20 text-amber-300'
            : 'border-transparent bg-transparent text-slate-600 opacity-0 group-hover:opacity-100 hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-400'
        }`}
      >
        {featuredPending ? (
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 20 20"
            fill={isFeatured ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        )}
      </button>

      <div className="space-y-3 p-4">
        {/* ── Header row ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-white">
              {achievement.title}
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {achievement.contest_name}
            </p>
          </div>

          {/* Year badge — right-padded to leave room for the star button */}
          <span className="mr-6 shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-400">
            {achievement.year}
          </span>
        </div>

        {/* ── Result pill ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            🏅 {achievement.result}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${typeConf.badge}`}
          >
            {typeConf.emoji} {typeConf.label}
          </span>
        </div>

        {/* ── Categories ─────────────────────────────────────────────── */}
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cats.map((cat) => {
              const conf = getCategoryConfig(cat);
              return (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${conf.color}`}
                >
                  {conf.emoji} {cat}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Team name (if team) ─────────────────────────────────────── */}
        {achievement.is_team && achievement.team_name && (
          <p className="text-xs text-slate-400">
            <span className="text-slate-500">Team:</span>{' '}
            {achievement.team_name}
          </p>
        )}

        {/* ── Description ─────────────────────────────────────────────── */}
        {achievement.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
            {achievement.description}
          </p>
        )}

        {/* ── Participants (plain text list) ──────────────────────────── */}
        {achievement.participants?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {achievement.participants.slice(0, 4).map((p) => (
              <span
                key={p}
                className="rounded-full border border-slate-600/30 bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300"
              >
                {p}
              </span>
            ))}
            {achievement.participants.length > 4 && (
              <span className="text-xs text-slate-500">
                +{achievement.participants.length - 4}
              </span>
            )}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-slate-700/40 pt-2">
          <div className="space-y-0.5">
            <p className="max-w-32 truncate text-xs text-slate-500">
              By {creatorName}
            </p>
            {achievement.achievement_date && (
              <p className="text-xs text-slate-600">
                {formatDate(achievement.achievement_date)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Gallery button */}
            <button
              onClick={() => onManageGallery(achievement)}
              title="Manage gallery photos"
              className="relative flex items-center gap-1 rounded-lg border border-transparent p-1.5 text-slate-400 transition-colors hover:border-sky-500/20 hover:bg-sky-500/10 hover:text-sky-400"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-3 3.001zm9-3.56a.75.75 0 00-.75.75.75.75 0 00.75.75.75.75 0 00.75-.75.75.75 0 00-.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
              {achievement.gallery_images?.length > 0 && (
                <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" />
              )}
            </button>

            {/* Members button */}
            <button
              onClick={() => onManageMembers(achievement)}
              title="Manage linked members"
              className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-violet-500/20 hover:bg-violet-500/10 hover:text-violet-400"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
              </svg>
              {memberCount > 0 && <span>{memberCount}</span>}
            </button>

            {/* Edit */}
            <button
              onClick={() => onEdit(achievement)}
              title="Edit"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </button>

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
                >
                  {deleting ? '…' : 'Yes'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-600"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                title="Delete"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Platform badge */}
        {achievement.platform && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-400">
              🖥️ {achievement.platform}
            </span>
            {achievement.profile_url && (
              <a
                href={achievement.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-slate-500 underline underline-offset-2 transition-colors hover:text-sky-400"
              >
                Profile ↗
              </a>
            )}
          </div>
        )}

        {/* Contest URL link */}
        {achievement.contest_url && (
          <a
            href={achievement.contest_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-sky-400"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path
                fillRule="evenodd"
                d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                clipRule="evenodd"
              />
            </svg>
            View contest page
          </a>
        )}
      </div>
    </div>
  );
}
