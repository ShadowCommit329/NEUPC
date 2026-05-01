/**
 * @file Member notifications centre — displays personal notifications
 *   with unread count and provides mark-as-read / dismiss actions.
 * @module MemberNotificationsPage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getUserNotifications,
  getUnreadNotificationsCount,
} from '@/app/_lib/data-service';
import MemberNotificationsClient from './_components/MemberNotificationsClient';

export const metadata = { title: 'Notifications | Member | NEUPC' };

export default async function MemberNotificationsPage() {
  const { user } = await requireRole('member');

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id, 50).catch(() => []),
    getUnreadNotificationsCount(user.id).catch(() => 0),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8">
      <MemberNotificationsClient
        notifications={notifications}
        unreadCount={unreadCount}
        userId={user.id}
      />
    </div>
  );
}
