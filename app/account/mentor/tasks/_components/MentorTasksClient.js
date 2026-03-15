/**
 * @file Mentor tasks client — task management interface for creating,
 *   assigning, and tracking learning tasks for mentees.
 * @module MentorTasksClient
 */

'use client';

import { useState } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Link,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';
import {
  createWeeklyTaskAction,
  updateWeeklyTaskAction,
  deleteWeeklyTaskAction,
} from '@/app/_lib/mentor-actions';
import { useScrollLock } from '@/app/_lib/hooks';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function TaskModal({ task, onClose, mentorId }) {
  const isEdit = !!task;
  useScrollLock();
  const [links, setLinks] = useState(task?.problem_links || ['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.target);
    fd.set('problem_links', JSON.stringify(links.filter(Boolean)));
    fd.set('assigned_by', mentorId);
    const result = isEdit
      ? await updateWeeklyTaskAction(fd)
      : await createWeeklyTaskAction(fd);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {isEdit ? 'Edit Task' : 'Create Task'}
          </h2>
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
          {isEdit && <input type="hidden" name="taskId" value={task.id} />}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Title *
            </label>
            <input
              name="title"
              required
              defaultValue={task?.title}
              placeholder="Task title"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={task?.description}
              placeholder="Task description…"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Difficulty
              </label>
              <select
                name="difficulty"
                defaultValue={task?.difficulty || 'medium'}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Deadline
              </label>
              <input
                type="date"
                name="deadline"
                defaultValue={task?.deadline ? task.deadline.slice(0, 10) : ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Target Audience
            </label>
            <input
              name="target_audience"
              defaultValue={task?.target_audience || ''}
              placeholder="e.g. batch-49, all"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Problem Links
            </label>
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = e.target.value;
                      setLinks(next);
                    }}
                    placeholder="https://codeforces.com/…"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setLinks(links.filter((_, j) => j !== i))}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLinks([...links, ''])}
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add link
              </button>
            </div>
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
              {loading ? 'Saving…' : isEdit ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MentorTasksClient({ tasks = [], mentorId }) {
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('all');
  const [modalTask, setModalTask] = useState(undefined); // undefined=closed, null=new, task=edit
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);

  const filtered = tasks.filter((t) => {
    const matchSearch =
      !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchDiff = filterDiff === 'all' || t.difficulty === filterDiff;
    return matchSearch && matchDiff;
  });

  const myTasks = filtered.filter((t) => t.assigned_by === mentorId);
  const otherTasks = filtered.filter((t) => t.assigned_by !== mentorId);

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setDeleting(taskId);
    const fd = new FormData();
    fd.set('taskId', taskId);
    const result = await deleteWeeklyTaskAction(fd);
    if (result.error) setMessage({ type: 'error', text: result.error });
    setDeleting(null);
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Weekly Tasks</h1>
          <p className="mt-1 text-gray-400">
            Create and manage tasks for your mentees
          </p>
        </div>
        <button
          onClick={() => setModalTask(null)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: tasks.length, color: 'text-blue-400' },
          {
            label: 'My Tasks',
            value: tasks.filter((t) => t.assigned_by === mentorId).length,
            color: 'text-green-400',
          },
          {
            label: 'Easy',
            value: tasks.filter((t) => t.difficulty === 'easy').length,
            color: 'text-emerald-400',
          },
          {
            label: 'Hard',
            value: tasks.filter((t) => t.difficulty === 'hard').length,
            color: 'text-red-400',
          },
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
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
          />
        </div>
        <select
          value={filterDiff}
          onChange={(e) => setFilterDiff(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {message && (
        <div
          className={`rounded-xl p-3 text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
        >
          {message.text}
        </div>
      )}

      {/* My Tasks Section */}
      <Section
        title="My Tasks"
        tasks={myTasks}
        expanded={expanded}
        setExpanded={setExpanded}
        onEdit={setModalTask}
        onDelete={handleDelete}
        deleting={deleting}
        showActions
      />

      {/* Other Tasks Section */}
      {otherTasks.length > 0 && (
        <Section
          title="All Tasks"
          tasks={otherTasks}
          expanded={expanded}
          setExpanded={setExpanded}
          onEdit={setModalTask}
          onDelete={handleDelete}
          deleting={deleting}
          showActions={false}
        />
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
          <ClipboardList className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">No tasks found</p>
        </div>
      )}

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          onClose={() => setModalTask(undefined)}
          mentorId={mentorId}
        />
      )}
    </div>
  );
}

function Section({
  title,
  tasks,
  expanded,
  setExpanded,
  onEdit,
  onDelete,
  deleting,
  showActions,
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold tracking-wider text-gray-500 uppercase">
        {title} ({tasks.length})
      </h2>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
          >
            <div
              className="flex cursor-pointer items-center justify-between p-4"
              onClick={() => setExpanded(expanded === task.id ? null : task.id)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[task.difficulty] || 'bg-gray-500/20 text-gray-400'}`}
                >
                  {task.difficulty}
                </span>
                <h3 className="truncate font-medium text-white">
                  {task.title}
                </h3>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                {task.deadline && (
                  <span className="hidden items-center gap-1 text-xs text-gray-500 sm:flex">
                    <Clock className="h-3 w-3" />
                    {new Date(task.deadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
                {showActions && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(task);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-blue-400"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                      disabled={deleting === task.id}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {expanded === task.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>

            {expanded === task.id && (
              <div className="border-t border-white/10 p-4 pt-3">
                {task.description && (
                  <p className="mb-3 text-sm text-gray-400">
                    {task.description}
                  </p>
                )}
                {task.target_audience && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>Target: {task.target_audience}</span>
                  </div>
                )}
                {Array.isArray(task.problem_links) &&
                  task.problem_links.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Problem Links
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {task.problem_links.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/20"
                          >
                            <Link className="h-3 w-3" />
                            Problem {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
