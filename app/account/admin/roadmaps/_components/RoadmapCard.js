/**
 * @file Roadmap card — displays a single roadmap with status badge, difficulty,
 *   category, views count, featured toggle, and edit/delete/status actions.
 * @module AdminRoadmapCard
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  Edit3,
  Trash2,
  Eye,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Tag,
} from 'lucide-react';
import {
  getStatusConfig,
  getDifficultyConfig,
  getCategoryConfig,
  formatRoadmapDate,
} from './roadmapConfig';
import {
  updateRoadmapStatusAction,
  toggleRoadmapFeaturedAction,
  deleteRoadmapAction,
} from '@/app/_lib/roadmap-actions';

const ORDERED_STATUSES = ['draft', 'published', 'archived'];

export default function RoadmapCard({ roadmap, onEdit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [featuredPending, setFeaturedPending] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [flash, setFlash] = useState(null);

  const sc = getStatusConfig(roadmap.status);
  const dc = getDifficultyConfig(roadmap.difficulty);
  const cc = getCategoryConfig(roadmap.category);

  function showFlash(type) {
    setFlash(type);
    setTimeout(() => setFlash(null), 1800);
  }

  async function handleStatusChange(newStatus) {
    setStatusOpen(false);
    if (newStatus === roadmap.status) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', roadmap.id);
      fd.set('status', newStatus);
      const result = await updateRoadmapStatusAction(fd);
      if (!result?.error) {
        router.refresh();
        showFlash('status');
      }
    });
  }

  async function handleToggleFeatured() {
    setFeaturedPending(true);
    const fd = new FormData();
    fd.set('id', roadmap.id);
    fd.set('featured', String(!roadmap.is_featured));
    const result = await toggleRoadmapFeaturedAction(fd);
    setFeaturedPending(false);
    if (!result?.error) {
      router.refresh();
      showFlash('featured');
    }
  }

  async function handleDelete() {
    setDeletePending(true);
    const fd = new FormData();
    fd.set('id', roadmap.id);
    const result = await deleteRoadmapAction(fd);
    setDeletePending(false);
    if (!result?.error) router.refresh();
  }

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 ${sc.cardBg} ${sc.cardBorder}`}
    >
      {/* top accent bar */}
      <div className={`h-1 w-full bg-linear-to-r ${sc.gradient}`} />

      {/* thumbnail / placeholder */}
      <div className="relative h-36 w-full overflow-hidden">
        {roadmap.thumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={roadmap.thumbnail}
            alt={roadmap.title || ''}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : null}
        <div
          className={`flex h-full w-full items-center justify-center bg-linear-to-br text-5xl ${cc.placeholder} ${roadmap.thumbnail ? 'hidden' : 'flex'}`}
        >
          {cc.icon}
        </div>

        {/* hover overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

        {/* featured star */}
        <button
          onClick={handleToggleFeatured}
          disabled={featuredPending}
          title={
            roadmap.is_featured ? 'Remove from featured' : 'Mark as featured'
          }
          className={`absolute top-2.5 left-2.5 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 ${
            roadmap.is_featured
              ? 'border-amber-400/60 bg-amber-500/30 text-amber-300 shadow-lg shadow-amber-900/30'
              : 'border-white/10 bg-black/30 text-gray-500 opacity-0 group-hover:opacity-100 hover:border-amber-400/40 hover:text-amber-300'
          }`}
        >
          {featuredPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Star
              className={`h-3.5 w-3.5 ${roadmap.is_featured ? 'fill-amber-400' : ''}`}
            />
          )}
        </button>

        {/* status badge */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase ${sc.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* flash feedback */}
        {flash && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-xl bg-black/80 px-4 py-2 text-xs font-semibold text-emerald-300 backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4" />
              {flash === 'featured'
                ? roadmap.is_featured
                  ? 'Unfeatured'
                  : 'Featured!'
                : 'Status updated'}
            </div>
          </div>
        )}

        {/* view link */}
        {roadmap.status === 'published' && (
          <a
            href={`/roadmaps/${roadmap.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-medium text-gray-300 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/70 hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </a>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* category + difficulty */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cc.badge}`}
          >
            <span>{cc.icon}</span>
            {roadmap.category}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${dc.badge}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'currentColor', opacity: 0.7 }}
            />
            {dc.label}
          </span>
        </div>

        {/* title */}
        <h3 className="line-clamp-2 text-sm leading-snug font-bold text-white">
          {roadmap.title}
        </h3>

        {/* description */}
        {roadmap.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
            {roadmap.description}
          </p>
        )}

        {/* meta row */}
        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-white/5 pt-3 text-[11px] text-gray-500">
          {roadmap.estimated_duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {roadmap.estimated_duration}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {roadmap.views ?? 0} views
          </span>
          {roadmap.prerequisites?.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {roadmap.prerequisites.length} prereq
              {roadmap.prerequisites.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="ml-auto">
            {formatRoadmapDate(roadmap.created_at)}
          </span>
        </div>
      </div>

      {/* action footer */}
      <div className="flex items-center gap-1.5 border-t border-white/5 bg-black/10 px-3 py-2.5">
        {/* status dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen((v) => !v)}
            disabled={isPending}
            className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            )}
            {sc.label}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${statusOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {statusOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setStatusOpen(false)}
              />
              <div className="absolute bottom-full left-0 z-30 mb-1.5 min-w-32.5 overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-xl shadow-black/50">
                {ORDERED_STATUSES.map((s) => {
                  const cfg = getStatusConfig(s);
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-xs transition-colors hover:bg-white/5 ${
                        s === roadmap.status
                          ? 'font-semibold text-white'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                      {s === roadmap.status && (
                        <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* edit */}
        <button
          onClick={() => onEdit(roadmap)}
          className="ml-auto flex items-center gap-1 rounded-lg border border-white/8 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-gray-400 transition-all hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"
        >
          <Edit3 className="h-3 w-3" />
          Edit
        </button>

        {/* delete */}
        {deleteConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deletePending}
              className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-red-300 transition-all hover:bg-red-500/30"
            >
              {deletePending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Confirm'
              )}
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="rounded-lg px-2 py-1.5 text-[10px] text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-gray-500 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
