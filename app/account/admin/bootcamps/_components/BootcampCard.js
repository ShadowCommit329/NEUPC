/**
 * @file Bootcamp card component for grid view.
 * @module BootcampCard
 */

'use client';

import Link from 'next/link';
import {
  GraduationCap,
  Star,
  Users,
  BookOpen,
  Clock,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import {
  getStatusConfig,
  formatDuration,
  formatPrice,
  formatRelativeDate,
} from './bootcampConfig';

export default function BootcampCard({
  bootcamp,
  onToggleFeatured,
  onDelete,
  deleteLoading,
}) {
  const sc = getStatusConfig(bootcamp.status);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0d1117] transition-all hover:border-white/15 hover:bg-[#161b22]">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
        {bootcamp.thumbnail ? (
          <img
            src={bootcamp.thumbnail}
            alt={bootcamp.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/20 to-violet-800/10">
            <GraduationCap className="h-12 w-12 text-violet-500/30" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${sc.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* Featured badge */}
        {bootcamp.is_featured && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm">
              <Star className="h-2.5 w-2.5 fill-current" />
              Featured
            </span>
          </div>
        )}

        {/* Price */}
        <div className="absolute right-2 bottom-2">
          <span className="rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {formatPrice(bootcamp.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">
          {bootcamp.title}
        </h3>

        {bootcamp.batch_info && (
          <p className="mt-1 font-mono text-[10px] text-gray-500">
            {bootcamp.batch_info}
          </p>
        )}

        {bootcamp.description && (
          <p className="mt-2 line-clamp-2 text-xs text-gray-500">
            {bootcamp.description}
          </p>
        )}

        {/* Stats */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {bootcamp.enrollment_count ?? 0} enrolled
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {bootcamp.total_lessons ?? 0} lessons
          </span>
          {bootcamp.total_duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(bootcamp.total_duration)}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="font-mono text-[10px] text-gray-700">
              {formatRelativeDate(bootcamp.created_at)}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Link
                href={`/account/admin/bootcamps/${bootcamp.id}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-blue-400"
                title="Edit & Curriculum"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => onToggleFeatured(bootcamp.id)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/8 ${
                  bootcamp.is_featured
                    ? 'text-amber-400'
                    : 'text-gray-500 hover:text-amber-400'
                }`}
                title={bootcamp.is_featured ? 'Unfeature' : 'Feature'}
              >
                <Star
                  className={`h-3.5 w-3.5 ${bootcamp.is_featured ? 'fill-current' : ''}`}
                />
              </button>
              {bootcamp.status === 'published' && (
                <Link
                  href={`/account/member/bootcamps/${bootcamp.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-emerald-400"
                  title="Preview as member"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              <button
                onClick={() => onDelete(bootcamp.id)}
                disabled={deleteLoading}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-red-400 disabled:opacity-50"
                title="Delete"
              >
                {deleteLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
