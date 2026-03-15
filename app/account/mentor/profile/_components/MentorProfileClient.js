/**
 * @file Mentor profile client — editable profile view for updating
 *   personal information, expertise areas, and mentoring preferences.
 * @module MentorProfileClient
 */

'use client';

import { useState } from 'react';
import { User, Mail, Phone, Github, Code, Edit2, Save, X } from 'lucide-react';

export default function MentorProfileClient({ user, memberProfile }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [skills, setSkills] = useState(memberProfile?.skills || []);
  const [skillInput, setSkillInput] = useState('');

  const addSkill = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !skills.includes(val)) setSkills([...skills, val]);
      setSkillInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const fd = new FormData(e.target);
      const updates = {
        bio: fd.get('bio'),
        github: fd.get('github'),
        codeforces_handle: fd.get('codeforces_handle'),
        skills,
      };

      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setLoading(false);
  };

  const infoRows = [
    { icon: Mail, label: 'Email', value: user?.email },
    { icon: Phone, label: 'Phone', value: user?.phone || '—' },
    {
      icon: User,
      label: 'Student ID',
      value: memberProfile?.student_id || '—',
    },
    { icon: User, label: 'Session', value: memberProfile?.session || '—' },
    {
      icon: User,
      label: 'Department',
      value: memberProfile?.department || '—',
    },
    { icon: User, label: 'Semester', value: memberProfile?.semester || '—' },
  ];

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="mt-1 text-gray-400">
            Manage your mentor profile information
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div
          className={`rounded-xl p-3 text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
        >
          {message.text}
        </div>
      )}

      {/* Avatar & Name Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              user?.full_name?.charAt(0) || 'M'
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user?.full_name}</h2>
            <p className="text-gray-400">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
                Mentor
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${user?.account_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
              >
                {user?.account_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="mb-4 font-semibold text-white">
            Personal Information
          </h3>
          <div className="space-y-3">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Icon className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm text-gray-300">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit / View Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="mb-4 font-semibold text-white">Mentor Profile</h3>

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Bio
                </label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={memberProfile?.bio || ''}
                  placeholder="Tell your mentees about yourself…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  GitHub
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <Github className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    name="github"
                    defaultValue={memberProfile?.github || ''}
                    placeholder="https://github.com/username"
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Codeforces Handle
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <Code className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    name="codeforces_handle"
                    defaultValue={memberProfile?.codeforces_handle || ''}
                    placeholder="your_handle"
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Skills
                </label>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() =>
                            setSkills(skills.filter((sk) => sk !== s))
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={addSkill}
                    placeholder="Type skill and press Enter…"
                    className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-gray-300 hover:bg-white/10"
                >
                  <X className="mx-auto h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    'Saving…'
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Save className="h-4 w-4" />
                      Save
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-gray-500">Bio</p>
                <p className="text-sm text-gray-300">
                  {memberProfile?.bio || (
                    <span className="text-gray-500 italic">
                      No bio added yet.
                    </span>
                  )}
                </p>
              </div>
              {memberProfile?.github && (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <Github className="h-4 w-4" />
                  <a
                    href={memberProfile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                  >
                    {memberProfile.github}
                  </a>
                </div>
              )}
              {memberProfile?.codeforces_handle && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Code className="h-4 w-4 text-gray-400" />
                  <span>{memberProfile.codeforces_handle}</span>
                </div>
              )}
              {skills.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-gray-500">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
