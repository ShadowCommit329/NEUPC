/**
 * @file Mentor sessions client — session management interface for
 *   scheduling, conducting, and reviewing one-on-one mentoring
 *   sessions with notes and feedback.
 * @module MentorSessionsClient
 */

'use client';

import { useState } from 'react';
import {
  Video,
  Plus,
  Search,
  X,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  createMentorshipSessionAction,
  updateSessionNotesAction,
  deleteSessionAction,
} from '@/app/_lib/mentor-actions';
import { useScrollLock } from '@/app/_lib/hooks';

function SessionModal({ mentorships, onClose, mentorId }) {
  const [loading, setLoading] = useState(false);
  useScrollLock();
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.target);
    fd.set('created_by', mentorId);
    const result = await createMentorshipSessionAction(fd);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Log Session</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Mentee *
            </label>
            <select
              name="mentorship_id"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="">Select mentee…</option>
              {mentorships
                .filter((m) => m.status === 'active')
                .map((m) => {
                  const mentee =
                    m['users!mentorships_mentee_id_fkey'] || m.users;
                  return (
                    <option key={m.id} value={m.id}>
                      {mentee?.full_name || 'Unknown'}
                    </option>
                  );
                })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Date *
              </label>
              <input
                type="date"
                name="session_date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Duration (min)
              </label>
              <input
                type="number"
                name="duration"
                min="15"
                step="15"
                defaultValue="60"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Topic *
            </label>
            <input
              name="topic"
              required
              placeholder="Session topic"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Session notes…"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="attended"
              id="attended"
              defaultChecked
              className="rounded border-white/20 bg-white/5"
            />
            <label htmlFor="attended" className="text-sm text-gray-300">
              Mentee attended
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Logging…' : 'Log Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MentorSessionsClient({ mentorships = [], mentorId }) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editNotes, setEditNotes] = useState(null); // { sessionId, notes, mentorshipId }
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);

  // Flatten all sessions across mentorships
  const allSessions = mentorships.flatMap((m) => {
    const mentee = m['users!mentorships_mentee_id_fkey'] || m.users;
    const sessions = m.mentorship_sessions || [];
    return sessions.map((s) => ({
      ...s,
      menteeName: mentee?.full_name || 'Unknown',
      mentorship_id: m.id,
    }));
  });

  const filtered = allSessions.filter(
    (s) =>
      !search ||
      s.topic?.toLowerCase().includes(search.toLowerCase()) ||
      s.menteeName?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.session_date) - new Date(a.session_date)
  );

  const stats = {
    total: allSessions.length,
    attended: allSessions.filter((s) => s.attended).length,
    thisMonth: allSessions.filter((s) => {
      const d = new Date(s.session_date);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length,
    totalHours:
      Math.round(
        (allSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60) * 10
      ) / 10,
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const fd = new FormData();
    fd.set('sessionId', editNotes.sessionId);
    fd.set('notes', editNotes.notes);
    const result = await updateSessionNotesAction(fd);
    if (result.error) setMessage({ type: 'error', text: result.error });
    else setEditNotes(null);
    setSavingNotes(false);
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this session record?')) return;
    setDeleting(sessionId);
    const fd = new FormData();
    fd.set('sessionId', sessionId);
    const result = await deleteSessionAction(fd);
    if (result.error) setMessage({ type: 'error', text: result.error });
    setDeleting(null);
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Sessions</h1>
          <p className="mt-1 text-gray-400">
            Track and log mentorship sessions
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Log Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Total Sessions',
            value: stats.total,
            color: 'text-blue-400',
          },
          { label: 'Attended', value: stats.attended, color: 'text-green-400' },
          {
            label: 'This Month',
            value: stats.thisMonth,
            color: 'text-purple-400',
          },
          { label: 'Hours', value: stats.totalHours, color: 'text-amber-400' },
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by topic or mentee…"
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

      {/* Sessions List */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
          <Video className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">
            No sessions logged yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Start by logging your first mentorship session.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{s.topic}</h3>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${s.attended ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                    >
                      {s.attended ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {s.attended ? 'Attended' : 'Missed'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-center text-xs leading-6 font-bold text-white">
                        {s.menteeName.charAt(0)}
                      </div>
                      {s.menteeName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(s.session_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {s.duration && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {s.duration} min
                      </span>
                    )}
                  </div>
                  {s.notes && editNotes?.sessionId !== s.id && (
                    <p className="mt-2 text-sm text-gray-500">{s.notes}</p>
                  )}
                  {editNotes?.sessionId === s.id && (
                    <div className="mt-3">
                      <textarea
                        rows={3}
                        value={editNotes.notes}
                        onChange={(e) =>
                          setEditNotes({ ...editNotes, notes: e.target.value })
                        }
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => setEditNotes(null)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingNotes ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() =>
                      setEditNotes({ sessionId: s.id, notes: s.notes || '' })
                    }
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
                  >
                    Notes
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SessionModal
          mentorships={mentorships}
          onClose={() => setShowModal(false)}
          mentorId={mentorId}
        />
      )}
    </div>
  );
}
