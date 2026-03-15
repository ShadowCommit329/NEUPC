/**
 * @file Developers page
 * @module DevelopersPage
 */

import {
  getDevelopersData,
  getAllPublicSettings,
} from '@/app/_lib/public-actions';
import DevelopersClient from './DevelopersClient';
import { buildMetadata } from '@/app/_lib/seo';
import { BreadcrumbJsonLd } from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'Developers',
  description:
    'Meet the developers who built and maintain the NEUPC website — tech stack, contributors, and development timeline.',
  pathname: '/developers',
  keywords: [
    'developers',
    'web development',
    'contributors',
    'open source',
    'tech stack',
    'Next.js',
  ],
});

export default async function Page() {
  const [data, settings] = await Promise.all([
    getDevelopersData(),
    getAllPublicSettings(),
  ]);

  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Developers' }]}
      />
      <DevelopersClient
        coreDevelopers={data.coreDevelopers || []}
        contributors={data.contributors || []}
        techStack={data.techStack || {}}
        timeline={data.timeline || []}
        githubStats={data.githubStats || {}}
        settings={settings}
      />
    </>
  );
}
