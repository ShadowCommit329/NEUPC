/**
 * @file Member dashboard shell — composes the header, stats grid,
 *   upcoming events, achievements, recent activity, learning progress,
 *   and quick-access sections into the main member view.
 * @module MemberDashboardClient
 */

'use client';

import MemberHeader from './MemberHeader';
import MemberStatsGrid from './MemberStatsGrid';
import UpcomingEventsSection from './UpcomingEventsSection';
import RecentActivity from './RecentActivity';
import LearningProgress from './LearningProgress';
import AchievementsSection from './AchievementsSection';
import QuickAccessSection from './QuickAccessSection';

export default function MemberDashboardClient({ session }) {
  const firstName = session.user.name?.split(' ')[0] || 'Member';

  // Mock stats - replace with real data
  const stats = {
    upcomingEvents: 2,
    achievements: 5,
    completedRoadmaps: 1,
    unreadMessages: 3,
  };

  // Mock user level data
  const userLevel = {
    level: 'Intermediate Developer',
    xp: 1250,
    nextLevelXp: 2000,
    membershipStatus: 'Active',
  };

  // Mock upcoming events
  const upcomingEvents = [
    {
      id: 1,
      title: 'Web3 Development Workshop',
      date: 'Mar 20, 2026',
      time: '2:00 PM',
      location: 'CSE Seminar Hall',
      status: 'Registered',
      image: '🌐',
    },
    {
      id: 2,
      title: 'Inter-University Hackathon',
      date: 'Apr 5, 2026',
      time: '9:00 AM',
      location: 'Main Campus',
      status: 'Not Registered',
      image: '💻',
    },
  ];

  // Mock roadmap progress
  const roadmaps = [
    { name: 'Frontend Development', progress: 65, color: 'blue' },
    { name: 'Backend Development', progress: 30, color: 'green' },
    { name: 'DSA Track', progress: 80, color: 'purple' },
  ];

  // Mock recent activities
  const recentActivities = [
    {
      action: 'Registered for Web3 Workshop',
      time: '2 hours ago',
      icon: 'Calendar',
      color: 'blue',
    },
    {
      action: 'Completed React Roadmap Module',
      time: '1 day ago',
      icon: 'CheckCircle',
      color: 'green',
    },
    {
      action: 'Earned "Open Source Contributor" badge',
      time: '3 days ago',
      icon: 'Award',
      color: 'amber',
    },
    {
      action: 'Posted in Community Forum',
      time: '5 days ago',
      icon: 'MessageSquare',
      color: 'purple',
    },
  ];

  // Mock achievements
  const achievements = [
    { title: 'Hackathon Winner', icon: '🏆', earned: true },
    { title: 'Top Contributor', icon: '⭐', earned: true },
    { title: '30 Days Streak', icon: '🔥', earned: true },
    { title: 'Roadmap Finisher', icon: '🎯', earned: true },
    { title: 'Workshop Organizer', icon: '🎓', earned: false },
    { title: 'Code Master', icon: '💻', earned: false },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8">
      <MemberHeader firstName={firstName} userLevel={userLevel} />
      <MemberStatsGrid stats={stats} />

      {/* Two Column Layout */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <UpcomingEventsSection upcomingEvents={upcomingEvents} />
        <RecentActivity recentActivities={recentActivities} />
      </div>

      {/* Learning Progress */}
      <LearningProgress roadmaps={roadmaps} />

      {/* Achievements & Quick Access */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <AchievementsSection achievements={achievements} />
        <QuickAccessSection />
      </div>
    </div>
  );
}
