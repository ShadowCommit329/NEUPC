'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FireIcon,
  TrophyIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';

/**
 * GoalsWidget - Compact goal tracking component
 * Shows daily/weekly/monthly progress with edit capability
 */
export default function GoalsWidget({ problems = [] }) {
  const [goals, setGoals] = useState({
    daily_target: 3,
    weekly_target: 15,
    monthly_target: 50,
  });
  const [progress, setProgress] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState(goals);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch goals from API
  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/problem-solving/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals);
        setProgress(data.progress);
        setEditValues(data.goals);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Calculate progress from local problems data if API fails
  useEffect(() => {
    if (problems.length > 0 && loading) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let daily = 0,
        weekly = 0,
        monthly = 0;

      problems.forEach((p) => {
        const solvedDate = new Date(p.first_solved_at);
        if (solvedDate >= today) daily++;
        if (solvedDate >= weekStart) weekly++;
        if (solvedDate >= monthStart) monthly++;
      });

      setProgress({ daily, weekly, monthly });
    }
  }, [problems, loading]);

  // Save goals
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/problem-solving/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });

      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save goals:', error);
    } finally {
      setSaving(false);
    }
  };

  // Progress bar component
  const ProgressBar = ({ current, target, color, label, icon: Icon }) => {
    const percentage = Math.min((current / target) * 100, 100);
    const isComplete = current >= target;

    return (
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon
              className={`h-4 w-4 ${isComplete ? 'text-green-500' : color}`}
            />
            <span className="text-xs font-medium text-gray-300">{label}</span>
          </div>
          <span
            className={`text-xs font-semibold ${isComplete ? 'text-green-400' : 'text-gray-400'}`}
          >
            {current}/{target}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-700">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : `bg-gradient-to-r ${color === 'text-amber-400' ? 'from-amber-500 to-yellow-400' : color === 'text-blue-400' ? 'from-blue-500 to-cyan-400' : 'from-purple-500 to-pink-400'}`
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // Edit modal
  const EditModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Edit Goals</h3>
          <button
            onClick={() => setIsEditing(false)}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Daily */}
          <div>
            <label className="mb-1 block text-sm text-gray-300">
              Daily Target
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={editValues.daily_target}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  daily_target: parseInt(e.target.value) || 0,
                })
              }
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Weekly */}
          <div>
            <label className="mb-1 block text-sm text-gray-300">
              Weekly Target
            </label>
            <input
              type="number"
              min="0"
              max="200"
              value={editValues.weekly_target}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  weekly_target: parseInt(e.target.value) || 0,
                })
              }
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Monthly */}
          <div>
            <label className="mb-1 block text-sm text-gray-300">
              Monthly Target
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={editValues.monthly_target}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  monthly_target: parseInt(e.target.value) || 0,
                })
              }
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setIsEditing(false)}
            className="rounded-lg px-4 py-2 text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );

  // Calculate overall completion
  const dailyComplete = progress.daily >= goals.daily_target;
  const weeklyComplete = progress.weekly >= goals.weekly_target;
  const monthlyComplete = progress.monthly >= goals.monthly_target;
  const allComplete = dailyComplete && weeklyComplete && monthlyComplete;

  return (
    <>
      <div
        className={`rounded-xl border p-4 ${
          allComplete
            ? 'border-green-500/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20'
            : 'border-gray-700 bg-gray-800/50'
        }`}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allComplete ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                <TrophyIcon className="h-5 w-5 text-green-400" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                <FireIconSolid className="h-5 w-5 text-amber-400" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-white">Goals</h3>
              <p className="text-xs text-gray-400">
                {allComplete ? 'All goals met!' : 'Track your progress'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
            title="Edit goals"
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bars */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-3">
            <ProgressBar
              current={progress.daily}
              target={goals.daily_target}
              color="text-amber-400"
              label="Daily"
              icon={FireIcon}
            />
            <ProgressBar
              current={progress.weekly}
              target={goals.weekly_target}
              color="text-blue-400"
              label="Weekly"
              icon={CalendarDaysIcon}
            />
            <ProgressBar
              current={progress.monthly}
              target={goals.monthly_target}
              color="text-purple-400"
              label="Monthly"
              icon={TrophyIcon}
            />
          </div>
        )}

        {/* Motivational message */}
        {!loading && !allComplete && (
          <div className="mt-3 rounded-lg bg-gray-700/50 px-3 py-2">
            <p className="text-xs text-gray-300">
              {progress.daily === 0
                ? 'Start your day with a problem!'
                : progress.daily < goals.daily_target
                  ? `${goals.daily_target - progress.daily} more to hit today's goal`
                  : dailyComplete && !weeklyComplete
                    ? 'Daily done! Keep going for weekly'
                    : 'Great progress!'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && <EditModal />}
    </>
  );
}
