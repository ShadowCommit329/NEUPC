'use client';

/**
 * @file JourneyModal — professional admin UI for Journey / Timeline items.
 * DB columns: year, event, icon, description, display_order
 */

import { useState, useTransition, useEffect, useRef } from 'react';
import {
  createJourneyItemAction,
  updateJourneyItemAction,
  deleteJourneyItemAction,
} from '@/app/_lib/achievement-actions';
import { useScrollLock } from '@/app/_lib/hooks';

/* ── Micro SVG icons ───────────────────────────────────────────────── */
const IconPlus = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
    <path
      fillRule="evenodd"
      d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
      clipRule="evenodd"
    />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

const INPUT_CLS =
  'w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none ring-0 transition focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/20';

/* ── Item form panel ────────────────────────────────────────────────── */
function ItemFormPanel({ initial, onSave, onCancel, saving }) {
  const [year, setYear] = useState(initial?.year ?? '');
  const [event, setEvent] = useState(initial?.event ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '🎯');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [displayOrder, setDisplayOrder] = useState(
    String(initial?.display_order ?? '')
  );
  const [err, setErr] = useState('');
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    const fd = new FormData();
    if (initial?.id) fd.set('id', initial.id);
    fd.set('year', year);
    fd.set('event', event);
    fd.set('icon', icon || '🎯');
    fd.set('description', description);
    fd.set('display_order', displayOrder || '0');
    const res = await onSave(fd);
    if (res?.error) setErr(res.error);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-violet-500/20 bg-slate-800/50 p-4 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-5 w-1 rounded-full bg-violet-500" />
        <span className="text-sm font-semibold text-violet-300">
          {initial ? 'Edit Milestone' : 'New Milestone'}
        </span>
      </div>

      {err && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{err}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            Year *
          </label>
          <input
            ref={firstRef}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
            className={INPUT_CLS}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            Event *
          </label>
          <input
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="Achievement or milestone"
            className={INPUT_CLS}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            Icon
          </label>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🎯"
            className={INPUT_CLS}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-3">
          <label className="mb-1 block text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description of this milestone…"
            className={`${INPUT_CLS} resize-none`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            Order
          </label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            placeholder="1"
            className={INPUT_CLS}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700/60 bg-slate-800 px-4 py-1.5 text-sm text-slate-400 transition hover:border-slate-600 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:opacity-60"
        >
          {saving ? (
            <svg
              className="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            <IconCheck />
          )}
          {initial ? 'Save Changes' : 'Add Milestone'}
        </button>
      </div>
    </form>
  );
}

/* ── Timeline row ───────────────────────────────────────────────────── */
function TimelineRow({ item, isLast, onEdit, onDelete, deleting }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex gap-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setConfirmDelete(false);
      }}
    >
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-violet-500/60 bg-slate-900 shadow-md shadow-violet-900/20">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-violet-500/40 to-transparent" />
        )}
      </div>

      {/* Content */}
      <div
        className={`mb-5 flex-1 rounded-xl border px-4 py-3 transition-all duration-200 ${hovered ? 'border-violet-500/30 bg-slate-800/80' : 'border-slate-700/40 bg-slate-800/30'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base">{item.icon || '🎯'}</span>
              <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300 ring-1 ring-violet-500/30">
                {item.year}
              </span>
              {item.display_order != null && (
                <span className="text-[10px] text-slate-600">
                  #{item.display_order}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-snug font-semibold text-slate-100">
              {item.event}
            </p>
            {item.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                {item.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div
            className={`flex shrink-0 items-center gap-1 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}
          >
            {confirmDelete ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1">
                <span className="text-[11px] text-red-300">Delete?</span>
                <button
                  onClick={() => onDelete(item.id)}
                  disabled={deleting}
                  className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 hover:text-white disabled:opacity-50"
                >
                  {deleting ? '…' : 'Yes'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:text-white"
                >
                  No
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onEdit(item)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-violet-300"
                  title="Edit"
                >
                  <IconEdit />
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-red-400"
                  title="Delete"
                >
                  <IconTrash />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main modal ─────────────────────────────────────────────────────── */
export default function JourneyModal({ initialItems = [], onClose }) {
  const [items, setItems] = useState(
    [...initialItems].sort(
      (a, b) =>
        (a.display_order ?? 999) - (b.display_order ?? 999) || a.year - b.year
    )
  );
  const [adding, setAdding] = useState(false);
  useScrollLock();
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [savePending, startSave] = useTransition();
  const [delPending, startDel] = useTransition();

  const sorted = [...items].sort(
    (a, b) =>
      (a.display_order ?? 999) - (b.display_order ?? 999) || a.year - b.year
  );

  function handleEdit(item) {
    setAdding(false);
    setEditItem(item);
  }

  function handleAdd() {
    setEditItem(null);
    setAdding(true);
  }

  function handleCancel() {
    setAdding(false);
    setEditItem(null);
  }

  async function handleCreate(fd) {
    return new Promise((resolve) => {
      startSave(async () => {
        const res = await createJourneyItemAction(fd);
        if (res?.error) {
          resolve(res);
          return;
        }
        if (res?.item) setItems((prev) => [...prev, res.item]);
        setAdding(false);
        resolve(null);
      });
    });
  }

  async function handleUpdate(fd) {
    return new Promise((resolve) => {
      startSave(async () => {
        const res = await updateJourneyItemAction(fd);
        if (res?.error) {
          resolve(res);
          return;
        }
        if (res?.item)
          setItems((prev) =>
            prev.map((i) => (i.id === editItem.id ? res.item : i))
          );
        setEditItem(null);
        resolve(null);
      });
    });
  }

  function handleDelete(id) {
    setDeleteId(id);
    startDel(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await deleteJourneyItemAction(fd);
      if (!res?.error) setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteId(null);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col p-2 sm:p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60">
        {/* ── Sticky header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-900/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-lg">
              🗺️
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Journey & Timeline
              </h2>
              <p className="text-xs text-slate-500">
                club milestones over the years
              </p>
            </div>
            <span className="ml-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/30">
              {items.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <IconX />
          </button>
        </div>

        {/* ── Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Add form */}
          {adding && (
            <div className="mb-6">
              <ItemFormPanel
                onSave={handleCreate}
                onCancel={handleCancel}
                saving={savePending}
              />
            </div>
          )}

          {/* Edit form */}
          {editItem && !adding && (
            <div className="mb-6">
              <ItemFormPanel
                initial={editItem}
                onSave={handleUpdate}
                onCancel={handleCancel}
                saving={savePending}
              />
            </div>
          )}

          {/* Timeline */}
          {sorted.length === 0 && !adding ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 text-4xl">🗺️</div>
              <p className="text-sm font-medium text-slate-400">
                No milestones yet
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Add the club's first milestone to start the journey.
              </p>
            </div>
          ) : (
            <div>
              {sorted.map((item, idx) => (
                <TimelineRow
                  key={item.id}
                  item={item}
                  isLast={idx === sorted.length - 1}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deleting={delPending && deleteId === item.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sticky footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-700/50 bg-slate-900/90 px-6 py-4 backdrop-blur">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-white"
          >
            Close
          </button>
          <button
            onClick={handleAdd}
            disabled={adding || !!editItem}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconPlus />
            Add Milestone
          </button>
        </div>
      </div>
    </div>
  );
}
