/**
 * @file Drag-and-drop bulk file upload modal for event photo galleries.
 *   Uploads images directly to Google Drive (event-images folder) and
 *   saves each item to the gallery_items table via server action.
 * @module AdminEventBulkUploadModal
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadEventGalleryFilesAction } from '@/app/_lib/gallery-actions';

const MAX_FILES = 30;
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];
const ALLOWED_EXTS = '.jpg,.jpeg,.png,.webp,.gif,.avif';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({ file, index, caption, onCaptionChange, status }) {
  const preview = URL.createObjectURL(file);
  const invalid =
    !ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE_MB * 1024 * 1024;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-2 transition-colors ${
        status === 'done'
          ? 'border-green-500/30 bg-green-900/10'
          : status === 'error'
            ? 'border-red-500/30 bg-red-900/10'
            : invalid
              ? 'border-yellow-500/30 bg-yellow-900/10'
              : 'border-slate-700/40 bg-slate-800/30'
      }`}
    >
      {/* Thumbnail */}
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-700/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt=""
          className="h-full w-full object-cover"
          onLoad={() => URL.revokeObjectURL(preview)}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-300">
          {file.name}
        </p>
        <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
        {invalid && (
          <p className="text-xs text-yellow-400">
            {!ALLOWED_TYPES.includes(file.type)
              ? 'Unsupported type'
              : 'Exceeds 10 MB'}
          </p>
        )}
      </div>

      {/* Caption */}
      {!invalid && (
        <input
          type="text"
          value={caption}
          onChange={(e) => onCaptionChange(index, e.target.value)}
          placeholder="Caption (optional)"
          maxLength={120}
          className="w-36 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-violet-500 focus:outline-none"
        />
      )}

      {/* Status badge */}
      <div className="shrink-0 text-lg">
        {status === 'done'
          ? '✅'
          : status === 'error'
            ? '❌'
            : status === 'uploading'
              ? '⏳'
              : ''}
      </div>
    </div>
  );
}

export default function EventBulkUploadModal({ event, events = [], onClose }) {
  const [files, setFiles] = useState([]);
  const [captions, setCaptions] = useState({});
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [summary, setSummary] = useState(null);
  const inputRef = useRef(null);

  // pre-resolved event title for display
  const eventTitle =
    event?.title ??
    events.find((e) => e.id === event?.id)?.title ??
    'this event';

  function addFiles(newFiles) {
    setFiles((prev) => {
      const combined = [...prev, ...newFiles].slice(0, MAX_FILES);
      return combined;
    });
  }

  function handleFilePick(e) {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      ALLOWED_TYPES.includes(f.type)
    );
    addFiles(dropped);
  }, []);

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setCaptions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function handleCaptionChange(index, value) {
    setCaptions((prev) => ({ ...prev, [index]: value }));
  }

  const validFiles = files.filter(
    (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_SIZE_MB * 1024 * 1024
  );

  async function handleUpload() {
    if (validFiles.length === 0) return;
    setUploading(true);
    setSummary(null);

    const fd = new FormData();
    fd.set('event_id', event?.id ?? '');

    // Add per-file captions using original index in `files`
    const validIndices = files
      .map((f, i) => ({ f, i }))
      .filter(
        ({ f }) =>
          ALLOWED_TYPES.includes(f.type) && f.size <= MAX_SIZE_MB * 1024 * 1024
      );

    validIndices.forEach(({ f, i }, slot) => {
      fd.append('files', f);
      if (captions[i]) fd.set(`caption_${slot}`, captions[i]);
    });

    // Optimistic status: mark all valid as uploading
    const uploadingStatus = {};
    validIndices.forEach(({ i }) => {
      uploadingStatus[i] = 'uploading';
    });
    setStatuses(uploadingStatus);

    const res = await uploadEventGalleryFilesAction(fd);
    setUploading(false);

    if (res?.error) {
      setStatuses({});
      setSummary({ type: 'error', message: res.error });
      return;
    }

    // Map results back to file indices
    const finalStatus = {};
    res.results?.forEach((r, slot) => {
      const origIdx = validIndices[slot]?.i;
      if (origIdx !== undefined) {
        finalStatus[origIdx] = r.success ? 'done' : 'error';
      }
    });
    setStatuses(finalStatus);
    setSummary({ type: 'success', count: res.count, failed: res.failed });

    if (res.failed === 0) {
      setTimeout(onClose, 1800);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              📤 Upload Event Photos
            </h2>
            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
              → {eventTitle} · saved to Drive{' '}
              <span className="text-violet-400">event-images/</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Drop zone */}
          {!uploading && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition-colors ${
                dragging
                  ? 'border-violet-400 bg-violet-500/10 text-violet-300'
                  : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-10 w-10 opacity-60"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="text-sm font-medium">
                Drag &amp; drop images here, or{' '}
                <span className="text-violet-400">browse</span>
              </p>
              <p className="text-xs">
                JPEG, PNG, WebP, GIF, AVIF · max {MAX_SIZE_MB} MB each · up to{' '}
                {MAX_FILES} files
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_EXTS}
                multiple
                className="sr-only"
                onChange={handleFilePick}
              />
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                  {validFiles.length < files.length && (
                    <span className="ml-2 text-xs text-yellow-400">
                      ({files.length - validFiles.length} will be skipped)
                    </span>
                  )}
                </p>
                {!uploading && (
                  <button
                    onClick={() => {
                      setFiles([]);
                      setCaptions({});
                      setStatuses({});
                    }}
                    className="text-xs text-slate-500 hover:text-red-400"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {files.map((file, i) => (
                  <div key={i} className="group relative">
                    <FileRow
                      file={file}
                      index={i}
                      caption={captions[i] ?? ''}
                      onCaptionChange={handleCaptionChange}
                      status={statuses[i]}
                    />
                    {!uploading && !statuses[i] && (
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-2 right-2 hidden rounded p-0.5 text-slate-500 group-hover:block hover:text-red-400"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5"
                        >
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-violet-300">
                <svg
                  className="h-4 w-4 animate-spin"
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
                Uploading {validFiles.length} image
                {validFiles.length !== 1 ? 's' : ''} to Drive…
              </div>
              <p className="mt-1 text-xs text-slate-500">
                This may take a moment. Do not close the window.
              </p>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                summary.type === 'success'
                  ? 'border-green-500/30 bg-green-900/20 text-green-300'
                  : 'border-red-500/30 bg-red-900/20 text-red-400'
              }`}
            >
              {summary.type === 'success'
                ? `✅ ${summary.count} photo${summary.count !== 1 ? 's' : ''} uploaded successfully${summary.failed > 0 ? ` · ${summary.failed} failed` : ''}.`
                : `❌ ${summary.message}`}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 rounded-xl bg-slate-700/50 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-40"
            >
              {summary?.type === 'success' ? 'Close' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || validFiles.length === 0}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {uploading
                ? 'Uploading…'
                : `Upload ${validFiles.length > 0 ? validFiles.length : ''} Photo${validFiles.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
