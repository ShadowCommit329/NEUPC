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
        className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-white/[0.06] bg-[#121317] px-6 py-16 text-center"
        role="status"
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[10px] border border-white/[0.06] bg-[#181a1f]">
          <Search className="h-5 w-5 text-white/20" />
        </div>
        <p className="text-[13px] font-medium text-white/60">No resources found</p>
        <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-white/25">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
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
