import ResourceEmbed from '@/app/_components/resources/ResourceEmbed';
import Image from 'next/image';
import {
  Calendar,
  Tag,
  FolderOpen,
  Globe,
  Lock,
  Pin,
  ImageIcon,
  PlayCircle,
  FileText,
  FileDown,
  Share2,
  ExternalLink as ExternalLinkIcon,
  User,
} from 'lucide-react';
import { RESOURCE_TYPE_LABELS } from '@/app/_lib/resources/constants';

// ─── Per-type visual config ──────────────────────────────────────────────────

const TYPE_CONFIG = {
  image: {
    icon: ImageIcon,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  video: {
    icon: PlayCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  rich_text: {
    icon: FileText,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  youtube: {
    icon: PlayCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  facebook_post: {
    icon: Share2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  linkedin_post: {
    icon: Share2,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  external_link: {
    icon: ExternalLinkIcon,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  file: {
    icon: FileDown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
};

const FALLBACK_CONFIG = {
  icon: FileText,
  color: 'text-gray-400',
  bg: 'bg-gray-500/10',
  border: 'border-gray-500/20',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return null;
  }
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ResourceViewer({ resource }) {
  if (!resource) return null;

  const type = resource.resource_type;
  const cfg = TYPE_CONFIG[type] || FALLBACK_CONFIG;
  const TypeIcon = cfg.icon;
  const typeLabel = RESOURCE_TYPE_LABELS[type] || 'Resource';
  const tags = resource.tags || [];
  const date = formatDate(resource.published_at || resource.created_at);

  // Don't show thumbnail separately for visual types — the embed IS the visual
  const showThumbnail =
    resource.thumbnail && !['image', 'video', 'youtube'].includes(type);

  return (
    <section className="space-y-4 sm:space-y-6" aria-label="Resource details">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5 md:p-7">
        {/* Meta pills */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5 sm:mb-4 sm:gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border ${cfg.border} ${cfg.bg} px-2 py-1 text-xs font-semibold sm:px-2.5 ${cfg.color}`}
          >
            <TypeIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {typeLabel}
          </span>

          {resource.category?.name && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-2 py-1 text-xs font-medium text-gray-300 sm:px-2.5">
              <FolderOpen className="h-3 w-3 text-gray-500" />
              {resource.category.name}
            </span>
          )}

          {resource.visibility === 'public' && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-green-500/20 bg-green-500/8 px-2 py-1 text-xs text-green-300 sm:px-2.5">
              <Globe className="h-3 w-3" /> Public
            </span>
          )}
          {resource.visibility === 'members' && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/8 px-2 py-1 text-xs text-blue-300 sm:px-2.5">
              <Lock className="h-3 w-3" /> Members
            </span>
          )}

          {resource.is_pinned && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-yellow-500/20 bg-yellow-500/8 px-2 py-1 text-xs text-yellow-300 sm:px-2.5">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl leading-tight font-bold text-white sm:text-2xl md:text-3xl">
          {resource.title}
        </h1>

        {/* Description */}
        {resource.description && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50 sm:mt-3 sm:text-[15px]">
            {resource.description}
          </p>
        )}

        {/* Date + tags footer */}
        {(date || tags.length > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/8 pt-3 sm:mt-5 sm:pt-4">
            {date && (
              <time
                dateTime={resource.published_at || resource.created_at}
                className="flex items-center gap-1.5 text-xs text-gray-600"
              >
                <Calendar className="h-3.5 w-3.5" />
                {date}
              </time>
            )}

            {tags.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="list"
                aria-label="Tags"
              >
                <Tag className="h-3 w-3 text-gray-600" />
                {tags.map((tag) => (
                  <span
                    key={tag.id || tag.slug || tag.name}
                    role="listitem"
                    className="rounded-md border border-blue-500/15 bg-blue-500/8 px-2 py-0.5 text-[11px] text-blue-400"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Thumbnail (only for non-visual types) ─────────────────── */}
      {showThumbnail && (
        <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/8 sm:h-64 md:h-80 lg:h-96">
          <Image
            src={resource.thumbnail}
            alt={resource.title}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5 md:p-7">
        <ResourceEmbed resource={resource} />
      </div>

      {/* ── Attachment (when file_url exists for non-media types) ── */}
      {resource.file_url && !['file', 'image', 'video'].includes(type) && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold tracking-wider text-gray-600 uppercase">
            Attachment
          </p>
          <a
            href={resource.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-white/15 hover:bg-white/10 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
          >
            <FileDown className="h-4 w-4 text-gray-500" />
            Open attachment
          </a>
        </div>
      )}
    </section>
  );
}
