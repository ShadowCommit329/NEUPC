/**
 * @file public actions - read-only data fetchers for public pages
 * @module public-actions
 *
 * NOTE: No 'use server' directive — these are plain async functions called
 * directly from server components during SSR, avoiding unnecessary Server
 * Action POST round-trips for read-only data.
 */

import { unstable_cache } from 'next/cache';
import {
  getPublishedEvents,
  getFeaturedEvents,
  getUpcomingEvents,
  getEventBySlug,
  getEventById,
  getPublishedBlogPosts,
  getFeaturedBlogPosts,
  getBlogPostBySlug,
  getBlogPostsByCategory,
  getTrendingBlogPosts,
  getAllAchievements,
  getAchievementsByCategory,
  getPublicParticipationRecords,
  getAllGalleryItems,
  getFeaturedGalleryItems,
  getGalleryItemsByCategory,
  getGalleryItemsByEvent,
  getEventGallery,
  getAllEventGalleryPublic,
  getCurrentCommittee,
  getCommitteePositions,
  getPublishedRoadmaps,
  getRoadmapBySlug,
  getRoadmapsByCategory,
  getSettingsByCategory,
  getSetting,
  getAllSettings,
  getActiveNotices,
  getPublicJourneyItems,
} from './data-service';

// ============================================================================
// Helper: Parse JSON setting value safely
// ============================================================================
function parseJsonSetting(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  // jsonb columns return already-parsed JS values (arrays, objects, strings)
  if (typeof value === 'object') return value;
  // If somehow a raw JSON string, try to parse it
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value; // return the plain string as-is
    }
  }
  return fallback;
}

// ============================================================================
// Helper: Get settings as key-value map for a category
// ============================================================================
async function getSettingsMap(category) {
  try {
    const settings = await getSettingsByCategory(category);
    const map = {};
    if (settings) {
      settings.forEach((s) => {
        map[s.key] = s.value;
      });
    }
    return map;
  } catch {
    return {};
  }
}

// ============================================================================
// Helper: Get ALL settings as a flat key-value map
// Used to pass a single settings object to public pages
// ============================================================================
export const getAllPublicSettings = unstable_cache(
  async () => {
    try {
      const rows = await getAllSettings();
      const map = {};
      if (rows) {
        rows.forEach((r) => {
          map[r.key] = r.value;
        });
      }
      return map;
    } catch {
      return {};
    }
  },
  ['all-public-settings'],
  { revalidate: 3600, tags: ['settings'] }
);

// ============================================================================
// Site Settings (Hero, About, Social, Contact, Footer, Stats)
// Cached for 1 hour — these rarely change
// ============================================================================
export const getHeroData = unstable_cache(
  async () => {
    try {
      const settings = await getSettingsMap('hero');
      return {
        title: settings.hero_title || 'Programming Club',
        subtitle: settings.hero_subtitle || '(NEUPC)',
        department:
          settings.hero_department ||
          'Department of Computer Science and Engineering',
        university:
          settings.hero_university ||
          'Netrokona University, Netrokona, Bangladesh',
      };
    } catch {
      return {
        title: 'Programming Club',
        subtitle: '(NEUPC)',
        department: 'Department of Computer Science and Engineering',
        university: 'Netrokona University, Netrokona, Bangladesh',
      };
    }
  },
  ['hero-data'],
  { revalidate: 3600, tags: ['settings'] }
);

export const getAboutData = unstable_cache(
  async () => {
    try {
      const settings = await getSettingsMap('about');
      return {
        title: settings.about_title || 'Who We Are',
        description1:
          settings.about_description_1 ||
          'The Programming Club (NEUPC) of Netrokona University is an academic and skill-development organization under the Department of Computer Science and Engineering.',
        description2:
          settings.about_description_2 ||
          'The club serves as a platform where students can explore competitive programming, software development, research discussions, and emerging technologies beyond the academic syllabus.',
        mission: parseJsonSetting(settings.about_mission, []),
        vision: parseJsonSetting(settings.about_vision, []),
        whatWeDo: parseJsonSetting(settings.about_what_we_do, []),
        stats: parseJsonSetting(settings.about_stats, []),
        coreValues: parseJsonSetting(settings.about_core_values, []),
        orgStructure: parseJsonSetting(settings.about_org_structure, []),
        skills: parseJsonSetting(settings.about_skills, []),
        skillsDescription: settings.about_skills_description || '',
        wieTitle: settings.about_wie_title || '',
        wieDescription: settings.about_wie_description || '',
        mentorshipTitle: settings.about_mentorship_title || '',
        mentorshipDescription: settings.about_mentorship_description || '',
        mentorshipAreas: parseJsonSetting(settings.about_mentorship_areas, []),
        orgFinancialNote: settings.about_org_financial_note || '',
      };
    } catch {
      return {
        title: 'Who We Are',
        description1: '',
        description2: '',
        mission: [],
        vision: [],
        whatWeDo: [],
        stats: [],
        coreValues: [],
        orgStructure: [],
        skills: [],
        skillsDescription: '',
        wieTitle: '',
        wieDescription: '',
        mentorshipTitle: '',
        mentorshipDescription: '',
        mentorshipAreas: [],
        orgFinancialNote: '',
      };
    }
  },
  ['about-data'],
  { revalidate: 3600, tags: ['settings'] }
);

export const getSocialLinks = unstable_cache(
  async () => {
    try {
      const settings = await getSettingsMap('social');
      return {
        facebook: settings.social_facebook || '',
        github: settings.social_github || '',
        linkedin: settings.social_linkedin || '',
        youtube: settings.social_youtube || '',
        twitter: settings.social_twitter || '',
      };
    } catch {
      return {
        facebook: '',
        github: '',
        linkedin: '',
        youtube: '',
        twitter: '',
      };
    }
  },
  ['social-links'],
  { revalidate: 3600, tags: ['settings'] }
);

export const getContactInfo = unstable_cache(
  async () => {
    try {
      const settings = await getSettingsMap('contact');
      return {
        email: settings.contact_email || '',
        phone: settings.contact_phone || '',
        address: settings.contact_address || '',
        officeHours: settings.contact_office_hours || '',
        subjects: parseJsonSetting(settings.contact_subjects, []),
      };
    } catch {
      return {
        email: '',
        phone: '',
        address: '',
        officeHours: '',
        subjects: [],
      };
    }
  },
  ['contact-info'],
  { revalidate: 3600, tags: ['settings'] }
);

export const getFooterData = unstable_cache(
  async () => {
    try {
      const footerSettings = await getSettingsMap('footer');
      return {
        description:
          footerSettings.footer_description ||
          'Netrokona University Programming Club - Empowering students with competitive programming, web development, and cutting-edge technology skills.',
      };
    } catch {
      return {
        description:
          'Netrokona University Programming Club - Empowering students with competitive programming, web development, and cutting-edge technology skills.',
      };
    }
  },
  ['footer-data'],
  { revalidate: 3600, tags: ['settings'] }
);

// Stats are now part of about_stats in the 'about' category.
// Use getAboutData().stats instead of a separate getStatsData().

// ============================================================================
// Content Settings (FAQs, Join benefits, Developers, Tech Stack)
// Cached for 1 hour — these rarely change
// ============================================================================
export const getFaqsData = unstable_cache(
  async () => {
    try {
      const setting = await getSetting('faqs');
      return parseJsonSetting(setting?.value, []);
    } catch {
      return [];
    }
  },
  ['faqs-data'],
  { revalidate: 3600, tags: ['settings'] }
);

export const getJoinPageData = unstable_cache(
  async () => {
    try {
      const [benefitsSetting, featuresSetting] = await Promise.all([
        getSetting('join_benefits'),
        getSetting('join_features'),
      ]);
      return {
        benefits: parseJsonSetting(benefitsSetting?.value, []),
        features: parseJsonSetting(featuresSetting?.value, []),
      };
    } catch {
      return { benefits: [], features: [] };
    }
  },
  ['join-page-data'],
  { revalidate: 3600, tags: ['settings'] }
);

export const getDevelopersData = unstable_cache(
  async () => {
    try {
      const [
        coreSetting,
        contributorsSetting,
        techStackSetting,
        timelineSetting,
        githubStatsSetting,
      ] = await Promise.all([
        getSetting('developers_core'),
        getSetting('developers_contributors'),
        getSetting('tech_stack'),
        getSetting('developers_timeline'),
        getSetting('github_stats'),
      ]);
      return {
        coreDevelopers: parseJsonSetting(coreSetting, []),
        contributors: parseJsonSetting(contributorsSetting, []),
        techStack: parseJsonSetting(techStackSetting, {}),
        timeline: parseJsonSetting(timelineSetting, []),
        githubStats: parseJsonSetting(githubStatsSetting, {}),
      };
    } catch {
      return {
        coreDevelopers: [],
        contributors: [],
        techStack: {},
        timeline: [],
        githubStats: {},
      };
    }
  },
  ['developers-data'],
  { revalidate: 3600, tags: ['settings'] }
);

// ============================================================================
// Events — cached for 5 minutes
// ============================================================================
export const getPublicEvents = unstable_cache(
  async () => {
    try {
      const events = await getPublishedEvents();
      return events || [];
    } catch {
      return [];
    }
  },
  ['public-events'],
  { revalidate: 300, tags: ['events'] }
);

export const getPublicFeaturedEvents = unstable_cache(
  async () => {
    try {
      const events = await getFeaturedEvents();
      return events || [];
    } catch {
      return [];
    }
  },
  ['public-featured-events'],
  { revalidate: 300, tags: ['events'] }
);

export const getPublicUpcomingEvents = (limit = 3) =>
  unstable_cache(
    async () => {
      try {
        const events = await getUpcomingEvents(limit);
        return events || [];
      } catch {
        return [];
      }
    },
    [`public-upcoming-events-${limit}`],
    { revalidate: 300, tags: ['events'] }
  )();

export const getPublicRecentEvents = (limit = 3) =>
  unstable_cache(
    async () => {
      try {
        const { getRecentNonFeaturedEvents } = await import('./data-service');
        const events = await getRecentNonFeaturedEvents(limit);
        return events || [];
      } catch {
        return [];
      }
    },
    [`public-recent-events-${limit}`],
    { revalidate: 300, tags: ['events'] }
  )();

export const getPublicEventBySlug = (slug) =>
  unstable_cache(
    async () => {
      try {
        return await getEventBySlug(slug);
      } catch {
        return null;
      }
    },
    [`public-event-by-slug-${slug}`],
    { revalidate: 120, tags: ['events'] }
  )();

export const getPublicEventById = (id) =>
  unstable_cache(
    async () => {
      try {
        return await getEventById(id);
      } catch {
        return null;
      }
    },
    [`public-event-by-id-${id}`],
    { revalidate: 120, tags: ['events'] }
  )();

// Gallery items for a specific event — merged from both event_gallery and gallery_items tables.
export const getPublicEventGallery = (eventId) =>
  unstable_cache(
    async () => {
      try {
        const [dedicated, general] = await Promise.all([
          getEventGallery(eventId).catch(() => []),
          getGalleryItemsByEvent(eventId).catch(() => []),
        ]);
        // Merge: dedicated event_gallery first (by display_order), then general gallery_items
        return [...(dedicated ?? []), ...(general ?? [])];
      } catch {
        return [];
      }
    },
    [`public-event-gallery-${eventId}`],
    { revalidate: 300, tags: ['gallery', 'events'] }
  )();

// ============================================================================
// Blog Posts — cached for 5 minutes
// ============================================================================
export const getPublicBlogs = (limit) =>
  unstable_cache(
    async () => {
      try {
        const blogs = await getPublishedBlogPosts(limit);
        return blogs || [];
      } catch {
        return [];
      }
    },
    [`public-blogs-${limit ?? 'all'}`],
    { revalidate: 300, tags: ['blogs'] }
  )();

export const getPublicFeaturedBlogs = unstable_cache(
  async () => {
    try {
      const blogs = await getFeaturedBlogPosts();
      return blogs || [];
    } catch {
      return [];
    }
  },
  ['public-featured-blogs'],
  { revalidate: 300, tags: ['blogs'] }
);

export const getPublicRecentBlogs = (limit = 6) =>
  unstable_cache(
    async () => {
      try {
        const { getRecentNonFeaturedBlogPosts } =
          await import('./data-service');
        const blogs = await getRecentNonFeaturedBlogPosts(limit);
        return blogs || [];
      } catch {
        return [];
      }
    },
    [`public-recent-blogs-${limit}`],
    { revalidate: 300, tags: ['blogs'] }
  )();

export const getPublicBlogBySlug = (slug) =>
  unstable_cache(
    async () => {
      try {
        return await getBlogPostBySlug(slug);
      } catch {
        return null;
      }
    },
    [`public-blog-by-slug-${slug}`],
    { revalidate: 120, tags: ['blogs'] }
  )();

export const getPublicBlogsByCategory = (category) =>
  unstable_cache(
    async () => {
      try {
        const blogs = await getBlogPostsByCategory(category);
        return blogs || [];
      } catch {
        return [];
      }
    },
    [`public-blogs-by-category-${category}`],
    { revalidate: 300, tags: ['blogs'] }
  )();

export const getPublicTrendingBlogs = (limit = 5) =>
  unstable_cache(
    async () => {
      try {
        const blogs = await getTrendingBlogPosts(limit);
        return blogs || [];
      } catch {
        return [];
      }
    },
    [`public-trending-blogs-${limit}`],
    { revalidate: 300, tags: ['blogs'] }
  )();

// ============================================================================
// Achievements — cached for 5 minutes
// ============================================================================
export const getPublicAchievements = unstable_cache(
  async () => {
    try {
      const achievements = await getAllAchievements();
      return achievements || [];
    } catch {
      return [];
    }
  },
  ['public-achievements'],
  { revalidate: 300, tags: ['achievements'] }
);

export const getPublicParticipations = unstable_cache(
  async () => {
    try {
      const records = await getPublicParticipationRecords();
      return records || [];
    } catch {
      return [];
    }
  },
  ['public-participations'],
  { revalidate: 300, tags: ['participations', 'achievements'] }
);

export const getPublicJourney = unstable_cache(
  async () => {
    try {
      return await getPublicJourneyItems();
    } catch {
      return [];
    }
  },
  ['public-journey'],
  { revalidate: 3600, tags: ['site-content'] }
);

export const getPublicAchievementsByCategory = (category) =>
  unstable_cache(
    async () => {
      try {
        const achievements = await getAchievementsByCategory(category);
        return achievements || [];
      } catch {
        return [];
      }
    },
    [`public-achievements-by-category-${category}`],
    { revalidate: 300, tags: ['achievements'] }
  )();

// ============================================================================
// Gallery — cached for 5 minutes
// ============================================================================
export const getPublicGallery = unstable_cache(
  async () => {
    try {
      const [galleryItems, eventItems] = await Promise.all([
        getAllGalleryItems().catch(() => []),
        getAllEventGalleryPublic().catch(() => []),
      ]);

      // Normalize event_gallery items to match gallery_items shape
      const normalizedEventItems = (eventItems ?? []).map((item) => ({
        ...item,
        _source: 'event_gallery',
        // Map event_gallery fields to gallery_items-compatible fields
        title: item.caption || item.events?.title || 'Event Photo',
        description: item.caption || '',
        image: item.url,
        image_url: item.url,
        category: item.events?.category || 'Activity',
        event_date: item.events?.start_date || item.created_at,
        date: item.events?.start_date || item.created_at,
        tags: [],
        is_featured: false,
      }));

      return [...(galleryItems ?? []), ...normalizedEventItems];
    } catch {
      return [];
    }
  },
  ['public-gallery'],
  { revalidate: 300, tags: ['gallery', 'events'] }
);

export const getPublicFeaturedGallery = unstable_cache(
  async () => {
    try {
      const items = await getFeaturedGalleryItems();
      return items || [];
    } catch {
      return [];
    }
  },
  ['public-featured-gallery'],
  { revalidate: 300, tags: ['gallery'] }
);

export const getPublicGalleryByCategory = (category) =>
  unstable_cache(
    async () => {
      try {
        const items = await getGalleryItemsByCategory(category);
        return items || [];
      } catch {
        return [];
      }
    },
    [`public-gallery-by-category-${category}`],
    { revalidate: 300, tags: ['gallery'] }
  )();

// ============================================================================
// Committee — cached for 10 minutes
// ============================================================================
export const getPublicCommittee = unstable_cache(
  async () => {
    try {
      const [members, positions] = await Promise.all([
        getCurrentCommittee(),
        getCommitteePositions(),
      ]);
      return {
        members: members || [],
        positions: positions || [],
      };
    } catch (error) {
      console.error(
        '[getPublicCommittee] Failed to fetch committee data:',
        error
      );
      return { members: [], positions: [] };
    }
  },
  ['public-committee'],
  { revalidate: 60, tags: ['committee'] }
);

// ============================================================================
// Roadmaps — cached for 10 minutes
// ============================================================================
export const getPublicRoadmaps = unstable_cache(
  async () => {
    try {
      const roadmaps = await getPublishedRoadmaps();
      return roadmaps || [];
    } catch {
      return [];
    }
  },
  ['public-roadmaps'],
  { revalidate: 600, tags: ['roadmaps'] }
);

export const getPublicRoadmapBySlug = (slug) =>
  unstable_cache(
    async () => {
      try {
        return await getRoadmapBySlug(slug);
      } catch {
        return null;
      }
    },
    [`public-roadmap-by-slug-${slug}`],
    { revalidate: 120, tags: ['roadmaps'] }
  )();

export const getPublicRoadmapsByCategory = (category) =>
  unstable_cache(
    async () => {
      try {
        const roadmaps = await getRoadmapsByCategory(category);
        return roadmaps || [];
      } catch {
        return [];
      }
    },
    [`public-roadmaps-category-${category}`],
    { revalidate: 600, tags: ['roadmaps'] }
  )();

// ============================================================================
// Notices — cached for 2 minutes (time-sensitive)
// ============================================================================
export const getPublicNotices = unstable_cache(
  async () => {
    try {
      const notices = await getActiveNotices();
      return notices || [];
    } catch {
      return [];
    }
  },
  ['public-notices'],
  { revalidate: 120, tags: ['notices'] }
);

// ============================================================================
// Homepage: Combined data fetch — cached for 5 minutes
// Inner calls also benefit from their own caches
// ============================================================================
export const getHomePageData = unstable_cache(
  async () => {
    try {
      const [
        hero,
        about,
        events,
        featuredEvents,
        recentEvents,
        achievements,
        participations,
        featuredBlogs,
        recentBlogs,
        joinData,
        settings,
      ] = await Promise.all([
        getHeroData(),
        getAboutData(),
        getPublicUpcomingEvents(6),
        getPublicFeaturedEvents(),
        getPublicRecentEvents(3),
        getPublicAchievements(),
        getPublicParticipations(),
        getPublicFeaturedBlogs(),
        getPublicRecentBlogs(6),
        getJoinPageData(),
        getAllPublicSettings(),
      ]);
      return {
        hero,
        about,
        events,
        featuredEvents,
        recentEvents,
        achievements,
        participations,
        featuredBlogs,
        recentBlogs,
        stats: about.stats || [],
        joinBenefits: joinData.benefits,
        settings,
      };
    } catch {
      return {
        hero: await getHeroData(),
        about: await getAboutData(),
        events: [],
        featuredEvents: [],
        recentEvents: [],
        achievements: [],
        participations: [],
        featuredBlogs: [],
        recentBlogs: [],
        stats: [],
        joinBenefits: [],
        settings: {},
      };
    }
  },
  ['homepage-data'],
  { revalidate: 300, tags: ['homepage'] }
);
