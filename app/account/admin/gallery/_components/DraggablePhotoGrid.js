/**
 * @file Drag-and-drop reorderable photo grid for event gallery management.
 *   Uses native HTML5 DnD — no extra dependencies.
 *   Optimistically reorders items locally, then persists to DB via server action.
 * @module AdminDraggablePhotoGrid
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { reorderGalleryItemsAction } from '@/app/_lib/gallery-actions';
function DragHandle() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 text-slate-400"
      aria-hidden
    >
      <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
    </svg>
  );
}

export default function DraggablePhotoGrid({
  items: propItems,
  onEdit,
  reorderAction,
}) {
  const [items, setItems] = useState(propItems);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [imgErrors, setImgErrors] = useState({});

  const draggedId = useRef(null);
  const overItemId = useRef(null);
  const saveTimer = useRef(null);

  // Sync when parent reloads (e.g. after a new upload)
  useEffect(() => {
    setItems(propItems);
  }, [propItems]);

  // ── Reorder helpers ──────────────────────────────────────────────────────
  function reorder(dragId, dropId) {
    if (dragId === dropId) return null;
    const next = [...items];
    const fromIdx = next.findIndex((i) => i.id === dragId);
    const toIdx = next.findIndex((i) => i.id === dropId);
    if (fromIdx === -1 || toIdx === -1) return null;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    return next;
  }

  // ── Save debounce — waits 400 ms after last drop ─────────────────────────
  const persist = useCallback(
    async (orderedItems) => {
      setSaving(true);
      setSavedMsg('');
      const ids = orderedItems.map((i) => i.id);
      const action = reorderAction ?? reorderGalleryItemsAction;
      const res = await action(ids);
      setSaving(false);
      if (res?.error) {
        setSavedMsg('⚠ Save failed');
      } else {
        setSavedMsg('✓ Order saved');
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSavedMsg(''), 2500);
      }
    },
    [reorderAction]
  );

  // ── HTML5 DnD handlers ───────────────────────────────────────────────────
  function onDragStart(e, id) {
    draggedId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    // ghost is the element itself — no custom ghost needed
    e.currentTarget.classList.add('opacity-50');
  }

  function onDragEnd(e) {
    e.currentTarget.classList.remove('opacity-50');
    draggedId.current = null;
    overItemId.current = null;
  }

  function onDragOver(e, id) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overItemId.current === id) return;
    overItemId.current = id;
    const next = reorder(draggedId.current, id);
    if (next) setItems(next);
  }

  function onDrop(e, _id) {
    e.preventDefault();
    persist(items);
  }

  if (items.length === 0) return null;

  return (
    <div>
      {/* Status row */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-600 select-none">
          Drag thumbnails to reorder · changes are saved automatically
        </p>
        <span
          className={`text-xs transition-opacity duration-300 ${
            saving
              ? 'text-violet-400 opacity-100'
              : savedMsg
                ? 'text-green-400 opacity-100'
                : 'opacity-0'
          }`}
        >
          {saving ? 'Saving…' : savedMsg}
        </span>
      </div>

      {/* Draggable grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => onDragStart(e, item.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOver(e, item.id)}
            onDrop={(e) => onDrop(e, item.id)}
            className="group relative cursor-grab overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/60 transition-all duration-150 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-900/10 active:cursor-grabbing"
          >
            {/* Thumbnail */}
            <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
              {item.type === 'image' && !imgErrors[item.id] ? (
                <Image
                  src={item.url}
                  alt={item.caption ?? `Photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  className="pointer-events-none object-cover transition-transform duration-200 group-hover:scale-105"
                  draggable={false}
                  onError={() =>
                    setImgErrors((prev) => ({ ...prev, [item.id]: true }))
                  }
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-40">
                  🖼️
                </div>
              )}

              {/* Order badge */}
              <span className="absolute top-1.5 left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1 text-[10px] font-bold text-white backdrop-blur-sm">
                {idx + 1}
              </span>

              {/* Drag handle */}
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-lg bg-black/60 p-1 backdrop-blur-sm">
                <DragHandle />
              </span>

              {/* Edit overlay */}
              <button
                onClick={() => onEdit(item)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-150 group-hover:bg-black/40"
                title="Edit"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 scale-0 text-white transition-transform duration-150 group-hover:scale-100"
                >
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
              </button>
            </div>

            {/* Caption */}
            {item.caption && (
              <p className="truncate px-2 py-1 text-[10px] text-slate-400">
                {item.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
