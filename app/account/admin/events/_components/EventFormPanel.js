/**
 * @file Full-screen overlay panel for creating / editing events.
 *   Professional UI with sectioned cards, sticky header, live preview,
 *   and progress indicator — all within an overlay on the management page.
 *
 * @module AdminEventFormPanel
 */

'use client';

import { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle2,
  PlusCircle,
  Edit3,
  AlertCircle,
  Upload,
  Trash2,
  Info,
  Eye,
  EyeOff,
  Star,
  Clock,
  Users,
  Globe,
  Tag,
  FileText,
  Settings,
  Image as ImageIcon,
  Link2,
  Shield,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  CATEGORIES,
  STATUSES,
  VENUE_TYPES,
  getStatusConfig,
  getCategoryConfig,
  getVenueConfig,
  toLocalDateTimeInput,
  formatEventDateTime,
} from './eventConfig';
import {
  createEventAction,
  updateEventAction,
  uploadEventImageAction,
  deleteEventImageAction,
  generateEventImageAction,
  generateEventTextAction,
} from '@/app/_lib/event-actions';
import { IMAGE_MODELS, DEFAULT_MODEL } from '@/app/_lib/image-gen';
import { TEXT_MODELS, DEFAULT_TEXT_MODEL } from '@/app/_lib/text-gen';
import { driveImageUrl } from '@/app/_lib/utils';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Field style constants                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-blue-500/40 focus:bg-white/7 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 scheme-dark';

const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-400';

const hintCls = 'mt-1.5 text-[11px] text-gray-600';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Sub-components                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Section card with icon, title, description. */
function FormSection({ icon: Icon, title, description, children, id }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-white/8 bg-white/3 p-5 backdrop-blur-sm transition-colors hover:border-white/12 sm:p-7"
    >
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Toggle switch with label and description. */
function Toggle({ value, onChange, label, description }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 transition-all hover:border-white/15 hover:bg-white/5"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div
        role="switch"
        aria-checked={value}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          value ? 'bg-blue-500' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            value ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
}

/** Pill selector for categories, statuses, venue types. */
function PillSelect({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  getExtra,
  getColor,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const val = getValue ? getValue(opt) : opt;
        const label = getLabel ? getLabel(opt) : opt;
        const extra = getExtra ? getExtra(opt) : null;
        const active = value === val;
        const color = getColor ? getColor(opt, active) : null;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
              active
                ? color ||
                  'border-blue-500/40 bg-blue-500/15 text-blue-300 shadow-sm shadow-blue-500/10'
                : 'border-white/8 bg-white/3 text-gray-500 hover:border-white/15 hover:bg-white/6 hover:text-gray-300'
            }`}
          >
            {extra && <span className="mr-1.5">{extra}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Sidebar navigation item. */
function NavItem({ icon: Icon, label, active, sectionId }) {
  return (
    <a
      href={`#${sectionId}`}
      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
        active
          ? 'bg-blue-500/10 text-blue-400'
          : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </a>
  );
}

/** Full-height live preview mirroring the public event detail page layout. */
function LivePreview({
  title,
  description,
  content,
  category,
  status,
  startDate,
  endDate,
  coverImage,
  location,
  venueType,
  isFeatured,
  regRequired,
  regDeadline,
  maxParticipants,
  registrationUrl,
  externalUrl,
  prerequisites,
  eligibility,
  tags,
  roles = [],
}) {
  const sc = getStatusConfig(status);
  const cc = getCategoryConfig(category);
  const vc = getVenueConfig(venueType);

  const eligibilityLabel =
    eligibility === 'all'
      ? 'Everyone'
      : (() => {
          const role = roles.find((r) => r.id === eligibility);
          return role
            ? `${role.name.charAt(0).toUpperCase() + role.name.slice(1)}s Only`
            : eligibility;
        })();

  const tagList = tags
    ? tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Helpers matching the original page
  function fmtDate(ds) {
    if (!ds) return '';
    return new Date(ds).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  function fmtTime(ds) {
    if (!ds) return '';
    return new Date(ds).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  function fmtShortDate(ds) {
    if (!ds) return { month: '', day: '' };
    const d = new Date(ds);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate(),
    };
  }
  function getDuration(start, end) {
    if (!start || !end) return null;
    const ms = new Date(end) - new Date(start);
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 24) {
      const days = Math.ceil(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${minutes} min`;
  }
  function getVenueLabel(type) {
    const map = {
      online: '🌐 Online',
      offline: '🏢 In-Person',
      hybrid: '🔄 Hybrid',
    };
    return map[type] || '';
  }

  const { month, day } = fmtShortDate(startDate);
  const duration = getDuration(startDate, endDate);
  const venueLabel = getVenueLabel(venueType);

  const statusMap = {
    draft: {
      label: 'Draft',
      dot: 'bg-gray-400',
      bg: 'bg-gray-500/15 border-gray-500/30',
      text: 'text-gray-300',
    },
    upcoming: {
      label: 'Upcoming',
      dot: 'bg-emerald-400',
      bg: 'bg-emerald-500/15 border-emerald-500/30',
      text: 'text-emerald-300',
    },
    ongoing: {
      label: 'Happening Now',
      dot: 'bg-amber-400 animate-pulse',
      bg: 'bg-amber-500/15 border-amber-500/30',
      text: 'text-amber-300',
    },
    completed: {
      label: 'Completed',
      dot: 'bg-gray-400',
      bg: 'bg-gray-500/15 border-gray-500/30',
      text: 'text-gray-300',
    },
    cancelled: {
      label: 'Cancelled',
      dot: 'bg-red-400',
      bg: 'bg-red-500/15 border-red-500/30',
      text: 'text-red-300',
    },
  };
  const statusCfg = statusMap[status] || statusMap.draft;

  /* -- InfoCard matching the original page -- */
  function InfoCard({ icon, label, value, accent = false }) {
    if (!value) return null;
    return (
      <div
        className={`group/info flex items-start gap-3 rounded-xl border p-3.5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
          accent
            ? 'border-primary-500/20 bg-primary-500/5 hover:border-primary-500/40 hover:bg-primary-500/10'
            : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/7'
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover/info:scale-110 ${
            accent ? 'bg-primary-500/20' : 'bg-white/8'
          }`}
        >
          <span className="text-base">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-wider text-gray-400 uppercase">
            {label}
          </p>
          <p className="mt-0.5 text-xs leading-snug font-semibold text-gray-200">
            {value}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-linear-to-b from-[#0F172A] via-[#0a1120] to-[#0F172A]">
      {/* ── Immersive Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="from-primary-500/10 to-secondary-500/10 absolute inset-0 bg-linear-to-br" />
          <div className="absolute inset-0 bg-linear-to-b from-black/40 to-black/80" />
        </div>
        {/* Decorative orbs */}
        <div className="from-primary-500/20 absolute -top-16 -left-16 h-48 w-48 rounded-full bg-linear-to-br to-transparent blur-3xl" />
        <div className="from-secondary-500/15 absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-linear-to-tl to-transparent blur-3xl" />

        <div className="relative px-5 pt-6 pb-8">
          <div className="flex items-end gap-4">
            {/* Date card */}
            {month && (
              <div className="hidden shrink-0 sm:block">
                <div className="from-primary-500 to-primary-600 flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-linear-to-br shadow-xl ring-2 ring-white/8">
                  <span className="text-[9px] font-bold tracking-widest text-white/80 uppercase">
                    {month}
                  </span>
                  <span className="text-xl font-black text-white">{day}</span>
                </div>
              </div>
            )}

            {/* Title area */}
            <div className="flex-1 space-y-3">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`}
                  />
                  {statusCfg.label}
                </span>
                {category && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {category}
                  </span>
                )}
                {venueLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/3 px-2.5 py-1 text-[10px] font-medium text-gray-300">
                    {venueLabel}
                  </span>
                )}
                {isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-300">
                    ⭐ Featured
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-lg leading-tight font-bold tracking-tight text-white sm:text-xl lg:text-2xl">
                {title || (
                  <span className="text-gray-500 italic">Untitled Event</span>
                )}
              </h1>

              {/* Quick meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-300">
                {startDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="text-primary-400 h-3 w-3" />
                    <span>{fmtDate(startDate)}</span>
                  </div>
                )}
                {startDate && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="text-primary-400 h-3 w-3" />
                    <span>{fmtTime(startDate)}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="text-primary-400 h-3 w-3" />
                    <span>{location}</span>
                  </div>
                )}
                {duration && (
                  <div className="flex items-center gap-1.5">
                    <Star className="text-primary-400 h-3 w-3" />
                    <span>{duration}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {/* ── Cover Image ── */}
        {coverImage && (
          <div className="group relative overflow-hidden rounded-xl shadow-xl ring-1 ring-white/8 transition-all duration-500 hover:ring-white/15">
            <div className="absolute inset-0 z-10 bg-linear-to-t from-gray-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={driveImageUrl(coverImage)}
              alt={title || 'Cover'}
              className="max-h-64 w-full rounded-xl object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        )}
        {/* About This Event */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="from-primary-500/20 to-primary-600/20 flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br">
              <Info className="text-primary-300 h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-white">About This Event</h2>
          </div>
          <div className="space-y-3">
            {description && (
              <p className="text-xs leading-relaxed text-gray-300">
                {description}
              </p>
            )}
            {content && (
              <div className="border-t border-white/8 pt-3">
                <div
                  className="blog-content text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            )}
            {!description && !content && (
              <p className="text-xs text-gray-600 italic">
                No description yet…
              </p>
            )}
          </div>
        </div>

        {/* Event Details Grid */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="from-secondary-500/20 to-secondary-600/20 flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br">
              <FileText className="text-secondary-300 h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Event Details</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoCard
              icon="📅"
              label="Date"
              value={fmtDate(startDate)}
              accent
            />
            <InfoCard
              icon="🕒"
              label="Time"
              value={fmtTime(startDate)}
              accent
            />
            <InfoCard icon="📍" label="Location" value={location} />
            {venueLabel && (
              <InfoCard
                icon={
                  venueType === 'online'
                    ? '🌐'
                    : venueType === 'hybrid'
                      ? '🔄'
                      : '🏢'
                }
                label="Venue Type"
                value={
                  venueType === 'online'
                    ? 'Online'
                    : venueType === 'hybrid'
                      ? 'Hybrid'
                      : 'In-Person'
                }
              />
            )}
            {duration && (
              <InfoCard icon="⏱️" label="Duration" value={duration} />
            )}
            {endDate && (
              <InfoCard icon="🏁" label="End Date" value={fmtDate(endDate)} />
            )}
            {maxParticipants && (
              <InfoCard
                icon="👥"
                label="Max Participants"
                value={`${maxParticipants} spots`}
              />
            )}
            {regDeadline && (
              <InfoCard
                icon="⏰"
                label="Registration Deadline"
                value={fmtDate(regDeadline)}
                accent
              />
            )}
            <InfoCard
              icon={eligibility === 'all' ? '🌐' : '🔒'}
              label="Eligibility"
              value={eligibilityLabel}
            />
            {category && (
              <InfoCard icon="🏷️" label="Category" value={category} />
            )}
          </div>
        </div>

        {/* Prerequisites */}
        {prerequisites && (
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-500/20 to-amber-600/20">
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
              <h2 className="text-sm font-bold text-white">Prerequisites</h2>
            </div>
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3.5">
              <p className="text-xs leading-relaxed whitespace-pre-line text-gray-300">
                {prerequisites}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {tagList.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="from-primary-500/20 to-primary-600/20 flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br">
                <Tag className="text-primary-300 h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-white">Tags</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="border-primary-500/20 bg-primary-500/10 text-primary-300 rounded-full border px-2.5 py-1 text-[10px] font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar-style cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Registration CTA */}
          <div className="from-primary-500 to-primary-600 relative overflow-hidden rounded-xl bg-linear-to-br p-4 text-white shadow-lg">
            <div className="from-secondary-500/20 absolute -top-8 -right-8 h-24 w-24 rounded-full bg-linear-to-br to-transparent blur-2xl" />
            <div className="relative">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="text-lg">🎟️</span>
                <h3 className="text-xs font-bold">
                  {regRequired ? 'Registration Required' : 'Open Event'}
                </h3>
              </div>
              <p className="text-[10px] leading-relaxed text-white/70">
                {regRequired
                  ? 'Members must register before attending.'
                  : 'No registration needed — just show up!'}
              </p>
              {registrationUrl && (
                <div className="mt-2.5 rounded-lg bg-white/15 px-3 py-1.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
                  📋 Registration form linked
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 backdrop-blur-xl">
            <h3 className="mb-2.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Quick Info
            </h3>
            <div className="space-y-2">
              {[
                {
                  icon: '📅',
                  label: 'Date',
                  value: fmtDate(startDate),
                },
                {
                  icon: '🕒',
                  label: 'Time',
                  value: fmtTime(startDate),
                },
                { icon: '📍', label: 'Venue', value: location },
                { icon: '⏱️', label: 'Duration', value: duration },
                {
                  icon: '👥',
                  label: 'Capacity',
                  value: maxParticipants ? `${maxParticipants} spots` : null,
                },
                {
                  icon: eligibility === 'all' ? '🌐' : '🔒',
                  label: 'Open to',
                  value: eligibilityLabel,
                },
              ]
                .filter((item) => item.value)
                .map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-xs">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-gray-400">{item.label}</p>
                      <p className="truncate text-[10px] font-medium text-gray-200">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* External Link */}
        {externalUrl && (
          <div className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 backdrop-blur-xl transition-all hover:border-white/15 hover:bg-white/7">
            <div className="from-primary-500/20 to-primary-600/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br">
              <Globe className="text-primary-400 h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white">Event Website</p>
              <p className="truncate text-[10px] text-gray-400">
                {externalUrl}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* AI Writing Assistant inline component                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function AiWriteButton({ mode, onGenerated, context, existingContent }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(DEFAULT_TEXT_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const modeLabels = {
    title: 'Generate Title',
    description: 'Generate Description',
    content: 'Generate Content',
    improve: 'Improve Content',
  };

  const placeholders = {
    title:
      'e.g. A competitive programming contest for beginners focusing on problem-solving skills',
    description:
      'e.g. Write a short summary for an ICPC practice contest for university students',
    content:
      'e.g. Create content for a 3-hour competitive programming contest with prizes, rules, and schedule',
    improve: 'e.g. Make it more professional and add more details',
  };

  const handleGenerate = async () => {
    if (loading) return;
    if (!prompt.trim() && mode !== 'improve') return;
    setError(null);
    setLoading(true);
    try {
      const fullPrompt = context
        ? `Event context: ${context}\n\nRequest: ${prompt}`
        : prompt;
      const result = await generateEventTextAction(
        fullPrompt,
        mode,
        model,
        existingContent
      );
      if (result?.error) {
        setError(result.error);
      } else if (result?.text) {
        onGenerated(result.text);
        setPrompt('');
        setOpen(false);
      }
    } catch {
      setError('Generation failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-300 transition-all hover:border-purple-500/40 hover:bg-purple-500/20"
      >
        <Sparkles className="h-3 w-3" />
        {mode === 'improve' ? 'AI Improve' : 'AI Write'}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <Sparkles className="h-3.5 w-3.5" />
          {modeLabels[mode]}
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md p-0.5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Model selector */}
      <div className="mb-2 flex flex-wrap gap-1">
        {TEXT_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModel(m.id)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
              model === m.id
                ? 'border border-purple-500/50 bg-purple-500/20 text-purple-200'
                : 'border border-white/8 bg-white/3 text-gray-500 hover:border-white/15 hover:text-gray-300'
            }`}
            title={m.description}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder={placeholders[mode]}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || (!prompt.trim() && mode !== 'improve')}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-purple-600 disabled:opacity-50 disabled:hover:bg-purple-600/80"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wand2 className="h-3 w-3" />
          )}
          {loading ? 'Writing…' : 'Generate'}
        </button>
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Sections list for sidebar nav                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SECTIONS = [
  { id: 'basic', icon: FileText, label: 'Basic Info' },
  { id: 'media', icon: ImageIcon, label: 'Cover Image' },
  { id: 'category', icon: Tag, label: 'Category & Status' },
  { id: 'datetime', icon: Calendar, label: 'Date & Location' },
  { id: 'registration', icon: Users, label: 'Registration' },
  { id: 'eligibility', icon: Shield, label: 'Eligibility' },
  { id: 'extras', icon: Settings, label: 'Additional' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Main component                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function EventFormPanel({
  event,
  roles = [],
  onClose,
  onSaved,
}) {
  const isEdit = !!event;
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  // Holds a one-shot status override for the next submit (used by Save Draft).
  // Avoids mutating `status` state, which would corrupt subsequent "Create Event" submits.
  const submitStatusRef = useRef(null);
  // Tracks all image URLs uploaded to Drive during this editing session (via RichTextEditor).
  const contentUploadedUrlsRef = useRef([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [activeSection, setActiveSection] = useState('basic');
  const [closing, setClosing] = useState(false);

  // ── form state ─────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [content, setContent] = useState(event?.content ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [venueType, setVenueType] = useState(event?.venue_type ?? 'offline');
  const [category, setCategory] = useState(event?.category ?? '');
  const [status, setStatus] = useState(event?.status ?? 'draft');
  const [startDate, setStartDate] = useState(
    toLocalDateTimeInput(event?.start_date)
  );
  const [endDate, setEndDate] = useState(toLocalDateTimeInput(event?.end_date));
  const [coverImage, setCoverImage] = useState(event?.cover_image ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [regRequired, setRegRequired] = useState(
    event?.registration_required ?? false
  );
  const [regDeadline, setRegDeadline] = useState(
    toLocalDateTimeInput(event?.registration_deadline)
  );
  const [maxParticipants, setMaxParticipants] = useState(
    event?.max_participants ?? ''
  );
  const [isFeatured, setIsFeatured] = useState(event?.is_featured ?? false);
  const [tags, setTags] = useState(event?.tags?.join(', ') ?? '');
  const [externalUrl, setExternalUrl] = useState(event?.external_url ?? '');
  const [registrationUrl, setRegistrationUrl] = useState(
    event?.registration_url ?? ''
  );
  const [prerequisites, setPrerequisites] = useState(
    event?.prerequisites ?? ''
  );
  const [eligibility, setEligibility] = useState(event?.eligibility ?? 'all');
  const [participationType, setParticipationType] = useState(
    event?.participation_type ?? 'individual'
  );
  const [teamSize, setTeamSize] = useState(event?.team_size ?? '');

  // ── lock body scroll while panel is open ───────────────────────────────────
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  // ── escape key to close ────────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && !isPending) handleClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // ── intersection observer for sidebar highlighting ─────────────────────────
  useEffect(() => {
    const container = panelRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { root: container, rootMargin: '-100px 0px -60% 0px', threshold: 0.1 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = container.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // ── animated close ─────────────────────────────────────────────────────────
  function handleClose() {
    if (isPending) return;
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }

  // ── progress calculation ───────────────────────────────────────────────────
  const progress = (() => {
    let filled = 0;
    const total = 4; // title, location, start_date, category
    if (title.trim()) filled++;
    if (location.trim()) filled++;
    if (startDate) filled++;
    if (category) filled++;
    return Math.round((filled / total) * 100);
  })();

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleGenerateImage = useCallback(async () => {
    if (generating || aiPrompt.trim().length < 3) return;
    setGenerateError(null);
    setGenerating(true);
    try {
      const result = await generateEventImageAction(aiPrompt.trim(), aiModel);
      if (result?.error) {
        setGenerateError(result.error);
      } else if (result?.url) {
        // Delete old cover image from Drive if replacing
        if (coverImage) {
          deleteEventImageAction(coverImage).catch(() => {});
        }
        setCoverImage(result.url);
        setAiPrompt('');
      }
    } catch {
      setGenerateError('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [aiPrompt, aiModel, generating]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setError(null);

      const fd = new FormData();
      if (isEdit) fd.set('id', event.id);
      fd.set('title', title);
      fd.set('description', description);
      fd.set('content', content);
      fd.set('location', location);
      fd.set('venue_type', venueType);
      if (category) fd.set('category', category);
      // Read status from the one-shot override ref (Save Draft) or the DOM hidden
      // input (which React keeps in sync with state, bypassing any closure staleness).
      const resolvedStatus =
        submitStatusRef.current ??
        e.target.querySelector('input[name="status"]')?.value ??
        status;
      submitStatusRef.current = null; // clear override after use
      fd.set('status', resolvedStatus);
      fd.set('start_date', startDate);
      if (endDate) fd.set('end_date', endDate);
      // Read cover_image from the DOM hidden input — always reflects current React state,
      // never a stale closure value regardless of when the user clicks Save.
      const ci =
        e.target.querySelector('input[name="cover_image"]')?.value ?? '';
      if (ci) fd.set('cover_image', ci);
      fd.set('registration_required', String(regRequired));
      if (regRequired && regDeadline)
        fd.set('registration_deadline', regDeadline);
      if (maxParticipants) fd.set('max_participants', String(maxParticipants));
      fd.set('participation_type', participationType);
      if (participationType === 'team' && teamSize)
        fd.set('team_size', String(teamSize));
      fd.set('is_featured', String(isFeatured));
      if (tags) fd.set('tags', tags);
      if (externalUrl) fd.set('external_url', externalUrl);
      if (registrationUrl) fd.set('registration_url', registrationUrl);
      if (prerequisites) fd.set('prerequisites', prerequisites);
      fd.set('eligibility', eligibility);

      startTransition(async () => {
        const action = isEdit ? updateEventAction : createEventAction;
        const result = await action(fd);

        if (result?.error) {
          setError(result.error);
          panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // ── Clean up orphaned images from Google Drive ──
        // Compare images uploaded during this session with the final content.
        // Any uploaded image NOT present in the saved content is an orphan.
        if (contentUploadedUrlsRef.current.length > 0) {
          const finalContent = content || '';
          const orphans = contentUploadedUrlsRef.current.filter(
            (url) => !finalContent.includes(url)
          );
          orphans.forEach((url) => {
            deleteEventImageAction(url).catch(() => {});
          });
          contentUploadedUrlsRef.current = [];
        }

        setSuccess(true);
        setTimeout(() => {
          onSaved?.();
          onClose();
        }, 800);
      });
    },
    [
      isEdit,
      event,
      title,
      description,
      content,
      location,
      venueType,
      category,
      status,
      startDate,
      endDate,
      coverImage,
      regRequired,
      regDeadline,
      maxParticipants,
      isFeatured,
      tags,
      externalUrl,
      registrationUrl,
      prerequisites,
      eligibility,
      participationType,
      teamSize,
      onSaved,
      onClose,
    ]
  );

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
          closing ? 'opacity-0' : 'animate-in fade-in'
        }`}
        onClick={handleClose}
      />

      {/* Full-screen modal container */}
      <div
        className={`relative m-2 flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0a0d14] shadow-2xl shadow-black/50 transition-all duration-300 sm:m-3 lg:m-4 ${
          closing ? 'scale-95 opacity-0' : 'animate-in fade-in zoom-in-95'
        }`}
      >
        {/* ─── Sticky header ─────────────────────────────── */}
        <div className="z-30 shrink-0 border-b border-white/8 bg-[#0a0d14]/95 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* Left: icon + Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                {isEdit ? (
                  <Edit3 className="h-4.5 w-4.5 text-blue-400" />
                ) : (
                  <PlusCircle className="h-4.5 w-4.5 text-blue-400" />
                )}
              </div>
              <div>
                <h1 className="text-sm font-bold text-white sm:text-base">
                  {isEdit ? 'Edit Event' : 'Create New Event'}
                </h1>
                <p className="hidden text-[11px] text-gray-500 sm:block">
                  {isEdit
                    ? `Editing "${event.title}"`
                    : 'Fill in the details below — preview updates live'}
                </p>
              </div>
            </div>

            {/* Right: Progress + Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Progress indicator */}
              <div className="hidden items-center gap-2 rounded-xl border border-white/6 bg-white/3 px-3 py-2 md:flex">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10 lg:w-24">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-400 tabular-nums">
                  {progress}%
                </span>
              </div>

              {/* Preview toggle */}
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className={`hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all lg:flex ${
                  showPreview
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/15 hover:text-white'
                }`}
              >
                {showPreview ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                <span className="hidden xl:inline">Preview</span>
              </button>

              {/* Divider */}
              <div className="hidden h-6 w-px bg-white/8 sm:block" />

              {/* Save as draft */}
              <button
                type="button"
                onClick={() => {
                  submitStatusRef.current = 'draft';
                  document.getElementById('event-panel-form')?.requestSubmit();
                }}
                disabled={isPending || success || !title.trim()}
                className="hidden rounded-xl border border-white/8 bg-white/3 px-4 py-2 text-xs font-semibold text-gray-300 transition-all hover:border-white/15 hover:bg-white/6 hover:text-white disabled:opacity-50 sm:flex"
              >
                Save Draft
              </button>

              {/* Primary submit */}
              <button
                type="submit"
                form="event-panel-form"
                onClick={() => {
                  if (status === 'draft') submitStatusRef.current = 'upcoming';
                }}
                disabled={isPending || success}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-70 sm:px-5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Saved!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {isEdit ? 'Save Changes' : 'Create Event'}
                    </span>
                  </>
                )}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/3 text-gray-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Body: Form + Preview side-by-side ───────── */}
        <div ref={bodyRef} className="relative flex min-h-0 flex-1">
          {/* ─── Left: Scrollable form area ──────────────── */}
          <div
            ref={panelRef}
            className={`flex-1 overflow-y-auto transition-all duration-300 ${
              showPreview ? 'lg:w-[55%] lg:flex-none xl:w-[60%]' : 'w-full'
            }`}
          >
            <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              <div className="flex gap-8">
                {/* ─── Sidebar navigation (desktop) ──────── */}
                <aside className="hidden w-44 shrink-0 xl:block">
                  <nav className="sticky top-0 space-y-1">
                    <p className="mb-3 px-3.5 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                      Sections
                    </p>
                    {SECTIONS.map(({ id, icon, label }) => (
                      <NavItem
                        key={id}
                        icon={icon}
                        label={label}
                        sectionId={id}
                        active={activeSection === id}
                      />
                    ))}
                  </nav>
                </aside>

                {/* ─── Form column ───────────────────────── */}
                <div className="min-w-0 flex-1">
                  <form
                    id="event-panel-form"
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-6"
                  >
                    {/* Error banner */}
                    {error && (
                      <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-4">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                        <div>
                          <p className="text-sm font-semibold text-red-300">
                            Something went wrong
                          </p>
                          <p className="mt-0.5 text-xs text-red-400/80">
                            {error}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Success banner */}
                    {success && (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <p className="text-sm font-semibold text-emerald-300">
                          Event {isEdit ? 'updated' : 'created'} successfully!
                        </p>
                      </div>
                    )}

                    {/* ═════════ Section 1: Basic Info ═════════ */}
                    <FormSection
                      id="basic"
                      icon={FileText}
                      title="Basic Information"
                      description="Event title, description, and full content details"
                    >
                      {/* Title */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-semibold text-gray-400">
                            Event Title <span className="text-red-400">*</span>
                          </label>
                          <AiWriteButton
                            mode="title"
                            onGenerated={(text) => setTitle(text)}
                            context={description || category || ''}
                          />
                        </div>
                        <input
                          required
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. ICPC Regional Qualifying Round"
                          className={inputCls}
                        />
                        <p className={hintCls}>
                          Choose a clear, descriptive title for your event
                        </p>
                      </div>

                      {/* Short description */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-semibold text-gray-400">
                            Short Description
                          </label>
                          <AiWriteButton
                            mode="description"
                            onGenerated={(text) => setDescription(text)}
                            context={title || ''}
                          />
                        </div>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Brief summary shown on event cards and listings…"
                          rows={2}
                          className={`${inputCls} resize-none`}
                        />
                        <p className={hintCls}>
                          This appears on event cards. Keep it under 200
                          characters.
                        </p>
                      </div>

                      {/* Full content */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <label className="text-xs font-semibold text-gray-400">
                            Full Content / Details
                          </label>
                          <div className="flex items-center gap-1.5">
                            <AiWriteButton
                              mode="content"
                              onGenerated={(html) => setContent(html)}
                              context={`${title || ''} — ${description || ''}`}
                            />
                            {content && (
                              <AiWriteButton
                                mode="improve"
                                onGenerated={(html) => setContent(html)}
                                existingContent={content}
                              />
                            )}
                          </div>
                        </div>
                        <RichTextEditor
                          value={content}
                          onChange={setContent}
                          placeholder="Detailed description, rules, requirements, schedule…"
                          uploadImageAction={uploadEventImageAction}
                          onDeleteImage={(url) => {
                            deleteEventImageAction(url).catch(() => {});
                          }}
                          uploadedUrlsRef={contentUploadedUrlsRef}
                          containedFullscreen
                          fullscreenContainerRef={bodyRef}
                        />
                        <p className={hintCls}>
                          Visible on the event detail page. Use the toolbar to
                          format text, add headings, lists, code blocks, images,
                          and more.
                        </p>
                      </div>
                    </FormSection>

                    {/* ═════════ Section 2: Cover Image ═════════ */}
                    <FormSection
                      id="media"
                      icon={ImageIcon}
                      title="Cover Image"
                      description="Upload or link a cover image for the event"
                    >
                      <div className="space-y-3">
                        {/* Preview */}
                        {coverImage ? (
                          <div className="relative overflow-hidden rounded-xl border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={driveImageUrl(coverImage)}
                              alt="Cover preview"
                              className="h-48 w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                            <button
                              type="button"
                              onClick={() => {
                                if (coverImage) {
                                  deleteEventImageAction(coverImage).catch(
                                    () => {}
                                  );
                                }
                                setCoverImage('');
                              }}
                              className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 backdrop-blur-sm transition-all hover:border-red-500/50 hover:bg-red-500/30"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/2 px-6 py-12 text-center transition-all hover:border-blue-500/30 hover:bg-blue-500/5 ${
                              uploading ? 'pointer-events-none opacity-60' : ''
                            }`}
                          >
                            {uploading ? (
                              <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-400" />
                            ) : (
                              <Upload className="mb-3 h-8 w-8 text-gray-600" />
                            )}
                            <p className="text-sm font-medium text-gray-300">
                              {uploading
                                ? 'Uploading…'
                                : 'Click to upload or drag & drop'}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              JPEG, PNG, WebP, or GIF
                            </p>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              disabled={uploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadError(null);
                                setUploading(true);
                                try {
                                  const fd = new FormData();
                                  fd.set('file', file);
                                  const result =
                                    await uploadEventImageAction(fd);
                                  if (result?.error) {
                                    setUploadError(result.error);
                                  } else if (result?.url) {
                                    // Delete old cover image from Drive if replacing
                                    if (coverImage) {
                                      deleteEventImageAction(coverImage).catch(
                                        () => {}
                                      );
                                    }
                                    setCoverImage(result.url);
                                  }
                                } catch {
                                  setUploadError(
                                    'Upload failed. Please try again.'
                                  );
                                } finally {
                                  setUploading(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                        )}

                        {uploadError && (
                          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {uploadError}
                          </div>
                        )}

                        {/* ── AI Image Generator ── */}
                        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-purple-300">
                              AI Image Generator
                            </span>
                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                              FREE
                            </span>
                          </div>

                          {/* Model selector */}
                          <div className="mb-3 flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-400">
                              Model:
                            </label>
                            <div className="flex gap-1.5">
                              {IMAGE_MODELS.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  disabled={generating}
                                  onClick={() => setAiModel(m.id)}
                                  title={m.description}
                                  className={`rounded-lg border px-3 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
                                    aiModel === m.id
                                      ? 'border-purple-500/50 bg-purple-500/25 text-purple-300'
                                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                                  }`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              placeholder="Describe the image you want, e.g. 'A programming contest banner with code and trophies'"
                              disabled={generating}
                              className={`${inputCls} flex-1`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (
                                    aiPrompt.trim().length >= 3 &&
                                    !generating
                                  ) {
                                    handleGenerateImage();
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              disabled={
                                generating || aiPrompt.trim().length < 3
                              }
                              onClick={handleGenerateImage}
                              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/20 px-4 py-2.5 text-sm font-medium text-purple-300 transition-all hover:border-purple-500/50 hover:bg-purple-500/30 disabled:pointer-events-none disabled:opacity-50"
                            >
                              {generating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Wand2 className="h-4 w-4" />
                              )}
                              {generating ? 'Generating…' : 'Generate'}
                            </button>
                          </div>
                          {generateError && (
                            <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {generateError}
                            </div>
                          )}
                          <p className="mt-2 text-[11px] text-gray-600">
                            {aiModel === 'gemini'
                              ? 'Nano Banana (Gemini 2.5 Flash) · 1,500 free/day · Auto-uploaded to Drive'
                              : 'Flux (Fast) · Free · Auto-uploaded to Drive'}
                          </p>
                        </div>

                        {/* URL paste fallback */}
                        <div>
                          <label className={labelCls}>Or paste image URL</label>
                          <input
                            type="text"
                            value={coverImage}
                            onChange={(e) => setCoverImage(e.target.value)}
                            placeholder="https://example.com/event-cover.jpg"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </FormSection>

                    {/* ═════════ Section 3: Category & Status ═════════ */}
                    <FormSection
                      id="category"
                      icon={Tag}
                      title="Category & Status"
                      description="Classify the event and set its publication status"
                    >
                      {/* Category */}
                      <div>
                        <label className={labelCls}>Event Category</label>
                        <PillSelect
                          options={CATEGORIES}
                          value={category}
                          onChange={setCategory}
                          getExtra={(c) => getCategoryConfig(c).icon}
                        />
                        <p className={hintCls}>
                          Select a category to help organize your event
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <label className={labelCls}>Publication Status</label>
                        <PillSelect
                          options={STATUSES}
                          value={status}
                          onChange={setStatus}
                          getLabel={(s) => getStatusConfig(s).label}
                          getColor={(s, active) => {
                            if (!active) return null;
                            const sc = getStatusConfig(s);
                            return `${sc.badge}`;
                          }}
                        />
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-600" />
                          <p className="text-[11px] text-gray-500">
                            <strong className="text-gray-400">Draft</strong>{' '}
                            events are only visible to admins.{' '}
                            <strong className="text-gray-400">Upcoming</strong>{' '}
                            events are published and visible to all users.
                          </p>
                        </div>
                      </div>
                    </FormSection>

                    {/* ═════════ Section 4: Date & Location ═════════ */}
                    <FormSection
                      id="datetime"
                      icon={Calendar}
                      title="Date & Location"
                      description="When and where is the event happening?"
                    >
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Start date */}
                        <div>
                          <label className={labelCls}>
                            <Clock className="mr-1 inline h-3 w-3" />
                            Start Date & Time{' '}
                            <span className="text-red-400">*</span>
                          </label>
                          <input
                            required
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={inputCls}
                          />
                        </div>

                        {/* End date */}
                        <div>
                          <label className={labelCls}>
                            <Clock className="mr-1 inline h-3 w-3" />
                            End Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <label className={labelCls}>
                          <MapPin className="mr-1 inline h-3 w-3" />
                          Location / Venue{' '}
                          <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Department Auditorium, Zoom Meeting…"
                          className={inputCls}
                        />
                      </div>

                      {/* Venue type */}
                      <div>
                        <label className={labelCls}>Venue Type</label>
                        <PillSelect
                          options={VENUE_TYPES}
                          value={venueType}
                          onChange={setVenueType}
                          getLabel={(v) => getVenueConfig(v).label}
                          getExtra={(v) => getVenueConfig(v).icon}
                        />
                      </div>
                    </FormSection>

                    {/* ═════════ Section 5: Registration ═════════ */}
                    <FormSection
                      id="registration"
                      icon={Users}
                      title="Registration Settings"
                      description="Configure registration requirements and limits"
                    >
                      <Toggle
                        value={regRequired}
                        onChange={setRegRequired}
                        label="Registration Required"
                        description="Members must register before attending this event"
                      />

                      {regRequired && (
                        <div className="space-y-5 rounded-xl border border-white/6 bg-white/2 p-4">
                          {/* Participation Type */}
                          <div>
                            <label className={labelCls}>
                              Participation Type
                            </label>
                            <PillSelect
                              options={['individual', 'team']}
                              value={participationType}
                              onChange={setParticipationType}
                              getLabel={(v) =>
                                v === 'individual' ? 'Individual' : 'Team'
                              }
                              getExtra={(v) =>
                                v === 'individual' ? '👤' : '👥'
                              }
                            />
                          </div>

                          {/* Team Size (only for team events) */}
                          {participationType === 'team' && (
                            <div>
                              <label className={labelCls}>
                                Team Size (members per team)
                              </label>
                              <input
                                type="number"
                                min="2"
                                value={teamSize}
                                onChange={(e) => setTeamSize(e.target.value)}
                                placeholder="e.g. 3"
                                className={inputCls}
                              />
                              <p className={hintCls}>
                                Number of members required in each team
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                              <label className={labelCls}>
                                Registration Deadline
                              </label>
                              <input
                                type="datetime-local"
                                value={regDeadline}
                                onChange={(e) => setRegDeadline(e.target.value)}
                                max={startDate || undefined}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>
                                Max Participants
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={maxParticipants}
                                onChange={(e) =>
                                  setMaxParticipants(e.target.value)
                                }
                                placeholder="Unlimited"
                                className={inputCls}
                              />
                            </div>
                          </div>

                          <div>
                            <label className={labelCls}>
                              <Link2 className="mr-1 inline h-3 w-3" />
                              Registration Form URL
                            </label>
                            <input
                              type="url"
                              value={registrationUrl}
                              onChange={(e) =>
                                setRegistrationUrl(e.target.value)
                              }
                              placeholder="https://forms.google.com/…"
                              className={inputCls}
                            />
                            <p className={hintCls}>
                              External registration link (e.g. Google Forms)
                            </p>
                          </div>
                        </div>
                      )}
                    </FormSection>

                    {/* ═════════ Section 6: Eligibility ═════════ */}
                    <FormSection
                      id="eligibility"
                      icon={Shield}
                      title="Eligibility & Prerequisites"
                      description="Define who can participate and what they need"
                    >
                      {/* Eligibility */}
                      <div>
                        <label className={labelCls}>Who Can Participate</label>
                        <PillSelect
                          options={['all', ...roles.map((r) => r.id)]}
                          value={eligibility}
                          onChange={setEligibility}
                          getLabel={(v) => {
                            if (v === 'all') return 'Everyone';
                            const role = roles.find((r) => r.id === v);
                            return role
                              ? `${role.name.charAt(0).toUpperCase() + role.name.slice(1)}s Only`
                              : v;
                          }}
                          getExtra={(v) => {
                            if (v === 'all') return '👥';
                            const role = roles.find((r) => r.id === v);
                            return role?.name === 'member' ? '🎓' : '🙋';
                          }}
                        />
                      </div>

                      {/* Prerequisites */}
                      <div>
                        <label className={labelCls}>Prerequisites</label>
                        <textarea
                          value={prerequisites}
                          onChange={(e) => setPrerequisites(e.target.value)}
                          placeholder="e.g. Basic knowledge of C/C++, Codeforces rating ≥ 1200…"
                          rows={3}
                          className={`${inputCls} resize-none`}
                        />
                        <p className={hintCls}>
                          Describe any skills, tools, or requirements
                          participants should have
                        </p>
                      </div>
                    </FormSection>

                    {/* ═════════ Section 7: Additional ═════════ */}
                    <FormSection
                      id="extras"
                      icon={Settings}
                      title="Additional Details"
                      description="Featured status, external links, and tags"
                    >
                      <Toggle
                        value={isFeatured}
                        onChange={setIsFeatured}
                        label="Feature on Homepage"
                        description="Highlight this event in the public events section and homepage"
                      />

                      <div>
                        <label className={labelCls}>
                          <Globe className="mr-1 inline h-3 w-3" />
                          External URL
                        </label>
                        <input
                          type="url"
                          value={externalUrl}
                          onChange={(e) => setExternalUrl(e.target.value)}
                          placeholder="https://… (contest page, event website)"
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>
                          <Tag className="mr-1 inline h-3 w-3" />
                          Tags
                        </label>
                        <input
                          type="text"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="icpc, programming, team (comma-separated)"
                          className={inputCls}
                        />
                        {tags && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {tags
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300"
                                >
                                  #{tag}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </FormSection>

                    {/* ─── Bottom actions ──────── */}
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/3 p-5 sm:justify-end">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={isPending}
                        className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            submitStatusRef.current = 'draft';
                            document
                              .getElementById('event-panel-form')
                              ?.requestSubmit();
                          }}
                          disabled={isPending || success || !title.trim()}
                          className="hidden rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white disabled:opacity-50 sm:block"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="submit"
                          onClick={() => {
                            if (status === 'draft')
                              submitStatusRef.current = 'upcoming';
                          }}
                          disabled={isPending || success}
                          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 disabled:opacity-70"
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : success ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              {isEdit ? 'Save Changes' : 'Create Event'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Hidden inputs — React always keeps these in sync with state;
                        handleSubmit reads from DOM to avoid stale closure values. */}
                    <input
                      type="hidden"
                      name="cover_image"
                      value={coverImage}
                      readOnly
                    />
                    <input
                      type="hidden"
                      name="status"
                      value={status}
                      readOnly
                    />
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right: Live Preview Panel ──────────────── */}
          {showPreview && (
            <aside className="hidden border-l border-white/8 bg-[#080b10] lg:block lg:w-[45%] xl:w-[40%]">
              <div className="sticky top-0 flex h-full flex-col">
                {/* Preview header */}
                <div className="flex shrink-0 items-center gap-2 border-b border-white/6 px-5 py-3">
                  <div className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">
                    Live Preview
                  </p>
                </div>

                {/* Scrollable preview content */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <LivePreview
                    title={title}
                    description={description}
                    content={content}
                    category={category}
                    status={status}
                    startDate={startDate}
                    endDate={endDate}
                    coverImage={coverImage}
                    location={location}
                    venueType={venueType}
                    isFeatured={isFeatured}
                    regRequired={regRequired}
                    regDeadline={regDeadline}
                    maxParticipants={maxParticipants}
                    registrationUrl={registrationUrl}
                    externalUrl={externalUrl}
                    prerequisites={prerequisites}
                    eligibility={eligibility}
                    tags={tags}
                    roles={roles}
                  />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
