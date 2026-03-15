/**
 * @file Admin roadmap management page (server component).
 * Fetches all roadmaps for the management UI.
 *
 * @module AdminRoadmapsPage
 * @access admin
 */

import { getAllRoadmaps } from '@/app/_lib/data-service';
import RoadmapManagementClient from './_components/RoadmapManagementClient';

export const metadata = { title: 'Roadmaps | Admin | NEUPC' };

async function loadRoadmapsSafely(timeoutMs = 10_000) {
  let timeoutId;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Timed out while loading roadmaps'));
      }, timeoutMs);
    });

    const roadmaps = await Promise.race([getAllRoadmaps(), timeoutPromise]);
    return Array.isArray(roadmaps) ? roadmaps : [];
  } catch {
    return [];
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default async function AdminRoadmapsPage() {
  const roadmaps = await loadRoadmapsSafely();

  const stats = {
    total: roadmaps.length,
    draft: roadmaps.filter((r) => r.status === 'draft').length,
    published: roadmaps.filter((r) => r.status === 'published').length,
    archived: roadmaps.filter((r) => r.status === 'archived').length,
    featured: roadmaps.filter((r) => r.is_featured).length,
    totalViews: roadmaps.reduce((s, r) => s + (r.views ?? 0), 0),
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <RoadmapManagementClient initialRoadmaps={roadmaps} stats={stats} />
    </div>
  );
}
