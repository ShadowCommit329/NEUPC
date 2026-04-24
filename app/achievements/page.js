/**
 * @file Achievements page
 * @module AchievementsPage
 */

import {
  getPublicAchievements,
  getPublicParticipations,
  getAboutData,
  getAllPublicSettings,
  getPublicJourney,
} from '@/app/_lib/public-actions';
import AchievementsClient from './AchievementsClient';
import { buildMetadata } from '@/app/_lib/seo';
import {
  CollectionPageJsonLd,
  BreadcrumbJsonLd,
} from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'Achievements',
  description:
    'Explore the achievements, awards, and milestones of NEUPC — ICPC regionals, national championship results, and more.',
  pathname: '/achievements',
  keywords: [
    'achievements',
    'awards',
    'ICPC results',
    'programming contest winners',
    'milestones',
  ],
});

export default async function Page() {
  const [achievements, participations, aboutData, settings, journey] =
    await Promise.all([
      getPublicAchievements(),
      getPublicParticipations(),
      getAboutData(),
      getAllPublicSettings(),
      getPublicJourney(),
    ]);

  const stats = aboutData.stats || [];

  return (
    <>
      <CollectionPageJsonLd
        name="Achievements - NEUPC"
        description="Awards, milestones, and competition results of NEUPC members."
        url="/achievements"
      />
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Achievements' }]}
      />
      <AchievementsClient
        achievements={achievements}
        participations={participations}
        timeline={journey}
        stats={stats}
        settings={settings}
      />
    </>
  );
}
