'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn, formatDate, driveImageUrl } from '@/app/_lib/utils';
import SafeImg from '../ui/SafeImg';

const STATUS_LABEL = {
  upcoming: 'Upcoming',
  ongoing: 'Live Now',
  completed: 'Completed',
};

const STATUS_STYLES = {
  upcoming: { dot: 'bg-neon-lime animate-pulse', text: 'text-neon-lime' },
  ongoing:  { dot: 'bg-neon-violet animate-pulse', text: 'text-neon-violet' },
  completed:{ dot: 'bg-slate-400 dark:bg-zinc-600', text: 'text-slate-400 dark:text-zinc-500' },
};

const CARD_ACCENT = [
  {
    border: 'border-violet-200/60 dark:border-neon-violet/20',
    tag: 'bg-violet-600 text-white dark:bg-neon-violet/90 dark:text-black',
    glow: 'group-hover:shadow-neon-violet/10',
    hover: 'group-hover:text-violet-600 dark:group-hover:text-neon-violet',
    badge: 'bg-violet-50 dark:bg-neon-violet/10',
  },
  {
    border: 'border-neon-lime/20',
    tag: 'bg-neon-lime/90 text-black',
    glow: 'group-hover:shadow-neon-lime/10',
    hover: 'group-hover:text-neon-lime',
    badge: 'bg-neon-lime/10',
  },
  {
    border: 'border-slate-200/60 dark:border-white/10',
    tag: 'bg-slate-800 text-white dark:bg-white/90 dark:text-black',
    glow: 'group-hover:shadow-white/5',
    hover: 'group-hover:text-slate-700 dark:group-hover:text-white',
    badge: 'bg-slate-100 dark:bg-white/5',
  },
];

// Animation variants
const sectionHeader = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};
const gridContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
};

function EventCard({ event, index = 0 }) {
  const accent = CARD_ACCENT[index % CARD_ACCENT.length];
  const statusKey = event.status || 'upcoming';
  const status = STATUS_STYLES[statusKey] || STATUS_STYLES.upcoming;
  const hasImage = !!(event.cover_image || event.banner_image);

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <Link
        href={`/events/${event.slug || event.id}`}
        className="group relative flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime rounded-2xl"
      >
        {/* Image */}
        <div
          className={cn(
            'relative mb-5 w-full overflow-hidden rounded-2xl border transition-shadow duration-500',
            'aspect-[4/3] md:aspect-[4/5]',
            accent.border, accent.badge,
            'shadow-md group-hover:shadow-xl', accent.glow
          )}
        >
          {hasImage ? (
            <SafeImg
              src={driveImageUrl(event.cover_image || event.banner_image)}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent dark:from-[#05060b]/90 dark:via-[#05060b]/20 dark:to-transparent" />
          <div className={cn('absolute left-3 top-3 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest backdrop-blur-md sm:left-4 sm:top-4 sm:px-4 sm:py-1.5', accent.tag)}>
            {event.category || 'Event'}
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 sm:bottom-4 sm:left-4">
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            <span className={cn('font-mono text-[10px] font-bold uppercase tracking-widest', status.text)}>
              {STATUS_LABEL[statusKey] || 'Upcoming'}
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-1 flex-col gap-3 px-1">
          <h3 className={cn('font-heading text-lg font-black uppercase italic leading-tight tracking-tight text-slate-900 transition-colors sm:text-xl md:text-2xl dark:text-white', accent.hover)}>
            {event.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-zinc-500">
            {event.description || 'Discover more about this exciting event.'}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:border-white/5 dark:text-zinc-600">
            <span>{formatDate(event.start_date, { timeZone: 'UTC' })}</span>
            {event.venue && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/10" />
                <span className="truncate max-w-[120px]">{event.venue}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Events({ events = [], featuredEvents = [], recentEvents = [], settings = {} }) {
  const recent = recentEvents.length > 0 ? recentEvents : events.slice(0, 3);

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute left-0 top-1/4 h-[300px] w-[300px] rounded-full bg-neon-lime/5 blur-[120px] sm:h-[400px] sm:w-[400px] sm:blur-[140px]" />
        <div className="absolute right-0 bottom-1/4 h-[200px] w-[200px] rounded-full bg-neon-violet/5 blur-[100px] sm:h-[300px] sm:w-[300px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-12 sm:space-y-16">
        {/* Header */}
        <motion.div
          variants={sectionHeader}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px 0px' }}
          className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between"
        >
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-neon-lime sm:w-10" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-neon-lime sm:text-[11px] sm:tracking-[0.5em]">
                Activity Feed / 002
              </span>
            </div>
            <h2 className="kinetic-headline font-heading text-4xl font-black uppercase text-slate-900 sm:text-5xl md:text-6xl dark:text-white">
              {settings?.homepage_events_title || 'Recent Events'}
            </h2>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/events"
              className="font-heading w-fit shrink-0 rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime sm:px-8 sm:py-3.5 sm:text-[11px] dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-neon-lime dark:hover:text-neon-lime"
            >
              View All →
            </Link>
          </motion.div>
        </motion.div>

        {/* Cards */}
        {recent.length > 0 ? (
          <motion.div
            variants={gridContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px 0px' }}
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3"
          >
            {recent.slice(0, 3).map((event, index) => (
              <motion.div key={event.id} variants={cardItem}>
                <EventCard event={event} index={index} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-4 py-20 text-center sm:py-24"
          >
            <div className="font-mono text-4xl opacity-20">[ ]</div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-slate-400 uppercase dark:text-zinc-600">
              {settings?.events_empty_message || 'No events found'}
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default Events;
