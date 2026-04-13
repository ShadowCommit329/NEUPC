import ResourceCard from '@/app/_components/resources/ResourceCard';
import { Search, BookOpen } from 'lucide-react';

export default function ResourceGrid({
  resources,
  showAdminActions = false,
  onEdit,
  onDelete,
  bookmarkedIds = [],
  onToggleBookmark,
  detailBasePath = '',
  onOpenResource,
}) {
  if (!resources?.length) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-6 py-16 text-center sm:py-20"
        role="status"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
          <Search className="h-6 w-6 text-gray-600" />
        </div>
        <p className="text-sm font-semibold text-gray-300">
          No resources found
        </p>
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-gray-600">
          Try adjusting your search or filters to find what you&apos;re looking
          for.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label={`${resources.length} resource${resources.length !== 1 ? 's' : ''}`}
    >
      {resources.map((resource) => (
        <div key={resource.id} role="listitem">
          <ResourceCard
            resource={resource}
            showAdminActions={showAdminActions}
            onEdit={onEdit}
            onDelete={onDelete}
            bookmarked={bookmarkedIds.includes(resource.id)}
            onToggleBookmark={onToggleBookmark}
            detailBasePath={detailBasePath}
            onOpen={onOpenResource}
          />
        </div>
      ))}
    </div>
  );
}
