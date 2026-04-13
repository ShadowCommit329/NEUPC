'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bookmark,
  BookmarkCheck,
  Pin,
  ExternalLink,
  Calendar,
  Globe,
  Lock,
  ImageIcon,
  PlayCircle,
  FileText,
  FileDown,
  Share2,
  Edit3,
  Trash2,
} from 'lucide-react';
import { RESOURCE_TYPE_LABELS } from '@/app/_lib/resources/constants';
import { safeExternalHref } from '@/app/_lib/resources/embed-utils';
import SocialCardEmbed from '@/app/_components/resources/SocialCardEmbed';

// ─── Per-type visual config ──────────────────────────────────────────────────

const TYPE_STYLES = {
  image: {
    icon: ImageIcon,
    gradient: 'from-purple-600/40 to-indigo-600/40',
    badge: 'border-purple-500/25 bg-purple-500/12 text-purple-200',
  },
  video: {
    icon: PlayCircle,
    gradient: 'from-red-600/40 to-rose-600/40',
    badge: 'border-red-500/25 bg-red-500/12 text-red-200',
  },
  rich_text: {
    icon: FileText,
    gradient: 'from-emerald-600/40 to-teal-600/40',
    badge: 'border-emerald-500/25 bg-emerald-500/12 text-emerald-200',
  },
  youtube: {
    icon: PlayCircle,
    gradient: 'from-red-600/40 to-rose-600/40',
    badge: 'border-red-500/25 bg-red-500/12 text-red-200',
  },
  facebook_post: {
    icon: Share2,
    gradient: 'from-blue-600/40 to-indigo-600/40',
    badge: 'border-blue-500/25 bg-blue-500/12 text-blue-200',
  },
  linkedin_post: {
    icon: Share2,
    gradient: 'from-sky-600/40 to-blue-600/40',
    badge: 'border-sky-500/25 bg-sky-500/12 text-sky-200',
  },
  external_link: {
    icon: Globe,
    gradient: 'from-cyan-600/40 to-teal-600/40',
    badge: 'border-cyan-500/25 bg-cyan-500/12 text-cyan-200',
  },
  file: {
    icon: FileDown,
    gradient: 'from-amber-600/40 to-orange-600/40',
    badge: 'border-amber-500/25 bg-amber-500/12 text-amber-200',
  },
};

const FALLBACK_STYLE = {
  icon: FileText,
  gradient: 'from-gray-600/40 to-slate-600/40',
  badge: 'border-gray-500/25 bg-gray-500/12 text-gray-200',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return null;
  }
}

function getYouTubeVideoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace('/', '') || null;
    }
    if (u.pathname === '/watch') {
      return u.searchParams.get('v');
    }
    if (u.pathname.startsWith('/shorts/')) {
      return u.pathname.split('/')[2] || null;
    }
    if (u.pathname.startsWith('/embed/')) {
      return u.pathname.split('/')[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function getFileExtension(url) {
  if (!url) return '';
  try {
    return new URL(url).pathname.split('.').pop()?.toLowerCase() || '';
  } catch {
    return '';
  }
}

function getPdfPreviewSrc(fileUrl) {
  if (!fileUrl) return '';
  const proxyMatch = fileUrl.match(/^\/api\/image\/([^/?#&]+)/);
  if (proxyMatch?.[1]) {
    return `https://drive.google.com/file/d/${proxyMatch[1]}/preview`;
  }
  return `${fileUrl}#page=1&view=FitH`;
}

function extractDriveFileId(url) {
  if (!url) return null;
  const proxyMatch = url.match(/^\/api\/image\/([^/?#&]+)/);
  if (proxyMatch?.[1]) return proxyMatch[1];
  const driveFileMatch = url.match(/\/file\/d\/([^/?#&]+)/);
  if (driveFileMatch?.[1]) return driveFileMatch[1];
  const idParamMatch = url.match(/[?&]id=([^&#]+)/);
  if (idParamMatch?.[1]) return idParamMatch[1];
  return null;
}

function getDriveVideoThumbnailUrl(fileUrl) {
  const driveFileId = extractDriveFileId(fileUrl);
  if (!driveFileId) return '';
  return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1200`;
}

function getExternalWebsiteUrl(resource) {
  if (resource?.resource_type !== 'external_link') return null;
  const websiteUrl =
    safeExternalHref(resource?.embed_url) ||
    safeExternalHref(resource?.file_url) ||
    safeExternalHref(resource?.url);
  if (!websiteUrl) return null;
  return websiteUrl.split('#')[0];
}

function getAutoCover(resource) {
  if (resource?.thumbnail) return null;
  if (resource?.resource_type === 'youtube' && resource?.embed_url) {
    const id = getYouTubeVideoId(resource.embed_url);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }
  const websiteUrl = getExternalWebsiteUrl(resource);
  if (websiteUrl) {
    return `https://image.thum.io/get/width/1200/crop/450/noanimate/${encodeURI(websiteUrl)}`;
  }
  return null;
}

function getAutoCoverFallback(resource) {
  const websiteUrl = getExternalWebsiteUrl(resource);
  if (!websiteUrl) return null;
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(websiteUrl)}?w=1200`;
}

// ─── Badge sub-components ────────────────────────────────────────────────────

function TypeBadge({ typeStyle, typeLabel }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md ${typeStyle.badge}`}
    >
      {typeLabel}
    </span>
  );
}

function PinnedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold text-amber-200 backdrop-blur-md">
      <Pin className="h-2.5 w-2.5" /> Pinned
    </span>
  );
}

function VisibilityBadge({ visibility }) {
  if (!visibility) return null;
  if (visibility === 'public') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-black/40 px-2 py-0.5 text-[10px] text-emerald-300 backdrop-blur-md">
        <Globe className="h-2.5 w-2.5" /> Public
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-black/40 px-2 py-0.5 text-[10px] text-blue-300 backdrop-blur-md">
      <Lock className="h-2.5 w-2.5" /> Members
    </span>
  );
}

function AdminOverlay({ resource, onEdit, onDelete }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(resource);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:border-blue-500/30 hover:bg-blue-500/30 focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
        title="Edit resource"
        aria-label={`Edit ${resource.title}`}
      >
        <Edit3 className="h-4 w-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.(resource);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:border-red-500/30 hover:bg-red-500/30 focus:ring-2 focus:ring-red-500/40 focus:outline-none"
        title="Delete resource"
        aria-label={`Delete ${resource.title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ResourceCard({
  resource,
  onEdit,
  onDelete,
  showAdminActions = false,
  bookmarked = false,
  onToggleBookmark,
  detailBasePath = '',
  onOpen,
}) {
  const [videoPreviewStatus, setVideoPreviewStatus] = useState('idle');

  const tags = resource?.tags || [];
  const typeLabel = RESOURCE_TYPE_LABELS[resource?.resource_type] || 'Resource';
  const href = detailBasePath ? `${detailBasePath}/${resource.id}` : null;
  const typeStyle = TYPE_STYLES[resource?.resource_type] || FALLBACK_STYLE;
  const TypeIcon = typeStyle.icon;
  const date = formatDate(resource?.published_at || resource?.created_at);
  const autoCover = getAutoCover(resource);
  const autoCoverFallback = getAutoCoverFallback(resource);
  const mediaMimeType = String(
    resource?.content?.uploadedMediaMimeType ||
      resource?.content?.mediaMimeType ||
      ''
  ).toLowerCase();
  const isPdfFile =
    resource?.resource_type === 'file' &&
    (getFileExtension(resource?.file_url) === 'pdf' ||
      mediaMimeType === 'application/pdf' ||
      String(resource?.title || '')
        .toLowerCase()
        .endsWith('.pdf'));
  const pdfPreviewSrc = isPdfFile ? getPdfPreviewSrc(resource?.file_url) : '';
  const isVideoFile = resource?.resource_type === 'video' && resource?.file_url;
  const driveVideoThumbnail = isVideoFile
    ? getDriveVideoThumbnailUrl(resource?.file_url)
    : '';

  useEffect(() => {
    if (!isVideoFile) {
      setVideoPreviewStatus('idle');
      return;
    }
    setVideoPreviewStatus('loading');
  }, [isVideoFile, resource?.id, resource?.file_url]);

  useEffect(() => {
    if (!isVideoFile || videoPreviewStatus !== 'loading') return;
    const timer = setTimeout(() => {
      setVideoPreviewStatus((prev) => (prev === 'loading' ? 'failed' : prev));
    }, 7000);
    return () => clearTimeout(timer);
  }, [isVideoFile, videoPreviewStatus]);

  const showDriveVideoThumbnail = Boolean(
    driveVideoThumbnail && videoPreviewStatus !== 'failed'
  );
  const showInlineVideoPreview = Boolean(
    isVideoFile && !driveVideoThumbnail && videoPreviewStatus !== 'failed'
  );
  const showVideoPlaceholder = Boolean(
    isVideoFile && !resource?.thumbnail && videoPreviewStatus === 'failed'
  );

  const isSocialPost = ['facebook_post', 'linkedin_post'].includes(
    resource?.resource_type
  );
  const canOpenInModal = !showAdminActions && typeof onOpen === 'function';

  const openResource = () => {
    if (!canOpenInModal) return;
    onOpen(resource);
  };

  const handleCardKeyDown = (e) => {
    if (!canOpenInModal) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openResource();
    }
  };

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] transition-all duration-300 focus-within:border-white/12 focus-within:ring-1 focus-within:ring-blue-500/20 hover:border-white/12 hover:bg-white/[0.05] hover:shadow-xl hover:shadow-black/20 ${
        canOpenInModal ? 'cursor-pointer' : ''
      }`}
      onClick={openResource}
      onKeyDown={handleCardKeyDown}
      role={canOpenInModal ? 'button' : undefined}
      tabIndex={canOpenInModal ? 0 : undefined}
      aria-label={canOpenInModal ? `Open ${resource.title}` : undefined}
    >
      {/* ── Social post embed OR Thumbnail / Type-gradient placeholder ── */}
      {isSocialPost && resource?.embed_url ? (
        <div className="relative shrink-0">
          {/* Badges overlay */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
            <TypeBadge typeStyle={typeStyle} typeLabel={typeLabel} />
            {resource.is_pinned && <PinnedBadge />}
          </div>

          <div className="absolute top-3 right-3 z-10">
            <VisibilityBadge visibility={resource.visibility} />
          </div>

          <SocialCardEmbed
            resourceType={resource.resource_type}
            embedUrl={resource.embed_url}
            title={resource.title}
          />

          {showAdminActions && (
            <AdminOverlay
              resource={resource}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      ) : (
        <div className="relative h-40 shrink-0 overflow-hidden bg-gray-900/50 sm:h-44">
          {resource.thumbnail ? (
            <Image
              src={resource.thumbnail}
              alt={resource.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : isPdfFile && pdfPreviewSrc ? (
            <iframe
              src={pdfPreviewSrc}
              title={resource.title || 'PDF preview'}
              className="h-full w-full border-0"
              loading="lazy"
            />
          ) : showDriveVideoThumbnail ? (
            <img
              src={driveVideoThumbnail}
              alt={resource.title || 'Video preview'}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onLoad={() => setVideoPreviewStatus('ready')}
              onError={() => setVideoPreviewStatus('failed')}
            />
          ) : showInlineVideoPreview ? (
            <video
              src={resource.file_url}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
              playsInline
              onLoadedData={() => setVideoPreviewStatus('ready')}
              onCanPlay={() => setVideoPreviewStatus('ready')}
              onError={() => setVideoPreviewStatus('failed')}
              onStalled={() => setVideoPreviewStatus('failed')}
            />
          ) : showVideoPlaceholder ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700/30 to-orange-700/25">
              <div className="flex flex-col items-center gap-2 text-white/70">
                <PlayCircle className="h-10 w-10" strokeWidth={1.5} />
                <span className="text-xs font-medium">
                  Video preview unavailable
                </span>
              </div>
            </div>
          ) : autoCover ? (
            <img
              src={autoCover}
              alt={resource.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                if (
                  autoCoverFallback &&
                  e.currentTarget.src !== autoCoverFallback
                ) {
                  e.currentTarget.src = autoCoverFallback;
                  return;
                }
                e.currentTarget.onerror = null;
              }}
            />
          ) : (
            <div
              className={`flex h-full items-center justify-center bg-gradient-to-br ${typeStyle.gradient}`}
            >
              <TypeIcon className="h-12 w-12 text-white/15" strokeWidth={1.5} />
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Top-left badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 sm:top-3 sm:left-3">
            <TypeBadge typeStyle={typeStyle} typeLabel={typeLabel} />
            {resource.is_pinned && <PinnedBadge />}
          </div>

          {/* Top-right visibility */}
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
            <VisibilityBadge visibility={resource.visibility} />
          </div>

          {/* Admin hover overlay */}
          {showAdminActions && (
            <AdminOverlay
              resource={resource}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      )}

      {/* ── Content area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col space-y-2.5 p-3.5 sm:space-y-3 sm:p-4">
        {/* Title + description */}
        <div className="flex-1">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-white transition-colors group-hover:text-blue-200 sm:text-[15px]">
            {resource.title}
          </h3>
          {resource.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 sm:mt-1.5 sm:text-[13px]">
              {resource.description}
            </p>
          )}
        </div>

        {/* Category + tags */}
        {(resource.category?.name || tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {resource.category?.name && (
              <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-gray-300">
                {resource.category.name}
              </span>
            )}
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id || tag.slug || tag.name}
                className="rounded-md border border-blue-500/12 bg-blue-500/6 px-2 py-0.5 text-[10px] text-blue-400"
              >
                #{tag.name}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[10px] text-gray-600">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Date + actions footer */}
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.04] pt-2.5 sm:pt-3">
          {date ? (
            <time
              dateTime={resource?.published_at || resource?.created_at}
              className="flex items-center gap-1.5 text-[11px] text-gray-600"
            >
              <Calendar className="h-3 w-3" />
              {date}
            </time>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5">
            {/* View button for modal-openable cards */}
            {!showAdminActions && canOpenInModal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openResource();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-gray-300 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none sm:px-3"
                aria-label={`View ${resource.title}`}
              >
                View <ExternalLink className="h-3 w-3" />
              </button>
            )}

            {/* View link for non-modal cards */}
            {!showAdminActions && !canOpenInModal && href && (
              <Link
                href={href}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-gray-300 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none sm:px-3"
                aria-label={`View ${resource.title}`}
              >
                View <ExternalLink className="h-3 w-3" />
              </Link>
            )}

            {/* Bookmark toggle */}
            {!showAdminActions && onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(resource.id);
                }}
                className={`inline-flex items-center rounded-lg border px-2 py-1.5 transition-all focus:ring-2 focus:ring-blue-500/30 focus:outline-none ${
                  bookmarked
                    ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                    : 'border-white/[0.06] bg-white/[0.04] text-gray-400 hover:border-white/15 hover:text-white'
                }`}
                aria-label={
                  bookmarked
                    ? `Remove bookmark from ${resource.title}`
                    : `Bookmark ${resource.title}`
                }
                aria-pressed={bookmarked}
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-3.5 w-3.5" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {/* Admin actions in footer */}
            {showAdminActions && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(resource);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-gray-300 transition-all hover:border-blue-500/25 hover:bg-blue-500/10 hover:text-blue-300 focus:ring-2 focus:ring-blue-500/30 focus:outline-none sm:px-2.5"
                  aria-label={`Edit ${resource.title}`}
                >
                  <Edit3 className="h-3 w-3" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(resource);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/8 px-2 py-1.5 text-[11px] font-medium text-red-300 transition-all hover:bg-red-500/15 focus:ring-2 focus:ring-red-500/30 focus:outline-none sm:px-2.5"
                  aria-label={`Delete ${resource.title}`}
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
