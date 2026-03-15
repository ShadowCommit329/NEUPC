/**
 * @file Gallery page
 * @module GalleryPage
 */

import {
  getPublicGallery,
  getAllPublicSettings,
  getPublicAchievements,
  getPublicParticipations,
  getPublicEvents,
  getPublicCommittee,
} from '@/app/_lib/public-actions';
import GalleryClient from './GalleryClient';
import { buildMetadata } from '@/app/_lib/seo';
import {
  ImageGalleryJsonLd,
  BreadcrumbJsonLd,
} from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'Gallery',
  description:
    'Photo gallery of NEUPC Programming Club — event highlights, workshop snapshots, contest moments, and community memories.',
  pathname: '/gallery',
  keywords: [
    'photo gallery',
    'event photos',
    'workshop images',
    'contest photos',
    'club activities',
  ],
});

export default async function Page() {
  const [
    galleryItems,
    settings,
    achievements,
    participations,
    events,
    committee,
  ] = await Promise.all([
    getPublicGallery(),
    getAllPublicSettings(),
    getPublicAchievements(),
    getPublicParticipations(),
    getPublicEvents(),
    getPublicCommittee(),
  ]);

  const isCompetitiveProgramming = (category) =>
    category?.toLowerCase().includes('competitive');

  // Convert achievement images (gallery_images + featured_photo) into gallery items
  const achievementImages = achievements
    .filter((ach) => !isCompetitiveProgramming(ach.category))
    .flatMap((ach) => {
      const seenIds = new Set();
      const images = [];
      const base = {
        title: ach.title,
        category: ach.category || 'Achievement',
        date: ach.achievement_date || ach.created_at || '',
        description: ach.description || ach.result || ach.contest_name || '',
        _source: 'achievement',
      };

      // Add all gallery images
      (ach.gallery_images ?? []).forEach((img, idx) => {
        if (img?.url) {
          seenIds.add(img.id);
          images.push({
            ...base,
            id: `ach-${ach.id}-${img.id || idx}`,
            image: img.url,
          });
        }
      });

      // Always include featured_photo if it's not already represented
      if (ach.featured_photo?.url && !seenIds.has(ach.featured_photo.id)) {
        images.push({
          ...base,
          id: `ach-${ach.id}-featured`,
          image: ach.featured_photo.url,
        });
      }

      return images;
    });

  // Convert participation images (photos + featured_photo) into gallery items
  const participationImages = participations
    .filter((par) => !isCompetitiveProgramming(par.category))
    .flatMap((par) => {
      const seenIds = new Set();
      const images = [];
      const base = {
        title: par.contest_name,
        category: par.category || 'Achievement',
        date: par.participation_date || par.created_at || '',
        description: par.result || par.notes || par.team_name || '',
        _source: 'participation',
      };

      // Add all photos
      (par.photos ?? []).forEach((img, idx) => {
        if (img?.url) {
          seenIds.add(img.id);
          images.push({
            ...base,
            id: `par-${par.id}-${img.id || idx}`,
            image: img.url,
          });
        }
      });

      // Always include featured_photo if not already represented
      if (par.featured_photo?.url && !seenIds.has(par.featured_photo.id)) {
        images.push({
          ...base,
          id: `par-${par.id}-featured`,
          image: par.featured_photo.url,
        });
      }

      return images;
    });

  const allGalleryItems = [
    ...galleryItems,
    ...achievementImages,
    ...participationImages,
  ];

  // Dynamically calculate stats based on actual DB records
  const stats = [
    { id: 1, value: `${events.length}+`, label: 'Events Hosted' },
    {
      id: 2,
      value: `${committee?.members?.length || 20}+`,
      label: 'Active Members',
    },
    { id: 3, value: `${participations.length}+`, label: 'Competitions' },
    { id: 4, value: `${allGalleryItems.length}+`, label: 'Photos Captured' },
  ];

  return (
    <>
      <ImageGalleryJsonLd images={allGalleryItems} />
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Gallery' }]}
      />
      <GalleryClient
        galleryItems={allGalleryItems}
        settings={settings}
        stats={stats}
      />
    </>
  );
}
