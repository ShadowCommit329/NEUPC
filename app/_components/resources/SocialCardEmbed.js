'use client';

import { useState } from 'react';
import { safeExternalHref } from '@/app/_lib/resources/embed-utils';
import { ExternalLink } from 'lucide-react';

// ─── SVG brand icons (compact) ───────────────────────────────────────────────

function FacebookIcon({ className = 'h-5 w-5' }) {
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

function LinkedInIcon({ className = 'h-5 w-5' }) {
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

// ─── Brand configurations ────────────────────────────────────────────────────

const SOCIAL_CONFIG = {
  facebook_post: {
    provider: 'Facebook',
    icon: FacebookIcon,
    brandColor: '#1877F2',
    borderColor: 'border-[#1877F2]/20',
    bgColor: 'bg-[#1877F2]/5',
    iconBg: 'bg-[#1877F2]/15',
  },
  linkedin_post: {
    provider: 'LinkedIn',
    icon: LinkedInIcon,
    brandColor: '#0A66C2',
    borderColor: 'border-[#0A66C2]/20',
    bgColor: 'bg-[#0A66C2]/5',
    iconBg: 'bg-[#0A66C2]/15',
  },
};

// ─── Facebook Card Embed ─────────────────────────────────────────────────────

function FacebookCardEmbed({ embedUrl, title }) {
  const href = safeExternalHref(embedUrl);
  if (!href) return null;

  const pluginUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(href)}&show_text=true&width=350`;

  return (
    <div className="overflow-hidden border-b border-[#1877F2]/10">
      <iframe
        src={pluginUrl}
        title={title || 'Facebook post'}
        className="w-full border-0"
        style={{ minHeight: 280, maxHeight: 350 }}
        scrolling="no"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        loading="lazy"
      />
    </div>
  );
}

// ─── LinkedIn Card Embed ─────────────────────────────────────────────────────

function extractLinkedInPostId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const decodedPath = decodeURIComponent(u.pathname);
    const combined = `${decodedPath}${u.search}`;

    const urnMatch = combined.match(/(urn:li:(?:activity|share|ugcPost):\d+)/);
    if (urnMatch) return urnMatch[1];

    const slugActivityMatch = decodedPath.match(/-activity-(\d{10,})/);
    if (slugActivityMatch) {
      return `urn:li:activity:${slugActivityMatch[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}

function LinkedInCardEmbed({ embedUrl, title }) {
  const href = safeExternalHref(embedUrl);
  if (!href) return null;

  const activityUrn = extractLinkedInPostId(embedUrl);

  if (activityUrn) {
    const iframeSrc = `https://www.linkedin.com/embed/feed/update/${activityUrn}`;
    return (
      <div className="overflow-hidden border-b border-[#0A66C2]/10">
        <iframe
          src={iframeSrc}
          title={title || 'LinkedIn post'}
          className="w-full border-0"
          style={{ minHeight: 280, maxHeight: 350 }}
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  // Slug-based LinkedIn URLs can't be iframe-embedded, fall back
  return null;
}

// ─── Generic social fallback card (when embed fails) ─────────────────────────

function SocialCardFallback({ resourceType, embedUrl, title }) {
  const config = SOCIAL_CONFIG[resourceType];
  if (!config) return null;
  const href = safeExternalHref(embedUrl);
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 border-b ${config.borderColor} ${config.bgColor} px-4 py-10`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.iconBg}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">
          {config.provider} Post
        </p>
        <p className="mt-1 max-w-50 truncate text-xs text-gray-500">
          {title || 'View the original post'}
        </p>
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-gray-300 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          View on {config.provider}
        </a>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SocialCardEmbed({ resourceType, embedUrl, title }) {
  const [embedFailed, setEmbedFailed] = useState(false);

  if (!resourceType || !embedUrl) return null;

  // If the embed failed, show fallback
  if (embedFailed) {
    return (
      <SocialCardFallback
        resourceType={resourceType}
        embedUrl={embedUrl}
        title={title}
      />
    );
  }

  if (resourceType === 'facebook_post') {
    return (
      <FacebookCardEmbedWithFallback
        embedUrl={embedUrl}
        title={title}
        resourceType={resourceType}
      />
    );
  }

  if (resourceType === 'linkedin_post') {
    return (
      <LinkedInCardEmbedWithFallback
        embedUrl={embedUrl}
        title={title}
        resourceType={resourceType}
      />
    );
  }

  return (
    <SocialCardFallback
      resourceType={resourceType}
      embedUrl={embedUrl}
      title={title}
    />
  );
}

// ─── Facebook embed with fallback wrapper ────────────────────────────────────

function FacebookCardEmbedWithFallback({ embedUrl, title, resourceType }) {
  const href = safeExternalHref(embedUrl);

  if (!href) {
    return (
      <SocialCardFallback
        resourceType={resourceType}
        embedUrl={embedUrl}
        title={title}
      />
    );
  }

  return <FacebookCardEmbed embedUrl={embedUrl} title={title} />;
}

// ─── LinkedIn embed with fallback wrapper ────────────────────────────────────

function LinkedInCardEmbedWithFallback({ embedUrl, title, resourceType }) {
  const activityUrn = extractLinkedInPostId(embedUrl);

  // LinkedIn's iframe embed only works with activity URN URLs
  if (!activityUrn) {
    return (
      <SocialCardFallback
        resourceType={resourceType}
        embedUrl={embedUrl}
        title={title}
      />
    );
  }

  return <LinkedInCardEmbed embedUrl={embedUrl} title={title} />;
}
