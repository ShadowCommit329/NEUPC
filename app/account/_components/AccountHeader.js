/**
 * @file Account welcome header with user greeting.
 * @module AccountHeader
 */

'use client';

/** @param {{ session: Object, accountStatus: string }} props */
export default function AccountHeader({ session, accountStatus }) {
  const name = session?.name || 'Guest User';
  const email = session?.email || 'guest@example.com';
  const isNew = accountStatus === 'pending';
  const isActive = accountStatus === 'active';

  const statusLabel =
    {
      active: 'Account Active',
      pending: 'Awaiting Approval',
      rejected: 'Access Denied',
      suspended: 'Suspended',
      banned: 'Restricted',
      locked: 'Locked',
      inactive: 'Inactive',
    }[accountStatus] ?? 'Unknown';

  const statusColor = isActive
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-amber-500/25 bg-amber-500/10 text-amber-300';

  const dotColor = isActive ? 'bg-emerald-400' : 'bg-amber-400';

  return (
    <div className="text-center">
      {/* Eyebrow badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2 text-sm font-medium backdrop-blur-sm">
        <span className="text-2xl">{isNew ? '🎉' : '👋'}</span>
        <span className="text-primary-300">
          {isNew ? 'Welcome to NEUPC' : 'Welcome Back'}
        </span>
      </div>

      {/* Gradient title */}
      <h1 className="from-primary-300 to-secondary-300 mb-4 bg-linear-to-r via-white bg-clip-text text-4xl leading-tight font-bold text-transparent md:text-5xl lg:text-6xl">
        {name}
      </h1>

      {/* Email */}
      <p className="mx-auto mb-6 max-w-2xl text-base text-gray-400 md:text-lg">
        {email}
      </p>

      {/* Status pill */}
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 ${statusColor}`}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotColor}`}
          />
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor}`}
          />
        </span>
        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
