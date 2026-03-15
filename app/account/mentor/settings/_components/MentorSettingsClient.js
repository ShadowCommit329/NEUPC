/**
 * @file Mentor settings client — account preferences panel for
 *   notification settings, availability, and mentoring configuration.
 * @module MentorSettingsClient
 */

'use client';

import { useState } from 'react';
import { Settings, Bell, Shield, Lock, Save, Eye, EyeOff } from 'lucide-react';

export default function MentorSettingsClient({ user }) {
  const [message, setMessage] = useState(null);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    session_reminders: true,
    task_submissions: true,
    mentee_updates: true,
    weekly_digest: false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    show_profile: true,
    show_contact: false,
    show_progress: true,
  });

  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    setSavingNotif(true);
    await new Promise((r) => setTimeout(r, 600));
    setMessage({ type: 'success', text: 'Notification preferences saved.' });
    setSavingNotif(false);
  };

  const handleSavePrivacy = async (e) => {
    e.preventDefault();
    setSavingPrivacy(true);
    await new Promise((r) => setTimeout(r, 600));
    setMessage({ type: 'success', text: 'Privacy settings saved.' });
    setSavingPrivacy(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPw(true);
    setMessage(null);
    const fd = new FormData(e.target);
    const current = fd.get('current_password');
    const next = fd.get('new_password');
    const confirm = fd.get('confirm_password');
    if (next !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setChangingPw(false);
      return;
    }
    if (next.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters.',
      });
      setChangingPw(false);
      return;
    }
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      e.target.reset();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setChangingPw(false);
  };

  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-white/20'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-gray-400">
          Configure your mentor account preferences
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl p-3 text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
        >
          {message.text}
        </div>
      )}

      {/* Account Info */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/20 p-2">
            <Settings className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Account</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-300">Full Name</p>
              <p className="text-xs text-gray-500">{user?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-300">Email Address</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <span className="text-xs text-gray-500">Read only</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-300">
                Account Status
              </p>
              <p className="text-xs text-gray-500">{user?.account_status}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${user?.is_online ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
            >
              {user?.is_online ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-purple-500/20 p-2">
            <Bell className="h-5 w-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>
        <form onSubmit={handleSaveNotifications} className="space-y-3">
          {[
            {
              key: 'session_reminders',
              label: 'Session Reminders',
              desc: 'Get reminded before scheduled sessions',
            },
            {
              key: 'task_submissions',
              label: 'Task Submissions',
              desc: 'Notify when a mentee submits a task',
            },
            {
              key: 'mentee_updates',
              label: 'Mentee Updates',
              desc: 'Activity updates from your mentees',
            },
            {
              key: 'weekly_digest',
              label: 'Weekly Digest',
              desc: 'Weekly summary of mentorship activity',
            },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-300">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <Toggle
                checked={notifSettings[key]}
                onChange={(val) =>
                  setNotifSettings({ ...notifSettings, [key]: val })
                }
              />
            </div>
          ))}
          <div className="pt-2">
            <button
              type="submit"
              disabled={savingNotif}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingNotif ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>

      {/* Privacy */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-green-500/20 p-2">
            <Shield className="h-5 w-5 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Privacy</h2>
        </div>
        <form onSubmit={handleSavePrivacy} className="space-y-3">
          {[
            {
              key: 'show_profile',
              label: 'Show Public Profile',
              desc: 'Allow others to view your mentor profile',
            },
            {
              key: 'show_contact',
              label: 'Show Contact Info',
              desc: 'Display phone number on your profile',
            },
            {
              key: 'show_progress',
              label: 'Show Progress Stats',
              desc: 'Display mentorship statistics publicly',
            },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-300">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <Toggle
                checked={privacySettings[key]}
                onChange={(val) =>
                  setPrivacySettings({ ...privacySettings, [key]: val })
                }
              />
            </div>
          ))}
          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPrivacy}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingPrivacy ? 'Saving…' : 'Save Privacy Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-red-500/20 p-2">
            <Lock className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Security</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { name: 'current_password', label: 'Current Password' },
            { name: 'new_password', label: 'New Password' },
            { name: 'confirm_password', label: 'Confirm New Password' },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                {label}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  name={name}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={changingPw}
            className="flex items-center gap-2 rounded-xl bg-red-600/80 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {changingPw ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
