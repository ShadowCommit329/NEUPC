/**
 * @file Pending role assignment banner.
 * Shown to active users who have not yet been assigned any roles.
 * Informs them to wait for admin assignment.
 *
 * @module PendingRoleAssignment
 */

'use client';

import { ShieldAlert, Mail, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function PendingRoleAssignment() {
  return (
    <div className="mt-6">
      <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-linear-to-b from-cyan-500/5 to-transparent shadow-lg shadow-cyan-500/5">
        <div className="h-0.5 w-full bg-linear-to-r from-cyan-500/60 via-blue-400/60 to-transparent" />

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/25">
              <ShieldAlert className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  Waiting for Role Assignment
                </h3>
                <span className="inline-flex items-center rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-400 ring-1 ring-cyan-500/25">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                  <span className="ml-1">Pending</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                Your account is active, but you haven&apos;t been assigned a
                role yet. An administrator needs to assign you a role to access
                the dashboards.
              </p>
            </div>
          </div>

          {/* Info box */}
          <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3.5">
            <p className="text-sm text-gray-300">
              <span className="font-medium text-cyan-300">
                What happens next?
              </span>
              <br />
              Once an admin assigns a role (Member, Advisor, Mentor, Executive,
              or Admin), you&apos;ll be able to access the corresponding
              dashboard.
            </p>
          </div>

          {/* Contact */}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3.5">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-400">
              Need assistance?{' '}
              <Link
                href="/contact"
                className="inline-flex items-center gap-0.5 font-medium text-white underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
              >
                Contact us
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
