/**
 * @file Event card — displays a single event’s cover image, title, status
 *   badge, dates, and registration count with edit / delete actions.
 * @module AdminEventCard
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { driveImageUrl } from '@/app/_lib/utils';
import {
  Calendar,
  MapPin,
  Users,
  Star,
  Edit3,
  Trash2,
  Eye,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Wifi,
  GitMerge,
  Clock,
} from 'lucide-react';
import {
  getStatusConfig,
  getCategoryConfig,
  getVenueConfig,
  formatEventDate,
} from './eventConfig';
import {
  updateEventStatusAction,
  toggleEventFeaturedAction,
  deleteEventAction,
} from '@/app/_lib/event-actions';

const ORDERED_STATUSES = [
  'draft',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
];

const VenueIcon = ({ type }) => {
  if (type === 'online') return <Wifi className="h-3 w-3" />;
  if (type === 'hybrid') return <GitMerge className="h-3 w-3" />;
  return <MapPin className="h-3 w-3" />;
};

export default function EventCard({ event, onEdit, onViewRegistrations }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [featuredPending, setFeaturedPending] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [flash, setFlash] = useState(null);

  const sc = getStatusConfig(event.status);
  const cc = getCategoryConfig(event.category);
  const vc = getVenueConfig(event.venue_type);

  function showFlash(type) {
    setFlash(type);
    setTimeout(() => setFlash(null), 1800);
  }

  async function handleStatusChange(newStatus) {
    setStatusOpen(false);
    if (newStatus === event.status) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', event.id);
      fd.set('status', newStatus);
      const result = await updateEventStatusAction(fd);
      if (!result?.error) {
        router.refresh();
        showFlash('status');
      }
    });
  }

  async function handleToggleFeatured() {
    setFeaturedPending(true);
    const fd = new FormData();
    fd.set('id', event.id);
    fd.set('featured', String(!event.is_featured));
    const result = await toggleEventFeaturedAction(fd);
    setFeaturedPending(false);
    if (!result?.error) {
      router.refresh();
      showFlash('featured');
    }
  }

  async function handleDelete() {
    setDeletePending(true);
    const fd = new FormData();
    fd.set('id', event.id);
    const result = await deleteEventAction(fd);
    setDeletePending(false);
    if (!result?.error) {
      router.refresh();
    }
  }

  const participantFill =
    event.max_participants && event.registrationCount
      ? Math.min(
          100,
          Math.round((event.registrationCount / event.max_participants) * 100)
        )
      : null;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 ${sc.cardBg} ${sc.cardBorder}`}
    >
      {/* top accent bar */}
      <div className={`h-1 w-full bg-linear-to-r ${sc.gradient}`} />

      {/* cover image / placeholder */}
      <div className="relative h-40 w-full overflow-hidden">
        {event.cover_image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={driveImageUrl(event.cover_image)}
            alt={event.title || ''}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/placeholder-event.svg';
            }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-linear-to-br text-5xl ${cc.placeholder}`}
          >
            {cc.icon}
          </div>
        )}

        {/* hover overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

        {/* featured star overlay */}
        <button
          onClick={handleToggleFeatured}
          disabled={featuredPending}
          className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
            event.is_featured
              ? 'bg-amber-500/90 text-white shadow-lg shadow-amber-900/30 backdrop-blur-sm'
              : 'bg-black/50 text-gray-400 opacity-0 backdrop-blur-sm group-hover:opacity-100 hover:bg-black/70 hover:text-amber-400'
          }`}
          title={
            event.is_featured ? 'Remove from featured' : 'Mark as featured'
          }
        >
          {featuredPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Star
              className="h-3.5 w-3.5"
              fill={event.is_featured ? 'currentColor' : 'none'}
            />
          )}
        </button>

        {/* category badge overlay */}
        {event.category && (
          <span
            className={`absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold shadow-sm backdrop-blur-md ${cc.badge}`}
          >
            {cc.icon} {event.category}
          </span>
        )}
      </div>

      {/* card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* title + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 flex-1 text-sm leading-snug font-bold text-white">
            {event.title}
          </h3>

          {/* status + dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setStatusOpen((p) => !p)}
              disabled={isPending}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-all ${sc.badge} ${isPending ? 'opacity-50' : 'hover:opacity-80'}`}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              )}
              {flash === 'status' ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              ) : (
                <>
                  {sc.label}
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </>
              )}
            </button>

            {statusOpen && (
              <div className="absolute top-full right-0 z-20 mt-1.5 min-w-36 overflow-hidden rounded-xl border border-white/12 bg-[#12151e] shadow-2xl ring-1 shadow-black/50 ring-white/5">
                <div className="px-2.5 py-2">
                  <p className="mb-1.5 text-[9px] font-bold tracking-widest text-gray-600 uppercase">
                    Change Status
                  </p>
                  {ORDERED_STATUSES.map((s) => {
                    const scOpt = getStatusConfig(s);
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-white/6 ${
                          s === event.status
                            ? 'bg-white/5 text-white'
                            : 'text-gray-400'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${scOpt.dot} shrink-0`}
                        />
                        <span className="capitalize">{scOpt.label}</span>
                        {s === event.status && (
                          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* description snippet */}
        {event.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
            {event.description}
          </p>
        )}

        {/* meta info */}
        <div className="space-y-2">
          {/* start date */}
          <div className="flex items-center gap-2.5 text-xs text-gray-400">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5">
              <Calendar className="h-3 w-3 text-gray-500" />
            </div>
            <span>{formatEventDate(event.start_date)}</span>
            {event.end_date && event.end_date !== event.start_date && (
              <span className="text-gray-600">
                → {formatEventDate(event.end_date)}
              </span>
            )}
          </div>

          {/* location + venue */}
          {event.location && (
            <div className="flex items-center gap-2.5 text-xs text-gray-400">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5">
                <VenueIcon type={event.venue_type} />
              </div>
              <span className="flex-1 truncate">{event.location}</span>
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${vc.badge}`}
              >
                {vc.icon} {vc.label}
              </span>
            </div>
          )}
        </div>

        {/* registrations bar */}
        <div className="space-y-1.5 rounded-xl border border-white/5 bg-white/2 p-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="h-3.5 w-3.5 text-gray-600" />
              <span>
                <span className="font-bold text-white tabular-nums">
                  {event.registrationCount}
                </span>
                {event.max_participants ? (
                  <span className="text-gray-600">
                    {' '}
                    / {event.max_participants}
                  </span>
                ) : (
                  <span className="text-gray-600"> registered</span>
                )}
              </span>
            </div>
            {event.attendedCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {event.attendedCount} attended
              </span>
            )}
          </div>

          {/* progress bar */}
          {participantFill !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full bg-linear-to-r transition-all duration-700 ${
                  participantFill >= 90
                    ? 'from-red-500 to-rose-500'
                    : participantFill >= 70
                      ? 'from-amber-500 to-yellow-500'
                      : 'from-blue-500 to-cyan-500'
                }`}
                style={{ width: `${participantFill}%` }}
              />
            </div>
          )}
        </div>

        {/* tags */}
        {event.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/5 bg-white/3 px-2 py-0.5 text-[10px] font-medium text-gray-500"
              >
                #{tag}
              </span>
            ))}
            {event.tags.length > 4 && (
              <span className="rounded-md border border-white/5 bg-white/3 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                +{event.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* creator */}
        <div className="flex items-center gap-2.5 border-t border-white/5 pt-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[9px] font-bold text-gray-400 ring-1 ring-white/8">
            {event.creatorAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={event.creatorAvatar}
                alt=""
                width={24}
                height={24}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              (event.creatorName ?? 'A').charAt(0).toUpperCase()
            )}
          </div>
          <span className="truncate text-[10px] text-gray-600">
            by {event.creatorName ?? 'Admin'}
          </span>
          {event.is_featured && (
            <span className="ml-auto flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
              <Star className="h-2.5 w-2.5" fill="currentColor" />
              Featured
            </span>
          )}
        </div>
      </div>

      {/* action footer */}
      <div className="flex items-center gap-1.5 border-t border-white/5 bg-white/2 p-3">
        {/* view registrations */}
        <button
          onClick={() => onViewRegistrations(event)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2.5 text-xs font-medium text-gray-400 transition-all hover:bg-white/10 hover:text-white"
        >
          <Eye className="h-3.5 w-3.5" />
          Registrations
          {event.registrationCount > 0 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-gray-300 tabular-nums">
              {event.registrationCount}
            </span>
          )}
        </button>

        {/* edit */}
        <button
          onClick={() => onEdit(event)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-blue-500/15 hover:text-blue-400"
          title="Edit event"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>

        {/* delete */}
        {deleteConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deletePending}
              className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-2 text-[10px] font-semibold text-red-400 transition-colors hover:bg-red-500/30"
            >
              {deletePending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Confirm'
              )}
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="rounded-lg bg-white/5 px-3 py-2 text-[10px] text-gray-500 transition-colors hover:bg-white/8"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-red-500/15 hover:text-red-400"
            title="Delete event"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* click-outside closer for status dropdown */}
      {statusOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setStatusOpen(false)}
        />
      )}
    </div>
  );
}
