/**
 * @file Member events browser — lists published events alongside the
 *   member’s own registration records so they can discover, register for,
 *   and track upcoming club activities.
 * @module MemberEventsPage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getPublishedEvents,
  getUserEventRegistrations,
} from '@/app/_lib/data-service';
import MemberEventsClient from './_components/MemberEventsClient';

export const metadata = { title: 'Events | Member | NEUPC' };

export default async function MemberEventsPage() {
  const { user } = await requireRole('member');

  const [events, myRegistrations] = await Promise.all([
    getPublishedEvents().catch(() => []),
    getUserEventRegistrations(user.id).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8">
      <MemberEventsClient
        events={events}
        myRegistrations={myRegistrations}
        userId={user.id}
      />
    </div>
  );
}
