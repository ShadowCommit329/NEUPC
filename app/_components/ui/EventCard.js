/**
 * @file Event Card
 * @module EventCard
 */

import { driveImageUrl } from '@/app/_lib/utils';
import SafeImg from '@/app/_components/ui/SafeImg';

/**
 * Format a date for display.
 * @param {string} dateStr
 * @returns {{ date: string, time: string }}
 */
function formatEventDateTime(dateStr) {
  if (!dateStr) return { date: '', time: '' };
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return { date, time };
}

function EventCard({ event, index }) {
  const isOdd = index % 2 === 1;
  const image = event.cover_image || event.image;
  const { date, time } = formatEventDateTime(event.start_date || event.date);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-8 shadow-xl backdrop-blur-md transition-all duration-500 hover:shadow-2xl md:p-10 lg:p-12 ${
        isOdd
          ? 'from-primary-500/10 to-secondary-500/10 hover:from-primary-500/20 hover:to-secondary-500/20 bg-linear-to-br'
          : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      {/* Decorative blur element */}
      <div
        className={`absolute -z-10 h-64 w-64 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${
          isOdd
            ? 'from-secondary-500/30 -bottom-20 -left-20 bg-linear-to-tr to-transparent'
            : 'from-primary-500/30 -top-20 -right-20 bg-linear-to-bl to-transparent'
        }`}
      ></div>

      <div
        className={`flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12 ${
          isOdd ? 'lg:flex-row' : 'lg:flex-row-reverse'
        }`}
      >
        {/* Image Section */}
        <div className="shrink-0">
          <div className="relative mx-auto h-48 w-48 md:h-56 md:w-56 lg:h-64 lg:w-64">
            {/* Glow effect */}
            <div
              className={`absolute inset-0 rounded-full opacity-0 blur-2xl transition-all duration-500 group-hover:opacity-60 ${
                isOdd
                  ? 'from-secondary-500/50 to-primary-500/50 bg-linear-to-br'
                  : 'bg-primary-500/50'
              }`}
            ></div>
            {/* Image */}
            <div className="relative h-full w-full overflow-hidden rounded-full shadow-2xl ring-4 ring-white/10 transition-all duration-500 group-hover:scale-110 group-hover:ring-white/20">
              <SafeImg
                src={driveImageUrl(image) || '/placeholder-event.svg'}
                alt={event.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-4">
          {/* Date and Time */}
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            {date && (
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <span
                  className={`${
                    isOdd ? 'text-secondary-300' : 'text-primary-300'
                  }`}
                >
                  {date}
                </span>
              </div>
            )}
            {time && (
              <div className="flex items-center gap-2">
                <span className="text-xl">🕒</span>
                <span
                  className={`${
                    isOdd ? 'text-secondary-300' : 'text-primary-300'
                  }`}
                >
                  {time}
                </span>
              </div>
            )}
            {event.category && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isOdd
                    ? 'bg-secondary-500/20 text-secondary-300'
                    : 'bg-primary-500/20 text-primary-300'
                }`}
              >
                {event.category}
              </span>
            )}
            {event.eligibility && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  event.eligibility === 'Everyone'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {event.eligibility === 'Everyone'
                  ? '🌐 Everyone'
                  : `🔒 ${event.eligibility}`}
              </span>
            )}
          </div>

          {/* Title with Gradient */}
          <h3
            className={`bg-linear-to-r bg-clip-text text-2xl font-bold text-transparent transition-all duration-300 group-hover:scale-[1.02] md:text-3xl lg:text-4xl ${
              isOdd
                ? 'from-secondary-300 via-secondary-200 to-primary-300'
                : 'from-primary-300 via-primary-200 to-secondary-300'
            }`}
          >
            {event.title}
          </h3>

          {/* Description */}
          <p className="text-base leading-relaxed text-gray-200 transition-colors group-hover:text-gray-100 md:text-lg">
            {event.description}
          </p>

          {/* Prerequisites */}
          {/* {event.prerequisites && (
            <div className="flex items-start gap-2 rounded-lg bg-white/5 px-4 py-2.5">
              <span className="mt-0.5 text-base">📋</span>
              <div>
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Prerequisites
                </span>
                <p className="text-sm leading-relaxed text-gray-300">
                  {event.prerequisites}
                </p>
              </div>
            </div>
          )} */}

          {/* Footer: Location and Link */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-xl">📍</span>
              <span className="text-sm md:text-base">{event.location}</span>
            </div>
            <a
              href={`/events/${event.slug || event.id}`}
              className={`group/link inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl md:text-base ${
                isOdd
                  ? 'from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 bg-linear-to-r text-white'
                  : 'from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 bg-linear-to-r text-white'
              }`}
            >
              Learn More
              <svg
                className="h-4 w-4 transition-transform group-hover/link:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventCard;
