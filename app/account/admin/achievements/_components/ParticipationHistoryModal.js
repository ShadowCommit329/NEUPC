/**
 * @file Participation History modal — manage participation records that are
 *   separate from achievements. Someone can participate without winning.
 * @module AdminParticipationHistoryModal
 */

'use client';

import { useState, useMemo, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import { getCategoryConfig, ACHIEVEMENT_CATEGORIES } from './achievementConfig';
import {
  createParticipationRecordAction,
  updateParticipationRecordAction,
  deleteParticipationRecordAction,
  getParticipationRecordsAction,
  getParticipationPhotosAction,
  uploadParticipationPhotoAction,
  deleteParticipationPhotoAction,
  uploadParticipationFeaturedPhotoAction,
  deleteParticipationFeaturedPhotoAction,
} from '@/app/_lib/achievement-actions';
import { useScrollLock } from '@/app/_lib/hooks';

const TABLE_PAGE_SIZE = 15;

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '\u2026', total];
  if (current >= total - 2)
    return [1, '\u2026', total - 3, total - 2, total - 1, total];
  return [1, '\u2026', current - 1, current, current + 1, '\u2026', total];
}

// ── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col)
    return (
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3 w-3 opacity-30"
      >
        <path d="M8 2l3 4H5l3-4zm0 12l-3-4h6l-3 4z" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3 w-3 text-amber-400"
    >
      {sortDir === 'asc' ? (
        <path d="M8 2l3 4H5l3-4z" />
      ) : (
        <path d="M8 14l-3-4h6l-3 4z" />
      )}
    </svg>
  );
}

// ── Add / Edit form ───────────────────────────────────────────────────────────

function RecordForm({ record, users, achievements, onSave, onCancel }) {
  const isEdit = !!record?.id;

  const [userId, setUserId] = useState(record?.user_id ?? '');
  const [userSearch, setUserSearch] = useState(
    record?.users?.full_name ??
      (record?.user_id
        ? (users.find((u) => u.id === record.user_id)?.full_name ?? '')
        : '')
  );
  const [showUserDrop, setShowUserDrop] = useState(false);
  const [contestName, setContestName] = useState(record?.contest_name ?? '');
  const [contestUrl, setContestUrl] = useState(record?.contest_url ?? '');
  const [category, setCategory] = useState(record?.category ?? '');
  const [year, setYear] = useState(record?.year ?? new Date().getFullYear());
  const [participationDate, setParticipationDate] = useState(
    record?.participation_date ?? ''
  );
  const [result, setResult] = useState(record?.result ?? '');
  const [isTeam, setIsTeam] = useState(record?.is_team ?? false);
  const [teamName, setTeamName] = useState(record?.team_name ?? '');
  const [teamMembers, setTeamMembers] = useState(() =>
    (record?.team_members ?? []).map((m) => ({
      ...m,
      localId: `${Math.random()}`,
    }))
  );
  // inline member adder
  const [showAdder, setShowAdder] = useState(false);
  const [adderType, setAdderType] = useState('club'); // 'club' | 'guest' | 'external'
  const [adderUserId, setAdderUserId] = useState('');
  const [adderUserSearch, setAdderUserSearch] = useState('');
  const [adderShowDrop, setAdderShowDrop] = useState(false);
  const [adderName, setAdderName] = useState('');
  const [adderProfileUrl, setAdderProfileUrl] = useState('');

  const [achievementId, setAchievementId] = useState(
    record?.achievement_id ?? ''
  );
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [err, setErr] = useState('');
  const [pending, setPending] = useState(false);
  const [featuredPhotoFile, setFeaturedPhotoFile] = useState(null);
  const [featuredPhotoPreviewUrl, setFeaturedPhotoPreviewUrl] = useState(
    record?.featured_photo?.url ?? null
  );
  const [clearFeaturedPhoto, setClearFeaturedPhoto] = useState(false);
  const featuredPhotoInputRef = useRef(null);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users.slice(0, 30);
    return users
      .filter((u) => u.full_name?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [users, userSearch]);

  const filteredAdderUsers = useMemo(() => {
    const q = adderUserSearch.toLowerCase().trim();
    if (!q) return users.slice(0, 20);
    return users
      .filter((u) => u.full_name?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [users, adderUserSearch]);

  function addTeamMember() {
    if (adderType === 'club') {
      if (!adderUserId) return;
      const user = users.find((u) => u.id === adderUserId);
      setTeamMembers((prev) => [
        ...prev,
        {
          localId: `${Date.now()}-${Math.random()}`,
          type: 'club',
          user_id: adderUserId,
          name: user?.full_name ?? adderUserSearch,
          profile_url: null,
        },
      ]);
    } else {
      if (!adderName.trim()) return;
      setTeamMembers((prev) => [
        ...prev,
        {
          localId: `${Date.now()}-${Math.random()}`,
          type: adderType,
          user_id: null,
          name: adderName.trim(),
          profile_url: adderProfileUrl.trim() || null,
        },
      ]);
    }
    setAdderUserId('');
    setAdderUserSearch('');
    setAdderName('');
    setAdderProfileUrl('');
    setShowAdder(false);
  }

  function removeTeamMember(localId) {
    setTeamMembers((prev) => prev.filter((m) => m.localId !== localId));
  }

  function resetAdder() {
    setShowAdder(false);
    setAdderType('club');
    setAdderUserId('');
    setAdderUserSearch('');
    setAdderName('');
    setAdderProfileUrl('');
  }

  function selectUser(u) {
    setUserId(u.id);
    setUserSearch(u.full_name ?? '');
    setShowUserDrop(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setPending(true);
    const fd = new FormData();
    if (isEdit) fd.set('id', record.id);
    fd.set('user_id', userId || '');
    fd.set('contest_name', contestName);
    fd.set('contest_url', contestUrl);
    fd.set('category', category);
    fd.set('year', String(year));
    fd.set('participation_date', participationDate);
    fd.set('result', result);
    fd.set('is_team', String(isTeam));
    fd.set('team_name', teamName);
    fd.set(
      'team_members',
      JSON.stringify(teamMembers.map(({ localId: _lid, ...m }) => m))
    );
    fd.set('achievement_id', achievementId);
    fd.set('notes', notes);

    const action = isEdit
      ? updateParticipationRecordAction
      : createParticipationRecordAction;

    const res = await action(fd);
    if (res?.error) {
      setErr(res.error);
      setPending(false);
    } else {
      const targetId = isEdit ? record.id : res.id;
      if (targetId) {
        if (clearFeaturedPhoto && !featuredPhotoFile) {
          const dfd = new FormData();
          dfd.set('record_id', targetId);
          await deleteParticipationFeaturedPhotoAction(dfd);
        } else if (featuredPhotoFile) {
          const ufd = new FormData();
          ufd.set('record_id', targetId);
          ufd.set('file', featuredPhotoFile);
          await uploadParticipationFeaturedPhotoAction(ufd);
        }
      }
      // Await onSave so the list has fresh data before view switches.
      // The form button stays in "Saving…" state throughout.
      await onSave();
    }
  }

  const inputCls =
    'w-full rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none';
  const labelCls = 'mb-1.5 block text-xs font-medium text-slate-400';

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
    >
      <h3 className="text-sm font-semibold text-white">
        {isEdit
          ? '✏️ Edit Participation Record'
          : '➕ Add Participation Record'}
      </h3>

      {err && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {err}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Individual / Team toggle */}
        <div className="md:col-span-2">
          <label className={labelCls}>Participation Type *</label>
          <div className="flex w-fit rounded-xl border border-slate-700/50 bg-slate-800/60 p-0.5">
            <button
              type="button"
              onClick={() => setIsTeam(false)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                !isTeam
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👤 Individual
            </button>
            <button
              type="button"
              onClick={() => setIsTeam(true)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                isTeam
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👥 Team
            </button>
          </div>
        </div>

        {/* Member combobox */}
        <div className={`relative ${isTeam ? '' : 'md:col-span-2'}`}>
          <label className={labelCls}>
            {isTeam ? 'Team Representative (optional)' : 'Member (optional)'}
          </label>
          <input
            type="text"
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setUserId('');
              setShowUserDrop(true);
            }}
            onFocus={() => setShowUserDrop(true)}
            onBlur={() => setTimeout(() => setShowUserDrop(false), 150)}
            placeholder="Type to search members…"
            className={inputCls}
            autoComplete="off"
          />
          {showUserDrop && filteredUsers.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-800 shadow-2xl">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onMouseDown={() => selectUser(u)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                >
                  <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-slate-700">
                    {u.avatar_url ? (
                      <Image
                        src={u.avatar_url}
                        alt={u.full_name ?? ''}
                        width={24}
                        height={24}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                        {u.full_name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                  {u.full_name}
                </button>
              ))}
            </div>
          )}
          {userId ? (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-emerald-400">
                ✓ Selected: {userSearch}
              </p>
              <button
                type="button"
                onClick={() => {
                  setUserId('');
                  setUserSearch('');
                }}
                className="text-xs text-slate-500 transition-colors hover:text-red-400"
              >
                × Clear
              </button>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Leave blank for external / guest participants
            </p>
          )}
        </div>

        {/* Team Name + Members — only shown when isTeam */}
        {isTeam && (
          <>
            <div>
              <label className={labelCls}>Team Name (optional)</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Team Alpha"
                className={inputCls}
              />
            </div>

            {/* Team members builder */}
            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">
                  Team Members{' '}
                  <span className="text-slate-600">
                    (club member, guest, or external)
                  </span>
                </label>
                {!showAdder && (
                  <button
                    type="button"
                    onClick={() => setShowAdder(true)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z" />
                    </svg>
                    Add Member
                  </button>
                )}
              </div>

              {/* Member chips */}
              {teamMembers.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {teamMembers.map((m) => (
                    <div
                      key={m.localId}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                        m.type === 'club'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : m.type === 'guest'
                            ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                            : 'border-slate-600/40 bg-slate-700/40 text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] opacity-70">
                        {m.type === 'club'
                          ? '🏫'
                          : m.type === 'guest'
                            ? '🙋'
                            : '🌐'}
                      </span>
                      {m.profile_url ? (
                        <a
                          href={m.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:opacity-80"
                        >
                          {m.name}
                        </a>
                      ) : (
                        <span>{m.name}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTeamMember(m.localId)}
                        className="ml-0.5 opacity-50 hover:opacity-100"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline adder */}
              {showAdder && (
                <div className="space-y-2.5 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3">
                  {/* Type tabs */}
                  <div className="flex gap-1">
                    {['club', 'guest', 'external'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setAdderType(t);
                          setAdderUserId('');
                          setAdderUserSearch('');
                          setAdderName('');
                          setAdderProfileUrl('');
                        }}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                          adderType === t
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {t === 'club'
                          ? '🏫 Club Member'
                          : t === 'guest'
                            ? '🙋 Guest'
                            : '🌐 External'}
                      </button>
                    ))}
                  </div>

                  {adderType === 'club' ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={adderUserSearch}
                        onChange={(e) => {
                          setAdderUserSearch(e.target.value);
                          setAdderUserId('');
                          setAdderShowDrop(true);
                        }}
                        onFocus={() => setAdderShowDrop(true)}
                        onBlur={() =>
                          setTimeout(() => setAdderShowDrop(false), 150)
                        }
                        placeholder="Search club member…"
                        className={inputCls}
                        autoComplete="off"
                      />
                      {adderShowDrop && filteredAdderUsers.length > 0 && (
                        <div className="absolute z-30 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-800 shadow-2xl">
                          {filteredAdderUsers.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onMouseDown={() => {
                                setAdderUserId(u.id);
                                setAdderUserSearch(u.full_name ?? '');
                                setAdderShowDrop(false);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60"
                            >
                              <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-slate-700">
                                {u.avatar_url ? (
                                  <Image
                                    src={u.avatar_url}
                                    alt={u.full_name ?? ''}
                                    width={20}
                                    height={20}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                                    {u.full_name?.[0]?.toUpperCase() ?? '?'}
                                  </span>
                                )}
                              </div>
                              {u.full_name}
                            </button>
                          ))}
                        </div>
                      )}
                      {adderUserId && (
                        <p className="mt-1 text-xs text-emerald-400">
                          ✓ {adderUserSearch}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={adderName}
                        onChange={(e) => setAdderName(e.target.value)}
                        placeholder="Full name *"
                        className={inputCls}
                      />
                      <input
                        type="url"
                        value={adderProfileUrl}
                        onChange={(e) => setAdderProfileUrl(e.target.value)}
                        placeholder="Profile link (optional)"
                        className={inputCls}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addTeamMember}
                      disabled={
                        adderType === 'club' ? !adderUserId : !adderName.trim()
                      }
                      className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={resetAdder}
                      className="rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Contest Name */}
        <div>
          <label className={labelCls}>Contest / Event Name *</label>
          <input
            type="text"
            value={contestName}
            onChange={(e) => setContestName(e.target.value)}
            placeholder="e.g. ICPC Dhaka Regional 2024"
            className={inputCls}
            required
          />
        </div>

        {/* Contest URL */}
        <div>
          <label className={labelCls}>Contest URL (optional)</label>
          <input
            type="url"
            value={contestUrl}
            onChange={(e) => setContestUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select category —</option>
            {ACHIEVEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className={labelCls}>Year *</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min="2000"
            max={new Date().getFullYear() + 1}
            className={inputCls}
            required
          />
        </div>

        {/* Participation Date */}
        <div>
          <label className={labelCls}>Date of Participation (optional)</label>
          <input
            type="date"
            value={participationDate}
            onChange={(e) => setParticipationDate(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Result */}
        <div>
          <label className={labelCls}>Result (optional)</label>
          <input
            type="text"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="Participated, Finalist, 1st Place, Honorable Mention…"
            className={inputCls}
          />
        </div>

        {/* Linked Achievement */}
        <div className="md:col-span-2">
          <label className={labelCls}>
            Linked Achievement{' '}
            <span className="text-slate-600">
              (optional — only if this participation resulted in an award)
            </span>
          </label>
          <select
            value={achievementId}
            onChange={(e) => setAchievementId(e.target.value)}
            className={inputCls}
          >
            <option value="">— No linked achievement —</option>
            {achievements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.year} · {a.title} ({a.result})
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className={labelCls}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any extra context or remarks…"
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Featured Photo */}
        <div className="md:col-span-2">
          <label className={labelCls}>
            Featured Photo{' '}
            <span className="text-slate-600">(shown on public page)</span>
          </label>
          {featuredPhotoPreviewUrl ? (
            <div className="relative inline-block">
              <div className="relative h-28 w-44 overflow-hidden rounded-xl border border-slate-700/60">
                <Image
                  src={featuredPhotoPreviewUrl}
                  alt="Featured photo"
                  fill
                  className="object-cover"
                  sizes="176px"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setFeaturedPhotoFile(null);
                  setFeaturedPhotoPreviewUrl(null);
                  setClearFeaturedPhoto(true);
                  if (featuredPhotoInputRef.current)
                    featuredPhotoInputRef.current.value = '';
                }}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                title="Remove featured photo"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3 w-3"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => featuredPhotoInputRef.current?.click()}
                className="mt-1 block text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => featuredPhotoInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-dashed border-slate-700/50 bg-slate-800/40 px-4 py-2.5 text-sm text-slate-500 transition-colors hover:border-amber-500/40 hover:text-amber-400"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
              Upload featured photo
            </button>
          )}
          <input
            ref={featuredPhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFeaturedPhotoFile(f);
                setFeaturedPhotoPreviewUrl(URL.createObjectURL(f));
                setClearFeaturedPhoto(false);
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-700/50 pt-3">
        <button
          type="submit"
          disabled={pending || !contestName || !year}
          className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : isEdit ? 'Update Record' : 'Add Record'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700/60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Participation Photo Panel ─────────────────────────────────────────────────

function ParticipationPhotoPanel({ record, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    getParticipationPhotosAction(record.id).then((res) => {
      if (res?.files) setFiles(res.files);
      setLoading(false);
    });
  }, [record.id]);

  async function handleUpload(file) {
    if (!file?.type?.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.set('record_id', record.id);
    fd.set('file', file);
    const res = await uploadParticipationPhotoAction(fd);
    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setFiles((prev) => [
        ...prev,
        {
          id: res.fileId,
          name: res.name,
          url: res.url,
          uploadedAt: res.uploadedAt,
        },
      ]);
    }
    setUploading(false);
  }

  function handleFileInput(e) {
    const fileList = Array.from(e.target.files ?? []);
    fileList.forEach((f) => handleUpload(f));
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const fileList = Array.from(e.dataTransfer.files ?? []);
    fileList.forEach((f) => handleUpload(f));
  }

  async function handleDelete(fileId) {
    setDeletingId(fileId);
    setError('');
    const fd = new FormData();
    fd.set('record_id', record.id);
    fd.set('file_id', fileId);
    const res = await deleteParticipationPhotoAction(fd);
    if (res?.error) setError(res.error);
    else setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setDeletingId(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-6 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">📷</span>
                <h2 className="truncate text-base font-semibold text-white">
                  Photos — {record.contest_name}
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {record.year}
                {record.category ? ` · ${record.category}` : ''}
                {record.result ? ` · ${record.result}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {/* Upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
                dragOver
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800/40 hover:border-amber-500/50 hover:bg-amber-500/5'
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  <p className="text-sm text-slate-400">Uploading…</p>
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-8 w-8 text-slate-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.412 11.09"
                    />
                  </svg>
                  <p className="text-sm font-medium text-slate-300">
                    Drag &amp; drop images, or{' '}
                    <span className="text-amber-400">click to browse</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, WEBP, GIF — multiple files supported
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Gallery grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 text-5xl">📷</div>
                <p className="font-medium text-slate-400">No photos yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Upload images to document this participation record.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  {files.length} image{files.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-700/40 bg-slate-800"
                    >
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        className="cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        onClick={() => setLightbox(file)}
                      />
                      <div className="absolute inset-0 flex flex-col items-end justify-start gap-1 bg-black/0 p-1.5 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
                        <button
                          onClick={() => setLightbox(file)}
                          title="View full size"
                          className="rounded-lg bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-3.5 w-3.5"
                          >
                            <path d="M3.28 2.22a.75.75 0 00-1.06 1.06L5.44 6.5H3.75a.75.75 0 000 1.5h3.5a.75.75 0 00.75-.75v-3.5a.75.75 0 00-1.5 0v1.69L3.28 2.22zM13.06 11.75a.75.75 0 00-1.5 0v1.69l-3.22-3.22a.75.75 0 10-1.06 1.06l3.22 3.22H9a.75.75 0 000 1.5h3.5a.75.75 0 00.75-.75v-3.5zM13.56 2.22l-3.22 3.22V3.75a.75.75 0 00-1.5 0v3.5c0 .414.336.75.75.75h3.5a.75.75 0 000-1.5h-1.69l3.22-3.22a.75.75 0 10-1.06-1.06zM6.44 13.56l-3.22 3.22a.75.75 0 101.06 1.06l3.22-3.22v1.69a.75.75 0 001.5 0v-3.5a.75.75 0 00-.75-.75h-3.5a.75.75 0 000 1.5h1.69z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          title="Delete image"
                          className="rounded-lg bg-red-600/80 p-1.5 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === file.id ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                          ) : (
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="absolute right-0 bottom-0 left-0 translate-y-full bg-black/70 px-2 py-1 text-xs text-white opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                        <p className="truncate">{file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-700/50 px-6 py-3">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-700/60 px-5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl shadow-2xl">
              <Image
                src={lightbox.url}
                alt={lightbox.name}
                width={1200}
                height={900}
                className="max-h-[85vh] max-w-[90vw] object-contain"
                unoptimized
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              {lightbox.name}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function ParticipationHistoryModal({
  initialParticipations = [],
  users = [],
  achievements = [],
  onClose,
}) {
  const [records, setRecords] = useState(initialParticipations);
  useScrollLock();
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [photoRecord, setPhotoRecord] = useState(null);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('year');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  async function refreshRecords() {
    const res = await getParticipationRecordsAction();
    if (res?.records) setRecords(res.records);
  }

  function handleAdd() {
    setEditItem(null);
    setView('form');
  }

  function handleEdit(row) {
    setEditItem(row);
    setView('form');
  }

  async function handleFormSave() {
    // Refresh data FIRST so the list is up-to-date the moment it appears.
    try {
      const res = await getParticipationRecordsAction();
      if (res?.records) setRecords(res.records);
    } catch (_) {}
    setView('list');
    setEditItem(null);
  }

  async function handleDeleteConfirm() {
    setDeleteLoading(true);
    const fd = new FormData();
    fd.set('id', deleteId);
    const res = await deleteParticipationRecordAction(fd);
    if (!res?.error) {
      setRecords((prev) => prev.filter((r) => r.id !== deleteId));
    }
    setDeleteId(null);
    setDeleteLoading(false);
  }

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(col);
      setSortDir('asc');
    }
  }

  const allCategories = useMemo(
    () => [...new Set(records.map((r) => r.category).filter(Boolean))].sort(),
    [records]
  );

  const allYears = useMemo(
    () =>
      [...new Set(records.map((r) => r.year).filter(Boolean))].sort(
        (a, b) => b - a
      ),
    [records]
  );

  const filtered = useMemo(() => {
    let rows = [...records];
    if (categoryFilter)
      rows = rows.filter((r) => r.category === categoryFilter);
    if (yearFilter) rows = rows.filter((r) => String(r.year) === yearFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.users?.full_name?.toLowerCase().includes(q) ||
          r.contest_name?.toLowerCase().includes(q) ||
          r.result?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.team_name?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q) ||
          r.achievements?.title?.toLowerCase().includes(q) ||
          (r.team_members ?? []).some((m) => m.name?.toLowerCase().includes(q))
      );
    }
    rows.sort((a, b) => {
      let va, vb;
      if (sortBy === 'year') {
        va = a.year;
        vb = b.year;
      } else if (sortBy === 'member') {
        va = a.users?.full_name?.toLowerCase() ?? '';
        vb = b.users?.full_name?.toLowerCase() ?? '';
      } else if (sortBy === 'category') {
        va = a.category ?? '';
        vb = b.category ?? '';
      } else {
        va = a.contest_name?.toLowerCase() ?? '';
        vb = b.contest_name?.toLowerCase() ?? '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [records, search, categoryFilter, yearFilter, sortBy, sortDir]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = filtered.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE
  );

  function handleExportCSV() {
    const headers = [
      'Representative',
      'Type',
      'Team Name',
      'Team Members',
      'Contest',
      'Contest URL',
      'Category',
      'Year',
      'Date',
      'Result',
      'Linked Achievement',
      'Notes',
    ];
    const rows = filtered.map((r) => [
      r.users?.full_name ?? '',
      r.is_team ? 'Team' : 'Individual',
      r.team_name ?? '',
      (r.team_members ?? []).map((m) => m.name).join('; '),
      r.contest_name,
      r.contest_url ?? '',
      r.category ?? '',
      r.year,
      r.participation_date ?? '',
      r.result ?? '',
      r.achievements?.title ?? '',
      r.notes ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participation-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-2 backdrop-blur-sm sm:p-3">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between rounded-t-2xl border-b border-slate-700/50 bg-slate-900 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                📋 Participation History
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {view === 'form'
                  ? editItem
                    ? 'Editing record'
                    : 'New participation record'
                  : `${records.length} record${records.length !== 1 ? 's' : ''} — participation ≠ achievement`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {view === 'list' ? (
                <>
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                    Add Record
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={filtered.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-40"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Export CSV
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setView('list');
                    setEditItem(null);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
                >
                  ← Back to list
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────────────── */}
          {view === 'form' ? (
            <RecordForm
              record={editItem}
              users={users}
              achievements={achievements}
              onSave={handleFormSave}
              onCancel={() => {
                setView('list');
                setEditItem(null);
              }}
            />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 border-b border-slate-700/40 px-6 py-3">
                <div className="relative min-w-48 flex-1">
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search member, contest, result…"
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-800/60 py-1.5 pr-4 pl-9 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">All categories</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">All years</option>
                  {allYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {(search || categoryFilter || yearFilter) && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setCategoryFilter('');
                      setYearFilter('');
                    }}
                    className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    ✕ Clear
                  </button>
                )}
                <p className="ml-auto self-center text-xs text-slate-500">
                  {filtered.length === 0
                    ? '0 records'
                    : `${(currentPage - 1) * TABLE_PAGE_SIZE + 1}\u2013${Math.min(currentPage * TABLE_PAGE_SIZE, filtered.length)} of ${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="mb-3 text-5xl">🏟️</div>
                    <p className="font-medium text-slate-400">
                      {records.length === 0
                        ? 'No participation records yet'
                        : 'No records match your filters'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {records.length === 0
                        ? 'Participation is tracked separately from achievements — someone can participate without winning.'
                        : 'Try adjusting your search or filters.'}
                    </p>
                    {records.length === 0 && (
                      <button
                        onClick={handleAdd}
                        className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                      >
                        Add First Record
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-900/95">
                      <tr className="border-b border-slate-700/50">
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => toggleSort('member')}
                            className="flex items-center gap-1 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-white"
                          >
                            Member{' '}
                            <SortIcon
                              col="member"
                              sortBy={sortBy}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className="hidden px-4 py-3 text-left md:table-cell">
                          <button
                            onClick={() => toggleSort('contest')}
                            className="flex items-center gap-1 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-white"
                          >
                            Contest{' '}
                            <SortIcon
                              col="contest"
                              sortBy={sortBy}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className="hidden px-4 py-3 text-left sm:table-cell">
                          <button
                            onClick={() => toggleSort('category')}
                            className="flex items-center gap-1 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-white"
                          >
                            Category{' '}
                            <SortIcon
                              col="category"
                              sortBy={sortBy}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => toggleSort('year')}
                            className="flex items-center gap-1 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-white"
                          >
                            Year{' '}
                            <SortIcon
                              col="year"
                              sortBy={sortBy}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className="hidden px-4 py-3 text-left sm:table-cell">
                          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Result
                          </span>
                        </th>
                        <th className="hidden px-4 py-3 text-left lg:table-cell">
                          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Achievement
                          </span>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Actions
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedRows.map((row) => {
                        const catConf = getCategoryConfig(row.category);
                        return (
                          <tr
                            key={row.id}
                            className="transition-colors hover:bg-slate-800/40"
                          >
                            {/* Member */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-700">
                                  {row.users?.avatar_url ? (
                                    <Image
                                      src={row.users.avatar_url}
                                      alt={row.users.full_name ?? ''}
                                      width={28}
                                      height={28}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                      {(
                                        row.users?.full_name?.[0] ??
                                        (row.team_members ?? [])[0]
                                          ?.name?.[0] ??
                                        '?'
                                      ).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="max-w-28 truncate font-medium text-white">
                                      {row.users?.full_name ??
                                        (row.team_members ?? [])[0]?.name ??
                                        'Unknown'}
                                    </span>
                                    {row.is_team ? (
                                      <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                                        👥 Team
                                      </span>
                                    ) : (
                                      <span className="shrink-0 rounded-full border border-slate-600/40 bg-slate-700/40 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                                        👤 Solo
                                      </span>
                                    )}
                                  </div>
                                  {row.is_team && row.team_name && (
                                    <p className="max-w-28 truncate text-xs text-slate-500">
                                      {row.team_name}
                                    </p>
                                  )}
                                  {row.is_team &&
                                    (row.team_members ?? []).length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {(row.team_members ?? [])
                                          .slice(0, 3)
                                          .map((m, i) => (
                                            <span
                                              key={i}
                                              className={`inline-flex max-w-20 items-center truncate rounded-full px-1.5 py-0.5 text-[10px] ${
                                                m.type === 'club'
                                                  ? 'bg-emerald-500/10 text-emerald-400'
                                                  : m.type === 'guest'
                                                    ? 'bg-sky-500/10 text-sky-400'
                                                    : 'bg-slate-700/50 text-slate-400'
                                              }`}
                                            >
                                              {m.profile_url ? (
                                                <a
                                                  href={m.profile_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="truncate underline underline-offset-1 hover:opacity-80"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  {m.name}
                                                </a>
                                              ) : (
                                                <span className="truncate">
                                                  {m.name}
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                        {(row.team_members ?? []).length >
                                          3 && (
                                          <span className="rounded-full bg-slate-700/40 px-1.5 py-0.5 text-[10px] text-slate-500">
                                            +{row.team_members.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </td>

                            {/* Contest */}
                            <td className="hidden px-4 py-3 md:table-cell">
                              {row.contest_url ? (
                                <a
                                  href={row.contest_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="max-w-48 truncate font-medium text-sky-400 underline-offset-2 hover:underline"
                                >
                                  {row.contest_name}
                                </a>
                              ) : (
                                <span className="max-w-48 truncate font-medium text-white">
                                  {row.contest_name}
                                </span>
                              )}
                            </td>

                            {/* Category */}
                            <td className="hidden px-4 py-3 sm:table-cell">
                              {row.category ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${catConf.color}`}
                                >
                                  {catConf.emoji} {row.category}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-600">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Year */}
                            <td className="px-4 py-3">
                              <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">
                                {row.year}
                              </span>
                            </td>

                            {/* Result */}
                            <td className="hidden px-4 py-3 sm:table-cell">
                              {row.result ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                  {row.result.split('*').map((part, i, arr) =>
                                    i < arr.length - 1 ? (
                                      <span key={i}>
                                        {part}
                                        <sup>*</sup>
                                      </span>
                                    ) : (
                                      <span key={i}>{part}</span>
                                    )
                                  )}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-600">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Linked Achievement */}
                            <td className="hidden px-4 py-3 lg:table-cell">
                              {row.achievements ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300">
                                  🏅 {row.achievements.title}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-600">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setPhotoRecord(row)}
                                  title="Manage photos"
                                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-sky-400"
                                >
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="h-3.5 w-3.5"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleEdit(row)}
                                  title="Edit record"
                                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-amber-400"
                                >
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="h-3.5 w-3.5"
                                  >
                                    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.629-.629z" />
                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setDeleteId(row.id)}
                                  title="Delete record"
                                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="h-3.5 w-3.5"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-3 border-t border-slate-700/40 px-6 py-3 sm:flex-row sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(1)}
                      disabled={currentPage <= 1}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                      title="First page"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                    >
                      ‹ Prev
                    </button>
                    {getPageNumbers(currentPage, totalPages).map((p, i) =>
                      p === '…' ? (
                        <span
                          key={`e${i}`}
                          className="px-1.5 text-xs text-slate-600"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                            p === currentPage
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'border border-slate-700/50 bg-slate-800/60 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                      title="Last page"
                    >
                      »»
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          {isPending && (
            <div className="flex items-center gap-2 border-t border-slate-700/50 px-6 py-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <span className="text-xs text-slate-500">
                Refreshing records…
              </span>
            </div>
          )}
          <div className="shrink-0 rounded-b-2xl border-t border-slate-700/50 px-6 py-3">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-700/60 px-5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Close
            </button>
          </div>

          {/* ── Delete Confirm ───────────────────────────────────────────────── */}
          {deleteId && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl">
                <div className="mb-4 text-center text-3xl">🗑️</div>
                <h3 className="mb-1 text-center text-sm font-semibold text-white">
                  Delete Participation Record?
                </h3>
                <p className="mb-5 text-center text-xs text-slate-500">
                  This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteLoading}
                    className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setDeleteId(null)}
                    disabled={deleteLoading}
                    className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/60 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {photoRecord && (
        <ParticipationPhotoPanel
          record={photoRecord}
          onClose={() => setPhotoRecord(null)}
        />
      )}
    </>
  );
}
