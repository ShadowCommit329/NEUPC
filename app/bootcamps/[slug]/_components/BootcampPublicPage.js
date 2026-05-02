'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Star,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatPrice(price) {
  if (!price || price <= 0) return 'Free';
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(price);
}

export default function BootcampPublicPage({ bootcamp }) {
  const courseCount = bootcamp.courses?.[0]?.count || 0;

  return (
    <div className="min-h-screen bg-[#0a0d13] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/6">
        {bootcamp.thumbnail && (
          <div className="absolute inset-0">
            <Image
              src={bootcamp.thumbnail}
              alt={bootcamp.title}
              fill
              className="object-cover opacity-10"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d13]/60 via-[#0a0d13]/80 to-[#0a0d13]" />
          </div>
        )}

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            {bootcamp.is_featured && (
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                <Star className="h-3 w-3 fill-current" />
                Featured Program
              </div>
            )}

            {bootcamp.batch_info && (
              <p className="mb-2 text-sm font-medium text-violet-400">
                {bootcamp.batch_info}
              </p>
            )}

            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {bootcamp.title}
            </h1>

            {bootcamp.description && (
              <p className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg">
                {bootcamp.description}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-8 flex flex-wrap gap-6">
              {bootcamp.total_lessons > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <BookOpen className="h-4 w-4 text-violet-400" />
                  <span>{bootcamp.total_lessons} lessons</span>
                </div>
              )}
              {courseCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>{courseCount} courses</span>
                </div>
              )}
              {bootcamp.total_duration > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>{formatDuration(bootcamp.total_duration)}</span>
                </div>
              )}
              {bootcamp.start_date && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <span>Starts {formatDate(bootcamp.start_date)}</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={`/account/member/bootcamps`}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:bg-violet-500 hover:shadow-violet-800/40"
              >
                Enroll Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="text-lg font-bold text-white">
                {formatPrice(bootcamp.price)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you'll learn / enroll CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/6 bg-white/3 p-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-10 w-10 text-violet-400" />
          <p className="text-base text-gray-400">
            Enroll to access the full curriculum and start learning.
          </p>
        </div>
      </section>
    </div>
  );
}
