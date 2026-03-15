'use client';

/**
 * @file Blogs — Homepage section
 * @module Blogs
 *
 * Shows a featured-blog slider (auto/manual) on top, then a 3-column grid
 * of the 6 most recent non-featured articles.
 * Design language: consistent with Events / Achievements sections.
 */

import Link from 'next/link';
import {
  cn,
  formatDate,
  estimateReadTime,
  getInitials,
  driveImageUrl,
} from '@/app/_lib/utils';
import { getCategoryConfig } from '@/app/_lib/blog-config';
import SafeImg from '../ui/SafeImg';
import SectionHeader from '../ui/SectionHeader';
import SectionBackground from '../ui/SectionBackground';
import FeaturedBlogSlider from './FeaturedBlogSlider';
import { useStaggerReveal } from '@/app/_lib/hooks';

// ─── Accent palette — cycles through card positions ─────────────────────────

const CARD_ACCENTS = [
  {
    border: 'hover:border-primary-500/40',
    topLine: 'from-primary-500 to-secondary-500',
    glow: 'from-primary-500/15',
    title: 'group-hover:text-primary-200',
    date: 'text-primary-300',
  },
  {
    border: 'hover:border-secondary-500/40',
    topLine: 'from-secondary-500 to-primary-500',
    glow: 'from-secondary-500/15',
    title: 'group-hover:text-secondary-200',
    date: 'text-secondary-300',
  },
  {
    border: 'hover:border-violet-500/40',
    topLine: 'from-violet-500 to-primary-500',
    glow: 'from-violet-500/15',
    title: 'group-hover:text-violet-200',
    date: 'text-violet-300',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExcerpt(blog) {
  return (
    blog.excerpt ||
    blog.description ||
    (blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 180) + '…'
      : '')
  );
}

function getAuthorName(blog) {
  return (
    blog.users?.full_name || blog.author_name || blog.author || 'NEUPC Team'
  );
}

function getAuthorAvatar(blog) {
  return blog.users?.avatar_url || null;
}

function getReadTime(blog) {
  return blog.read_time || estimateReadTime(blog.content);
}

// ─── BlogCard ─────────────────────────────────────────────────────────────────

function BlogCard({ blog, index = 0 }) {
  const a = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const catCfg = getCategoryConfig(blog.category);
  const blogLink = `/blogs/${blog.slug || blog.id}`;
  const readTime = getReadTime(blog);
  const authorName = getAuthorName(blog);
  const authorAvatar = getAuthorAvatar(blog);

  return (
    <Link
      href={blogLink}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 shadow-xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:bg-white/6 hover:shadow-2xl',
        a.border
      )}
    >
      {/* Top accent line */}
      <div
        className={cn(
          'absolute top-0 right-0 left-0 h-px w-0 bg-linear-to-r transition-all duration-700 group-hover:w-full',
          a.topLine
        )}
      />

      {/* Corner glow */}
      <div
        className={cn(
          'pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-linear-to-br to-transparent opacity-0 blur-[50px] transition-opacity duration-500 group-hover:opacity-100',
          a.glow
        )}
      />

      {/* Thumbnail */}
      {blog.thumbnail && (
        <div className="relative h-44 w-full overflow-hidden">
          <SafeImg
            src={driveImageUrl(blog.thumbnail)}
            alt={blog.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            fallback="/placeholder-blog.svg"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#0d1117]/80 via-transparent to-transparent" />
        </div>
      )}

      {/* Body */}
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        {/* Category badge + read time */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              catCfg.badge
            )}
          >
            <span>{catCfg.emoji}</span>
            {catCfg.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {readTime}
          </span>
        </div>

        {/* Title */}
        <h3
          className={cn(
            'mb-2 line-clamp-2 text-base leading-snug font-bold text-white transition-colors sm:text-lg',
            a.title
          )}
        >
          {blog.title}
        </h3>

        {/* Excerpt */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500">
          {getExcerpt(blog)}
        </p>

        {/* Footer: author + stats */}
        <div className="flex items-center justify-between gap-2 border-t border-white/6 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-white/10 to-white/5 text-[10px] font-bold text-gray-300 ring-1 ring-white/10">
              {authorAvatar ? (
                <SafeImg
                  src={driveImageUrl(authorAvatar)}
                  alt={authorName}
                  className="h-full w-full object-cover"
                  fallback=""
                />
              ) : (
                getInitials(authorName)
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300">{authorName}</p>
              <p className={cn('text-[10px]', a.date)}>
                {formatDate(blog.published_at || blog.created_at)}
              </p>
            </div>
          </div>

          {blog.views > 0 || blog.likes > 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              {blog.views > 0 && (
                <span className="flex items-center gap-0.5">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  {blog.views >= 1000
                    ? `${(blog.views / 1000).toFixed(1)}k`
                    : blog.views}
                </span>
              )}
              {blog.likes > 0 && (
                <span className="flex items-center gap-0.5">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {blog.likes}
                </span>
              )}
            </div>
          ) : (
            <svg
              className="group-hover:text-primary-400 h-4 w-4 text-gray-700 transition-all duration-300 group-hover:translate-x-1"
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
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Blogs Section ───────────────────────────────────────────────────────────

function Blogs({
  blogs = [],
  featuredBlogs = [],
  recentBlogs = [],
  settings = {},
}) {
  // Support legacy `blogs` prop: derive featured/recent from it when new props not provided
  const featured =
    featuredBlogs.length > 0
      ? featuredBlogs
      : blogs.filter((b) => b.is_featured);

  const featuredIds = new Set(featured.map((b) => b.id));
  const recent =
    recentBlogs.length > 0
      ? recentBlogs.slice(0, 6)
      : blogs.filter((b) => !featuredIds.has(b.id)).slice(0, 6);

  const hasContent = featured.length > 0 || recent.length > 0;
  const {
    ref: gridRef,
    isVisible: gridVisible,
    getDelay,
  } = useStaggerReveal({ staggerMs: 100 });

  return (
    <section className="relative overflow-hidden py-16 sm:py-20 md:py-28">
      <SectionBackground variant="accent" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Section Header ───────────────────────────────────────── */}
        <SectionHeader
          badgeIcon="📝"
          badge={
            settings?.homepage_blogs_badge || 'Latest Articles & Resources'
          }
          title={settings?.homepage_blogs_title || 'Knowledge Base'}
          subtitle={
            settings?.homepage_blogs_subtitle ||
            'Explore tutorials, contest insights, career guidance, and community stories'
          }
          lineClassName="to-primary-500/40"
          titleClassName="from-white via-gray-100 to-gray-300"
        />

        {hasContent ? (
          <>
            {/* ── Featured Blog Slider ──────────────────────────────── */}
            {featured.length > 0 && (
              <div className="mb-10 sm:mb-14">
                <div className="mb-4 flex items-center gap-2 sm:mb-5">
                  <div className="h-px flex-1 bg-linear-to-r from-amber-500/30 to-transparent" />
                  <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-amber-400/80 uppercase">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 text-amber-400"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Featured{' '}
                    {featured.length > 1
                      ? `· ${featured.length} articles`
                      : 'Article'}
                  </span>
                  <div className="h-px flex-1 bg-linear-to-l from-amber-500/30 to-transparent" />
                </div>
                <FeaturedBlogSlider blogs={featured} />
              </div>
            )}

            {/* ── Recent Articles Grid ──────────────────────────────── */}
            {recent.length > 0 && (
              <>
                {featured.length > 0 && (
                  <div className="mb-5 flex items-center gap-2 sm:mb-6">
                    <div className="from-primary-500/20 h-px flex-1 bg-linear-to-r to-transparent" />
                    <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Latest Articles
                    </span>
                    <div className="from-primary-500/20 h-px flex-1 bg-linear-to-l to-transparent" />
                  </div>
                )}
                <div
                  ref={gridRef}
                  className="mb-10 grid gap-5 sm:mb-12 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
                >
                  {recent.map((blog, index) => (
                    <div
                      key={blog.id ?? index}
                      className={cn(
                        'transition-all duration-700 ease-out',
                        gridVisible
                          ? 'translate-y-0 opacity-100'
                          : 'translate-y-8 opacity-0'
                      )}
                      style={{
                        transitionDelay: gridVisible
                          ? `${getDelay(index)}ms`
                          : '0ms',
                      }}
                    >
                      <BlogCard blog={blog} index={index} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="mb-10 rounded-2xl border border-white/8 bg-white/3 py-16 text-center backdrop-blur-xl">
            <div className="mb-3 text-4xl">📭</div>
            <p className="text-base text-gray-400">
              {settings?.blogs_empty_message ||
                'No articles published yet. Check back soon!'}
            </p>
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <div className="text-center">
          <Link
            href="/blogs"
            className="group border-primary-500/30 from-primary-500/20 via-secondary-500/20 to-primary-500/20 hover:border-primary-500/50 hover:shadow-primary-500/40 relative inline-flex items-center gap-3 overflow-hidden rounded-full border bg-linear-to-r px-10 py-4 font-bold text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_60px_-15px]"
          >
            <div className="from-primary-500/50 via-secondary-500/50 to-primary-500/50 absolute inset-0 bg-linear-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative z-10">
              {settings?.homepage_blogs_cta || 'Explore All Articles'}
            </span>
            <svg
              className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Blogs;
