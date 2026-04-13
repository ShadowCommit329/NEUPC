/**
 * @file Json Ld
 * @module JsonLd
 */

/**
 * JSON-LD structured data components for SEO.
 * These generate schema.org markup that helps search engines understand page content.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://neupc.vercel.app';

/**
 * Organization schema for the club (enhanced with EducationalOrganization)
 */
export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'EducationalOrganization'],
    name: 'Netrokona University Programming Club',
    alternateName: 'NEUPC',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      'Building a strong programming community at Netrokona University through competitive programming, workshops, mentorship, and ICPC preparation.',
    foundingDate: '2023',
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: 'Netrokona University',
      department: {
        '@type': 'Organization',
        name: 'Department of Computer Science and Engineering',
      },
    },
    memberOf: {
      '@type': 'CollegeOrUniversity',
      name: 'Netrokona University',
    },
    knowsAbout: [
      'Competitive Programming',
      'ICPC',
      'Algorithm Design',
      'Data Structures',
      'Software Development',
      'Web Development',
    ],
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * WebSite schema for search features
 */
export function WebsiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NEUPC',
    url: BASE_URL,
    description: 'Netrokona University Programming Club official website.',
    publisher: {
      '@type': 'Organization',
      name: 'Netrokona University Programming Club',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * Event schema for individual event pages
 */
export function EventJsonLd({ event }) {
  if (!event) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || event.short_description,
    startDate: event.start_date,
    endDate: event.end_date || event.start_date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.venue
      ? 'https://schema.org/OfflineEventAttendanceMode'
      : 'https://schema.org/OnlineEventAttendanceMode',
    location: event.venue
      ? {
          '@type': 'Place',
          name: event.venue,
          address: {
            '@type': 'PostalAddress',
            name: 'Netrokona University',
          },
        }
      : {
          '@type': 'VirtualLocation',
          url: BASE_URL,
        },
    organizer: {
      '@type': 'Organization',
      name: 'Netrokona University Programming Club',
      url: BASE_URL,
    },
    image: event.image_url || undefined,
    url: `${BASE_URL}/events/${event.slug || event.id}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * Article schema for blog posts
 */
export function ArticleJsonLd({ article }) {
  if (!article) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || article.short_description,
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      '@type': 'Person',
      name: article.author_name || 'NEUPC',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Netrokona University Programming Club',
    },
    url: `${BASE_URL}/blogs/${article.slug || article.id}`,
    image: article.cover_image || undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blogs/${article.slug || article.id}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * BreadcrumbList schema
 */
export function BreadcrumbJsonLd({ items }) {
  if (!items || items.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${BASE_URL}${item.url}` : undefined,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * FAQ schema for the contact/FAQ page
 */
export function FAQJsonLd({ faqs }) {
  if (!faqs || faqs.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * CollectionPage schema for list/index pages (events, blogs, achievements)
 */
export function CollectionPageJsonLd({ name, description, url }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: url ? `${BASE_URL}${url}` : BASE_URL,
    isPartOf: {
      '@type': 'WebSite',
      name: 'NEUPC',
      url: BASE_URL,
    },
    provider: {
      '@type': 'Organization',
      name: 'Netrokona University Programming Club',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * ImageGallery schema for gallery pages
 */
export function ImageGalleryJsonLd({ images }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: 'NEUPC Photo Gallery',
    description: 'Photo gallery of events, workshops, and activities at NEUPC.',
    url: `${BASE_URL}/gallery`,
    publisher: {
      '@type': 'Organization',
      name: 'Netrokona University Programming Club',
    },
    ...(images?.length > 0 && {
      image: images.slice(0, 10).map((img) => ({
        '@type': 'ImageObject',
        url: img.url || img.image_url,
        name: img.title || img.caption || 'NEUPC Gallery Image',
        description: img.caption || img.description || '',
      })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * AboutPage schema for the about page
 */
export function AboutPageJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About NEUPC',
    description:
      'Learn about the mission, vision, and activities of Netrokona University Programming Club.',
    url: `${BASE_URL}/about`,
    mainEntity: {
      '@type': 'Organization',
      name: 'Netrokona University Programming Club',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * ContactPage schema for the contact page
 */
export function ContactPageJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact NEUPC',
    description: 'Get in touch with Netrokona University Programming Club.',
    url: `${BASE_URL}/contact`,
    mainEntity: {
      '@type': 'Organization',
      name: 'Netrokona University Programming Club',
      url: BASE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * Course schema for bootcamp/course pages
 */
export function CourseJsonLd({ name, description, provider, url }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    provider: {
      '@type': 'Organization',
      name: provider || 'Netrokona University Programming Club',
      url: BASE_URL,
    },
    url: url ? `${BASE_URL}${url}` : BASE_URL,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
