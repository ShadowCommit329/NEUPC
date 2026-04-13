/**
 * @file Member problem set client — weekly task trainer with
 *   submission tracking, progress bars, and comparative statistics.
 * @module MemberProblemSetClient
 */

'use client';

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import {
  Brain,
  Search,
  X,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Calendar,
  ExternalLink,
  Code2,
  FileText,
  Send,
  BarChart2,
  Upload,
  Trophy,
  Flame,
  Target,
  CircleDashed,
  CircleCheck,
  CircleX,
  ChevronRight,
  Link2,
  StickyNote,
  MessageSquare,
  TrendingUp,
  Star,
} from 'lucide-react';
import { submitTaskAction } from '@/app/_lib/member-tasks-actions';
import { useScrollLock } from '@/app/_lib/hooks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function isPast(iso) {
  return iso ? new Date(iso) < new Date() : false;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DIFF_CONFIG = {
  easy: {
    label: 'Easy',
    color: 'text-green-300',
    bg: 'bg-green-500/12',
    border: 'border-green-500/25',
    dot: 'bg-green-400',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-300',
    bg: 'bg-yellow-500/12',
    border: 'border-yellow-500/25',
    dot: 'bg-yellow-400',
  },
  hard: {
    label: 'Hard',
    color: 'text-red-300',
    bg: 'bg-red-500/12',
    border: 'border-red-500/25',
    dot: 'bg-red-400',
  },
};

const SUB_STATUS = {
  pending: {
    label: 'Pending Review',
    color: 'text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/25',
    Icon: Clock,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-300',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    Icon: CircleCheck,
  },
  late: {
    label: 'Late',
    color: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
    Icon: AlertCircle,
  },
  missed: {
    label: 'Missed',
    color: 'text-red-400',
    bg: 'bg-red-500/8',
    border: 'border-red-500/20',
    Icon: CircleX,
  },
};

function diffConf(d) {
  return DIFF_CONFIG[d] || DIFF_CONFIG.medium;
}
function subConf(s) {
  return SUB_STATUS[s] || SUB_STATUS.pending;
}

// ─── Flash message ────────────────────────────────────────────────────────────

function Flash({ msg, onClose }) {
  if (!msg) return null;
  const isErr = msg.type === 'error';
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        isErr
          ? 'border-red-500/25 bg-red-500/8 text-red-300'
          : 'border-green-500/25 bg-green-500/8 text-green-300'
      }`}
    >
      {isErr ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose}>
        <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}

// ─── Tabs button (declared outside render for lint) ─────────────────────────

function TabBtn({ id, label, count, accent, activeTab, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
        activeTab === id
          ? 'bg-white/12 text-white shadow-sm'
          : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
            accent
              ? 'bg-green-500/20 text-green-400'
              : activeTab === id
                ? 'bg-white/15 text-white'
                : 'bg-white/6 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────

function SubmitModal({ task, existing, onClose, onDone }) {
  useScrollLock();
  const [pending, start] = useTransition();
  const [url, setUrl] = useState(existing?.submission_url ?? '');
  const [code, setCode] = useState(existing?.code ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [tab, setTab] = useState('url');
  const dc = diffConf(task.difficulty);
  const late = isPast(task.deadline);

  const handleSubmit = (e) => {
    e.preventDefault();
    start(async () => {
      const res = await submitTaskAction({
        taskId: task.id,
        submissionUrl: url,
        code,
        notes,
      });
      if (res.error) {
        onDone({ type: 'error', text: res.error });
      } else {
        onDone({
          type: 'success',
          text: res.updated
            ? 'Submission updated successfully!'
            : 'Solution submitted!',
        });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/12 bg-gray-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/8 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${dc.bg} ${dc.border} ${dc.color}`}
              >
                {dc.label}
              </span>
              {late && (
                <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                  Late Submission
                </span>
              )}
              {existing && (
                <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  Re-submit
                </span>
              )}
            </div>
            <h2 className="line-clamp-2 text-sm font-semibold text-white">
              {task.title}
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Deadline: {fmtDateTime(task.deadline)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 ml-3 shrink-0 text-gray-500 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Problem links */}
          {task.problem_links?.length > 0 && (
            <div className="rounded-xl border border-white/6 bg-white/2 px-3 py-2.5">
              <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                Problem Links
              </p>
              <div className="space-y-1">
                {task.problem_links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-400 transition-colors hover:text-blue-300"
                  >
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{link}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Submission tabs */}
          <div>
            <div className="mb-3 flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
              {[
                { id: 'url', Icon: Link2, label: 'Solution URL' },
                { id: 'code', Icon: Code2, label: 'Paste Code' },
              ].map(({ id, Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                    tab === id
                      ? 'bg-white/12 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {tab === 'url' && (
              <input
                type="url"
                placeholder="https://codeforces.com/contest/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:outline-none"
              />
            )}
            {tab === 'code' && (
              <textarea
                rows={7}
                placeholder="// Paste your solution here…"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 font-mono text-xs text-white placeholder-gray-600 focus:border-white/20 focus:outline-none"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-gray-500">
              Notes / Approach (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief explanation of your approach…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-white/20 focus:outline-none"
            />
          </div>

          {/* Reviewer feedback (read-only if present) */}
          {existing?.feedback && (
            <div className="rounded-xl border border-blue-500/15 bg-blue-500/6 px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-blue-400 uppercase">
                Reviewer Feedback
              </p>
              <p className="text-xs text-gray-300">{existing.feedback}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/8 bg-white/3 py-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/6"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/15 py-2.5 text-xs font-semibold text-blue-300 transition-all hover:bg-blue-500/25 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {existing ? 'Update Submission' : 'Submit Solution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, submission, onSubmit, index }) {
  const dc = diffConf(task.difficulty);
  const past = isPast(task.deadline);
  const sub = submission;
  const sc = sub ? subConf(sub.status) : null;
  const SubIcon = sc?.Icon;

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-4 py-3.5 transition-all hover:border-white/12 hover:bg-white/4">
      {/* Index */}
      <span className="w-6 shrink-0 text-center text-xs text-gray-600 tabular-nums">
        {index}
      </span>

      {/* Status dot */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center">
        {sub ? (
          <SubIcon className={`h-4.5 w-4.5 ${sc.color}`} />
        ) : past ? (
          <CircleX className="h-4.5 w-4.5 text-red-500/60" />
        ) : (
          <CircleDashed className="h-4.5 w-4.5 text-gray-700" />
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-200">
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-600">
          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {past ? (
              <span className="text-red-500/70">
                Expired {fmtDate(task.deadline)}
              </span>
            ) : (
              fmtDate(task.deadline)
            )}
          </span>
          {task.problem_links?.length > 0 && (
            <span className="flex items-center gap-0.5 text-blue-500/70">
              <Link2 className="h-2.5 w-2.5" /> {task.problem_links.length} link
              {task.problem_links.length > 1 ? 's' : ''}
            </span>
          )}
          {task.target_audience && <span>{task.target_audience}</span>}
        </div>
      </div>

      {/* Difficulty */}
      <span
        className={`hidden shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold sm:inline ${dc.bg} ${dc.border} ${dc.color}`}
      >
        {dc.label}
      </span>

      {/* Submission status */}
      {sub && (
        <span
          className={`hidden shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:flex ${sc.bg} ${sc.border} ${sc.color}`}
        >
          {sc.label}
        </span>
      )}

      {/* Action */}
      <button
        onClick={() => onSubmit(task, sub || null)}
        className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all ${
          sub
            ? 'border-blue-500/25 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
            : past
              ? 'border-orange-500/20 bg-orange-500/8 text-orange-400 hover:bg-orange-500/15'
              : 'border-white/10 bg-white/4 text-gray-300 hover:border-white/20 hover:bg-white/10'
        }`}
      >
        {sub ? 'Update' : past ? 'Submit Late' : 'Submit'}
      </button>
    </div>
  );
}

// ─── Platform Stat Card ───────────────────────────────────────────────────────

function PlatformCard({ label, value, color, sub }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/2 p-3 text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>
        {value ?? '—'}
      </p>
      <p className="mt-0.5 text-[10px] font-medium text-gray-500">{label}</p>
      {sub && <p className="text-[10px] text-gray-700">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemberProblemSetClient({
  tasks,
  mySubmissions,
  progress,
  memberStats,
  userId,
}) {
  const [activeTab, setActiveTab] = useState('tasks');
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flash, setFlash] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [modalExisting, setModalExisting] = useState(null);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 4500);
    return () => clearTimeout(id);
  }, [flash]);

  // Submission lookup by task ID
  const subMap = useMemo(() => {
    const m = {};
    for (const s of mySubmissions) {
      if (s.task_id) m[s.task_id] = s;
    }
    return m;
  }, [mySubmissions]);

  // Derived stats
  const completedCount = mySubmissions.filter(
    (s) => s.status === 'completed'
  ).length;
  const pendingCount = mySubmissions.filter(
    (s) => s.status === 'pending'
  ).length;
  const lateCount = mySubmissions.filter((s) => s.status === 'late').length;
  const missedCount = tasks.filter(
    (t) => isPast(t.deadline) && !subMap[t.id]
  ).length;
  const activeTasks = tasks.filter((t) => !isPast(t.deadline));

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (diffFilter !== 'all' && t.difficulty !== diffFilter) return false;
      if (statusFilter !== 'all') {
        const sub = subMap[t.id];
        const taskStatus = sub
          ? sub.status
          : isPast(t.deadline)
            ? 'missed'
            : 'open';
        if (statusFilter === 'completed' && sub?.status !== 'completed')
          return false;
        if (statusFilter === 'pending' && sub?.status !== 'pending')
          return false;
        if (statusFilter === 'late' && sub?.status !== 'late') return false;
        if (statusFilter === 'missed' && taskStatus !== 'missed') return false;
        if (statusFilter === 'open' && taskStatus !== 'open') return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    });
  }, [tasks, diffFilter, statusFilter, search, subMap]);

  function openSubmitModal(task, existing) {
    setModalTask(task);
    setModalExisting(existing);
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Problem Set
          </h1>
          <p className="text-sm text-gray-500">Practice. Improve. Compete.</p>
        </div>
        {activeTasks.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 rounded-xl border border-orange-500/20 bg-orange-500/8 px-3.5 py-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-semibold text-orange-300">
                {activeTasks.length} active task
                {activeTasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {flash && <Flash msg={flash} onClose={() => setFlash(null)} />}

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: Target,
            label: 'Total Tasks',
            value: tasks.length,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            icon: CircleCheck,
            label: 'Completed',
            value: completedCount,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
          {
            icon: Clock,
            label: 'Pending',
            value: pendingCount + lateCount,
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
          },
          {
            icon: CircleX,
            label: 'Missed',
            value: missedCount,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}
            >
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl leading-none font-bold text-white tabular-nums">
                {value}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Platform Stats (if available) ──────────────────────────────── */}
      {memberStats && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">
              Platform Statistics
            </h2>
            {memberStats.last_sync_at && (
              <span className="ml-auto text-[10px] text-gray-600">
                Synced {timeAgo(memberStats.last_sync_at)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <PlatformCard
              label="Total Solved"
              value={memberStats.total_problems_solved}
              color="text-white"
            />
            <PlatformCard
              label="Codeforces"
              value={memberStats.codeforces_rating}
              color="text-blue-400"
              sub={
                memberStats.codeforces_max_rating
                  ? `Max: ${memberStats.codeforces_max_rating}`
                  : null
              }
            />
            <PlatformCard
              label="VJudge"
              value={memberStats.vjudge_solved}
              color="text-purple-400"
              sub="solved"
            />
            <PlatformCard
              label="AtCoder"
              value={memberStats.atcoder_rating}
              color="text-orange-400"
            />
            <PlatformCard
              label="LeetCode"
              value={memberStats.leetcode_rating}
              color="text-yellow-400"
            />
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-9 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:bg-white/6 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {/* Difficulty */}
          <div className="relative">
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <select
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value)}
              className="w-32 appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-3.5 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
            >
              <option value="all">All Levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          {/* Status */}
          <div className="relative">
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36 appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-3.5 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending Review</option>
              <option value="late">Late</option>
              <option value="missed">Missed</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-1.5">
        <TabBtn
          id="tasks"
          label="All Tasks"
          count={filteredTasks.length}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
        <TabBtn
          id="active"
          label="Active"
          count={activeTasks.length}
          accent={activeTasks.length > 0}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
        <TabBtn
          id="history"
          label="My Submissions"
          count={mySubmissions.length}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
        <TabBtn
          id="progress"
          label="Progress"
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
           TAB: ALL TASKS / ACTIVE
      ═══════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'tasks' || activeTab === 'active') &&
        (() => {
          const list =
            activeTab === 'active'
              ? activeTasks.filter((t) => {
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return t.title?.toLowerCase().includes(q);
                })
              : filteredTasks;

          return list.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
              <Target className="mb-3 h-12 w-12 text-gray-700" />
              <p className="text-sm font-medium text-gray-500">
                {activeTab === 'active'
                  ? 'No active tasks right now'
                  : 'No tasks match your filters'}
              </p>
              {(search || diffFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setDiffFilter('all');
                    setStatusFilter('all');
                  }}
                  className="mt-2 text-xs text-blue-400 transition-colors hover:text-blue-300"
                >
                  Clear filters ×
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
              {/* Table header */}
              <div className="hidden grid-cols-[2rem_2rem_1fr_6rem_8rem_6rem] items-center gap-3 border-b border-white/6 px-4 py-2.5 text-[10px] font-semibold tracking-wider text-gray-600 uppercase sm:grid">
                <span>#</span>
                <span></span>
                <span>Title</span>
                <span>Difficulty</span>
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>
              <div className="space-y-1 divide-y divide-white/4 p-2 sm:p-3">
                {list.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    submission={subMap[task.id] || null}
                    onSubmit={openSubmitModal}
                    index={i + 1}
                  />
                ))}
              </div>
            </div>
          );
        })()}

      {/* ═══════════════════════════════════════════════════════════════════
           TAB: MY SUBMISSIONS HISTORY
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">My Submissions</h2>
            <span className="ml-auto rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">
              {mySubmissions.length}
            </span>
          </div>

          {mySubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Send className="mb-3 h-10 w-10 text-gray-700" />
              <p className="text-sm font-medium text-gray-500">
                No submissions yet
              </p>
              <button
                onClick={() => setActiveTab('active')}
                className="mt-2 text-xs text-blue-400 transition-colors hover:text-blue-300"
              >
                Browse active tasks →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {mySubmissions.map((sub) => {
                const task = sub.weekly_tasks;
                const sc = subConf(sub.status);
                const SubIcon = sc.Icon;
                const dc = task ? diffConf(task.difficulty) : null;
                return (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-white/6 bg-white/2 px-4 py-3 transition-colors hover:bg-white/4"
                  >
                    <div className="flex items-start gap-3">
                      <SubIcon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${sc.color}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gray-200">
                            {task?.title ?? 'Unknown task'}
                          </p>
                          {dc && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${dc.bg} ${dc.border} ${dc.color}`}
                            >
                              {dc.label}
                            </span>
                          )}
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${sc.bg} ${sc.border} ${sc.color}`}
                          >
                            {sc.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-600">
                          Submitted {timeAgo(sub.submitted_at)}
                        </p>
                        {sub.notes && (
                          <p className="mt-1.5 line-clamp-1 text-[11px] text-gray-500 italic">
                            "{sub.notes}"
                          </p>
                        )}
                        {sub.feedback && (
                          <div className="mt-2 rounded-lg border border-blue-500/15 bg-blue-500/6 px-3 py-2">
                            <p className="mb-0.5 text-[10px] font-semibold text-blue-400">
                              Feedback
                            </p>
                            <p className="text-xs text-gray-300">
                              {sub.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {sub.submission_url && (
                          <a
                            href={sub.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/4 px-2.5 py-1.5 text-[11px] text-gray-400 transition-colors hover:bg-white/8 hover:text-white"
                          >
                            <ExternalLink className="h-3 w-3" /> View
                          </a>
                        )}
                        {task && sub.status !== 'completed' && (
                          <button
                            onClick={() => openSubmitModal(task, sub)}
                            className="rounded-lg border border-blue-500/20 bg-blue-500/8 px-2.5 py-1.5 text-[11px] font-medium text-blue-300 transition-colors hover:bg-blue-500/15"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           TAB: PROGRESS
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          {/* Completion Rate Chart (visual bar) */}
          {tasks.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">
                  Completion Overview
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: 'Completed',
                    count: completedCount,
                    total: tasks.length,
                    color: 'bg-green-500',
                  },
                  {
                    label: 'Pending Review',
                    count: pendingCount + lateCount,
                    total: tasks.length,
                    color: 'bg-yellow-500',
                  },
                  {
                    label: 'Missed',
                    count: missedCount,
                    total: tasks.length,
                    color: 'bg-red-500',
                  },
                  {
                    label: 'Open',
                    count:
                      activeTasks.length -
                      (pendingCount + lateCount + completedCount <
                      activeTasks.length
                        ? Object.keys(subMap).filter(
                            (id) =>
                              !isPast(tasks.find((t) => t.id === id)?.deadline)
                          ).length
                        : 0),
                    total: tasks.length,
                    color: 'bg-gray-600',
                  },
                ].map(({ label, count, total, color }) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="mb-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">{label}</span>
                        <span className="text-gray-500 tabular-nums">
                          {count} / {total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full transition-all ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress periods */}
          {progress.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-white">
                  Progress History
                </h2>
              </div>
              <div className="space-y-3">
                {progress.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-white/6 bg-white/2 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-white capitalize">
                          {p.period}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {fmtDate(p.start_date)} – {fmtDate(p.end_date)}
                        </p>
                      </div>
                      {p.rating_change !== null &&
                        p.rating_change !== undefined && (
                          <span
                            className={`text-sm font-bold tabular-nums ${p.rating_change >= 0 ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {p.rating_change >= 0 ? '+' : ''}
                            {p.rating_change}
                          </span>
                        )}
                    </div>
                    <div className="flex gap-4 text-[11px]">
                      <span className="text-gray-500">
                        Problems:{' '}
                        <span className="font-semibold text-white">
                          {p.problems_solved ?? 0}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        Contests:{' '}
                        <span className="font-semibold text-white">
                          {p.contests_participated ?? 0}
                        </span>
                      </span>
                    </div>
                    {p.self_assessment && (
                      <p className="mt-2 text-[11px] text-gray-500 italic">
                        "{p.self_assessment}"
                      </p>
                    )}
                    {p.mentor_notes && (
                      <div className="mt-2 rounded-lg border border-purple-500/15 bg-purple-500/6 px-3 py-2">
                        <p className="mb-0.5 text-[10px] font-semibold text-purple-400">
                          Mentor Notes
                        </p>
                        <p className="text-xs text-gray-300">
                          {p.mentor_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {progress.length === 0 && tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
              <BarChart2 className="mb-3 h-12 w-12 text-gray-700" />
              <p className="text-sm font-medium text-gray-500">
                No progress data yet
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Submit Modal ─────────────────────────────────────────────────── */}
      {modalTask && (
        <SubmitModal
          task={modalTask}
          existing={modalExisting}
          onClose={() => {
            setModalTask(null);
            setModalExisting(null);
          }}
          onDone={(msg) => {
            setFlash(msg);
            setModalTask(null);
            setModalExisting(null);
          }}
        />
      )}
    </>
  );
}
