/**
 * @file Create User Client
 * @module CreateUserClient
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import {
  User,
  Mail,
  Shield,
  Check,
  BookOpen,
  Briefcase,
  Calendar,
  GraduationCap,
  Link2,
  FileText,
} from 'lucide-react';

const roles = ['member', 'advisor', 'admin', 'mentor', 'executive'];

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pr-4 pl-10 text-white placeholder-gray-400 transition-colors focus:border-blue-500/50 focus:outline-none';
const inputNoPadCls =
  'w-full rounded-lg border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder-gray-400 transition-colors focus:border-blue-500/50 focus:outline-none';
const labelCls = 'block text-sm font-medium text-gray-300';

export default function CreateUserClient() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Role-specific profile fields
  // Member
  const [studentId, setStudentId] = useState('');
  const [academicSession, setAcademicSession] = useState('');
  const [memberDepartment, setMemberDepartment] = useState('');

  // Advisor
  const [advisorPosition, setAdvisorPosition] = useState('');
  const [advisorProfileLink, setAdvisorProfileLink] = useState('');
  const [advisorDepartment, setAdvisorDepartment] = useState('');

  // Admin & Mentor
  const [bio, setBio] = useState('');

  // Executive
  const [positionId, setPositionId] = useState('');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);

  const buildProfileData = () => {
    switch (role) {
      case 'member':
        return {
          student_id: studentId,
          academic_session: academicSession,
          department: memberDepartment,
        };
      case 'advisor':
        return {
          position: advisorPosition,
          profile_link: advisorProfileLink,
          department: advisorDepartment,
        };
      case 'admin':
        return { bio };
      case 'mentor':
        return { bio };
      case 'executive':
        return {
          position_id: positionId || null,
          term_start: termStart || null,
          term_end: termEnd || null,
          is_current: isCurrent,
          bio,
        };
      default:
        return {};
    }
  };

  const validateProfileData = () => {
    if (role === 'member') {
      if (
        !studentId.trim() ||
        !academicSession.trim() ||
        !memberDepartment.trim()
      ) {
        return 'Student ID, Academic Session, and Department are required for members.';
      }
    }
    if (role === 'advisor') {
      if (
        !advisorPosition.trim() ||
        !advisorProfileLink.trim() ||
        !advisorDepartment.trim()
      ) {
        return 'Position, Profile Link, and Department are required for advisors.';
      }
    }
    if (role === 'executive') {
      if (!positionId.trim() || !termStart || !termEnd) {
        return 'Position ID, Term Start, and Term End are required for executives.';
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateProfileData();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Creating user...');

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          role,
          profileData: buildProfileData(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      toast.success(
        `User "${fullName}" created with role "${role}". Account status is inactive — send verification email to activate.`,
        { id: loadingToast, duration: 5000 }
      );

      setTimeout(() => {
        router.push('/account/admin/users');
      }, 2000);
    } catch (error) {
      toast.error(`Error: ${error.message}`, { id: loadingToast });
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#333', color: '#fff' },
        }}
      />
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className={labelCls}>
              Full Name
            </label>
            <div className="relative mt-2">
              <User className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputCls}
                placeholder="e.g., John Doe"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={labelCls}>
              Email Address
            </label>
            <div className="relative mt-2">
              <Mail className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
                placeholder="e.g., user@example.com"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className={labelCls}>
              Assign Role
            </label>
            <div className="relative mt-2">
              <Shield className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className={`${inputCls} appearance-none`}
              >
                {roles.map((r) => (
                  <option key={r} value={r} className="bg-gray-800 text-white">
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ═══ Role-Specific Profile Fields ═══ */}

          {/* Member Profile Fields */}
          {role === 'member' && (
            <div className="space-y-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                <GraduationCap className="h-4 w-4" />
                Member Profile (Required)
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className={inputNoPadCls}
                    placeholder="e.g., 20241234"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Academic Session *
                  </label>
                  <input
                    type="text"
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    className={inputNoPadCls}
                    placeholder="e.g., 50th"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={memberDepartment}
                    onChange={(e) => setMemberDepartment(e.target.value)}
                    className={inputNoPadCls}
                    placeholder="e.g., CSE"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Advisor Profile Fields */}
          {role === 'advisor' && (
            <div className="space-y-4 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
                <Briefcase className="h-4 w-4" />
                Advisor Profile (Required)
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Position *
                  </label>
                  <input
                    type="text"
                    value={advisorPosition}
                    onChange={(e) => setAdvisorPosition(e.target.value)}
                    className={inputNoPadCls}
                    placeholder="e.g., Assistant Professor"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={advisorDepartment}
                    onChange={(e) => setAdvisorDepartment(e.target.value)}
                    className={inputNoPadCls}
                    placeholder="e.g., Computer Science & Engineering"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Profile Link *
                </label>
                <input
                  type="url"
                  value={advisorProfileLink}
                  onChange={(e) => setAdvisorProfileLink(e.target.value)}
                  className={inputNoPadCls}
                  placeholder="https://faculty.example.com/profile"
                  required
                />
              </div>
            </div>
          )}

          {/* Admin Profile Fields */}
          {role === 'admin' && (
            <div className="space-y-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-300">
                <Shield className="h-4 w-4" />
                Admin Profile
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Bio (optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className={inputNoPadCls}
                  placeholder="Short bio or description..."
                />
              </div>
            </div>
          )}

          {/* Mentor Profile Fields */}
          {role === 'mentor' && (
            <div className="space-y-4 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-300">
                <BookOpen className="h-4 w-4" />
                Mentor Profile
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Bio (optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className={inputNoPadCls}
                  placeholder="Short bio or description..."
                />
              </div>
            </div>
          )}

          {/* Executive (Committee Member) Profile Fields */}
          {role === 'executive' && (
            <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                <Briefcase className="h-4 w-4" />
                Executive Profile (Required)
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Position ID *
                  </label>
                  <input
                    type="text"
                    value={positionId}
                    onChange={(e) => setPositionId(e.target.value)}
                    className={inputNoPadCls}
                    placeholder="Committee position ID"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={isCurrent}
                      onChange={(e) => setIsCurrent(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500"
                    />
                    Is Current Executive
                  </label>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Term Start *
                  </label>
                  <input
                    type="date"
                    value={termStart}
                    onChange={(e) => setTermStart(e.target.value)}
                    className={inputNoPadCls}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Term End *
                  </label>
                  <input
                    type="date"
                    value={termEnd}
                    onChange={(e) => setTermEnd(e.target.value)}
                    className={inputNoPadCls}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Bio (optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className={inputNoPadCls}
                  placeholder="Short bio or description..."
                />
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
            <p className="text-sm text-yellow-300">
              The user will be created with <strong>inactive</strong> status.
              Use the activation panel to send a verification email.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-green-500/20 px-4 py-2.5 font-semibold text-green-300 transition-colors hover:bg-green-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
