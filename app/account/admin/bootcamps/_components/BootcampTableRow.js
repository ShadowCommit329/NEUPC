'use client';

import Link from 'next/link';
import {
  Terminal,
  Edit3,
  Trash2,
  Loader2,
  Star,
  Users,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { getStatusConfig, formatRelativeDate } from './bootcampConfig';

export default function BootcampTableRow({
  bootcamp,
  onToggleFeatured,
  onDelete,
  deleteLoading,
}) {
  const sc = getStatusConfig(bootcamp.status);

  return (
    <tr className="group hover:bg-white/[0.025] transition-colors cursor-pointer">
      {/* Track */}
      <td className="py-3.5 px-5">
        <Link
          href={`/account/admin/bootcamps/${bootcamp.id}`}
          className="flex items-center gap-3"
        >
          <div className="h-11 w-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:border-violet-500/40 transition-colors">
            {bootcamp.thumbnail ? (
              <img src={bootcamp.thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <Terminal className="h-4 w-4 text-violet-400/50" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
              {bootcamp.title}
            </div>
            {bootcamp.batch_info && (
              <div className="text-[11px] font-mono text-violet-400/60 mt-0.5">{bootcamp.batch_info}</div>
            )}
            {bootcamp.is_featured && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-2.5 w-2.5 text-amber-400 fill-current" />
                <span className="text-[10px] text-amber-400/70 font-medium">Featured</span>
              </div>
            )}
          </div>
        </Link>
      </td>

      {/* Status */}
      <td className="py-3.5 px-5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sc.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </td>

      {/* Students */}
      <td className="py-3.5 px-5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-blue-400/60" />
          <span className="text-sm font-medium text-white tabular-nums">
            {bootcamp.enrollment_count ?? 0}
          </span>
        </div>
      </td>

      {/* Lessons */}
      <td className="py-3.5 px-5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-emerald-400/60" />
          <span className="text-sm font-medium text-white tabular-nums">
            {bootcamp.total_lessons ?? 0}
          </span>
        </div>
      </td>

      {/* Updated */}
      <td className="py-3.5 px-5">
        <span className="text-xs text-gray-500 font-mono">
          {bootcamp.updated_at ? formatRelativeDate(bootcamp.updated_at) : '—'}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-5">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/account/admin/bootcamps/${bootcamp.id}`}
            className="p-1.5 text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all border border-transparent hover:border-violet-500/20"
            title="Edit"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => onToggleFeatured(bootcamp.id)}
            className={`p-1.5 rounded-lg transition-all border border-transparent ${
              bootcamp.is_featured
                ? 'text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20'
                : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20'
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
              className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all border border-transparent hover:border-emerald-500/20"
              title="Preview"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <button
            onClick={() => onDelete(bootcamp.id)}
            disabled={deleteLoading}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20 disabled:opacity-40"
            title="Delete"
          >
            {deleteLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
