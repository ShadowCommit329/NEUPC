/**
 * @file About page
 * @module AboutPage
 */

import AboutClient from './AboutClient';
import {
  getAboutData,
  getAllPublicSettings,
  getPublicFeaturedGallery,
  getPublicCommittee,
} from '@/app/_lib/public-actions';
import { buildMetadata } from '@/app/_lib/seo';
import { AboutPageJsonLd, BreadcrumbJsonLd } from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'About',
  description:
    'Learn about Netrokona University Programming Club (NEUPC) — our mission, vision, activities, team, and how we build a thriving CSE community.',
  pathname: '/about',
  keywords: [
    'about NEUPC',
    'mission',
    'vision',
    'programming community',
    'CSE department',
  ],
});

export default async function Page() {
  const [aboutData, settings, galleryImages, committeeData] = await Promise.all(
    [
      getAboutData(),
      getAllPublicSettings(),
      getPublicFeaturedGallery().catch(() => []),
      getPublicCommittee().catch(() => ({ members: [], positions: [] })),
    ]
  );
  return (
    <AboutClient
      data={aboutData}
      settings={settings}
      galleryImages={galleryImages}
      committeeMembers={committeeData.members}
    />
  );
}
