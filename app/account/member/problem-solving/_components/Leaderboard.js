/**
 * @file Leaderboard Component
 * @module Leaderboard
 *
 * Displays the problem solving leaderboard with global,
 * weekly, and monthly rankings.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  TrendingUp,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
} from 'lucide-react';
import { useLeaderboard } from '@/app/_hooks/useProblemSolving';

const TABS = [
  { id: 'global', label: 'All Time', icon: Trophy },
  { id: 'weekly', label: 'Weekly', icon: TrendingUp },
  { id: 'monthly', label: 'Monthly', icon: Calendar },
];

function getRankStyle(rank) {
  if (rank === 1) {
    return {
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      Icon: Crown,
    };
  }
  if (rank === 2) {
    return {
      bg: 'bg-slate-500/15',
      border: 'border-slate-400/30',
      text: 'text-slate-300',
      Icon: Medal,
    };
  }
  if (rank === 3) {
    return {
      bg: 'bg-orange-500/12',
      border: 'border-orange-500/25',
      text: 'text-orange-300',
      Icon: Award,
    };
  }
  return {
    bg: 'bg-white/5',
    border: 'border-white/8',
    text: 'text-gray-400',
    Icon: null,
  };
}

function LeaderboardRow({ entry, currentUserId }) {
  const isCurrentUser = entry.userId === currentUserId;
  const rankStyle = getRankStyle(entry.rank);
  const RankIcon = rankStyle.Icon;

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
        isCurrentUser
          ? 'border-blue-500/30 bg-blue-500/10 shadow-sm shadow-blue-500/10'
          : `${rankStyle.border} ${rankStyle.bg} hover:border-white/[0.12] hover:shadow-sm`
      }`}
    >
      {/* Rank */}
      <div className="flex w-10 shrink-0 items-center justify-center">
        {RankIcon ? (
          <RankIcon className={`h-5 w-5 ${rankStyle.text}`} />
        ) : (
          <span className="text-sm font-bold text-gray-500 tabular-nums">
            #{entry.rank}
          </span>
        )}
      </div>

      {/* Avatar & Name */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {entry.avatar ? (
          <img
            src={entry.avatar}
            alt={entry.name}
            className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover ring-1 ring-white/5"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <User className="h-4 w-4 text-gray-500" />
          </div>
        )}
        <div className="min-w-0">
          <Link
            href={`/account/member/problem-solving/${entry.userId}`}
            className={`block truncate text-sm font-medium transition-colors hover:text-blue-400 ${
              isCurrentUser ? 'text-blue-300' : 'text-white'
            }`}
          >
            {entry.name}
            {isCurrentUser && (
              <span className="ml-1.5 text-[10px] font-semibold text-blue-400">
                (You)
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="flex shrink-0 items-center gap-4 text-right">
        <div>
          <p className="text-sm font-bold text-white tabular-nums">
            {entry.totalSolved}
          </p>
          <p className="text-[9px] text-gray-600">solved</p>
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-bold text-green-400 tabular-nums">
            {entry.score}
          </p>
          <p className="text-[9px] text-gray-600">score</p>
        </div>
      </div>
    </div>
  );
}

function TopThree({ entries, currentUserId }) {
  if (!entries || entries.length === 0) return null;

  const top3 = entries.slice(0, 3);
  const [first, second, third] = top3;

  // Reorder for display: 2nd, 1st, 3rd
  const displayOrder = [second, first, third].filter(Boolean);

  return (
    <div className="mb-4 flex items-end justify-center gap-3">
      {displayOrder.map((entry, idx) => {
        if (!entry) return null;
        const isFirst = entry.rank === 1;
        const rankStyle = getRankStyle(entry.rank);
        const isCurrentUser = entry.userId === currentUserId;

        return (
          <Link
            key={entry.userId}
            href={`/account/member/problem-solving/${entry.userId}`}
            className={`flex flex-col items-center rounded-xl border p-3 transition-all hover:scale-105 ${
              isCurrentUser
                ? 'border-blue-500/30 bg-blue-500/10'
                : `${rankStyle.border} ${rankStyle.bg}`
            } ${isFirst ? 'scale-105 pb-4' : ''}`}
          >
            <div className="relative mb-2">
              {entry.avatar ? (
                <img
                  src={entry.avatar}
                  alt={entry.name}
                  className={`rounded-full border-2 object-cover ${
                    isFirst
                      ? 'h-14 w-14 border-yellow-500'
                      : 'h-10 w-10 border-white/20'
                  }`}
                />
              ) : (
                <div
                  className={`flex items-center justify-center rounded-full border-2 bg-white/5 ${
                    isFirst
                      ? 'h-14 w-14 border-yellow-500'
                      : 'h-10 w-10 border-white/20'
                  }`}
                >
                  <User className={isFirst ? 'h-7 w-7' : 'h-5 w-5'} />
                </div>
              )}
              {isFirst && (
                <Crown className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 text-yellow-400" />
              )}
            </div>
            <span
              className={`max-w-20 truncate text-center text-xs font-medium ${
                isCurrentUser ? 'text-blue-300' : 'text-white'
              }`}
            >
              {entry.name}
            </span>
            <span className={`mt-0.5 text-lg font-bold ${rankStyle.text}`}>
              #{entry.rank}
            </span>
            <span className="text-[10px] text-gray-500">
              {entry.totalSolved} solved
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function Leaderboard({ currentUserId, compact = false }) {
  const [activeTab, setActiveTab] = useState('global');
  const [page, setPage] = useState(0);
  const limit = compact ? 10 : 20;

  const { data, loading, error, refetch } = useLeaderboard(activeTab, limit);

  useEffect(() => {
    setPage(0);
  }, [activeTab]);

  const leaderboard = data?.leaderboard || [];
  const pagination = data?.pagination || { total: 0, hasMore: false };

  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-lg shadow-black/5 sm:p-5">
      {/* Top accent line */}
      <div className="absolute top-0 right-0 left-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-purple-500 to-violet-500" />

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg ring-2 shadow-purple-500/20 ring-purple-400/20">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Leaderboard</h3>
            {pagination.total > 0 && (
              <span className="text-[10px] text-gray-500">
                {pagination.total} members
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.04] p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            Try again
          </button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Trophy className="h-7 w-7 text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-400">No rankings yet</p>
          <p className="mt-1 text-[11px] text-gray-600">
            Be the first to climb the leaderboard!
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 podium (only on non-compact) */}
          {!compact && page === 0 && leaderboard.length >= 3 && (
            <TopThree entries={leaderboard} currentUserId={currentUserId} />
          )}

          {/* List */}
          <div className="space-y-1.5">
            {leaderboard.slice(compact || page > 0 ? 0 : 3).map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                currentUserId={currentUserId}
              />
            ))}
          </div>

          {/* Pagination */}
          {!compact && pagination.total > limit && (
            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-400 transition-all duration-200 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="text-[11px] text-gray-500">
                Page {page + 1} of {Math.ceil(pagination.total / limit)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasMore}
                className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-400 transition-all duration-200 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
