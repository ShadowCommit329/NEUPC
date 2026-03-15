/**
 * @file Membership benefits banner — promotional card highlighting
 *   advantages of club membership with a call-to-action for guests
 *   to apply.
 * @module GuestMembershipBenefitsBanner
 */

'use client';

import Link from 'next/link';
import {
  Gift,
  ChevronRight,
  Trophy,
  BookOpen,
  Users,
  Award,
  Target,
  Rocket,
} from 'lucide-react';

const benefitIcons = {
  trophy: Trophy,
  bookOpen: BookOpen,
  users: Users,
  award: Award,
  target: Target,
  rocket: Rocket,
};

export default function MembershipBenefitsBanner({ benefits }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-linear-to-br from-purple-500/20 via-pink-500/15 to-purple-600/20 p-6 backdrop-blur-xl sm:p-8">
      <div className="absolute top-0 right-0 h-32 w-32 bg-purple-500/30 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-32 w-32 bg-pink-500/30 blur-3xl" />
      <div className="relative">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-purple-500/30 p-3">
            <Gift className="h-6 w-6 text-purple-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Unlock Full Access
            </h2>
            <p className="text-sm text-gray-300">
              Join as a member and get exclusive benefits
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, idx) => {
            const Icon = benefitIcons[benefit.iconKey];
            return (
              <div key={idx} className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 shrink-0 text-${benefit.color}-400`}
                />
                <span className="text-sm text-white">{benefit.text}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link

            href="/about"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition-all hover:bg-white/10"
          >
            Learn More
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
