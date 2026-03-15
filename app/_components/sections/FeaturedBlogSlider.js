/**
 * @file FeaturedBlogSlider — Auto-sliding hero carousel for featured blog posts.
 * @module FeaturedBlogSlider
 */

'use client';

import { useState, useEffect } from 'react';
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

function getExcerpt(blog) {
  return (
    blog.excerpt ||
    blog.description ||
    (blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '…'
      : '')
  );
}

export default function FeaturedBlogSlider({ blogs = [] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = blogs.length;

  // Auto-advance every 6 seconds
  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => setCurrent((i) => (i + 1) % count), 6000);
    return () => clearInterval(id);
  }, [count, paused]);

  const next = () => setCurrent((i) => (i + 1) % count);
  const prev = () => setCurrent((i) => (i - 1 + count) % count);

  if (count === 0) return null;

  const blog = blogs[current];
  const catCfg = getCategoryConfig(blog.category);
  const readTime = getReadTime(blog);
  const authorName = getAuthorName(blog);
  const authorAvatar = getAuthorAvatar(blog);
  const blogLink = `/blogs/${blog.slug || blog.id}`;

  return (
    <div
      className="group/slider relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background glow */}
      <div className="from-primary-500/8 via-secondary-500/5 pointer-events-none absolute inset-0 bg-linear-to-br to-transparent" />

      <div className="relative flex flex-col lg:flex-row">
        {/* ── Thumbnail Side ──────────────────────────────────────────── */}
        <div className="relative h-56 w-full overflow-hidden sm:h-64 lg:h-auto lg:w-1/2">
          {blog.thumbnail ? (
            <SafeImg
              src={driveImageUrl(blog.thumbnail)}
              alt={blog.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/slider:scale-105"
              fallback="/placeholder-blog.svg"
            />
          ) : (
            <div className="from-primary-900/60 via-secondary-900/40 flex h-full w-full items-center justify-center bg-linear-to-br to-slate-900/60">
              <span className="text-7xl opacity-40">{catCfg.emoji}</span>
            </div>
          )}
          {/* Gradient overlays */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent lg:bg-linear-to-r lg:from-transparent lg:via-slate-950/30 lg:to-slate-950/90" />

          {/* Category badge on image */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md sm:top-5 sm:left-5">
            <span className="text-sm">{catCfg.emoji}</span>
            {catCfg.label}
          </div>

          {/* Mobile title overlay */}
          <div className="absolute right-4 bottom-4 left-4 lg:hidden">
            <h3 className="text-lg leading-tight font-bold text-white drop-shadow-lg sm:text-xl">
              {blog.title}
            </h3>
          </div>
        </div>

        {/* ── Content Side ────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col justify-center p-5 sm:p-7 lg:p-10">
          {/* Featured + category badges */}
          <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                  clipRule="evenodd"
                />
              </svg>
              Featured
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                catCfg.badge
              )}
            >
              <span>{catCfg.emoji}</span>
              {catCfg.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <svg
                className="h-3.5 w-3.5"
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
              {readTime} read
            </span>
          </div>

          {/* Title (desktop) */}
          <h3 className="from-primary-200 to-secondary-200 mb-3 hidden bg-linear-to-r via-white bg-clip-text text-2xl leading-tight font-bold text-transparent lg:block xl:text-3xl">
            {blog.title}
          </h3>

          {/* Excerpt */}
          <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-gray-400 sm:text-base">
            {getExcerpt(blog)}
          </p>

          {/* Author + date */}
          <div className="mb-6 flex items-center gap-3">
            <div className="from-primary-500/30 to-secondary-500/30 text-primary-200 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br text-xs font-bold ring-2 ring-white/10">
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
              <p className="text-sm font-semibold text-gray-200">
                {authorName}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(blog.published_at || blog.created_at)}
              </p>
            </div>
            {(blog.views > 0 || blog.likes > 0) && (
              <div className="ml-auto flex items-center gap-3 text-xs text-gray-600">
                {blog.views > 0 && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
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
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
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
            )}
          </div>

          {/* CTA */}
          <Link
            href={blogLink}
            className="group/btn from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 hover:shadow-primary-500/40 inline-flex w-fit items-center gap-2 rounded-xl bg-linear-to-r px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.03]"
          >
            Read Article
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Slider Controls ─────────────────────────────────────────── */}
      {count > 1 && (
        <>
          {/* Prev arrow */}
          <button
            onClick={prev}
            aria-label="Previous featured blog"
            className="absolute top-1/2 left-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md transition-all hover:bg-black/70 hover:text-white sm:left-4 sm:h-10 sm:w-10"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Next arrow */}
          <button
            onClick={next}
            aria-label="Next featured blog"
            className="absolute top-1/2 right-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md transition-all hover:bg-black/70 hover:text-white sm:right-4 sm:h-10 sm:w-10"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="absolute right-0 bottom-0 left-0 flex items-center justify-center gap-2 pb-4 lg:pb-5">
            {blogs.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to featured blog ${i + 1}`}
                className={cn(
                  'h-2 rounded-full transition-all duration-400',
                  i === current
                    ? 'bg-primary-400 w-8'
                    : 'w-2 bg-white/25 hover:bg-white/50'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
