/**
 * @file Reusable inline pagination component.
 * Replaces duplicated pagination in BlogsClient, EventsClient,
 * GalleryClient, AchievementsClient.
 *
 * @module InlinePagination
 */

'use client';

import { cn } from '@/app/_lib/utils';

/**
 * Build smart page numbers with ellipsis for large page counts.
 * @param {number} current - Current page (1-indexed)
 * @param {number} total - Total pages
 * @returns {(number|string)[]}
 */
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return pages;
}

/**
 * InlinePagination — Standardized pagination footer.
 *
 * @param {Object} props
 * @param {number} props.currentPage
 * @param {number} props.totalPages
 * @param {number} props.total - Total number of items
 * @param {number} props.perPage
 * @param {(page: number) => void} props.onPageChange
 * @param {string} [props.itemLabel='item'] - Label for items (e.g. 'article', 'event')
 */
export default function InlinePagination({
  currentPage,
  totalPages,
  total,
  perPage,
  onPageChange,
  itemLabel = 'item',
}) {
  if (totalPages <= 1) return null;

  const from = Math.min((currentPage - 1) * perPage + 1, total);
  const to = Math.min(currentPage * perPage, total);
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/6 pt-6 sm:flex-row sm:justify-between">
      {/* Results range */}
      <p className="font-mono text-[10px] tracking-wider text-zinc-600 uppercase tabular-nums">
        Showing{' '}
        <span className="text-zinc-300">{from}–{to}</span>
        {' '}of{' '}
        <span className="text-zinc-300">{total}</span>
        {' '}{itemLabel}{total !== 1 ? 's' : ''}
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-1.5">
        {/* Prev */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-3 font-mono text-[10px] tracking-wider text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime disabled:pointer-events-none disabled:opacity-30"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="flex h-9 w-9 items-center justify-center font-mono text-[10px] text-zinc-600">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl font-mono text-[10px] font-bold transition-all',
                p === currentPage
                  ? 'bg-neon-lime text-black shadow-[0_0_16px_-4px_rgba(182,243,107,0.5)]'
                  : 'border border-white/10 bg-white/4 text-zinc-400 hover:border-neon-lime/30 hover:text-neon-lime'
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-3 font-mono text-[10px] tracking-wider text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime disabled:pointer-events-none disabled:opacity-30"
        >
          Next
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
