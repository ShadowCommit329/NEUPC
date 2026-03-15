/**
 * @file Membership application client — multi-step form for guests
 *   to submit club membership requests with personal and academic
 *   information.
 * @module GuestMembershipApplicationClient
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  BookOpen,
  GraduationCap,
  Phone,
  Github,
  Linkedin,
  Code,
  Code2,
  FileText,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader,
  CheckCircle,
  AlertCircle,
  Building,
  Hash,
  Star,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { submitMembershipApplicationAction } from '@/app/_lib/user-actions';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical & Electronic Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Business Administration',
  'English',
  'Law',
  'Pharmacy',
  'Architecture',
  'Other',
];

const BATCHES = Array.from({ length: 12 }, (_, i) => {
  const start = 2019 + i;
  return `${start}-${String(start + 1).slice(-2)}`;
});

const SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

const STEPS = [
  { id: 1, label: 'Basic Info', icon: User },
  { id: 2, label: 'Academic', icon: GraduationCap },
  { id: 3, label: 'Competitive', icon: Code },
  { id: 4, label: 'About You', icon: FileText },
];

function InputField({
  label,
  id,
  required,
  icon: Icon,
  hint,
  error,
  className = '',
  ...props
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-300"
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-500" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        id={id}
        name={id}
        className={`w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 ${error ? 'border-red-500/50' : ''} ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1 text-[11px] text-gray-600">{hint}</p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  id,
  required,
  icon: Icon,
  options,
  placeholder,
  error,
  ...props
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-300"
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-500" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <select
        id={id}
        name={id}
        className={`w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white transition-all outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 ${error ? 'border-red-500/50' : ''}`}
        {...props}
      >
        <option value="" className="bg-gray-900 text-gray-500">
          {placeholder || 'Select…'}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-gray-900">
            {o}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export default function MembershipApplicationClient({
  userData,
  latestApplication,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [reapplying, setReapplying] = useState(false);

  const prefill = latestApplication ?? {};

  const [form, setForm] = useState({
    student_id: prefill.student_id || userData?.student_id || '',
    session: prefill.session || prefill.batch || '',
    department: prefill.department || '',
    phone: prefill.phone || '',
    semester: '',
    cgpa: '',
    github: prefill.github || '',
    linkedin: '',
    codeforces_handle: prefill.codeforces_handle || '',
    vjudge_handle: '',
    atcoder_handle: '',
    leetcode_handle: '',
    interests: Array.isArray(prefill.interests)
      ? prefill.interests.join(', ')
      : prefill.interests || '',
    reason: prefill.reason || '',
  });

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.student_id.trim()) errs.student_id = 'Student ID is required.';
      if (!form.session) errs.session = 'Session is required.';
      if (!form.department) errs.department = 'Department is required.';
    }
    if (s === 4) {
      if (!form.reason.trim())
        errs.reason = 'Please tell us why you want to join.';
    }
    return errs;
  };

  const nextStep = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateStep(4);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setServerError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v) fd.append(k, v);
        });
        // Pass the existing join_request id if editing a pending application
        if (latestApplication?.status === 'pending' && latestApplication?.id) {
          fd.append('joinRequestId', latestApplication.id);
        }
        await submitMembershipApplicationAction(fd);
        setSubmitted(true);
      } catch (err) {
        setServerError(
          err.message || 'Something went wrong. Please try again.'
        );
      }
    });
  };

  // ── Pending screen ────────────────────────────────────────────────────────
  if (latestApplication?.status === 'pending' && !reapplying) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-500/30">
          <Clock className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-white">
          Application Under Review
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-400">
          Your membership application submitted on{' '}
          <span className="font-medium text-gray-300">
            {new Date(latestApplication.created_at).toLocaleDateString(
              'en-US',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }
            )}
          </span>{' '}
          is currently being reviewed. You can still edit it before a decision
          is made.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <a
            href="/account/guest"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/10"
          >
            Back to Dashboard
          </a>
          <button
            onClick={() => {
              setReapplying(true);
              setStep(1);
              setErrors({});
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <RefreshCw className="h-4 w-4" />
            Edit Application
          </button>
        </div>
      </div>
    );
  }

  // ── Rejected screen ───────────────────────────────────────────────────────
  if (latestApplication?.status === 'rejected' && !reapplying) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-2 ring-red-500/30">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-white">
          Application Rejected
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-400">
          Your application submitted on{' '}
          <span className="font-medium text-gray-300">
            {new Date(latestApplication.created_at).toLocaleDateString(
              'en-US',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }
            )}
          </span>{' '}
          was not approved.
        </p>
        {latestApplication.rejection_reason && (
          <div className="mt-4 max-w-sm rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-left">
            <p className="mb-1 text-[10px] font-semibold tracking-widest text-red-400 uppercase">
              Rejection Reason
            </p>
            <p className="text-sm text-gray-300">
              {latestApplication.rejection_reason}
            </p>
          </div>
        )}
        <div className="mt-8 flex items-center gap-3">
          <a
            href="/account/guest"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/10"
          >
            Back to Dashboard
          </a>
          <button
            onClick={() => {
              setReapplying(true);
              setStep(1);
              setErrors({});
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <RefreshCw className="h-4 w-4" />
            Re-apply
          </button>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-white">
          Application Submitted!
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-400">
          Your membership application has been received. Our team will review it
          within{' '}
          <span className="font-medium text-gray-300">2–3 business days</span>.
        </p>
        <button
          onClick={() => router.push('/account/guest')}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/25">
          <Star className="h-7 w-7 text-blue-400" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">
          {reapplying ? 'Re-apply for Membership' : 'Membership Application'}
        </h1>
        <p className="mt-1.5 text-sm text-gray-400">
          Join NEUPC and become part of our competitive programming community.
        </p>
        {reapplying && (
          <div className="mx-auto mt-3 flex max-w-sm items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3.5 py-2 text-xs text-amber-300">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            {latestApplication?.status === 'pending'
              ? 'Editing your pending application — changes will update your submission.'
              : 'Re-applying — your previous answers have been pre-filled.'}
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div
                key={s.id}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                      : isActive
                        ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50'
                        : 'bg-white/5 text-gray-600 ring-1 ring-white/10'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`hidden text-[10px] font-medium sm:block ${isActive ? 'text-blue-400' : isDone ? 'text-emerald-400' : 'text-gray-600'}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/3 backdrop-blur-sm">
        <div className="h-px w-full bg-linear-to-r from-blue-500/40 to-transparent" />

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div className="space-y-5">
              <SectionTitle icon={User} title="Personal Information" />

              {/* Pre-filled read-only */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadonlyField
                  label="Full Name"
                  icon={User}
                  value={userData?.full_name || '—'}
                />
                <ReadonlyField
                  label="Email Address"
                  icon={Mail}
                  value={userData?.email || '—'}
                />
              </div>

              <InputField
                label="Student ID"
                id="student_id"
                icon={Hash}
                required
                placeholder="e.g. 2021-1-60-016"
                value={form.student_id}
                onChange={set('student_id')}
                error={errors.student_id}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Session"
                  id="session"
                  icon={GraduationCap}
                  required
                  options={BATCHES}
                  placeholder="Select session"
                  value={form.session}
                  onChange={set('session')}
                  error={errors.session}
                />
                <SelectField
                  label="Department"
                  id="department"
                  icon={Building}
                  required
                  options={DEPARTMENTS}
                  placeholder="Select department"
                  value={form.department}
                  onChange={set('department')}
                  error={errors.department}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Phone Number"
                  id="phone"
                  icon={Phone}
                  type="tel"
                  placeholder="+880 1xxx-xxxxxx"
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Academic ── */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionTitle icon={BookOpen} title="Academic Details" />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Current Semester"
                  id="semester"
                  icon={BookOpen}
                  options={SEMESTERS}
                  placeholder="Select semester"
                  value={form.semester}
                  onChange={set('semester')}
                />
                <InputField
                  label="CGPA"
                  id="cgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  placeholder="e.g. 3.75"
                  value={form.cgpa}
                  onChange={set('cgpa')}
                  hint="Out of 4.00"
                />
              </div>

              <InputField
                label="Areas of Interest"
                id="interests"
                icon={Star}
                placeholder="e.g. Competitive Programming, Web Dev, AI/ML"
                value={form.interests}
                onChange={set('interests')}
                hint="Separate multiple interests with commas"
              />
            </div>
          )}

          {/* ── Step 3: Competitive Profiles ── */}
          {step === 3 && (
            <div className="space-y-5">
              <SectionTitle icon={Code} title="Online Profiles" />
              <p className="text-xs text-gray-500">
                All fields are optional — fill in whichever platforms you use.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="GitHub"
                  id="github"
                  icon={Github}
                  placeholder="github.com/username"
                  value={form.github}
                  onChange={set('github')}
                />
                <InputField
                  label="LinkedIn"
                  id="linkedin"
                  icon={Linkedin}
                  placeholder="linkedin.com/in/username"
                  value={form.linkedin}
                  onChange={set('linkedin')}
                />
                <InputField
                  label="Codeforces Handle"
                  id="codeforces_handle"
                  icon={Code2}
                  placeholder="your handle"
                  value={form.codeforces_handle}
                  onChange={set('codeforces_handle')}
                />
                <InputField
                  label="VJudge Handle"
                  id="vjudge_handle"
                  icon={Code2}
                  placeholder="your handle"
                  value={form.vjudge_handle}
                  onChange={set('vjudge_handle')}
                />
                <InputField
                  label="AtCoder Handle"
                  id="atcoder_handle"
                  icon={Code2}
                  placeholder="your handle"
                  value={form.atcoder_handle}
                  onChange={set('atcoder_handle')}
                />
                <InputField
                  label="LeetCode Handle"
                  id="leetcode_handle"
                  icon={Code2}
                  placeholder="your handle"
                  value={form.leetcode_handle}
                  onChange={set('leetcode_handle')}
                />
              </div>
            </div>
          )}

          {/* ── Step 4: About You ── */}
          {step === 4 && (
            <div className="space-y-5">
              <SectionTitle icon={FileText} title="Tell Us About Yourself" />

              <div>
                <label
                  htmlFor="reason"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-300"
                >
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  Why do you want to join NEUPC?
                  <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={5}
                  maxLength={800}
                  placeholder="Tell us about your interest in competitive programming, your goals, and what you hope to contribute to the club…"
                  value={form.reason}
                  onChange={set('reason')}
                  className={`w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 ${errors.reason ? 'border-red-500/50' : ''}`}
                />
                <div className="mt-1 flex items-center justify-between">
                  {errors.reason ? (
                    <p className="text-[11px] text-red-400">{errors.reason}</p>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-[11px] ${form.reason.length > 750 ? 'text-amber-400' : 'text-gray-600'}`}
                  >
                    {800 - form.reason.length} remaining
                  </span>
                </div>
              </div>

              {/* Review summary */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <p className="mb-3 text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
                  Application Summary
                </p>
                <div className="grid gap-1.5 text-xs">
                  <SummaryRow label="Student ID" value={form.student_id} />
                  <SummaryRow label="Session" value={form.session} />
                  <SummaryRow label="Department" value={form.department} />
                  {form.semester && (
                    <SummaryRow label="Semester" value={form.semester} />
                  )}
                  {form.cgpa && <SummaryRow label="CGPA" value={form.cgpa} />}
                  {form.codeforces_handle && (
                    <SummaryRow
                      label="Codeforces"
                      value={form.codeforces_handle}
                    />
                  )}
                  {form.github && (
                    <SummaryRow label="GitHub" value={form.github} />
                  )}
                </div>
              </div>

              {serverError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div
            className={`mt-8 flex items-center ${step > 1 ? 'justify-between' : 'justify-end'}`}
          >
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isPending
                  ? 'Submitting…'
                  : latestApplication?.status === 'pending' && reapplying
                    ? 'Update Application'
                    : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-gray-600">
        By submitting, you agree to abide by NEUPC&apos;s community guidelines and
        code of conduct.
      </p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15">
        <Icon className="h-3.5 w-3.5 text-blue-400" />
      </div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
    </div>
  );
}

function ReadonlyField({ label, icon: Icon, value }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-300">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-500" />}
        {label}
      </label>
      <div className="rounded-xl border border-white/8 bg-white/3 px-3.5 py-2.5 text-sm text-gray-400">
        {value}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-300">{value || '—'}</span>
    </div>
  );
}
