/**
 * @file Gallery management client — admin interface for uploading,
 *   categorising, tagging, reordering, and featuring gallery items
 *   with bulk-add support.
 * @module AdminGalleryManagementClient
 */

'use client';

import { useState, useMemo } from 'react';
import GalleryItemCard from './GalleryItemCard';
import GalleryItemFormModal from './GalleryItemFormModal';
import BulkAddModal from './BulkAddModal';
import EventBulkUploadModal from './EventBulkUploadModal';
import DraggablePhotoGrid from './DraggablePhotoGrid';
import EventGalleryItemEditModal from './EventGalleryItemEditModal';
import { getStatCards, GALLERY_CATEGORIES } from './galleryConfig';
import { ImageIcon, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  reorderEventGalleryAction,
  deleteEventGalleryItemAction,
} from '@/app/_lib/gallery-actions';

const TABS = ['all', 'image', 'video', 'featured', 'by_event'];

function TabLabel(tab) {
  switch (tab) {
    case 'all':
      return 'All';
    case 'image':
      return '🖼️ Images';
    case 'video':
      return '🎬 Videos';
    case 'featured':
      return '⭐ Featured';
    case 'by_event':
      return '📅 By Event';
    default:
      return tab;
  }
}

export default function GalleryManagementClient({
  initialItems = [],
  stats,
  events = [],
  eventGalleryItems = [],
}) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  // Tracks which event's add-modal is pre-populated
  const [addEventId, setAddEventId] = useState(null);
  // Tracks which event's bulk file upload modal is open
  const [bulkUploadEvent, setBulkUploadEvent] = useState(null);

  const [editItem, setEditItem] = useState(null);
  const [editEventItem, setEditEventItem] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // ── Pagination ──────────────────────────────────────────────────────────
  const ITEMS_PER_PAGE = 24;
  const [currentPage, setCurrentPage] = useState(1);

  function openAddForEvent(eventId) {
    setAddEventId(eventId);
    setAddOpen(true);
  }
  function closeAdd() {
    setAddOpen(false);
    setAddEventId(null);
  }

  // ── Derived categories & events from data ─────────────────────────────────
  const allCategories = useMemo(
    () =>
      [...new Set(initialItems.map((i) => i.category).filter(Boolean))].sort(),
    [initialItems]
  );

  // ── Tab counts ────────────────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      all: initialItems.length + eventGalleryItems.length,
      image:
        initialItems.filter((i) => i.type === 'image').length +
        eventGalleryItems.filter((i) => i.type === 'image').length,
      video:
        initialItems.filter((i) => i.type === 'video').length +
        eventGalleryItems.filter((i) => i.type === 'video').length,
      featured: initialItems.filter((i) => i.is_featured).length,
      by_event: events.length,
    }),
    [initialItems, eventGalleryItems, events]
  );

  // ── Grouped by event (for by_event tab) ──────────────────────────────────
  const groupedByEvent = useMemo(() => {
    const map = new Map();
    // seed all known events so they show even with 0 items
    events.forEach((ev) => map.set(ev.id, { event: ev, items: [] }));
    eventGalleryItems.forEach((item) => {
      if (!map.has(item.event_id)) {
        const ev = {
          id: item.event_id,
          title: item.events?.title || 'Unknown Event',
        };
        map.set(item.event_id, { event: ev, items: [] });
      }
      map.get(item.event_id).items.push(item);
    });
    return [...map.values()].sort((a, b) => b.items.length - a.items.length);
  }, [eventGalleryItems, events]);

  // ── Filtered items ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Normalize event gallery items so they render with GalleryItemCard
    const normalizedEventItems = eventGalleryItems.map((i) => ({
      ...i,
      _source: 'event_gallery',
      category: null,
      tags: [],
      is_featured: false,
    }));

    // featured tab: only gallery_items have is_featured; exclude event_gallery
    let items =
      tab === 'featured'
        ? [...initialItems]
        : [...initialItems, ...normalizedEventItems];

    if (tab === 'image') items = items.filter((i) => i.type === 'image');
    else if (tab === 'video') items = items.filter((i) => i.type === 'video');
    else if (tab === 'featured') items = items.filter((i) => i.is_featured);

    if (categoryFilter)
      items = items.filter((i) => i.category === categoryFilter);
    if (eventFilter) items = items.filter((i) => i.event_id === eventFilter);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.caption?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          i.tags?.some((t) => t.toLowerCase().includes(q)) ||
          i.events?.title?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [
    initialItems,
    eventGalleryItems,
    tab,
    search,
    categoryFilter,
    eventFilter,
  ]);

  // Reset page when filters change
  const filterKey = `${tab}-${search}-${categoryFilter}-${eventFilter}`;
  useMemo(() => setCurrentPage(1), [filterKey]);

  // ── Paginated slice ─────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(
    () =>
      filtered.slice(
        (safePage - 1) * ITEMS_PER_PAGE,
        safePage * ITEMS_PER_PAGE
      ),
    [filtered, safePage]
  );

  const statCards = getStatCards(stats);

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-500/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">Gallery</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
                <ImageIcon className="h-5 w-5 text-violet-400" />
              </div>
              Gallery Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage all photos and videos in the public gallery.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Bulk Add
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="group flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-xl hover:shadow-violet-900/40"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Item
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`bg-linear-to-br ${s.color} flex flex-col gap-1 rounded-xl border p-3.5`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">{s.icon}</span>
              <span className={`text-xl font-bold ${s.text}`}>{s.value}</span>
            </div>
            <p className="truncate text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions, tags, categories…"
            className="w-full rounded-xl border border-slate-700/50 bg-slate-800/60 py-2 pr-4 pl-9 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-violet-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Event filter */}
        {events.length > 0 && (
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-violet-500 focus:outline-none"
          >
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex w-fit gap-1 rounded-xl border border-slate-700/40 bg-slate-800/50 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {TabLabel(t)}{' '}
            <span
              className={`ml-1 text-xs ${tab === t ? 'text-violet-200' : 'text-slate-600'}`}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* ── By Event view ─────────────────────────────────────────────── */}
      {tab === 'by_event' && (
        <div className="space-y-8">
          {groupedByEvent.map(({ event: ev, items: evItems }) => (
            <div
              key={ev.id}
              className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📅</span>
                  <div>
                    <h3 className="font-semibold text-white">{ev.title}</h3>
                    <p className="text-xs text-slate-500">
                      {evItems.length} photo{evItems.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBulkUploadEvent(ev)}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                    </svg>
                    Upload Files
                  </button>
                  <button
                    onClick={() => openAddForEvent(ev.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                    Add URL
                  </button>
                </div>
              </div>
              {evItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/50 py-10 text-center">
                  <span className="mb-2 text-3xl opacity-40">🖼️</span>
                  <p className="text-sm text-slate-500">
                    No photos yet for this event
                  </p>
                  <button
                    onClick={() => setBulkUploadEvent(ev)}
                    className="mt-3 text-xs font-medium text-emerald-400 hover:underline"
                  >
                    Upload files
                  </button>
                </div>
              ) : (
                <DraggablePhotoGrid
                  items={evItems}
                  onEdit={(i) => setEditEventItem(i)}
                  reorderAction={reorderEventGalleryAction}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Grid (normal tabs) ──────────────────────────────────────────── */}
      {tab !== 'by_event' && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-3 text-5xl">🖼️</div>
              <p className="font-medium text-slate-400">No items found</p>
              <p className="mt-1 text-sm text-slate-500">
                {search || categoryFilter || eventFilter
                  ? 'Try adjusting your filters.'
                  : 'Add the first gallery item to get started.'}
              </p>
              {!search && !categoryFilter && !eventFilter && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
                >
                  Add Item
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of{' '}
                {filtered.length} items
                {filtered.length !==
                  initialItems.length + eventGalleryItems.length &&
                  ` (${initialItems.length + eventGalleryItems.length} total)`}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedItems.map((item) => (
                  <GalleryItemCard
                    key={item.id}
                    item={item}
                    onEdit={(i) =>
                      i._source === 'event_gallery'
                        ? setEditEventItem(i)
                        : setEditItem(i)
                    }
                    noFeatured={item._source === 'event_gallery'}
                    deleteAction={
                      item._source === 'event_gallery'
                        ? deleteEventGalleryItemAction
                        : undefined
                    }
                  />
                ))}
              </div>

              {/* ── Pagination Controls ─────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Page {safePage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={safePage <= 1}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - safePage) <= 2
                      )
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1)
                          acc.push('ellipsis-' + p);
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p) =>
                        typeof p === 'string' ? (
                          <span
                            key={p}
                            className="px-1.5 text-xs text-slate-600"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              p === safePage
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage >= totalPages}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    >
                      Next →
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safePage >= totalPages}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {addOpen && (
        <GalleryItemFormModal
          events={events}
          defaultEventId={addEventId}
          onClose={closeAdd}
        />
      )}
      {editItem && (
        <GalleryItemFormModal
          item={editItem}
          events={events}
          onClose={() => setEditItem(null)}
        />
      )}
      {editEventItem && (
        <EventGalleryItemEditModal
          item={editEventItem}
          onClose={() => setEditEventItem(null)}
        />
      )}
      {bulkOpen && (
        <BulkAddModal events={events} onClose={() => setBulkOpen(false)} />
      )}
      {bulkUploadEvent && (
        <EventBulkUploadModal
          event={bulkUploadEvent}
          events={events}
          onClose={() => setBulkUploadEvent(null)}
        />
      )}
    </div>
  );
}
