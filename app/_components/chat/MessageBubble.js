/**
 * @file MessageBubble – Professional chat bubble with tails, context menu,
 *       inline editing, read receipts, link detection, image & file rendering.
 *
 * Features:
 * - WhatsApp-style tails (CSS borders)
 * - Inline timestamp + edited label + double-check
 * - Context menu on hover (edit / delete within 5 min)
 * - Inline edit mode with save/cancel (text messages only)
 * - Deleted-message placeholder
 * - Sender name for received messages
 * - Auto-detect URLs and render clickable links
 * - Image messages with lightbox
 * - File messages with download card
 *
 * @module MessageBubble
 */

'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { cn } from '@/app/_lib/utils';
import {
  editMessageAction,
  deleteMessageAction,
} from '@/app/_lib/chat-actions';
import {
  ChevronDown,
  Pencil,
  Trash2,
  X,
  Check,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  ExternalLink,
} from 'lucide-react';
import { useScrollLock } from '@/app/_lib/hooks';

/* ── Time formatter ────────────────────────────────────── */
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/* ── Format file size ──────────────────────────────────── */
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── URL regex for auto-linking ────────────────────────── */
const URL_REGEX =
  /https?:\/\/(?:[-\w.])+(?::\d+)?(?:\/(?:[\w.~!$&'()*+,;=:@%-]|\/)*)?(?:\?[\w.~!$&'()*+,;=:@%/?-]*)?(?:#[\w.~!$&'()*+,;=:@%/?-]*)?/gi;

function renderTextWithLinks(text) {
  if (!text) return null;
  const parts = [];
  let lastIndex = 0;
  let match;

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`t-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>
      );
    }
    parts.push(
      <a
        key={`l-${match.index}`}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-[#53bdeb] underline decoration-[#53bdeb]/40 underline-offset-2 transition-colors hover:text-[#7ecef4] hover:decoration-[#7ecef4]/60"
        onClick={(e) => e.stopPropagation()}
      >
        {match[0]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Fragment key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Fragment>
    );
  }

  return parts.length > 0 ? parts : text;
}

/* ── File icon helper ──────────────────────────────────── */
function getFileIcon(mimeType) {
  if (!mimeType) return File;
  if (mimeType.includes('pdf') || mimeType.includes('word')) return FileText;
  if (
    mimeType.includes('sheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv')
  )
    return FileSpreadsheet;
  if (mimeType.startsWith('image/')) return FileImage;
  return File;
}

export default function MessageBubble({ message, isOwn, showTail = false }) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgExpanded, setImgExpanded] = useState(false);
  useScrollLock(imgExpanded);
  const confirmTimerRef = useRef(null);

  // Local state to avoid direct prop mutation
  const [localContent, setLocalContent] = useState(message.content);
  const [localDeletedAt, setLocalDeletedAt] = useState(message.deleted_at);
  const [localEditedAt, setLocalEditedAt] = useState(message.edited_at);

  const messageType = message.message_type || 'text';
  const metadata = message.metadata || {};
  const isTextMessage = messageType === 'text';
  const isImageMessage = messageType === 'image';
  const isFileMessage = messageType === 'file';

  // Sync with prop changes from polling
  useEffect(() => {
    setLocalContent(message.content);
    setLocalDeletedAt(message.deleted_at);
    setLocalEditedAt(message.edited_at);
  }, [message.content, message.deleted_at, message.edited_at]);

  // Cleanup confirm timer
  useEffect(() => {
    return () => clearTimeout(confirmTimerRef.current);
  }, []);

  const isDeleted = !!localDeletedAt;
  const isEdited = !!localEditedAt && !isDeleted;
  const sender = message.sender || {};
  const name = sender.full_name || 'User';

  const canModify =
    isOwn &&
    !isDeleted &&
    Date.now() - new Date(message.created_at).getTime() < 5 * 60 * 1000;

  const canEdit = canModify && isTextMessage;

  /* ── Handlers ────────────────────────────────────────── */
  const handleEdit = async () => {
    if (!editContent.trim() || editContent.trim() === localContent) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const result = await editMessageAction(message.id, editContent.trim());
    setSaving(false);
    if (!result.error) {
      setLocalContent(editContent.trim());
      setLocalEditedAt(new Date().toISOString());
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    clearTimeout(confirmTimerRef.current);
    const result = await deleteMessageAction(message.id);
    if (!result.error) {
      setLocalDeletedAt(new Date().toISOString());
    }
    setConfirmDelete(false);
    setShowMenu(false);
  };

  const startEdit = () => {
    setEditContent(localContent);
    setEditing(true);
    setShowMenu(false);
  };

  /* ── Deleted state ───────────────────────────────────── */
  if (isDeleted) {
    return (
      <div
        className={cn(
          'flex px-[6%] py-px',
          isOwn ? 'justify-end' : 'justify-start'
        )}
      >
        <div className="rounded-lg bg-[#182229]/60 px-3 py-1.5 ring-1 ring-[#2a3942]/30">
          <p className="flex items-center gap-1.5 text-[13px] text-[#6b7b8d] italic">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            This message was deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex px-[4%] py-px',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'relative max-w-[85%] rounded-lg px-2.25 pt-1.5 pb-1.25 shadow-sm',
          isOwn
            ? cn('bg-[#005c4b]', showTail && 'rounded-tr-none')
            : cn('bg-[#202c33]', showTail && 'rounded-tl-none')
        )}
      >
        {/* Tail */}
        {showTail && (
          <div
            className={cn(
              'absolute top-0 h-0 w-0',
              isOwn
                ? '-right-2 border-t-12 border-l-8 border-t-[#005c4b] border-l-transparent'
                : '-left-2 border-t-12 border-r-8 border-t-[#202c33] border-r-transparent'
            )}
          />
        )}

        {/* Sender name */}
        {!isOwn && showTail && (
          <p className="mb-0.5 text-[12px] font-semibold text-[#00a884]">
            {name}
          </p>
        )}

        {/* Context menu trigger */}
        {canModify && !editing && (
          <div
            className={cn(
              'absolute top-1 z-10 transition-opacity duration-150',
              'opacity-60 sm:opacity-0 sm:group-hover:opacity-100',
              isOwn ? 'right-1' : 'right-1'
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="rounded p-0.5 text-white/30 hover:text-white/60"
              aria-label="Message options"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className={cn(
                    'absolute z-20 mt-1 min-w-30 overflow-hidden rounded-lg bg-[#233138] py-1 shadow-xl ring-1 shadow-black/40 ring-white/5',
                    isOwn ? 'right-0' : 'left-0'
                  )}
                >
                  {canEdit && (
                    <button
                      onClick={startEdit}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#e9edef] transition-colors hover:bg-[#374752]"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-4 py-2 text-[13px] transition-colors hover:bg-[#374752]',
                      confirmDelete
                        ? 'bg-[#ea4335]/80 text-white'
                        : 'text-[#ea4335]'
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {confirmDelete ? 'Confirm?' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Content ──────────────────────────────────── */}
        {editing ? (
          <div className="flex flex-col gap-1.5 pr-5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-full resize-none rounded bg-[#111b21]/50 px-2 py-1.5 text-[14px] text-[#e9edef] ring-1 ring-[#00a884]/30 outline-none"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setEditing(false)}
                className="rounded-full bg-[#374752] p-1.5 text-[#8696a0] transition-colors hover:text-[#e9edef]"
                disabled={saving}
                aria-label="Cancel edit"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleEdit}
                className="rounded-full bg-[#00a884] p-1.5 text-[#111b21] transition-colors hover:bg-[#06cf9c]"
                disabled={saving}
                aria-label="Save edit"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : isImageMessage && metadata.url && !imgError ? (
          /* ── Image message ───────────────────────────── */
          <>
            <div
              className="cursor-pointer overflow-hidden rounded-sm"
              onClick={() => setImgExpanded(true)}
            >
              <img
                src={metadata.url}
                alt={metadata.filename || 'Image'}
                className="max-h-70 min-h-20 w-full max-w-[320px] min-w-37.5 rounded-sm object-cover transition-transform duration-200 hover:scale-[1.02]"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            </div>
            {/* Caption if any */}
            {localContent && localContent !== '📷 Photo' && (
              <p className="mt-1 min-w-0 text-[14.2px] leading-4.75 wrap-break-word whitespace-pre-wrap text-[#e9edef]">
                {renderTextWithLinks(localContent)}
              </p>
            )}
            {/* Timestamp overlay on image */}
            <div className="flex items-end justify-end gap-1.5">
              <span className="flex shrink-0 items-center gap-0.75 self-end pb-px">
                {isEdited && (
                  <span className="text-[10px] text-white/35 italic">
                    edited
                  </span>
                )}
                <span
                  className={cn(
                    'text-[11px] leading-none',
                    isOwn ? 'text-white/45' : 'text-[#8696a0]'
                  )}
                >
                  {formatTime(message.created_at)}
                </span>
                {isOwn && (
                  <svg
                    className="h-3.75 w-3.75 text-[#53bdeb]"
                    viewBox="0 0 16 15"
                    fill="currentColor"
                  >
                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.434a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                  </svg>
                )}
              </span>
            </div>

            {/* ── Image lightbox ─────────────────────────── */}
            {imgExpanded && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                onClick={() => setImgExpanded(false)}
              >
                <button
                  className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                  onClick={() => setImgExpanded(false)}
                  aria-label="Close preview"
                >
                  <X className="h-6 w-6" />
                </button>
                <a
                  href={metadata.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-4 right-16 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
                <img
                  src={metadata.url}
                  alt={metadata.filename || 'Image'}
                  className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        ) : isFileMessage || (isImageMessage && imgError) ? (
          /* ── File message / broken image ─────────────── */
          (() => {
            const FileIcon = getFileIcon(metadata.mime_type);
            return (
              <div className="flex items-center gap-3">
                <a
                  href={metadata.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-50 items-center gap-3 rounded-lg bg-[#111b21]/40 px-3 py-2.5 ring-1 ring-white/5 transition-colors hover:bg-[#111b21]/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00a884]/20">
                    <FileIcon className="h-5 w-5 text-[#00a884]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#e9edef]">
                      {metadata.filename || 'File'}
                    </p>
                    <p className="text-[11px] text-[#8696a0]">
                      {formatFileSize(metadata.size)}
                      {metadata.mime_type && (
                        <span>
                          {' · '}
                          {metadata.mime_type.split('/').pop()?.toUpperCase()}
                        </span>
                      )}
                    </p>
                  </div>
                  <Download className="h-4 w-4 shrink-0 text-[#8696a0]" />
                </a>
              </div>
            );
          })()
        ) : (
          /* ── Text message (with link auto-detection) ─── */
          <div className="flex items-end gap-1.5">
            <p className="min-w-0 text-[14.2px] leading-4.75 wrap-break-word whitespace-pre-wrap text-[#e9edef]">
              {renderTextWithLinks(localContent)}
            </p>
            {/* Inline timestamp */}
            <span className="flex shrink-0 items-center gap-0.75 self-end pb-px">
              {isEdited && (
                <span className="text-[10px] text-white/35 italic">edited</span>
              )}
              <span
                className={cn(
                  'text-[11px] leading-none',
                  isOwn ? 'text-white/45' : 'text-[#8696a0]'
                )}
              >
                {formatTime(message.created_at)}
              </span>
              {isOwn && (
                <svg
                  className="h-3.75 w-3.75 text-[#53bdeb]"
                  viewBox="0 0 16 15"
                  fill="currentColor"
                >
                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.434a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                </svg>
              )}
            </span>
          </div>
        )}

        {/* ── File/image inline timestamp (non-text, non-image) ── */}
        {(isFileMessage || (isImageMessage && imgError)) && (
          <div className="mt-1 flex items-end justify-end gap-1.5">
            <span className="flex shrink-0 items-center gap-0.75 pb-px">
              <span
                className={cn(
                  'text-[11px] leading-none',
                  isOwn ? 'text-white/45' : 'text-[#8696a0]'
                )}
              >
                {formatTime(message.created_at)}
              </span>
              {isOwn && (
                <svg
                  className="h-3.75 w-3.75 text-[#53bdeb]"
                  viewBox="0 0 16 15"
                  fill="currentColor"
                >
                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.434a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                </svg>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
