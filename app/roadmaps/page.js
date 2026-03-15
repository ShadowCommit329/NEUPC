/**
 * @file Roadmaps page
 * @module RoadmapsPage
 */

import {
  getPublicRoadmaps,
  getAllPublicSettings,
} from '@/app/_lib/public-actions';
import RoadmapsClient from './RoadmapsClient';
import { buildMetadata } from '@/app/_lib/seo';
import {
  CollectionPageJsonLd,
  BreadcrumbJsonLd,
} from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'Roadmaps',
  description:
    'Explore curated learning roadmaps for competitive programming, web development, data structures, algorithms, and more.',
  pathname: '/roadmaps',
  keywords: [
    'learning roadmap',
    'study plan',
    'competitive programming guide',
    'web development path',
    'algorithm learning',
    'DSA roadmap',
  ],
});

export default async function Page() {
  const [roadmaps, settings] = await Promise.all([
    getPublicRoadmaps(),
    getAllPublicSettings(),
  ]);

  return (
    <>
      <CollectionPageJsonLd
        name="Roadmaps - NEUPC"
        description="Curated learning roadmaps for competitive programming, web development, and more."
        url="/roadmaps"
      />
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Roadmaps' }]}
      />
      <RoadmapsClient roadmaps={roadmaps} settings={settings} />
    </>
  );
}
