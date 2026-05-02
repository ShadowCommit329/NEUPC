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
  TrendingUp,
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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d1117] shadow-xl transition-all duration-300 hover:border-violet-500/30 hover:shadow-violet-500/10 hover:shadow-2xl">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#0a0c14]">
        {bootcamp.thumbnail ? (
          <img
            src={bootcamp.thumbnail}
            alt={bootcamp.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/30 via-violet-800/10 to-indigo-900/20">
            <GraduationCap className="h-14 w-14 text-violet-500/25" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent opacity-60" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-lg backdrop-blur-md ${sc.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* Featured badge */}
        {bootcamp.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-lg backdrop-blur-md ring-1 ring-amber-500/30">
              <Star className="h-2.5 w-2.5 fill-current" />
              Featured
            </span>
          </div>
        )}

        {/* Price */}
        <div className="absolute right-3 bottom-3">
          <span className="rounded-xl bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm ring-1 ring-white/10">
            {formatPrice(bootcamp.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white/95 transition-colors group-hover:text-white">
          {bootcamp.title}
        </h3>

        {bootcamp.batch_info && (
          <p className="mt-1 font-mono text-[10px] font-medium text-violet-400/70">
            {bootcamp.batch_info}
          </p>
        )}

        {bootcamp.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
            {bootcamp.description}
          </p>
        )}

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-white/4 px-2 py-1 text-[11px] text-gray-400">
            <Users className="h-3 w-3 text-blue-400" />
            <span className="tabular-nums">{bootcamp.enrollment_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-white/4 px-2 py-1 text-[11px] text-gray-400">
            <BookOpen className="h-3 w-3 text-emerald-400" />
            <span className="tabular-nums">{bootcamp.total_lessons ?? 0}</span>
          </div>
          {bootcamp.total_duration > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-white/4 px-2 py-1 text-[11px] text-gray-400">
              <Clock className="h-3 w-3 text-amber-400" />
              <span>{formatDuration(bootcamp.total_duration)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between border-t border-white/6 pt-3">
            <span className="font-mono text-[10px] text-gray-700">
              {formatRelativeDate(bootcamp.created_at)}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-0.5">
              <Link
                href={`/account/admin/bootcamps/${bootcamp.id}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-blue-500/15 hover:text-blue-400"
                title="Edit & Curriculum"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => onToggleFeatured(bootcamp.id)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                  bootcamp.is_featured
                    ? 'text-amber-400 hover:bg-amber-500/15'
                    : 'text-gray-600 hover:bg-amber-500/15 hover:text-amber-400'
                }`}
                title={bootcamp.is_featured ? 'Unfeature' : 'Feature'}
              >
                <Star className={`h-3.5 w-3.5 ${bootcamp.is_featured ? 'fill-current' : ''}`} />
              </button>
              {bootcamp.status === 'published' && (
                <Link
                  href={`/account/member/bootcamps/${bootcamp.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-emerald-500/15 hover:text-emerald-400"
                  title="Preview as member"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              <button
                onClick={() => onDelete(bootcamp.id)}
                disabled={deleteLoading}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"
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
