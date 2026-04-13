/**
 * Error state for lesson page.
 */

'use client';

import { Play, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function LessonError({ error, reset }) {
  const params = useParams();
  const bootcampId = params?.bootcampId;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
        <Play className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-white">
        Failed to Load Lesson
      </h2>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        {error?.message || 'Something went wrong while loading the lesson.'}
      </p>
      <div className="flex gap-3">
        {bootcampId && (
          <Link
            href={`/account/member/bootcamps/${bootcampId}`}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
