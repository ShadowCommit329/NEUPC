'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  BookOpen,
  Bell,
  User,
  Settings,
  Sparkles,
  Home,
} from 'lucide-react';

const NAV = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', href: '/account/guest', icon: LayoutDashboard, exact: true },
      { label: 'Events', href: '/account/guest/events', icon: Calendar },
      { label: 'Participation', href: '/account/guest/participation', icon: Trophy },
      { label: 'Resources', href: '/account/guest/resources', icon: BookOpen },
      { label: 'Notifications', href: '/account/guest/notifications', icon: Bell },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Profile', href: '/account/guest/profile', icon: User },
      { label: 'Settings', href: '/account/guest/settings', icon: Settings },
      { label: 'Apply for Membership', href: '/account/guest/membership-application', icon: Sparkles, accent: true },
    ],
  },
];

export default function GuestSidebar() {
  const pathname = usePathname();

  function isActive(href, exact) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className="gp-sidebar">
      <div className="gp-sidebar-logo">
        <span className="gp-sidebar-logo-mark">NEU<b>PC</b></span>
        <span className="gp-sidebar-role">Guest</span>
      </div>

      <nav className="gp-sidebar-nav">
        {NAV.map((section) => (
          <div key={section.group} className="gp-sidebar-section">
            <div className="gp-sidebar-group-label">{section.group}</div>
            {section.items.map((item) => {
              const Ico = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'gp-sidebar-link',
                    active ? 'gp-sidebar-link-active' : '',
                    item.accent ? 'gp-sidebar-link-accent' : '',
                  ].join(' ')}
                >
                  <Ico size={15} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="gp-sidebar-footer">
        <Link href="/" className="gp-sidebar-home-link">
          <Home size={13} />
          <span>Back to homepage</span>
        </Link>
      </div>
    </aside>
  );
}
