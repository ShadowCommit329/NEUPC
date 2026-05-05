/**
 * Loading state for lesson page.
 * Tokens match member panel design system (surface #121317, hairline
 * border, shimmer white/[0.05]).
 */

const SHIMMER = 'animate-pulse rounded-md bg-white/[0.05]';

export default function LessonLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0d0e11]" role="status" aria-label="Loading">
      {/* Sidebar skeleton */}
      <aside className="hidden w-72 shrink-0 border-r border-white/[0.06] bg-[#121317] p-4 lg:block">
        <div className="space-y-4">
          <div className={`${SHIMMER} h-[11px] w-16`} />
          <div className={`${SHIMMER} h-[14px] w-3/4`} />
          <div className={`${SHIMMER} h-1.5 w-full rounded-full`} />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className={`${SHIMMER} mb-2 h-[11px] w-2/3`} />
                <div className={`${SHIMMER} h-[9px] w-1/3`} />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 space-y-5 p-4 lg:p-6">
        <div className={`${SHIMMER} h-3 w-40`} />
        <div className={`${SHIMMER} h-7 w-72`} />
        <div className={`${SHIMMER} aspect-video w-full rounded-[12px]`} />
        <div className={`${SHIMMER} h-14 w-full rounded-[12px]`} />
        <div className="space-y-2">
          <div className={`${SHIMMER} h-3 w-full`} />
          <div className={`${SHIMMER} h-3 w-2/3`} />
        </div>
      </div>
      <span className="sr-only">Loading content, please wait…</span>
    </div>
  );
}
