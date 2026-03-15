/**
 * @file Mentor recommendations client — interface for creating and
 *   managing learning resource recommendations for assigned mentees.
 * @module MentorRecommendationsClient
 */

'use client';

import { useState } from 'react';
import {
  Star,
  Search,
  X,
  TrendingUp,
  Award,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { saveMentorNotesAction } from '@/app/_lib/mentor-actions';

export default function MentorRecommendationsClient({
  mentorships = [],
  mentorId,
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [editNotes, setEditNotes] = useState(null); // { mentorshipId, notes }
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const activeMentorships = mentorships.filter((m) => m.status === 'active');
  const filtered = activeMentorships.filter((m) => {
    const mentee = m['users!mentorships_mentee_id_fkey'] || m.users;
    const name = mentee?.full_name?.toLowerCase() || '';
    return !search || name.includes(search.toLowerCase());
  });

  const handleSaveNotes = async (mentorshipId) => {
    setSaving(true);
    const fd = new FormData();
    fd.set('mentorshipId', mentorshipId);
    fd.set('notes', editNotes?.notes || '');
    const result = await saveMentorNotesAction(fd);
    if (result.error) setMessage({ type: 'error', text: result.error });
    else {
      setMessage({ type: 'success', text: 'Notes saved!' });
      setEditNotes(null);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Recommendations</h1>
        <p className="mt-1 text-gray-400">
          Track mentee progress and write recommendations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Active Mentees',
            value: activeMentorships.length,
            color: 'text-blue-400',
            icon: Star,
          },
          {
            label: 'With Notes',
            value: mentorships.filter((m) => m.notes).length,
            color: 'text-green-400',
            icon: MessageSquare,
          },
          {
            label: 'Completed',
            value: mentorships.filter((m) => m.status === 'completed').length,
            color: 'text-purple-400',
            icon: Award,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <p className="text-sm text-gray-400">{s.label}</p>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search mentees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
      </div>

      {message && (
        <div
          className={`rounded-xl p-3 text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
        >
          {message.text}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
          <Star className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">No active mentees</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const mentee = m['users!mentorships_mentee_id_fkey'] || m.users;
            const profile = mentee?.member_profiles;
            const progress = m.member_progress || [];
            const isExpanded = expanded === m.id;

            return (
              <div
                key={m.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
              >
                {/* Header Row */}
                <div
                  className="flex cursor-pointer items-center justify-between p-5"
                  onClick={() => setExpanded(isExpanded ? null : m.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 font-bold text-white">
                      {mentee?.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {mentee?.full_name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {profile?.session ? `Session ${profile.session}` : ''}
                        {profile?.department ? ` · ${profile.department}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.notes && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Has notes
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="space-y-5 border-t border-white/10 p-5 pt-4">
                    {/* Focus Area */}
                    {m.focus_area && (
                      <div>
                        <p className="mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                          Focus Area
                        </p>
                        <p className="text-sm text-gray-300">{m.focus_area}</p>
                      </div>
                    )}

                    {/* Skills */}
                    {profile?.skills?.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
                          Skills
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progress Records */}
                    {progress.length > 0 && (
                      <div>
                        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium tracking-wider text-gray-500 uppercase">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Progress History
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {progress.slice(0, 4).map((p) => (
                            <div
                              key={p.id}
                              className="rounded-xl bg-white/5 p-3"
                            >
                              <p className="mb-2 text-xs font-medium text-gray-300">
                                {p.period}
                              </p>
                              <div className="flex gap-4 text-sm">
                                <div className="text-center">
                                  <p className="font-semibold text-blue-400">
                                    {p.problems_solved ?? 0}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Problems
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="font-semibold text-green-400">
                                    {p.contests_participated ?? 0}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Contests
                                  </p>
                                </div>
                              </div>
                              {p.mentor_notes && (
                                <p className="mt-2 text-xs text-gray-500">
                                  {p.mentor_notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mentor Notes */}
                    <div>
                      <p className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Mentor Notes / Recommendation
                      </p>
                      {editNotes?.mentorshipId === m.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            value={editNotes.notes}
                            onChange={(e) =>
                              setEditNotes({
                                ...editNotes,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Write your recommendation or notes about this mentee…"
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditNotes(null)}
                              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNotes(m.id)}
                              disabled={saving}
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving ? 'Saving…' : 'Save Notes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {m.notes ? (
                            <p className="mb-3 rounded-xl bg-white/5 p-3 text-sm text-gray-300">
                              {m.notes}
                            </p>
                          ) : (
                            <p className="mb-3 text-sm text-gray-500 italic">
                              No notes written yet.
                            </p>
                          )}
                          <button
                            onClick={() =>
                              setEditNotes({
                                mentorshipId: m.id,
                                notes: m.notes || '',
                              })
                            }
                            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {m.notes ? 'Edit Notes' : 'Write Notes'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
