/**
 * Loading state for bootcamp learning page.
 * Tokens match member panel design system (surface #121317, hairline
 * border, shimmer white/[0.05]).
 */

const SHIMMER = 'animate-pulse rounded-md bg-white/[0.05]';

export default function BootcampLearningLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0d0e11]" role="status" aria-label="Loading">
      {/* Sidebar skeleton */}
      <aside className="hidden w-80 shrink-0 border-r border-white/[0.06] bg-[#121317] p-4 lg:block">
        <div className="space-y-4">
          <div className={`${SHIMMER} h-[11px] w-20`} />
          <div className={`${SHIMMER} h-5 w-3/4`} />
          <div className={`${SHIMMER} h-1.5 w-full rounded-full`} />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className={`${SHIMMER} mb-2 h-[12px] w-2/3`} />
                <div className={`${SHIMMER} h-[10px] w-1/3`} />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 space-y-5 p-6">
        <div className={`${SHIMMER} h-7 w-64`} />
        <div className={`${SHIMMER} aspect-video w-full rounded-[12px]`} />
        <div className="space-y-2">
          <div className={`${SHIMMER} h-3 w-full`} />
          <div className={`${SHIMMER} h-3 w-3/4`} />
          <div className={`${SHIMMER} h-3 w-2/3`} />
        </div>
      </div>
      <span className="sr-only">Loading content, please wait…</span>
    </div>
  );
}
