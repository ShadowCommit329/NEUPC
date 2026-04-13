'use client';

import {
  normalizeEmbed,
  safeExternalHref,
} from '@/app/_lib/resources/embed-utils';
import { FileDown, Download, ExternalLink, Loader2 } from 'lucide-react';

// ─── File helpers ─────────────────────────────────────────────────────────────

function getFileExtension(url) {
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    return ext && ext.length <= 6 ? ext : '';
  } catch {
    return '';
  }
}

function getFileName(url) {
  if (!url) return 'file';
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1]) || 'file';
  } catch {
    return 'file';
  }
}

const FILE_TYPE_INFO = {
  pdf: {
    label: 'PDF Document',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  doc: {
    label: 'Word Document',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  docx: {
    label: 'Word Document',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  ppt: {
    label: 'Presentation',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  pptx: {
    label: 'Presentation',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  txt: {
    label: 'Text File',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
  },
  zip: {
    label: 'ZIP Archive',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
};

const DEFAULT_FILE_INFO = {
  label: 'File',
  color: 'text-gray-400',
  bg: 'bg-gray-500/10',
  border: 'border-gray-500/20',
};

function getFileTypeKey(resource, fileUrl) {
  const ext = getFileExtension(fileUrl);
  if (ext) return ext;

  const mime = String(
    resource?.content?.uploadedMediaMimeType ||
      resource?.content?.mediaMimeType ||
      ''
  ).toLowerCase();

  if (mime === 'application/pdf' || mime === 'application/x-pdf') return 'pdf';
  if (mime === 'application/zip' || mime === 'application/x-zip-compressed')
    return 'zip';
  if (mime === 'text/plain') return 'txt';
  if (mime === 'application/msword') return 'doc';
  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'docx';
  if (mime === 'application/vnd.ms-powerpoint') return 'ppt';
  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )
    return 'pptx';

  return '';
}

// ─── Social "View on …" fallback link ────────────────────────────────────────

function SocialFallbackLink({ href, provider, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-2 text-sm text-gray-400 transition hover:border-white/15 hover:bg-white/5 hover:text-gray-200"
    >
      {icon}
      <span>View on {provider}</span>
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

// ─── Facebook Post Embed ─────────────────────────────────────────────────────

function FacebookPostEmbed({ embedUrl, title }) {
  const href = safeExternalHref(embedUrl);
  if (!href) return null;

  // Facebook plugin iframe URL
  const pluginUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(href)}&show_text=true&width=500`;

  return (
    <div className="space-y-0">
      <div className="flex justify-center">
        <div className="w-full max-w-130 overflow-hidden rounded-2xl border border-[#1877F2]/20 bg-[#1877F2]/5">
          <iframe
            src={pluginUrl}
            title={title || 'Facebook post'}
            className="w-full border-0"
            style={{ minHeight: 350 }}
            scrolling="no"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            loading="lazy"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <SocialFallbackLink
          href={href}
          provider="Facebook"
          icon={<FacebookIcon className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

// ─── LinkedIn Post Embed ─────────────────────────────────────────────────────

function extractLinkedInPostId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const decodedPath = decodeURIComponent(u.pathname);
    const combined = `${decodedPath}${u.search}`;

    // Matches feed/update/embed URNs and encoded variants.
    // LinkedIn embeds support activity/share/ugcPost identifiers.
    const urnMatch = combined.match(/(urn:li:(?:activity|share|ugcPost):\d+)/);
    if (urnMatch) return urnMatch[1];

    // Matches the common slug format:
    // /posts/username_slug-activity-1234567890123456789-xxxx
    const slugActivityMatch = decodedPath.match(/-activity-(\d{10,})/);
    if (slugActivityMatch) {
      return `urn:li:activity:${slugActivityMatch[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}

function LinkedInPostEmbed({ embedUrl, title }) {
  const href = safeExternalHref(embedUrl);
  if (!href) return null;

  const activityUrn = extractLinkedInPostId(embedUrl);

  // LinkedIn embed iframe works with valid update URNs
  if (activityUrn) {
    const iframeSrc = `https://www.linkedin.com/embed/feed/update/${activityUrn}`;
    return (
      <div className="space-y-0">
        <div className="flex justify-center">
          <div className="w-full max-w-130 overflow-hidden rounded-2xl border border-[#0A66C2]/20 bg-[#0A66C2]/5">
            <iframe
              src={iframeSrc}
              title={title || 'LinkedIn post'}
              className="w-full border-0"
              style={{ minHeight: 400 }}
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <SocialFallbackLink
            href={href}
            provider="LinkedIn"
            icon={<LinkedInIcon className="h-4 w-4" />}
          />
        </div>
      </div>
    );
  }

  // LinkedIn does not provide a universal iframe for every public URL format.
  // If we cannot derive an activity URN, fall back to the branded link card.
  return (
    <div className="space-y-0">
      <SocialPostCard
        href={href}
        provider="LinkedIn"
        iconBg="bg-[#0A66C2]/15"
        brandBg="bg-[#0A66C2]/5"
        brandBorder="border-[#0A66C2]/20"
        description={title || 'View the original LinkedIn post'}
        icon={<LinkedInIcon className="h-7 w-7" />}
      />
    </div>
  );
}

// ─── Social-brand full card (kept as fallback) ───────────────────────────────

function SocialPostCard({
  href,
  provider,
  brandBg,
  brandBorder,
  iconBg,
  description,
  icon,
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block overflow-hidden rounded-2xl border ${brandBorder} ${brandBg} transition-all duration-300 hover:shadow-lg hover:shadow-black/20`}
    >
      <div className="flex items-center gap-4 p-6">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-white">
            View on {provider}
          </p>
          <p className="mt-1 truncate text-sm text-gray-400">
            {description || href}
          </p>
        </div>
        <ExternalLink className="h-5 w-5 shrink-0 text-gray-500 transition-colors group-hover:text-white" />
      </div>
    </a>
  );
}

// ─── SVG brand icons ─────────────────────────────────────────────────────────

function FacebookIcon({ className = 'h-7 w-7' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`text-[#1877F2] ${className}`}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon({ className = 'h-7 w-7' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`text-[#0A66C2] ${className}`}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ResourceEmbed({ resource, className = '' }) {
  const type = resource?.resource_type;
  const embedUrl = resource?.embed_url;
  const fileUrl = resource?.file_url;

  // ── Image ──────────────────────────────────────────────
  if (type === 'image') {
    const src = fileUrl || embedUrl;
    if (!src) return null;

    return (
      <div
        className={`group relative overflow-hidden rounded-xl border border-white/10 bg-black ${className}`}
      >
        <img
          src={src}
          alt={resource?.title || 'Image resource'}
          className="w-full object-contain"
          style={{ maxHeight: '70vh' }}
          loading="lazy"
        />
      </div>
    );
  }

  // ── Video ──────────────────────────────────────────────
  if (type === 'video') {
    const src = fileUrl || embedUrl;
    if (!src) return null;

    // Drive-hosted videos are stored as /api/image/{fileId}.
    // The image proxy only handles images, so we use the Drive iframe
    // /preview embed for playback — same pattern as PDF previews.
    const driveMatch = src.match(/^\/api\/image\/([^/?#&]+)/);
    if (driveMatch?.[1]) {
      const driveEmbedSrc = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      return (
        <div
          className={`aspect-video overflow-hidden rounded-xl border border-white/10 bg-black ${className}`}
        >
          <iframe
            src={driveEmbedSrc}
            title={resource?.title || 'Video'}
            className="h-full w-full border-0"
            loading="lazy"
            allow="autoplay"
            allowFullScreen
          />
        </div>
      );
    }

    // Non-Drive video: use the native HTML5 player
    return (
      <div
        className={`overflow-hidden rounded-xl border border-white/10 bg-black ${className}`}
      >
        <video
          src={src}
          controls
          preload="metadata"
          className="w-full"
          style={{ maxHeight: '70vh' }}
        >
          Your browser does not support the video element.
        </video>
      </div>
    );
  }

  // ── Rich Text ──────────────────────────────────────────
  if (type === 'rich_text') {
    const html =
      typeof resource?.content === 'string'
        ? resource.content
        : resource?.content?.html || '';

    return (
      <article
        className={`prose prose-invert prose-headings:text-white prose-p:text-gray-300 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-blue-300 prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/40 prose-img:rounded-xl prose-img:border prose-img:border-white/10 max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // ── YouTube ────────────────────────────────────────────
  if (type === 'youtube' && embedUrl) {
    const normalized = normalizeEmbed('youtube', embedUrl);
    if (!normalized.ok) return null;

    return (
      <div
        className={`aspect-video overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg shadow-black/30 ${className}`}
      >
        <iframe
          src={normalized.embedUrl}
          title={resource?.title || 'YouTube video'}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  // ── Facebook Post ──────────────────────────────────────
  if (type === 'facebook_post' && embedUrl) {
    return (
      <div className={className}>
        <FacebookPostEmbed embedUrl={embedUrl} title={resource?.title} />
      </div>
    );
  }

  // ── LinkedIn Post ──────────────────────────────────────
  if (type === 'linkedin_post' && embedUrl) {
    return (
      <div className={className}>
        <LinkedInPostEmbed embedUrl={embedUrl} title={resource?.title} />
      </div>
    );
  }

  // ── External Link ──────────────────────────────────────
  if (type === 'external_link' && embedUrl) {
    const href = safeExternalHref(embedUrl);
    if (!href) return null;

    return (
      <div className={`space-y-3 ${className}`}>
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg shadow-black/20 md:aspect-video">
          <iframe
            src={href}
            title={resource?.title || 'External website'}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          Open in new tab
        </a>
      </div>
    );
  }

  // ── File ───────────────────────────────────────────────
  if (type === 'file' && fileUrl) {
    const ext = getFileTypeKey(resource, fileUrl);
    const fileName = getFileName(fileUrl);
    const info = FILE_TYPE_INFO[ext] || {
      ...DEFAULT_FILE_INFO,
      label: ext ? `${ext.toUpperCase()} File` : 'File',
    };

    return (
      <div
        className={`overflow-hidden rounded-2xl border ${info.border} ${info.bg} ${className}`}
      >
        <div className="flex items-center gap-5 p-6">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border ${info.border} bg-white/5`}
          >
            <FileDown className={`h-8 w-8 ${info.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white">
              {fileName}
            </p>
            <p className="mt-1 text-sm text-gray-400">{info.label}</p>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>
      </div>
    );
  }

  return null;
}
