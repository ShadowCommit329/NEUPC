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
  Search,
  Bookmark,
  CheckCircle,
  FolderOpen,
  SlidersHorizontal,
  Map,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
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
  blogCount = 0,
  roadmapCount = 0,
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

  // Sidebar category items (shared between sidebar + mobile chip strip)
  const allCatItem = { id: '', name: 'All', count: total };
  const filterItems = [
    { id: '__bookmarked', name: 'Bookmarked', icon: 'bookmark', count: saved.length },
    { id: '__completed', name: 'Completed', icon: 'check' },
  ];

  const activeCatId = filterState.categoryId || '';
  const activeTypeFilter = filterState.type || '';

  function handleCatClick(catId) {
    updateFilters({ ...filterState, categoryId: catId, type: '' });
  }
  function handleSpecialFilter(key) {
    const next = activeTypeFilter === key ? '' : key;
    updateFilters({ ...filterState, type: next, categoryId: '' });
  }

  return (
    <div ref={gridRef} className="space-y-3">

      {/* ── Mobile/tablet: horizontal chip strip (hidden on lg+) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {/* All chip */}
        <button
          onClick={() => handleCatClick('')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
            !activeCatId && !activeTypeFilter
              ? 'border-[rgba(124,131,255,0.35)] bg-[rgba(124,131,255,0.12)] text-[#aab0ff]'
              : 'border-white/[0.06] bg-[#121317] text-white/50 hover:border-white/[0.12] hover:text-white/80'
          }`}
        >
          All
          <span className="tabular-nums text-[10.5px] opacity-60">{total}</span>
        </button>

        {/* Category chips */}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCatClick(cat.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
              activeCatId === cat.id
                ? 'border-[rgba(124,131,255,0.35)] bg-[rgba(124,131,255,0.12)] text-[#aab0ff]'
                : 'border-white/[0.06] bg-[#121317] text-white/50 hover:border-white/[0.12] hover:text-white/80'
            }`}
          >
            {cat.name}
          </button>
        ))}

        {/* Divider dot */}
        <span className="shrink-0 text-white/15">·</span>

        {/* Bookmarked chip */}
        <button
          onClick={() => handleSpecialFilter('bookmarked')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
            activeTypeFilter === 'bookmarked'
              ? 'border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.10)] text-[#fcd34d]'
              : 'border-white/[0.06] bg-[#121317] text-white/50 hover:border-white/[0.12] hover:text-white/80'
          }`}
        >
          <Bookmark className="h-3 w-3" />
          Bookmarked
          {saved.length > 0 && <span className="tabular-nums text-[10.5px] opacity-60">{saved.length}</span>}
        </button>

        {/* Divider dot */}
        <span className="shrink-0 text-white/15">·</span>

        {/* Blogs chip */}
        <Link
          href="/blogs"
          target="_blank"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.06] bg-[#121317] px-3 py-1.5 text-[12px] font-medium text-white/50 transition-all hover:border-white/[0.12] hover:text-white/80"
        >
          <BookOpen className="h-3 w-3" />
          Blogs
          {blogCount > 0 && <span className="tabular-nums text-[10.5px] opacity-60">{blogCount}</span>}
        </Link>

        {/* Roadmaps chip */}
        <Link
          href="/roadmaps"
          target="_blank"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.06] bg-[#121317] px-3 py-1.5 text-[12px] font-medium text-white/50 transition-all hover:border-white/[0.12] hover:text-white/80"
        >
          <Map className="h-3 w-3" />
          Roadmaps
          {roadmapCount > 0 && <span className="tabular-nums text-[10.5px] opacity-60">{roadmapCount}</span>}
        </Link>
      </div>

      {/* ── Main two-column layout ── */}
      <div className="flex gap-[18px] items-start">

        {/* ── Category sidebar (desktop only) ── */}
        <aside className="hidden lg:block w-[200px] shrink-0 rounded-[12px] border border-white/[0.06] bg-[#121317] p-[14px] sticky top-[70px]">
          <div className="mb-[6px] px-[6px] pb-[6px] text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/25">
            Categories
          </div>
          <div className="flex flex-col gap-[1px]">
            {/* All */}
            <button
              onClick={() => handleCatClick('')}
              className={`flex w-full items-center gap-2 rounded-[6px] border-0 px-[8px] py-[6px] text-left text-[12.5px] transition-all ${
                !activeCatId && !activeTypeFilter
                  ? 'bg-[#181a1f] font-medium text-white'
                  : 'bg-transparent text-white/50 hover:bg-[#181a1f] hover:text-white/80'
              }`}
            >
              <span className="flex-1">All</span>
              <span className="tabular-nums text-[11px] text-white/25">{total}</span>
            </button>

            {/* Categories */}
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCatClick(cat.id)}
                className={`flex w-full items-center gap-2 rounded-[6px] border-0 px-[8px] py-[6px] text-left text-[12.5px] transition-all ${
                  activeCatId === cat.id
                    ? 'bg-[#181a1f] font-medium text-white'
                    : 'bg-transparent text-white/50 hover:bg-[#181a1f] hover:text-white/80'
                }`}
              >
                <span className="flex-1 truncate">{cat.name}</span>
                {cat.resource_count != null && (
                  <span className="tabular-nums text-[11px] text-white/25">{cat.resource_count}</span>
                )}
              </button>
            ))}

            {/* Divider */}
            <div className="my-[10px] h-px bg-white/[0.06]" />
            <div className="mb-[6px] px-[6px] text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/25">
              Filters
            </div>

            {/* Bookmarked */}
            <button
              onClick={() => handleSpecialFilter('bookmarked')}
              className={`flex w-full items-center gap-2 rounded-[6px] border-0 px-[8px] py-[6px] text-left text-[12.5px] transition-all ${
                activeTypeFilter === 'bookmarked'
                  ? 'bg-[#181a1f] font-medium text-white'
                  : 'bg-transparent text-white/50 hover:bg-[#181a1f] hover:text-white/80'
              }`}
            >
              <Bookmark className="h-3 w-3 shrink-0" />
              <span className="flex-1">Bookmarked</span>
              <span className="tabular-nums text-[11px] text-white/25">{saved.length}</span>
            </button>

            {/* Completed */}
            <button
              onClick={() => handleSpecialFilter('completed')}
              className={`flex w-full items-center gap-2 rounded-[6px] border-0 px-[8px] py-[6px] text-left text-[12.5px] transition-all ${
                activeTypeFilter === 'completed'
                  ? 'bg-[#181a1f] font-medium text-white'
                  : 'bg-transparent text-white/50 hover:bg-[#181a1f] hover:text-white/80'
              }`}
            >
              <CheckCircle className="h-3 w-3 shrink-0" />
              <span className="flex-1">Completed</span>
            </button>

            {/* Explore divider */}
            <div className="my-[10px] h-px bg-white/[0.06]" />
            <div className="mb-[6px] px-[6px] text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/25">
              Explore
            </div>

            {/* Blogs */}
            <Link
              href="/blogs"
              target="_blank"
              className="flex w-full items-center gap-2 rounded-[6px] px-[8px] py-[6px] text-[12.5px] text-white/50 transition-all hover:bg-[#181a1f] hover:text-white/80 group"
            >
              <BookOpen className="h-3 w-3 shrink-0" />
              <span className="flex-1">Blogs</span>
              {blogCount > 0 && (
                <span className="tabular-nums text-[11px] text-white/25">{blogCount}</span>
              )}
              <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
            </Link>

            {/* Roadmaps */}
            <Link
              href="/roadmaps"
              target="_blank"
              className="flex w-full items-center gap-2 rounded-[6px] px-[8px] py-[6px] text-[12.5px] text-white/50 transition-all hover:bg-[#181a1f] hover:text-white/80 group"
            >
              <Map className="h-3 w-3 shrink-0" />
              <span className="flex-1">Roadmaps</span>
              {roadmapCount > 0 && (
                <span className="tabular-nums text-[11px] text-white/25">{roadmapCount}</span>
              )}
              <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
            </Link>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Search + type filter row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
              <input
                value={filterState.q}
                onChange={(e) => updateFilters({ ...filterState, q: e.target.value })}
                placeholder="Search resources..."
                className="w-full rounded-[8px] border border-white/[0.06] bg-[#121317] py-[7px] pr-3 pl-9 text-[12.5px] text-white placeholder-white/25 outline-none transition-all focus:border-white/[0.14] focus:bg-[#181a1f]"
              />
              {filterState.q && (
                <button
                  onClick={() => updateFilters({ ...filterState, q: '' })}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={filterState.type && !['bookmarked','completed'].includes(filterState.type) ? filterState.type : ''}
              onChange={(e) => updateFilters({ ...filterState, type: e.target.value, categoryId: filterState.categoryId })}
              className="hidden rounded-[8px] border border-white/[0.06] bg-[#121317] px-3 py-[7px] text-[12.5px] text-white/60 outline-none transition-all focus:border-white/[0.14] focus:bg-[#181a1f] appearance-none cursor-pointer sm:block"
            >
              <option value="">All Types</option>
              <option value="video">Video</option>
              <option value="youtube">YouTube</option>
              <option value="rich_text">Article</option>
              <option value="file">File / PDF</option>
              <option value="external_link">Link</option>
              <option value="image">Image</option>
              <option value="facebook_post">Facebook</option>
              <option value="linkedin_post">LinkedIn</option>
            </select>
          </div>

          {/* Filter match info */}
          {hasFilters && total > 0 && (
            <p className="text-[12px] text-white/30" role="status" aria-live="polite">
              <span className="font-medium text-white/60">{total}</span> resource{total !== 1 ? 's' : ''} found
            </p>
          )}

          {/* Resource grid */}
          <ResourceGrid
            resources={resources}
            bookmarkedIds={saved}
            onToggleBookmark={canBookmark ? onToggleBookmark : undefined}
            detailBasePath={effectiveBasePath}
            onOpenResource={openModal}
          />

          {/* Pagination */}
          {total > 0 && totalPages > 1 && (
            <nav
              aria-label="Resources pagination"
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-white/[0.06] bg-[#121317] px-4 py-3"
            >
              <p className="text-[12px] text-white/30" aria-live="polite">
                <span className="font-medium text-white/60">{rangeStart}–{rangeEnd}</span>
                {' '}of{' '}
                <span className="font-medium text-white/60">{total}</span>
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1 || pending}
                  aria-label="Previous page"
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-white/[0.06] bg-transparent text-white/40 transition-all hover:border-white/[0.12] hover:bg-[#181a1f] hover:text-white/80 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {pageNumbers.map((item) =>
                  typeof item === 'string' ? (
                    <span key={item} className="flex h-7 w-5 items-center justify-center text-[11px] text-white/20">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goPage(item)}
                      disabled={pending}
                      aria-current={item === page ? 'page' : undefined}
                      className={`flex h-7 min-w-[28px] items-center justify-center rounded-[6px] text-[12px] font-medium tabular-nums transition-all ${
                        item === page
                          ? 'bg-[#7c83ff] text-white'
                          : 'text-white/40 hover:bg-[#181a1f] hover:text-white/80'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= totalPages || pending}
                  aria-label="Next page"
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-white/[0.06] bg-transparent text-white/40 transition-all hover:border-white/[0.12] hover:bg-[#181a1f] hover:text-white/80 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </nav>
          )}

          {total > 0 && totalPages <= 1 && (
            <p className="py-1 text-center text-[11.5px] text-white/20" role="status">
              {total} resource{total !== 1 ? 's' : ''} total
            </p>
          )}

          {pending && (
            <div className="flex items-center justify-center gap-2 py-4" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-white/30" />
              <span className="text-[12px] text-white/30">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Resource detail modal ── */}
      {activeResource && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-sm"
          onClick={closeModal}
          role="presentation"
          aria-hidden="true"
        >
          <div
            ref={modalRef}
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0d0e11] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Resource details: ${activeResource.title}`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0d0e11]/95 px-5 py-3 backdrop-blur-sm">
              <h2 className="min-w-0 truncate pr-4 text-[13px] font-semibold text-white">
                {activeResource.title}
              </h2>
              <button
                type="button"
                data-close-modal
                onClick={closeModal}
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[6px] border border-white/[0.09] bg-transparent text-white/40 transition-all hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white focus:outline-none"
                aria-label="Close resource details"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              <ViewTracker resourceId={activeResource.id} source="member_modal" />
              <ResourceViewer resource={activeResource} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
