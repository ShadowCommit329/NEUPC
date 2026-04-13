/**
 * @file Member stats grid — responsive card grid showing personal
 *   metrics (contests, events attended, achievements earned, etc.).
 * @module MemberStatsGrid
 */

'use client';

import Link from 'next/link';
import { Calendar, Trophy, MessageSquare, Clock } from 'lucide-react';

export default function MemberStatsGrid({ stats }) {
  const statConfigs = [
    {
      label: 'Upcoming Events',
      value: stats.upcomingEvents,
      subtext: 'View calendar',
      href: '/account/member/events',
      icon: Calendar,
      color: 'blue',
      shadowColor: 'blue',
    },
    {
      label: 'Achievements',
      value: stats.achievements,
      subtext: 'Badges earned',
      href: '/account/member/achievements',
      icon: Trophy,
      color: 'amber',
      shadowColor: 'amber',
    },
    {
      label: 'Messages',
      value: stats.unreadMessages,
      subtext: 'Unread',
      href: null,
      icon: MessageSquare,
      color: 'green',
      shadowColor: 'green',
      isAlert: true,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {statConfigs.map((config, idx) => {
        const Icon = config.icon;
        const content = (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">
                {config.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {config.value}
              </p>
              <p
                className={`mt-1 text-xs ${config.isAlert ? 'flex items-center text-green-400' : `text-${config.color}-400`}`}
              >
                {config.isAlert && <Clock className="mr-1 h-3 w-3" />}
                {config.subtext}
              </p>
            </div>
            <Icon
              className={`h-8 w-8 text-${config.color}-400 opacity-70 transition-transform duration-300 group-hover:scale-110`}
            />
          </div>
        );

        const baseClasses = `group rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-${config.shadowColor}-500/20 sm:p-6`;

        if (config.href) {
          return (
            <Link key={idx} href={config.href} className={baseClasses}>
              {content}
            </Link>
          );
        }

        return (
          <div key={idx} className={baseClasses}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
