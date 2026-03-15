'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  User,
  Shield,
  BookOpen,
  Briefcase,
  FileText,
} from 'lucide-react';
import {
  updateUserAction,
  uploadUserImageAction,
  getUserProfileForAdminAction,
} from '@/app/_lib/user-actions';
import { driveImageUrl } from '@/app/_lib/utils';

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20';
const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-400';

const STATUS_OPTIONS = [
  'active',
  'inActive',
  'pending',
  'rejected',
  'suspended',
  'locked',
  'banned',
];

function hasRole(roles, target) {
  return roles.includes(target);
}

export default function UserFormPanel({ user, onClose, onRefresh }) {
  const [isPending, startTransition] = useTransition();
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [roles, setRoles] = useState([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [accountStatus, setAccountStatus] = useState('pending');
  const [statusReason, setStatusReason] = useState('');

  const [studentId, setStudentId] = useState('');
  const [sessionValue, setSessionValue] = useState('');
  const [department, setDepartment] = useState('');
  const [memberBio, setMemberBio] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [codeforces, setCodeforces] = useState('');
  const [vjudge, setVjudge] = useState('');
  const [atcoder, setAtcoder] = useState('');
  const [leetcode, setLeetcode] = useState('');

  const [advisorPosition, setAdvisorPosition] = useState('');
  const [advisorProfileLink, setAdvisorProfileLink] = useState('');
  const [advisorDepartment, setAdvisorDepartment] = useState('');

  const [adminBio, setAdminBio] = useState('');
  const [mentorBio, setMentorBio] = useState('');

  const [committeePositionId, setCommitteePositionId] = useState('');
  const [committeeTermStart, setCommitteeTermStart] = useState('');
  const [committeeTermEnd, setCommitteeTermEnd] = useState('');
  const [committeeIsCurrent, setCommitteeIsCurrent] = useState(true);
  const [committeeBio, setCommitteeBio] = useState('');

  const [uploading, setUploading] = useState(false);

  const showMemberFields = useMemo(() => hasRole(roles, 'member'), [roles]);
  const showAdvisorFields = useMemo(() => hasRole(roles, 'advisor'), [roles]);
  const showAdminFields = useMemo(() => hasRole(roles, 'admin'), [roles]);
  const showMentorFields = useMemo(() => hasRole(roles, 'mentor'), [roles]);
  const showExecutiveFields = useMemo(
    () => hasRole(roles, 'executive'),
    [roles]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setIsFetching(true);
        setError(null);

        const profile = await getUserProfileForAdminAction(user.id);
        if (cancelled) return;

        const effectiveRoles =
          profile?.roles?.length > 0
            ? profile.roles
            : Array.isArray(user.roles) && user.roles.length > 0
              ? user.roles.map((r) => String(r).toLowerCase())
              : user.role
                ? [String(user.role).toLowerCase()]
                : [];

        setRoles(effectiveRoles);

        setName(profile?.full_name || user.name || '');
        setEmail(profile?.email || user.email || '');
        setPhone(profile?.phone || '');
        setAvatar(profile?.avatar_url || user.avatar || '');
        const rawStatus = profile?.account_status || user.status || 'pending';
        setAccountStatus(
          rawStatus.toLowerCase() === 'inactive'
            ? 'inActive'
            : rawStatus.toLowerCase()
        );
        setStatusReason(profile?.status_reason || user.statusReason || '');

        const mp = profile?.member_profile || {};
        setStudentId(mp.student_id || '');
        setSessionValue(mp.academic_session || mp.session || '');
        setDepartment(mp.department || '');
        setMemberBio(mp.bio || '');
        setGithub(mp.github || '');
        setLinkedin(mp.linkedin || '');
        setCodeforces(mp.codeforces_handle || '');
        setVjudge(mp.vjudge_handle || '');
        setAtcoder(mp.atcoder_handle || '');
        setLeetcode(mp.leetcode_handle || '');

        const ap = profile?.advisor_profile || {};
        setAdvisorPosition(ap.position || '');
        setAdvisorProfileLink(ap.profile_link || '');
        setAdvisorDepartment(ap.department || '');

        const adp = profile?.admin_profile || {};
        setAdminBio(adp.bio || '');

        const mtp = profile?.mentor_profile || {};
        setMentorBio(mtp.bio || '');

        const cp = profile?.committee_profile || {};
        setCommitteePositionId(cp.position_id || '');
        setCommitteeTermStart(cp.term_start || '');
        setCommitteeTermEnd(cp.term_end || '');
        setCommitteeIsCurrent(Boolean(cp.is_current));
        setCommitteeBio(cp.bio || '');
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load user profile.');
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [
    user.id,
    user.name,
    user.email,
    user.avatar,
    user.status,
    user.statusReason,
    user.role,
    user.roles,
  ]);

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', user.id);
      const result = await uploadUserImageAction(fd);
      if (result?.error) throw new Error(result.error);
      if (!result?.url) throw new Error('Image upload failed.');
      setAvatar(result.url);
    } catch (err) {
      setError(err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function validateForm() {
    if (!name.trim()) return 'Name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!statusReason.trim()) return 'Status reason is required.';

    if (showMemberFields) {
      if (!studentId.trim() || !sessionValue.trim() || !department.trim()) {
        return 'Member requires Student ID, Session, and Department.';
      }
    }

    if (showAdvisorFields) {
      if (
        !advisorPosition.trim() ||
        !advisorProfileLink.trim() ||
        !advisorDepartment.trim()
      ) {
        return 'Advisor requires Position, Profile Link, and Department.';
      }
    }

    if (showExecutiveFields) {
      if (
        !String(committeePositionId).trim() ||
        !String(committeeTermStart).trim() ||
        !String(committeeTermEnd).trim()
      ) {
        return 'Executive requires Position ID, Term Start, and Term End.';
      }
    }

    return null;
  }

  function handleSave(e) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setSuccess(false);

        const fd = new FormData();
        fd.append('userId', user.id);
        fd.append('name', name.trim());
        fd.append('email', email.trim());
        fd.append('phone', phone.trim());
        fd.append('avatar', avatar.trim());
        fd.append('account_status', accountStatus);
        fd.append('status_reason', statusReason.trim());

        if (showMemberFields) {
          fd.append('studentId', studentId.trim());
          fd.append('academic_session', sessionValue.trim());
          fd.append('department', department.trim());
          fd.append('bio', memberBio.trim());
          fd.append('github', github.trim());
          fd.append('linkedin', linkedin.trim());
          fd.append('codeforces_handle', codeforces.trim());
          fd.append('vjudge_handle', vjudge.trim());
          fd.append('atcoder_handle', atcoder.trim());
          fd.append('leetcode_handle', leetcode.trim());
        }

        if (showAdvisorFields) {
          fd.append('advisor_position', advisorPosition.trim());
          fd.append('advisor_profile_link', advisorProfileLink.trim());
          fd.append('advisor_department', advisorDepartment.trim());
        }

        if (showAdminFields) {
          fd.append('admin_bio', adminBio.trim());
        }

        if (showMentorFields) {
          fd.append('mentor_bio', mentorBio.trim());
        }

        if (showExecutiveFields) {
          fd.append(
            'committee_position_id',
            String(committeePositionId).trim()
          );
          fd.append('committee_term_start', String(committeeTermStart).trim());
          fd.append('committee_term_end', String(committeeTermEnd).trim());
          fd.append(
            'committee_is_current',
            committeeIsCurrent ? 'true' : 'false'
          );
          fd.append('committee_bio', committeeBio.trim());
        }

        const res = await updateUserAction(fd);
        if (!res?.success) {
          throw new Error(res?.error || 'Failed to update user.');
        }

        setSuccess(true);
        onRefresh?.(user.id, {
          name,
          email,
          avatar,
          studentId,
        });
      } catch (err) {
        setError(err.message || 'An unexpected error occurred.');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d14] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit User</h2>
            <p className="text-xs text-gray-500">
              Update account, role profile, and status details
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending || uploading}
            className="rounded-lg border border-white/10 p-2 text-gray-400 transition-colors hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isFetching ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="max-h-[80vh] overflow-y-auto p-5"
          >
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-white/8 bg-white/4 p-4">
                  <div className="mx-auto mb-3 h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {avatar && !avatar.match(/^[A-Z?]{1,2}$/) ? (
                      <Image
                        src={driveImageUrl(avatar)}
                        alt="Avatar"
                        width={112}
                        height={112}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-blue-300">
                        {avatar || name?.slice(0, 1)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Uploading...' : 'Upload Avatar'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading || isPending}
                    />
                  </label>

                  <p className="mt-2 text-center text-[11px] text-gray-500">
                    Roles: {roles.length > 0 ? roles.join(', ') : 'none'}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    User updated successfully.
                  </div>
                )}

                <section className="rounded-xl border border-white/8 bg-white/4 p-4">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                    <User className="h-4 w-4 text-blue-300" />
                    Account
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Full Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                        type="email"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Avatar URL</label>
                      <input
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Account Status</label>
                      <select
                        value={accountStatus}
                        onChange={(e) => setAccountStatus(e.target.value)}
                        className={inputCls}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option
                            key={status}
                            value={status}
                            className="bg-gray-900 text-white"
                          >
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>
                        Status Reason (required)
                      </label>
                      <textarea
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        rows={2}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </section>

                {showMemberFields && (
                  <section className="rounded-xl border border-white/8 bg-white/4 p-4">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                      <BookOpen className="h-4 w-4 text-emerald-300" />
                      Member Profile
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className={labelCls}>Student ID</label>
                        <input
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Session</label>
                        <input
                          value={sessionValue}
                          onChange={(e) => setSessionValue(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Department</label>
                        <input
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>GitHub</label>
                        <input
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>LinkedIn</label>
                        <input
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Codeforces</label>
                        <input
                          value={codeforces}
                          onChange={(e) => setCodeforces(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>VJudge</label>
                        <input
                          value={vjudge}
                          onChange={(e) => setVjudge(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>AtCoder</label>
                        <input
                          value={atcoder}
                          onChange={(e) => setAtcoder(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>LeetCode</label>
                        <input
                          value={leetcode}
                          onChange={(e) => setLeetcode(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className={labelCls}>Bio</label>
                      <textarea
                        value={memberBio}
                        onChange={(e) => setMemberBio(e.target.value)}
                        rows={3}
                        className={inputCls}
                      />
                    </div>
                  </section>
                )}

                {showAdvisorFields && (
                  <section className="rounded-xl border border-white/8 bg-white/4 p-4">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                      <Briefcase className="h-4 w-4 text-cyan-300" />
                      Advisor Profile
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Position</label>
                        <input
                          value={advisorPosition}
                          onChange={(e) => setAdvisorPosition(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Department</label>
                        <input
                          value={advisorDepartment}
                          onChange={(e) => setAdvisorDepartment(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className={labelCls}>Profile Link</label>
                      <input
                        value={advisorProfileLink}
                        onChange={(e) => setAdvisorProfileLink(e.target.value)}
                        className={inputCls}
                        type="url"
                      />
                    </div>
                  </section>
                )}

                {showAdminFields && (
                  <section className="rounded-xl border border-white/8 bg-white/4 p-4">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                      <Shield className="h-4 w-4 text-red-300" />
                      Admin Profile
                    </h3>
                    <label className={labelCls}>Bio (optional)</label>
                    <textarea
                      value={adminBio}
                      onChange={(e) => setAdminBio(e.target.value)}
                      rows={3}
                      className={inputCls}
                    />
                  </section>
                )}

                {showMentorFields && (
                  <section className="rounded-xl border border-white/8 bg-white/4 p-4">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                      <FileText className="h-4 w-4 text-blue-300" />
                      Mentor Profile
                    </h3>
                    <label className={labelCls}>Bio (optional)</label>
                    <textarea
                      value={mentorBio}
                      onChange={(e) => setMentorBio(e.target.value)}
                      rows={3}
                      className={inputCls}
                    />
                  </section>
                )}

                {showExecutiveFields && (
                  <section className="rounded-xl border border-white/8 bg-white/4 p-4">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                      <Briefcase className="h-4 w-4 text-amber-300" />
                      Executive Profile
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Position ID</label>
                        <input
                          value={committeePositionId}
                          onChange={(e) =>
                            setCommitteePositionId(e.target.value)
                          }
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Term Start</label>
                        <input
                          value={committeeTermStart}
                          onChange={(e) =>
                            setCommitteeTermStart(e.target.value)
                          }
                          className={inputCls}
                          type="date"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Term End</label>
                        <input
                          value={committeeTermEnd}
                          onChange={(e) => setCommitteeTermEnd(e.target.value)}
                          className={inputCls}
                          type="date"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={committeeIsCurrent}
                            onChange={(e) =>
                              setCommitteeIsCurrent(e.target.checked)
                            }
                            className="h-4 w-4"
                          />
                          Is Current
                        </label>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className={labelCls}>Bio (optional)</label>
                      <textarea
                        value={committeeBio}
                        onChange={(e) => setCommitteeBio(e.target.value)}
                        rows={3}
                        className={inputCls}
                      />
                    </div>
                  </section>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                    disabled={isPending || uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || uploading || isFetching}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
