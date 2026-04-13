/**
 * @file Admin resource management page (server component).
 * Fetches learning resources with stats for the management UI.
 *
 * @module AdminResourcesPage
 * @access admin
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getAdminResources,
  getResourceCategories,
} from '@/app/_lib/resources/queries';
import AdminResourcesClient from './_components/AdminResourcesClient';

export const metadata = { title: 'Resources | Admin | NEUPC' };

export default async function AdminResourcesPage() {
  await requireRole('admin');

  const [{ resources }, categories] = await Promise.all([
    getAdminResources().catch(() => ({ resources: [] })),
    getResourceCategories().catch(() => []),
  ]);

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <AdminResourcesClient
        initialResources={resources}
        categories={categories}
      />
    </div>
  );
}
