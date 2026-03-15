/**
 * @file Achievement gallery modal — browse, upload, and delete photos
 *   stored in the achievement's dedicated Google Drive folder.
 * @module AdminAchievementGalleryModal
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  getAchievementGalleryAction,
  uploadAchievementGalleryImageAction,
  deleteAchievementGalleryImageAction,
} from '@/app/_lib/achievement-actions';
import { getCategoryConfig } from './achievementConfig';
import { useScrollLock } from '@/app/_lib/hooks';

export default function GalleryModal({ achievement, onClose }) {
  const [files, setFiles] = useState([]);
  useScrollLock();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null); // file to preview full screen
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const catConf = getCategoryConfig(achievement.category);

  // ── Load gallery ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await getAchievementGalleryAction(achievement.id);
      if (!cancelled) {
        if (res?.error) setError(res.error);
        else setFiles(res.files ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [achievement.id]);

  // ── Upload ──────────────────────────────────────────────────────────────────
  async function handleUpload(fileList) {
    if (!fileList?.length) return;
    setError('');
    setUploading(true);

    const results = [];
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.set('achievement_id', achievement.id);
      fd.set('file', file);
      const res = await uploadAchievementGalleryImageAction(fd);
      if (res?.error) {
        setError(res.error);
        break;
      }
      if (res?.fileId) {
        results.push({
          id: res.fileId,
          name: file.name,
          url: res.url,
          createdAt: new Date().toISOString(),
          uploadedAt: res.uploadedAt ?? new Date().toISOString(),
        });
      }
    }

    if (results.length) {
      setFiles((prev) => [...results, ...prev]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileInput(e) {
    handleUpload(e.target.files);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(fileId) {
    setDeletingId(fileId);
    const fd = new FormData();
    fd.set('achievement_id', achievement.id);
    fd.set('file_id', fileId);
    const res = await deleteAchievementGalleryImageAction(fd);
    if (res?.error) setError(res.error);
    else setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setDeletingId(null);
  }

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-2 backdrop-blur-sm sm:p-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-6 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🖼️</span>
                <h2 className="truncate text-base font-semibold text-white">
                  Gallery — {achievement.title}
                </h2>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {achievement.category && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${catConf.color}`}
                  >
                    {catConf.emoji} {achievement.category}
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {achievement.year} · {achievement.result}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* ── Body ──────────────────────────────────────────────────────── */}
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {/* Upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
                dragOver
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800/40 hover:border-amber-500/50 hover:bg-amber-500/5'
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  <p className="text-sm text-slate-400">Uploading…</p>
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-8 w-8 text-slate-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.412 11.09"
                    />
                  </svg>
                  <p className="text-sm font-medium text-slate-300">
                    Drag &amp; drop images, or{' '}
                    <span className="text-amber-400">click to browse</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, WEBP, GIF — multiple files supported
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Gallery grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 text-5xl">📷</div>
                <p className="font-medium text-slate-400">No photos yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Upload images to create the gallery for this achievement.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  {files.length} image{files.length !== 1 ? 's' : ''} in this
                  gallery
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-700/40 bg-slate-800"
                    >
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        className="cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        onClick={() => setLightbox(file)}
                      />

                      {/* Overlay controls */}
                      <div className="absolute inset-0 flex flex-col items-end justify-start gap-1 bg-black/0 p-1.5 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
                        {/* Expand */}
                        <button
                          onClick={() => setLightbox(file)}
                          title="View full size"
                          className="rounded-lg bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-3.5 w-3.5"
                          >
                            <path d="M3.28 2.22a.75.75 0 00-1.06 1.06L5.44 6.5H3.75a.75.75 0 000 1.5h3.5a.75.75 0 00.75-.75v-3.5a.75.75 0 00-1.5 0v1.69L3.28 2.22zM13.06 11.75a.75.75 0 00-1.5 0v1.69l-3.22-3.22a.75.75 0 10-1.06 1.06l3.22 3.22H9a.75.75 0 000 1.5h3.5a.75.75 0 00.75-.75v-3.5zM13.56 2.22l-3.22 3.22V3.75a.75.75 0 00-1.5 0v3.5c0 .414.336.75.75.75h3.5a.75.75 0 000-1.5h-1.69l3.22-3.22a.75.75 0 10-1.06-1.06zM6.44 13.56l-3.22 3.22a.75.75 0 101.06 1.06l3.22-3.22v1.69a.75.75 0 001.5 0v-3.5a.75.75 0 00-.75-.75h-3.5a.75.75 0 000 1.5h1.69z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          title="Delete image"
                          className="rounded-lg bg-red-600/80 p-1.5 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === file.id ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                          ) : (
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Filename tooltip */}
                      <div className="absolute right-0 bottom-0 left-0 translate-y-full bg-black/70 px-2 py-1 text-xs text-white opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                        <p className="truncate">{file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-slate-700/50 px-6 py-3">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-700/60 px-5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl shadow-2xl">
              <Image
                src={lightbox.url}
                alt={lightbox.name}
                width={1200}
                height={900}
                className="max-h-[85vh] max-w-[90vw] object-contain"
                unoptimized
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              {lightbox.name}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
