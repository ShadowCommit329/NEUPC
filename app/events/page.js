/**
 * @file Events page
 * @module EventsPage
 */

import {
  getPublicEvents,
  getAllPublicSettings,
} from '@/app/_lib/public-actions';
import EventsClient from './EventsClient';
import { buildMetadata } from '@/app/_lib/seo';
import {
  CollectionPageJsonLd,
  BreadcrumbJsonLd,
} from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'Events',
  description:
    'Explore upcoming and past events organized by NEUPC — workshops, hackathons, programming contests, seminars, and more.',
  pathname: '/events',
  keywords: [
    'events',
    'workshops',
    'hackathon',
    'programming contest',
    'seminar',
    'tech events',
  ],
});

export default async function EventsPage() {
  const [events, settings] = await Promise.all([
    getPublicEvents(),
    getAllPublicSettings(),
  ]);

  return (
    <>
      <CollectionPageJsonLd
        name="Events - NEUPC"
        description="Upcoming and past events organized by Netrokona University Programming Club."
        url="/events"
      />
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Events' }]}
      />
      <EventsClient events={events} settings={settings} />
    </>
  );
}
