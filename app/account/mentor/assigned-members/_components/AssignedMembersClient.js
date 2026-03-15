/**
 * @file Assigned members client — full-page view of the mentor’s
 *   assigned mentees with progress tracking, contact info, and
 *   individual performance summaries.
 * @module MentorAssignedMembersClient
 */

'use client';

import { useState } from 'react';
import {
  Users,
  Search,
  BookOpen,
  Calendar,
  ChevronRight,
  X,
} from 'lucide-react';
import { updateMentorshipStatusAction } from '@/app/_lib/mentor-actions';
import { useScrollLock } from '@/app/_lib/hooks';

const STATUS_COLORS = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function AssignedMembersClient({ mentorships = [], mentorId }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMentorship, setSelectedMentorship] = useState(null);
  useScrollLock(!!selectedMentorship);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  const filtered = mentorships.filter((m) => {
    const mentee = m['users!mentorships_mentee_id_fkey'] || m.users;
    const name = mentee?.full_name?.toLowerCase() || '';
    const sessionValue =
      mentee?.member_profiles?.academic_session?.toLowerCase() || '';
    const matchSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      sessionValue.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: mentorships.length,
    active: mentorships.filter((m) => m.status === 'active').length,
    completed: mentorships.filter((m) => m.status === 'completed').length,
    paused: mentorships.filter((m) => m.status === 'paused').length,
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);
    const formData = new FormData(e.target);
    formData.set('mentorshipId', selectedMentorship.id);
    const result = await updateMentorshipStatusAction(formData);
    if (result.error) setMessage({ type: 'error', text: result.error });
    else {
      setMessage({ type: 'success', text: result.success });
      setSelectedMentorship(null);
    }
    setIsUpdating(false);
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Assigned Members</h1>
        <p className="mt-1 text-gray-400">Manage and track your mentees</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-400' },
          { label: 'Active', value: stats.active, color: 'text-green-400' },
          {
            label: 'Completed',
            value: stats.completed,
            color: 'text-purple-400',
          },
          { label: 'Paused', value: stats.paused, color: 'text-amber-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
          >
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or session…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
          <Users className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">No mentees found</p>
          <p className="mt-1 text-sm text-gray-500">
            {mentorships.length === 0
              ? 'No members have been assigned to you yet.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const mentee = m['users!mentorships_mentee_id_fkey'] || m.users;
            const profile = mentee?.member_profiles;
            return (
              <div
                key={m.id}
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-colors hover:bg-white/10"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">
                      {mentee?.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {mentee?.full_name || 'Unknown'}
                      </h3>
                      {profile?.academic_session && (
                        <p className="text-xs text-gray-400">
                          Session {profile.academic_session}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status] || 'bg-gray-500/20 text-gray-400'}`}
                  >
                    {m.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  {m.focus_area && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{m.focus_area}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Since{' '}
                      {new Date(m.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMentorship(m)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                >
                  Manage
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Update Modal */}
      {selectedMentorship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Update Mentorship
              </h2>
              <button
                onClick={() => {
                  setSelectedMentorship(null);
                  setMessage(null);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {message && (
              <div
                className={`mb-4 rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
              >
                {message.text}
              </div>
            )}

            {/* Mentee Info */}
            {(() => {
              const mentee =
                selectedMentorship['users!mentorships_mentee_id_fkey'] ||
                selectedMentorship.users;
              const profile = mentee?.member_profiles;
              return (
                <div className="mb-5 rounded-xl bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 font-bold text-white">
                      {mentee?.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {mentee?.full_name}
                      </p>
                      {profile?.student_id && (
                        <p className="text-xs text-gray-400">
                          ID: {profile.student_id} | Session{' '}
                          {profile.academic_session}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedMentorship.focus_area && (
                    <p className="mt-3 text-sm text-gray-400">
                      <span className="text-gray-500">Focus: </span>
                      {selectedMentorship.focus_area}
                    </p>
                  )}
                </div>
              );
            })()}

            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={selectedMentorship.status}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Notes
                </label>
                <textarea
                  name="notes"
                  defaultValue={selectedMentorship.notes || ''}
                  rows={3}
                  placeholder="Internal notes about this mentorship…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMentorship(null);
                    setMessage(null);
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
