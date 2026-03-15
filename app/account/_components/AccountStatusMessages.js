/**
 * @file Account status message components.
 * Renders contextual status banners (pending, rejected, suspended, banned, locked)
 * with interactive message forms and countdown timers.
 *
 * @module AccountStatusMessages
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  Loader,
  Clock,
  ShieldOff,
  ShieldX,
  ShieldAlert,
  Lock,
  XCircle,
  CheckCircle,
  MessageSquare,
  Mail,
  ChevronRight,
  Timer,
  ShieldCheck,
} from 'lucide-react';

// ── Suspension countdown timer ────────────────────────────────────────────────
/** @param {{ expiresAt: string }} props */
function SuspensionTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;

    const calc = () => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) return setTimeLeft(null); // expired
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s, diff });
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return null;

  const expiredDate = new Date(expiresAt);
  const isExpired = !timeLeft;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <Timer className="h-4 w-4 text-orange-400" />
        <p className="text-[10px] font-semibold tracking-widest text-orange-400 uppercase">
          {isExpired ? 'Suspension Expired' : 'Suspension Lifts In'}
        </p>
      </div>
      {isExpired ? (
        <p className="text-sm text-gray-300">
          Your suspension expired on{' '}
          <span className="font-medium text-white">
            {expiredDate.toLocaleString()}
          </span>
          . Contact support if your account has not been reactivated.
        </p>
      ) : (
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-2">
            {timeLeft.d > 0 && (
              <span>
                <span className="text-xl font-bold text-white tabular-nums">
                  {timeLeft.d}
                </span>
                <span className="ml-1 text-xs text-gray-400">d</span>
              </span>
            )}
            <span>
              <span className="text-xl font-bold text-white tabular-nums">
                {pad(timeLeft.h)}
              </span>
              <span className="ml-1 text-xs text-gray-400">h</span>
            </span>
            <span>
              <span className="text-xl font-bold text-white tabular-nums">
                {pad(timeLeft.m)}
              </span>
              <span className="ml-1 text-xs text-gray-400">m</span>
            </span>
            <span>
              <span className="text-xl font-bold text-orange-300 tabular-nums">
                {pad(timeLeft.s)}
              </span>
              <span className="ml-1 text-xs text-gray-400">s</span>
            </span>
          </div>
          <p className="shrink-0 text-right text-[11px] text-gray-500">
            {expiredDate.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Shared message form ──────────────────────────────────────────────────────

/** @type {{ label: string, done: boolean }[]} */
const REVIEW_STEPS = [
  { label: 'Signed Up', done: true },
  { label: 'Admin Review', done: false },
  { label: 'Approved', done: false },
];

function MessageForm({
  onSubmit,
  isSubmitting,
  userMessage,
  setUserMessage,
  feedback,
  accentColor = 'amber',
  label = 'Leave us a message',
  placeholder = 'Tell us about your account...',
}) {
  const accent = {
    amber: {
      input: 'focus:border-amber-500 focus:ring-amber-500/20',
      btn: 'bg-amber-500 hover:bg-amber-400 disabled:hover:bg-amber-500',
    },
    red: {
      input: 'focus:border-red-500 focus:ring-red-500/20',
      btn: 'bg-red-600 hover:bg-red-500 disabled:hover:bg-red-600',
    },
    blue: {
      input: 'focus:border-blue-500 focus:ring-blue-500/20',
      btn: 'bg-blue-600 hover:bg-blue-500 disabled:hover:bg-blue-600',
    },
  }[accentColor] ?? {
    input: 'focus:border-amber-500 focus:ring-amber-500/20',
    btn: 'bg-amber-500 hover:bg-amber-400 disabled:hover:bg-amber-500',
  };

  const remaining = 500 - userMessage.length;
  const isNearLimit = remaining <= 50;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-300">
          <MessageSquare className="h-3.5 w-3.5" />
          {label}
        </label>
        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          rows={3}
          className={`w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:ring-2 focus:outline-none ${accent.input}`}
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span
            className={`text-xs transition-colors ${
              isNearLimit ? 'text-amber-400' : 'text-gray-500'
            }`}
          >
            {remaining} characters remaining
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !userMessage.trim()}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${accent.btn}`}
          >
            {isSubmitting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{isSubmitting ? 'Sending…' : 'Send'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/25 bg-red-500/10 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {feedback.message}
        </div>
      )}
    </form>
  );
}

// ── Message thread ────────────────────────────────────────────────────────────
function MessageThread({
  messages,
  isLoading,
  userId,
  fallbackReason,
  fallbackChangedBy,
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-gray-400">
        <Loader className="h-4 w-4 animate-spin" />
        <span>Loading messages…</span>
      </div>
    );
  }

  // Normalise: if DB table has no rows yet, synthesise from legacy status_reason
  const effective =
    messages.length > 0
      ? messages
      : fallbackReason
        ? [
            {
              id: 'legacy',
              sender_id: fallbackChangedBy,
              is_admin: fallbackChangedBy !== userId,
              message: fallbackReason,
              created_at: null,
            },
          ]
        : [];

  if (effective.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
        Conversation
      </p>
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {effective.map((msg) => {
          const isAdminMsg = msg.is_admin;
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isAdminMsg ? 'flex-row' : 'flex-row-reverse'}`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${
                  isAdminMsg
                    ? 'bg-blue-500/15 ring-blue-500/30'
                    : 'bg-white/8 ring-white/15'
                }`}
              >
                {isAdminMsg ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
                  isAdminMsg
                    ? 'bg-blue-500/10 ring-1 ring-blue-500/20'
                    : 'bg-white/6 ring-1 ring-white/10'
                }`}
              >
                <p
                  className={`mb-1 text-[10px] font-semibold ${
                    isAdminMsg ? 'text-blue-400' : 'text-gray-400'
                  }`}
                >
                  {isAdminMsg ? 'Team' : 'You'}
                </p>
                <p className="text-sm leading-relaxed text-gray-200">
                  {msg.message}
                </p>
                {msg.created_at && (
                  <p className="mt-1.5 text-[10px] text-gray-600">
                    {new Date(msg.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AccountStatusMessages({
  accountStatus,
  statusReason,
  statusChangedBy,
  suspensionExpiresAt,
  userId,
  userName = '',
  userEmail = '',
}) {
  const [userMessage, setUserMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const contactHref = `/contact${
    userName || userEmail
      ? `?${new URLSearchParams(
          Object.fromEntries(
            [
              ['name', userName],
              ['email', userEmail],
            ].filter(([, v]) => v)
          )
        ).toString()}`
      : ''
  }`;

  useEffect(() => {
    if (!userId) {
      setIsLoadingMessages(false);
      return;
    }
    fetch(`/api/account/messages?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {})
      .finally(() => setIsLoadingMessages(false));
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;
    if (!userId) {
      setFeedback({ type: 'error', message: 'User ID is missing.' });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/account/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: userMessage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send');
      setMessages((prev) => [...prev, data.message]);
      setFeedback({ type: 'success', message: 'Message sent successfully.' });
      setUserMessage('');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to send. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // ── Pending ────────────────────────────────────────────────────────────────
  if (accountStatus === 'pending') {
    return (
      <div className="mt-6 space-y-4">
        {/* Admin access required — prominent callout */}
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <ShieldAlert className="h-6 w-6 shrink-0 text-amber-400" />
          <p className="text-sm font-semibold text-amber-200">
            Admin access required —{' '}
            <span className="font-normal text-amber-300/80">
              An administrator must approve your account before you can access
              any dashboard.
            </span>
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-linear-to-b from-amber-500/5 to-transparent shadow-lg shadow-amber-500/5">
          <div className="h-0.5 w-full bg-linear-to-r from-amber-500/60 via-orange-400/60 to-transparent" />

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-white">
                    Admin Approval Required
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 ring-1 ring-amber-500/25">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                    </span>
                    Pending Approval
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  Your account is awaiting approval from a{' '}
                  <span className="font-medium text-amber-300">
                    NEUPC admin
                  </span>
                  . This typically takes{' '}
                  <span className="font-medium text-gray-300">
                    1–3 business days
                  </span>
                  . You&apos;ll gain access once an admin reviews and activates
                  your account.
                </p>
              </div>
            </div>

            {/* Progress steps */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {REVIEW_STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      step.done
                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                        : 'bg-white/5 text-gray-500 ring-1 ring-white/10'
                    }`}
                  >
                    {step.done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      step.done ? 'text-amber-400' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Message thread */}
            <div className="mt-6">
              <MessageThread
                messages={messages}
                isLoading={isLoadingMessages}
                userId={userId}
                fallbackReason={statusReason}
                fallbackChangedBy={statusChangedBy}
              />
            </div>

            <div className="my-6 border-t border-white/5" />

            <MessageForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              userMessage={userMessage}
              setUserMessage={setUserMessage}
              feedback={feedback}
              accentColor="amber"
              label="Send us a message"
              placeholder="Tell us about your account or ask a question…"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Rejected ───────────────────────────────────────────────────────────────
  if (accountStatus === 'rejected') {
    return (
      <div className="mt-6">
        <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-linear-to-b from-red-500/5 to-transparent shadow-lg shadow-red-500/5">
          <div className="h-0.5 w-full bg-linear-to-r from-red-500/60 via-rose-400/60 to-transparent" />

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/25">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-white">
                    Application Rejected
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 ring-1 ring-red-500/25">
                    Rejected
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  Your application was not approved at this time. See the
                  details below or reach out if you believe this is a mistake.
                </p>
              </div>
            </div>

            {/* Message thread */}
            <div className="mt-6">
              <MessageThread
                messages={messages}
                isLoading={isLoadingMessages}
                userId={userId}
                fallbackReason={statusReason}
                fallbackChangedBy={statusChangedBy}
              />
            </div>

            {/* Contact */}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-sm text-gray-400">
                Think this was a mistake?{' '}
                <Link
                  href={contactHref}
                  className="inline-flex items-center gap-0.5 font-medium text-white underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
                >
                  Contact us
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </div>

            <div className="my-6 border-t border-white/5" />

            <MessageForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              userMessage={userMessage}
              setUserMessage={setUserMessage}
              feedback={feedback}
              accentColor="red"
              label="Send an appeal (optional)"
              placeholder="Explain why you believe this decision should be reconsidered…"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── All other non-active statuses (suspended, banned, locked, …) ──────────
  // pending and rejected are caught above, so this handles everything else
  if (accountStatus && accountStatus !== 'active') {
    const STATUS = {
      suspended: {
        Icon: ShieldOff,
        title: 'Account Suspended',
        description:
          'Your account has been temporarily suspended. Please contact our support team for assistance.',
        badge: 'Suspended',
        palette: {
          border: 'border-orange-500/20',
          bar: 'from-orange-500/60 via-amber-400/60',
          iconWrap: 'bg-orange-500/15 ring-orange-500/25',
          iconText: 'text-orange-400',
          badge: 'bg-orange-500/15 text-orange-400 ring-orange-500/25',
          inputAccent: 'blue',
        },
      },
      banned: {
        Icon: ShieldX,
        title: 'Account Restricted',
        description:
          'Your account access has been restricted due to a policy violation.',
        badge: 'Restricted',
        palette: {
          border: 'border-red-500/20',
          bar: 'from-red-500/60 via-rose-400/60',
          iconWrap: 'bg-red-500/15 ring-red-500/25',
          iconText: 'text-red-400',
          badge: 'bg-red-500/15 text-red-400 ring-red-500/25',
          inputAccent: 'red',
        },
      },
      locked: {
        Icon: Lock,
        title: 'Account Locked',
        description:
          'Your account is locked for security reasons. Please verify your identity.',
        badge: 'Locked',
        palette: {
          border: 'border-blue-500/20',
          bar: 'from-blue-500/60 via-cyan-400/60',
          iconWrap: 'bg-blue-500/15 ring-blue-500/25',
          iconText: 'text-blue-400',
          badge: 'bg-blue-500/15 text-blue-400 ring-blue-500/25',
          inputAccent: 'blue',
        },
      },
    };

    const cfg = STATUS[accountStatus] ?? STATUS.suspended;
    const { Icon, palette } = cfg;

    return (
      <div className="mt-6">
        <div
          className={`overflow-hidden rounded-2xl border ${palette.border} bg-linear-to-b from-white/3 to-transparent shadow-lg`}
        >
          <div
            className={`h-0.5 w-full bg-linear-to-r ${palette.bar} to-transparent`}
          />

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${palette.iconWrap}`}
              >
                <Icon className={`h-5 w-5 ${palette.iconText}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-white">
                    {cfg.title}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${palette.badge}`}
                  >
                    {cfg.badge}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400">{cfg.description}</p>
              </div>
            </div>

            {/* Message thread */}
            <div className="mt-6">
              <MessageThread
                messages={messages}
                isLoading={isLoadingMessages}
                userId={userId}
                fallbackReason={statusReason}
                fallbackChangedBy={statusChangedBy}
              />
            </div>

            {/* Suspension timer */}
            {accountStatus === 'suspended' && (
              <SuspensionTimer expiresAt={suspensionExpiresAt} />
            )}

            {/* Contact */}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-sm text-gray-400">
                Believe this is a mistake?{' '}
                <Link
                  href={contactHref}
                  className="inline-flex items-center gap-0.5 font-medium text-white underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
                >
                  Contact us
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Inactive ──────────────────────────────────────────────────────────────
  if (accountStatus === 'inactive') {
    return (
      <div className="mt-6">
        <div className="overflow-hidden rounded-2xl border border-gray-500/20 bg-linear-to-b from-gray-500/5 to-transparent shadow-lg shadow-gray-500/5">
          <div className="h-0.5 w-full bg-linear-to-r from-gray-500/60 via-slate-400/60 to-transparent" />

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-500/15 ring-1 ring-gray-500/25">
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-white">
                    Account Inactive
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-gray-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-gray-400 ring-1 ring-gray-500/25">
                    Inactive
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  Your account is currently inactive. Please verify your email
                  or contact support to reactivate it.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-sm text-gray-400">
                Need help?{' '}
                <Link
                  href={contactHref}
                  className="inline-flex items-center gap-0.5 font-medium text-white underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
                >
                  Contact support
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
