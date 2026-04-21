'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/app/_lib/utils';
import { getCategoryConfig } from '@/app/_lib/blog-config';

const CARD_ACCENTS = [
  { cat: 'text-neon-lime', hover: 'group-hover:text-neon-lime', icon: 'text-neon-lime', bar: 'bg-neon-lime' },
  { cat: 'text-neon-violet', hover: 'group-hover:text-neon-violet', icon: 'text-neon-violet', bar: 'bg-neon-violet' },
  { cat: 'text-neon-lime', hover: 'group-hover:text-neon-lime', icon: 'text-neon-lime', bar: 'bg-neon-lime' },
];

function getExcerpt(blog) {
  return (
    blog.excerpt ||
    blog.description ||
    (blog.content ? blog.content.replace(/<[^>]*>/g, '').slice(0, 160) + '…' : '')
  );
}

function getAuthorName(blog) {
  return blog.users?.full_name || blog.author_name || blog.author || 'NEUPC Team';
}

const headerVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};
const gridContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
};

function InsightCard({ blog, index = 0 }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const catCfg = getCategoryConfig(blog.category);
  const blogLink = `/blogs/${blog.slug || blog.id}`;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Link
        href={blogLink}
        className="holographic-card group flex h-full flex-col justify-between rounded-2xl p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-violet sm:rounded-3xl sm:p-8 md:p-10"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Accent bar + category */}
          <div className="flex items-center gap-3">
            <span className={cn('h-3 w-[3px] rounded-full', accent.bar)} />
            <span className={cn('font-mono text-[10px] font-bold uppercase tracking-widest', accent.cat)}>
              {catCfg.label || blog.category || 'Research'}
            </span>
          </div>
          <h3 className={cn('font-heading text-xl font-black uppercase leading-snug tracking-tight text-slate-900 transition-colors sm:text-2xl dark:text-white', accent.hover)}>
            {blog.title}
          </h3>
          <p className="line-clamp-3 text-sm font-light leading-relaxed text-slate-500 dark:text-zinc-500">
            {getExcerpt(blog)}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 sm:mt-8 sm:pt-6 dark:border-white/5">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600">Author</span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400">{getAuthorName(blog)}</span>
          </div>
          <motion.span
            whileHover={{ x: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={cn('flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 sm:h-10 sm:w-10 dark:border-white/10', accent.icon)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </motion.span>
        </div>
      </Link>
    </motion.div>
  );
}

function Blogs({ blogs = [], featuredBlogs = [], recentBlogs = [], settings = {} }) {
  const allBlogs = [...featuredBlogs, ...recentBlogs, ...blogs];
  const uniqueBlogs = allBlogs.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
  const displayBlogs = uniqueBlogs.slice(0, 3);

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute right-0 top-1/4 h-[300px] w-[300px] rounded-full bg-neon-violet/5 blur-[120px] sm:h-[400px] sm:w-[400px] sm:blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-12 sm:space-y-16 lg:space-y-20">
        {/* Header */}
        <motion.div
          variants={headerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px 0px' }}
          className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end"
        >
          <div className="shrink-0 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-neon-violet sm:w-10" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-neon-violet sm:text-[11px] sm:tracking-[0.5em]">
                Knowledge Base / 004
              </span>
            </div>
            <h2 className="kinetic-headline font-heading text-4xl font-black uppercase text-slate-900 sm:text-5xl md:text-6xl dark:text-white">
              {settings?.homepage_blogs_title || 'Insights'}
            </h2>
          </div>
          <div className="mb-3 hidden h-px grow bg-linear-to-r from-neon-violet/20 to-transparent md:block" />
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/blogs"
              className="font-heading w-fit shrink-0 rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase transition-colors hover:border-neon-violet hover:text-neon-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-violet sm:px-8 sm:py-3.5 sm:text-[11px] dark:border-white/10 dark:bg-white/5 dark:text-zinc-400"
            >
              View All Posts →
            </Link>
          </motion.div>
        </motion.div>

        {/* Cards grid */}
        {displayBlogs.length > 0 ? (
          <motion.div
            variants={gridContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px 0px' }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"
          >
            {displayBlogs.map((blog, index) => (
              <motion.div key={blog.id ?? index} variants={cardItem}>
                <InsightCard blog={blog} index={index} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="holographic-card flex flex-col items-center gap-4 rounded-2xl py-20 text-center sm:py-24"
          >
            <div className="font-mono text-4xl opacity-20">{'{}'}</div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-slate-400 uppercase dark:text-zinc-600">
              {settings?.blogs_empty_message || 'No articles published yet'}
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default Blogs;
