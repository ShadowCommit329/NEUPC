/**
 * Not found state for lesson.
 */

import Link from 'next/link';
import { Play, ArrowLeft } from 'lucide-react';

export default function LessonNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
        <Play className="h-8 w-8 text-violet-400" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-white">
        Lesson Not Found
      </h2>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        The lesson you're looking for doesn't exist or has been removed.
      </p>
      <Link
        href="/account/member/bootcamps"
        className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bootcamps
      </Link>
    </div>
  );
}
