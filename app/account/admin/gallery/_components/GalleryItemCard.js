/**
 * @file Gallery item card — displays a single media item’s thumbnail,
 *   caption, category tag, and edit / delete / feature actions.
 * @module AdminGalleryItemCard
 */

'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { getTypeConfig, formatRelativeDate } from './galleryConfig';
import {
  toggleGalleryFeaturedAction,
  deleteGalleryItemAction,
} from '@/app/_lib/gallery-actions';

export default function GalleryItemCard({
  item,
  onEdit,
  noFeatured = false,
  deleteAction,
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [featured, setFeatured] = useState(item.is_featured ?? false);
  const [isPending, startTransition] = useTransition();
  const [imgError, setImgError] = useState(false);

  const effectiveDeleteAction = deleteAction ?? deleteGalleryItemAction;

  const typeConf = getTypeConfig(item.type);
  const uploaderName = item.users?.full_name ?? 'Unknown';
  const eventTitle = item.events?.title ?? null;

  // ── Featured Toggle ────────────────────────────────────────────────────────
  function handleToggleFeatured(e) {
    e.stopPropagation();
    const newVal = !featured;
    setFeatured(newVal);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', item.id);
      fd.set('featured', String(newVal));
      const res = await toggleGalleryFeaturedAction(fd);
      if (res?.error) setFeatured(!newVal); // revert on error
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function handleDeleteClick(e) {
    e.stopPropagation();
    setConfirmDelete(true);
  }

  async function handleConfirmDelete(e) {
    e.stopPropagation();
    setDeleting(true);
    const fd = new FormData();
    fd.set('id', item.id);
    await effectiveDeleteAction(fd);
    setDeleting(false);
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/60 transition-all duration-200 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-900/20">
      {/* ── Media Preview ──────────────────────────────────────────────────── */}
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        {item.type === 'image' && !imgError ? (
          <Image
            src={item.url}
            alt={item.caption ?? 'Gallery image'}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-linear-to-br ${typeConf.gradient} flex items-center justify-center text-slate-500`}
          >
            {typeConf.icon}
          </div>
        )}

        {/* Caption overlay */}
        {item.caption && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-black/70 to-transparent px-3 py-2 transition-transform duration-200 group-hover:translate-y-0">
            <p className="line-clamp-2 text-xs text-white">{item.caption}</p>
          </div>
        )}

        {/* Featured toggle (top-left) — hidden for event_gallery items */}
        {!noFeatured && (
          <button
            onClick={handleToggleFeatured}
            disabled={isPending}
            title={featured ? 'Unfeature' : 'Mark as featured'}
            className={`absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm transition-all duration-150 ${
              featured
                ? 'scale-110 bg-amber-500 text-white shadow-md shadow-amber-500/40'
                : 'bg-black/40 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-amber-500/20 hover:text-amber-400'
            }`}
          >
            ⭐
          </button>
        )}

        {/* Type badge (top-right) */}
        <span
          className={`absolute top-2 right-2 rounded-full border px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${typeConf.badge}`}
        >
          {typeConf.emoji} {typeConf.label}
        </span>
      </div>

      {/* ── Info ───────────────────────────────────────────────────────────── */}
      <div className="space-y-2 p-3">
        {/* Category + Event */}
        <div className="flex flex-wrap gap-1.5">
          {item.category && (
            <span className="rounded-full border border-slate-600/40 bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300">
              {item.category}
            </span>
          )}
          {eventTitle && (
            <span className="max-w-35 truncate rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400">
              📅 {eventTitle}
            </span>
          )}
        </div>

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-slate-700/40 px-1.5 py-0.5 text-xs text-slate-500"
              >
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-slate-600">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: uploader + order + actions */}
        <div className="flex items-center justify-between border-t border-slate-700/40 pt-1">
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">{uploaderName}</p>
            <p className="text-xs text-slate-600" suppressHydrationWarning>
              {formatRelativeDate(item.created_at)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Display order badge */}
            <span className="px-1.5 text-xs text-slate-600">
              # {item.display_order}
            </span>

            {/* Edit */}
            <button
              onClick={() => onEdit(item)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
              title="Edit"
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
                  onClick={handleConfirmDelete}
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
                onClick={handleDeleteClick}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Delete"
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
      </div>
    </div>
  );
}
