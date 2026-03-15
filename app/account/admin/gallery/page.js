/**
 * @file Admin gallery management page (server component).
 * Fetches gallery items with stats and event list for the management UI.
 *
 * @module AdminGalleryPage
 * @access admin
 */

import {
  getGalleryAdmin,
  getAllEvents,
  getAllEventGalleryAdmin,
} from '@/app/_lib/data-service';
import GalleryManagementClient from './_components/GalleryManagementClient';

export const metadata = { title: 'Gallery | Admin | NEUPC' };

export default async function AdminGalleryPage() {
  const [{ items, stats }, allEvents, eventGalleryItems] = await Promise.all([
    getGalleryAdmin().catch(() => ({ items: [], stats: {} })),
    getAllEvents().catch(() => []),
    getAllEventGalleryAdmin().catch(() => []),
  ]);

  const events = (allEvents ?? []).map((e) => ({ id: e.id, title: e.title }));

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <GalleryManagementClient
        initialItems={items}
        stats={stats}
        events={events}
        eventGalleryItems={eventGalleryItems}
      />
    </div>
  );
}
