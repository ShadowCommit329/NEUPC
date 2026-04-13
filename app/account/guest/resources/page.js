/**
 * @file Guest resources library — public resources available to guest users.
 * @module GuestResourcesPage
 * @access guest
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getPublishedResources,
  getResourceCategories,
} from '@/app/_lib/resources/queries';
import ResourcesClient from '@/app/_components/resources/ResourcesClient';
import ResourcesPageHeader from '@/app/_components/resources/ResourcesPageHeader';

export const metadata = { title: 'Resources | Guest | NEUPC' };

export default async function GuestResourcesPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page || 1) || 1;
  const pageSize = 12;
  const q = params?.q || '';
  const type = params?.type || '';
  const categoryId = params?.categoryId || '';

  await requireRole('guest');

  const [{ resources, total }, categories] = await Promise.all([
    getPublishedResources({
      page,
      pageSize,
      q,
      type,
      categoryId,
      includeMembers: false,
      visibility: 'public',
    }),
    getResourceCategories(),
  ]);

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <ResourcesPageHeader
        role="guest"
        total={total}
        categoryCount={categories.length}
      />

      <ResourcesClient
        resources={resources}
        categories={categories}
        page={page}
        pageSize={pageSize}
        total={total}
        bookmarkedIds={[]}
        canBookmark={false}
        basePath="/account/guest/resources"
      />
    </div>
  );
}
