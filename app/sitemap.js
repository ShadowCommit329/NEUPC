/**
 * @file Sitemap generator
 * @module Sitemap
 */

import {
  getPublicEvents,
  getPublicBlogs,
  getPublicRoadmaps,
} from '@/app/_lib/public-actions';

export default async function sitemap() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://neupc.vercel.app';

  // Use a stable build timestamp so sitemap doesn't change on every request.
  // Dynamic pages use their own updated_at from the database.
  const buildDate = new Date('2026-03-01T00:00:00Z');

  // Static pages with stable lastModified dates
  const staticPages = [
    {
      url: baseUrl,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/achievements`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/roadmaps`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/committee`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: buildDate,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/developers`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/join`,
      lastModified: buildDate,
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: buildDate,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: buildDate,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  // Fetch all dynamic pages in parallel for performance
  const [events, blogs, roadmaps] = await Promise.all([
    getPublicEvents().catch(() => []),
    getPublicBlogs().catch(() => []),
    getPublicRoadmaps().catch(() => []),
  ]);

  // Dynamic event pages
  const eventPages = (events || []).map((event) => ({
    url: `${baseUrl}/events/${event.slug || event.id}`,
    lastModified: event.updated_at ? new Date(event.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
    ...(event.image_url && {
      images: [event.image_url],
    }),
  }));

  // Dynamic blog pages
  const blogPages = (blogs || []).map((blog) => ({
    url: `${baseUrl}/blogs/${blog.slug || blog.id}`,
    lastModified: blog.updated_at ? new Date(blog.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
    ...(blog.cover_image && {
      images: [blog.cover_image],
    }),
  }));

  // Dynamic roadmap pages
  const roadmapPages = (roadmaps || []).map((roadmap) => ({
    url: `${baseUrl}/roadmaps/${roadmap.slug || roadmap.id}`,
    lastModified: roadmap.updated_at
      ? new Date(roadmap.updated_at)
      : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticPages, ...eventPages, ...blogPages, ...roadmapPages];
}
