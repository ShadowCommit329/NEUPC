'use client';

export default function AdminNotificationsLoading() {
  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-10 bg-gray-700 rounded-lg animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
