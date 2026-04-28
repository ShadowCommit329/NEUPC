/**
 * @file Join page
 * @module JoinPage
 */

import {
  getJoinPageData,
  getAllPublicSettings,
} from '@/app/_lib/public-actions';
import JoinClient from './JoinClient';
import { buildMetadata } from '@/app/_lib/seo';
import { BreadcrumbJsonLd } from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'Join NEUPC',
  description:
    'Join the Netrokona University Programming Club — become a member, learn competitive programming, and start your journey with ICPC preparation.',
  pathname: '/join',
  keywords: [
    'join',
    'membership',
    'register',
    'sign up',
    'become a member',
    'programming club membership',
  ],
});

export default async function Page() {
  const [joinData, settings] = await Promise.all([
    getJoinPageData(),
    getAllPublicSettings(),
  ]);

  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Join' }]}
      />
      <JoinClient features={joinData.features || []} settings={settings} />
    </>
  );
}
