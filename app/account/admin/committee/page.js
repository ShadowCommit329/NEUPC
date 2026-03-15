/**
 * @file Admin committee management page (server component)
 * Fetches committee data and renders the professional management interface
 * @module AdminCommitteePage
 */

import {
  getAllCommitteeMembers,
  getCommitteePositions,
  getUsersBasic,
} from '@/app/_lib/data-service';
import CommitteeManagementClient from './_components/CommitteeManagementClient';

export const metadata = { title: 'Committee | Admin | NEUPC' };

export default async function AdminCommitteePage() {
  const [members, positions, users] = await Promise.all([
    getAllCommitteeMembers().catch(() => []),
    getCommitteePositions().catch(() => []),
    getUsersBasic().catch(() => []),
  ]);

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <CommitteeManagementClient
        initialMembers={members}
        initialPositions={positions}
        initialUsers={users}
      />
    </div>
  );
}
