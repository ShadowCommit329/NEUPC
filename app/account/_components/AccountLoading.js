/**
 * @file Account loading skeleton — reusable shimmer UI shown during
 *   route transitions within the /account/* segment. Matches the
 *   member panel design system: surface #121317, hairline border
 *   rgba(255,255,255,0.06), 12px radius, 24px page title.
 * @module AccountLoading
 */

'use client';

const SURFACE = 'border border-white/[0.06] bg-[#121317]';
const SHIMMER = 'animate-pulse rounded-md bg-white/[0.05]';

function Skeleton({ className = '' }) {
  return <div className={`${SHIMMER} ${className}`} aria-hidden="true" />;
}

function StatsRow({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-4 2xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`rounded-[12px] ${SURFACE} px-4 py-[14px]`}>
          <Skeleton className="mb-2 h-[11px] w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

function TableRows({ rows = 6 }) {
  return (
    <div className={`overflow-hidden rounded-[12px] ${SURFACE}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-[14px] px-[18px] py-3 ${i < rows - 1 ? 'border-b border-white/[0.06]' : ''}`}
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-[13px] w-2/5" />
            <Skeleton className="h-[11px] w-3/5" />
          </div>
          <Skeleton className="h-[11px] w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function CardGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`rounded-[12px] ${SURFACE} overflow-hidden`}>
          <Skeleton className="h-28 w-full rounded-none" />
          <div className="space-y-2 px-[18px] py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-1.5 pt-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FormSkeleton({ fields = 6 }) {
  return (
    <div className={`space-y-5 rounded-[12px] ${SURFACE} p-5 sm:p-6 max-w-4xl`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-[11px] w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <div className={`flex items-center gap-4 rounded-[12px] ${SURFACE} p-5 sm:p-6`}>
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <FormSkeleton fields={4} />
    </div>
  );
}

function TabsBar() {
  const widths = ['w-14', 'w-16', 'w-20', 'w-16'];
  return (
    <div className="flex gap-3 border-b border-white/[0.06] pb-2">
      {widths.map((w, i) => (
        <Skeleton key={i} className={`h-5 rounded-md ${w}`} />
      ))}
    </div>
  );
}

const VARIANTS = {
  dashboard: 'dashboard',
  table: 'table',
  cards: 'cards',
  form: 'form',
  profile: 'profile',
};

/**
 * Reusable account loading skeleton.
 *
 * @param {{ variant?: 'dashboard'|'table'|'cards'|'form'|'profile', title?: string }} props
 */
export default function AccountLoading({
  variant = VARIANTS.dashboard,
  title,
}) {
  return (
    <div
      className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8 xl:px-10 2xl:px-12"
      role="status"
      aria-label="Loading"
    >
      <div className="space-y-6">
        {/* Page head */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            {title ? (
              <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">
                {title}
              </h1>
            ) : (
              <Skeleton className="h-7 w-48" />
            )}
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>

        {variant === VARIANTS.dashboard && (
          <>
            <StatsRow count={4} />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
                <TableRows rows={4} />
              </div>
              <CardGrid count={2} />
            </div>
          </>
        )}

        {variant === VARIANTS.table && (
          <>
            <StatsRow count={4} />
            <TabsBar />
            <TableRows rows={7} />
          </>
        )}

        {variant === VARIANTS.cards && (
          <>
            <StatsRow count={4} />
            <TabsBar />
            <CardGrid count={10} />
          </>
        )}

        {variant === VARIANTS.form && <FormSkeleton fields={6} />}

        {variant === VARIANTS.profile && <ProfileSkeleton />}
      </div>

      <span className="sr-only">Loading content, please wait…</span>
    </div>
  );
}
