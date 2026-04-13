'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Loader2,
  X,
  ArrowUp,
} from 'lucide-react';
import ResourceGrid from '@/app/_components/resources/ResourceGrid';
import ResourceFilters from '@/app/_components/resources/ResourceFilters';
import { toggleResourceBookmarkAction } from '@/app/_lib/member-resources-actions';
import ResourceViewer from '@/app/_components/resources/ResourceViewer';
import ViewTracker from '@/app/_components/resources/ViewTracker';

export default function ResourcesClient({
  resources,
  categories,
  page,
  total,
  pageSize,
  bookmarkedIds = [],
  canBookmark = false,
  basePath,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saved, setSaved] = useState(bookmarkedIds);
  const [activeResource, setActiveResource] = useState(null);
  const [pending, start] = useTransition();
  const gridRef = useRef(null);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  const effectiveBasePath = basePath || pathname || '/account';
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  const filterState = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      type: searchParams.get('type') || '',
      categoryId: searchParams.get('categoryId') || '',
    }),
    [searchParams]
  );

  const updateFilters = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key, val) => {
        if (val) params.set(key, val);
        else params.delete(key);
      };

      setOrDelete('q', next.q);
      setOrDelete('type', next.type);
      setOrDelete('categoryId', next.categoryId);
      params.set('page', '1');

      router.push(`${effectiveBasePath}?${params.toString()}`);
    },
    [searchParams, effectiveBasePath, router]
  );

  const goPage = useCallback(
    (targetPage) => {
      const p = Math.max(1, Math.min(totalPages, targetPage));
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(p));
      router.push(`${effectiveBasePath}?${params.toString()}`);

      // Scroll to top of grid on page change
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [totalPages, searchParams, effectiveBasePath, router]
  );

  const onToggleBookmark = useCallback(
    (resourceId) => {
      if (!canBookmark) {
        router.push('/login');
        return;
      }

      start(async () => {
        const result = await toggleResourceBookmarkAction(resourceId);
        if (result?.error) return;
        setSaved((prev) =>
          result.bookmarked
            ? [...new Set([...prev, resourceId])]
            : prev.filter((id) => id !== resourceId)
        );
      });
    },
    [canBookmark, router]
  );

  const rangeStart = Math.min((page - 1) * pageSize + 1, total);
  const rangeEnd = Math.min(page * pageSize, total);
  const hasFilters =
    filterState.q || filterState.type || filterState.categoryId;

  const closeModal = useCallback(() => {
    setActiveResource(null);
    // Restore focus to the element that triggered the modal
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  const openModal = useCallback((resource) => {
    if (!resource) return;
    previousFocusRef.current = document.activeElement;
    setActiveResource(resource);
  }, []);

  // Lock body scroll & handle keyboard when modal is open
  useEffect(() => {
    if (!activeResource) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();

      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    // Focus the close button when modal opens
    requestAnimationFrame(() => {
      const closeBtn = modalRef.current?.querySelector('[data-close-modal]');
      closeBtn?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeResource, closeModal]);

  // Generate page numbers with smart ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set([1, totalPages]);
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.add(i);
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        result.push('ellipsis-' + sorted[i]);
      }
      result.push(sorted[i]);
    }
    return result;
  }, [totalPages, page]);

  return (
    <div className="space-y-5" ref={gridRef}>
      {/* Filters */}
      <ResourceFilters
        value={filterState}
        categories={categories}
        onChange={updateFilters}
      />

      {/* Results summary when filtering */}
      {hasFilters && total > 0 && (
        <div
          className="flex items-center gap-2 rounded-xl border border-blue-500/10 bg-blue-500/[0.03] px-4 py-2.5"
          role="status"
          aria-live="polite"
        >
          <BookOpen className="h-3.5 w-3.5 text-blue-400/60" />
          <p className="text-xs text-gray-400">
            Found <span className="font-semibold text-blue-300">{total}</span>{' '}
            resource{total !== 1 ? 's' : ''} matching your filters
          </p>
        </div>
      )}

      {/* Resource Grid */}
      <ResourceGrid
        resources={resources}
        bookmarkedIds={saved}
        onToggleBookmark={canBookmark ? onToggleBookmark : undefined}
        detailBasePath={effectiveBasePath}
        onOpenResource={openModal}
      />

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {total > 0 && totalPages > 1 && (
        <nav
          aria-label="Resources pagination"
          className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 sm:flex-row sm:px-5"
        >
          {/* Page info */}
          <p className="text-sm text-gray-500" aria-live="polite">
            Showing{' '}
            <span className="font-medium text-gray-300">
              {rangeStart}&ndash;{rangeEnd}
            </span>{' '}
            of <span className="font-medium text-gray-300">{total}</span>{' '}
            resources
          </p>

          {/* Page controls */}
          <div className="flex items-center gap-1.5">
            {/* Previous button */}
            <button
              onClick={() => goPage(page - 1)}
              disabled={page <= 1 || pending}
              aria-label="Go to previous page"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm font-medium text-gray-300 transition-all hover:border-white/12 hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((item) => {
                if (typeof item === 'string') {
                  return (
                    <span
                      key={item}
                      className="flex h-8 w-6 items-center justify-center text-xs text-gray-600"
                      aria-hidden="true"
                    >
                      &hellip;
                    </span>
                  );
                }
                const isActive = item === page;
                return (
                  <button
                    key={item}
                    onClick={() => goPage(item)}
                    disabled={pending}
                    aria-label={`Go to page ${item}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            <button
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages || pending}
              aria-label="Go to next page"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm font-medium text-gray-300 transition-all hover:border-white/12 hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-40"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}

      {/* Single page result count */}
      {total > 0 && totalPages <= 1 && (
        <div className="flex items-center justify-center py-2" role="status">
          <p className="text-xs text-gray-600">
            {total} resource{total !== 1 ? 's' : ''} total
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {pending && (
        <div
          className="flex items-center justify-center gap-2 py-4"
          role="status"
          aria-label="Loading resources"
        >
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      )}

      {/* ── Resource detail modal ──────────────────────────────── */}
      {activeResource && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:px-5"
          onClick={closeModal}
          role="presentation"
          aria-hidden="true"
        >
          <div
            ref={modalRef}
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1120] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Resource details: ${activeResource.title}`}
          >
            {/* Sticky modal header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0B1120]/95 px-4 py-3 backdrop-blur-sm sm:px-6">
              <h2 className="min-w-0 truncate pr-4 text-sm font-semibold text-white">
                {activeResource.title}
              </h2>
              <button
                type="button"
                data-close-modal
                onClick={closeModal}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                aria-label="Close resource details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <ViewTracker
                resourceId={activeResource.id}
                source="member_modal"
              />
              <ResourceViewer resource={activeResource} />
            </div>

            {/* Back to top hint on scroll */}
            <div className="pointer-events-none absolute right-4 bottom-4 sm:right-6">
              <button
                type="button"
                onClick={() => {
                  modalRef.current
                    ?.querySelector('.overflow-y-auto')
                    ?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-gray-400 opacity-0 shadow-lg backdrop-blur-sm transition-all hover:bg-black/80 hover:text-white [.overflow-y-auto:hover~&]:opacity-100"
                aria-label="Scroll to top"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
