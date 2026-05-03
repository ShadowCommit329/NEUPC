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
  ArrowRight,
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
  const price = formatPrice(bootcamp.price);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0c0e16] shadow-xl transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_8px_40px_rgba(124,92,255,0.15)] hover:-translate-y-0.5">

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#090b12]">
        {bootcamp.thumbnail ? (
          <img
            src={bootcamp.thumbnail}
            alt={bootcamp.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/30 via-[#0a0c14] to-indigo-900/20">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(rgba(124,92,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.15) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <GraduationCap className="relative h-12 w-12 text-violet-500/30" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e16] via-transparent to-transparent opacity-80" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-lg backdrop-blur-md ${sc.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${bootcamp.status === 'published' ? 'animate-pulse' : ''}`} />
            {sc.label}
          </span>
        </div>

        {/* Featured badge */}
        {bootcamp.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-lg backdrop-blur-md ring-1 ring-amber-500/30">
              <Star className="h-2.5 w-2.5 fill-current" />
              Featured
            </span>
          </div>
        )}

        {/* Price tag */}
        <div className="absolute bottom-3 right-3">
          <span className="rounded-lg bg-black/70 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm ring-1 ring-white/10">
            {price}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">

        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white/95 group-hover:text-white transition-colors">
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

        {/* Stats pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md bg-blue-500/8 px-2 py-1 text-[11px] text-blue-300/70">
            <Users className="h-3 w-3" />
            <span className="tabular-nums font-medium">{bootcamp.enrollment_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-emerald-500/8 px-2 py-1 text-[11px] text-emerald-300/70">
            <BookOpen className="h-3 w-3" />
            <span className="tabular-nums font-medium">{bootcamp.total_lessons ?? 0}</span>
          </div>
          {bootcamp.total_duration > 0 && (
            <div className="flex items-center gap-1 rounded-md bg-amber-500/8 px-2 py-1 text-[11px] text-amber-300/70">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{formatDuration(bootcamp.total_duration)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between border-t border-white/6 pt-3">
            <span className="font-mono text-[10px] text-gray-700">
              {formatRelativeDate(bootcamp.created_at)}
            </span>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5">
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

              <Link
                href={`/account/admin/bootcamps/${bootcamp.id}`}
                className="flex h-7 items-center justify-center gap-1 rounded-lg px-2 text-gray-500 transition-all hover:bg-violet-500/15 hover:text-violet-400 text-[11px] font-medium ml-1"
                title="Edit & Curriculum"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden group-hover:inline">Edit</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
