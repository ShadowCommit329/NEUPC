'use client';

export default function AdminNotificationsError({ error }) {
  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">Error loading notifications</h2>
        <p className="text-gray-400 mb-4">{error?.message || 'Something went wrong'}</p>
        <a
          href="/account/admin"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
