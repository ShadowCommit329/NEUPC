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
  Star,
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
      className={`group relative flex flex-col rounded-[12px] border border-white/[0.06] bg-[#121317] transition-all duration-150 hover:border-white/[0.09] hover:bg-[#181a1f] ${
        canOpenInModal ? 'cursor-pointer' : ''
      }`}
      onClick={openResource}
      onKeyDown={handleCardKeyDown}
      role={canOpenInModal ? 'button' : undefined}
      tabIndex={canOpenInModal ? 0 : undefined}
      aria-label={canOpenInModal ? `Open ${resource.title}` : undefined}
    >
      {/* ── Card body ── */}
      <div className="flex flex-1 flex-col gap-[6px] p-4">
        {/* Top row: type pill + bookmark */}
        <div className="flex items-center justify-between gap-2 mb-[2px]">
          <div className="flex items-center gap-1.5">
            <TypeBadge typeStyle={typeStyle} typeLabel={typeLabel} />
            {resource.is_pinned && <PinnedBadge />}
          </div>
          {!showAdminActions && onToggleBookmark && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(resource.id); }}
              className={`cursor-pointer p-1 transition-colors focus:outline-none ${
                bookmarked ? 'text-[#fbbf24]' : 'text-white/20 hover:text-white/50'
              }`}
              aria-label={bookmarked ? `Remove bookmark from ${resource.title}` : `Bookmark ${resource.title}`}
              aria-pressed={bookmarked}
            >
              <Star className="h-3.5 w-3.5" fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          )}
          {showAdminActions && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(resource); }}
                className="flex h-[26px] items-center gap-1 rounded-[5px] border border-white/[0.06] bg-transparent px-2 text-[11px] text-white/40 transition-all hover:border-blue-500/25 hover:bg-blue-500/10 hover:text-blue-300"
                aria-label={`Edit ${resource.title}`}
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(resource); }}
                className="flex h-[26px] items-center gap-1 rounded-[5px] border border-red-500/20 bg-transparent px-2 text-[11px] text-red-400/60 transition-all hover:bg-red-500/10 hover:text-red-300"
                aria-label={`Delete ${resource.title}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-white">
          {resource.title}
        </h3>

        {/* Description */}
        {resource.description && (
          <p className="line-clamp-2 text-[12.5px] leading-[1.45] text-white/40">
            {resource.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t border-white/[0.06] pt-[10px]">
          <div className="flex min-w-0 items-center gap-[6px] flex-wrap">
            {resource.category?.name && (
              <span className="text-[11.5px] text-white/30">{resource.category.name}</span>
            )}
            {resource.category?.name && date && (
              <span className="text-white/20 text-[11px]">·</span>
            )}
            {date && (
              <time dateTime={resource?.published_at || resource?.created_at} className="text-[11.5px] text-white/30">
                {date}
              </time>
            )}
          </div>

          {!showAdminActions && canOpenInModal && (
            <button
              onClick={(e) => { e.stopPropagation(); openResource(); }}
              className="flex shrink-0 items-center gap-1 rounded-[5px] border border-white/[0.06] bg-transparent px-2.5 py-1 text-[11px] font-medium text-white/40 transition-all hover:border-white/[0.14] hover:bg-[#1f2127] hover:text-white/80"
              aria-label={`View ${resource.title}`}
            >
              View <ExternalLink className="h-2.5 w-2.5" />
            </button>
          )}
          {!showAdminActions && !canOpenInModal && href && (
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="flex shrink-0 items-center gap-1 rounded-[5px] border border-white/[0.06] bg-transparent px-2.5 py-1 text-[11px] font-medium text-white/40 transition-all hover:border-white/[0.14] hover:bg-[#1f2127] hover:text-white/80"
              aria-label={`View ${resource.title}`}
            >
              View <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
