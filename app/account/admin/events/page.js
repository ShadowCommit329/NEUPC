/**
 * @file Admin event management page (server component).
 * Fetches events with stats for the event management UI.
 *
 * @module AdminEventsPage
 * @access admin
 */

import {
  getEventsWithStats,
  getEligibilityRoles,
} from '@/app/_lib/data-service';
import EventManagementClient from './_components/EventManagementClient';

export const metadata = { title: 'Events | Admin | NEUPC' };

export default async function AdminEventsPage() {
  const [{ events, stats }, roles] = await Promise.all([
    getEventsWithStats().catch(() => ({ events: [], stats: {} })),
    getEligibilityRoles().catch(() => []),
  ]);

  return (
    <div className="space-y-5 px-4 pt-6 pb-8 sm:space-y-6 sm:px-6 sm:pt-8 lg:px-8">
      <EventManagementClient
        initialEvents={events}
        stats={stats}
        roles={roles}
      />
    </div>
  );
}
