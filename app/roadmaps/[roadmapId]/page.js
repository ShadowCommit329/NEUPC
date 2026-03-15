/**
 * @file [roadmapId] page
 * @module [roadmapId]Page
 */

import { notFound } from 'next/navigation';
import {
  getPublicRoadmapBySlug,
  getPublicRoadmapsByCategory,
} from '@/app/_lib/public-actions';
import {
  BreadcrumbJsonLd,
  CollectionPageJsonLd,
} from '@/app/_components/ui/JsonLd';
import RoadmapDetailClient from './RoadmapDetailClient';
import { buildRoadmapMetadata } from '@/app/_lib/seo';

export async function generateMetadata({ params }) {
  const { roadmapId } = await params;
  const roadmap = await getPublicRoadmapBySlug(roadmapId);

  if (!roadmap) {
    return { title: 'Roadmap Not Found | NEUPC' };
  }

  return buildRoadmapMetadata(roadmap, `/roadmaps/${roadmapId}`);
}

export default async function Page({ params }) {
  const { roadmapId } = await params;
  const roadmap = await getPublicRoadmapBySlug(roadmapId);

  if (!roadmap) {
    notFound();
  }

  const relatedRoadmaps = roadmap.category
    ? await getPublicRoadmapsByCategory(roadmap.category)
        .then((rows) => (rows || []).filter((r) => r.id !== roadmap.id).slice(0, 3))
        .catch(() => [])
    : [];

  return (
    <>
      <CollectionPageJsonLd
        name={roadmap.title || 'Roadmap'}
        description={roadmap.description || 'Learning roadmap'}
        url={`/roadmaps/${roadmapId}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Roadmaps', url: '/roadmaps' },
          { name: roadmap.title },
        ]}
      />
      <RoadmapDetailClient
        roadmap={roadmap}
        relatedRoadmaps={relatedRoadmaps}
      />
    </>
  );
}
