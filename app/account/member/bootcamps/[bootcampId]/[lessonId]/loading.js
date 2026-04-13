/**
 * Loading state for lesson page.
 */

export default function LessonLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar skeleton */}
      <div className="hidden w-72 shrink-0 border-r border-white/8 bg-[#0d1117] p-4 lg:block">
        <div className="space-y-4">
          <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
          <div className="h-5 w-full animate-pulse rounded bg-white/10" />
          <div className="h-1.5 w-full animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-72 animate-pulse rounded bg-white/10" />
        <div className="aspect-video w-full animate-pulse rounded-xl bg-white/5" />
        <div className="h-14 animate-pulse rounded-xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-white/8" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/8" />
        </div>
      </div>
    </div>
  );
}
