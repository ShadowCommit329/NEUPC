/**
 * @file User management client — admin interface for listing, filtering,
 *   searching, and performing bulk actions on all platform users.
 * @module AdminUserManagementClient
 */

'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Wifi,
  Clock,
  ShieldOff,
  Ban,
  LockKeyhole,
  ChevronRight,
  MessageSquare,
  Loader,
  Send,
  X,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import {
  suspendUserAction,
  banUserAction,
  lockUserAction,
  activateUserAction,
  changeUserRoleAction,
  updateUserAction,
  uploadUserImageAction,
  sendCustomEmailAction,
} from '@/app/_lib/user-actions';
import { MODAL_CONFIG } from './constants';
import StatCard from './StatCard';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import UsersTable from './UsersTable';
import FilterBar from './FilterBar';
import ModalForm from './ModalForm';
import UserFormPanel from './UserFormPanel';

// ─── main component ──────────────────────────────────────────

export default function UserManagementClient({
  initialUsers,
  stats,
  initialFilterRole = 'All',
  initialFilterStatus = 'All',
  initialSearch = '',
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState(initialSearch);
  const [filterRole, setFilterRole] = useState(initialFilterRole);
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
  const [filterOnline, setFilterOnline] = useState(false);

  const [modal, setModal] = useState(null); // { type, user }
  const [messagesModal, setMessagesModal] = useState(null); // { user }
  const [threadMessages, setThreadMessages] = useState([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [toast, setToast] = useState(null);
  const [verifyModalUser, setVerifyModalUser] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── filter ──
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.studentId?.toLowerCase().includes(search.toLowerCase());
      const matchRole =
        filterRole === 'All' ||
        u.role === filterRole ||
        (u.roles &&
          u.roles.some(
            (role) =>
              role.charAt(0).toUpperCase() + role.slice(1) === filterRole
          ));
      const matchStatus = filterStatus === 'All' || u.status === filterStatus;
      const matchOnline = !filterOnline || u.isOnline;
      return matchSearch && matchRole && matchStatus && matchOnline;
    });
  }, [users, search, filterRole, filterStatus, filterOnline]);

  // ── toast helper ──
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── optimistic update helper ──
  const updateUserLocally = (userId, changes) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...changes } : u))
    );
  };

  // ── open modal ──
  const handleAction = (type, user) => {
    if (type === 'messages') {
      setMessagesModal({ user });
      setAdminReply('');
      setIsLoadingThread(true);
      fetch(`/api/account/messages?userId=${user.id}`)
        .then((r) => r.json())
        .then((d) => setThreadMessages(d.messages ?? []))
        .catch(() => setThreadMessages([]))
        .finally(() => setIsLoadingThread(false));
      return;
    }
    setModal({ type, user });
    setReason('');
    setExpiresAt('');
    setEmailSubject(`Message from NEUPC Admin`);
    setEmailBody(`Hello ${user.name},\n\n\n\nBest regards,\nNEUPC Team`);
    setSelectedRole(user.role?.toLowerCase() || 'member');
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditStudentId(user.studentId || '');
    const initialAvatar =
      typeof user.avatar === 'string' &&
      (user.avatar.startsWith('http') ||
        user.avatar.startsWith('/') ||
        user.avatar.startsWith('/api/image/'))
        ? user.avatar
        : '';
    setEditAvatar(initialAvatar);
  };

  // ── close modal ──
  const closeModal = () => setModal(null);

  const handleAdminReply = async () => {
    if (!adminReply.trim() || !messagesModal) return;
    setIsSendingReply(true);
    try {
      const res = await fetch('/api/account/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: messagesModal.user.id,
          message: adminReply,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setThreadMessages((prev) => [...prev, data.message]);
      setAdminReply('');
    } catch (err) {
      showToast(err.message || 'Failed to send reply', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  // ── image upload ──
  const handleImageUpload = async (file, userId) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('userId', userId);
      const result = await uploadUserImageAction(fd);
      if (result?.error) {
        setUploadError(result.error);
      } else if (result?.url) {
        setEditAvatar(result.url);
        showToast('Image uploaded successfully!');
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload image');
      showToast(err.message || 'Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── open email verification popup ──
  const handleVerifyEmail = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      showToast('User not found for verification.', 'error');
      return;
    }
    const defaultTemplate = `Hi ${user.name || 'User'},

Your account has been approved! Click the link below to verify your email and activate your account:

[Verification Link]

If you did not request this, please ignore this email.

Best regards,
NEUPC Team`;
    setVerifyModalUser(user);
    setEmailTemplate(defaultTemplate);
  };

  // ── confirm email verification and send ──
  const confirmVerifyEmail = async () => {
    if (!verifyModalUser?.id) return;
    setIsVerifyingEmail(true);
    try {
      showToast('Generating verification link and sending email...');

      const fd = new FormData();
      fd.append('userId', verifyModalUser.id);
      fd.append('emailTemplate', emailTemplate || '');

      const { verifyUserEmailAction } = await import('@/app/_lib/user-actions');
      const result = await verifyUserEmailAction(fd);

      if (result.error) throw new Error(result.error);

      updateUserLocally(verifyModalUser.id, {
        statusReason: 'verification email sent',
      });
      showToast(
        result.emailSent
          ? 'Verification email with link sent!'
          : 'Verification link created, but email failed/skipped.'
      );
      setVerifyModalUser(null);
      setEmailTemplate('');
    } catch (err) {
      showToast(err.message || 'Verification failed.', 'error');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // ── submit ──
  const handleConfirm = () => {
    if (!modal) return;
    const { type, user } = modal;

    // Reason is required for suspend, ban, lock (not activate)
    if (
      (type === 'suspend' || type === 'ban' || type === 'lock') &&
      !reason.trim()
    ) {
      showToast('A reason is required for this action.', 'error');
      return;
    }
    // Expiry date is required for suspend
    if (type === 'suspend' && !expiresAt) {
      showToast('Suspension expiry date is required.', 'error');
      return;
    }
    if (type === 'email' && (!emailSubject.trim() || !emailBody.trim())) {
      showToast('Subject and body are required to send an email.', 'error');
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('userId', user.id);

        if (type === 'activate') {
          fd.append('reason', reason.trim() || 'Account activated by admin');
          await activateUserAction(fd);
          updateUserLocally(user.id, { status: 'Active' });
          showToast(`${user.name}'s account has been activated.`);
        } else if (type === 'suspend') {
          fd.append('reason', reason.trim());
          fd.append('expiresAt', new Date(expiresAt).toISOString());
          await suspendUserAction(fd);
          updateUserLocally(user.id, { status: 'Suspended' });
          showToast(`${user.name} has been suspended.`);
        } else if (type === 'ban') {
          fd.append('reason', reason.trim());
          await banUserAction(fd);
          updateUserLocally(user.id, { status: 'Banned' });
          showToast(`${user.name} has been banned.`);
        } else if (type === 'lock') {
          fd.append('reason', reason.trim());
          await lockUserAction(fd);
          updateUserLocally(user.id, { status: 'Locked' });
          showToast(`${user.name}'s account has been locked.`);
        } else if (type === 'role') {
          fd.append('role', selectedRole);
          await changeUserRoleAction(fd);
          const capRole =
            selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
          updateUserLocally(user.id, { role: capRole, roles: [selectedRole] });
          showToast(`${user.name}'s role changed to ${capRole}.`);
        } else if (type === 'edit') {
          fd.append('name', editName);
          fd.append('email', editEmail);
          fd.append('studentId', editStudentId);
          fd.append('avatar', editAvatar);
          await updateUserAction(fd);
          updateUserLocally(user.id, {
            name: editName,
            email: editEmail,
            studentId: editStudentId,
            avatar: editAvatar,
          });
          showToast(`${editName}'s profile has been updated.`);
        } else if (type === 'email') {
          fd.append('subject', emailSubject);
          fd.append('message', emailBody);
          await sendCustomEmailAction(fd);
          showToast(`Email sent to ${user.name}.`);
        }

        closeModal();
      } catch (err) {
        showToast(err.message || 'Something went wrong.', 'error');
        closeModal();
      }
    });
  };

  // ── modal config ──
  const cfg = modal ? MODAL_CONFIG[modal.type] : null;

  return (
    <>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">User Management</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/25">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              User Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage platform users, roles, and account status
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/account/admin/roles"
              className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-medium text-purple-300 transition-all hover:border-purple-500/50 hover:bg-purple-500/20"
            >
              Role Management
            </Link>
            <Link
              href="/account/admin/applications"
              className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs font-medium text-yellow-300 transition-all hover:border-yellow-500/50 hover:bg-yellow-500/20"
            >
              Applications
            </Link>
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* ── stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.total || 0}
          color="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active"
          value={stats.active || 0}
          color="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending || 0}
          color="bg-amber-500/15 text-amber-400"
        />
        <StatCard
          icon={ShieldOff}
          label="Suspended"
          value={stats.suspended || 0}
          color="bg-orange-500/15 text-orange-400"
        />
        <StatCard
          icon={Ban}
          label="Banned"
          value={stats.banned || 0}
          color="bg-red-500/15 text-red-400"
        />
        <StatCard
          icon={LockKeyhole}
          label="Locked"
          value={stats.locked || 0}
          color="bg-purple-500/15 text-purple-400"
        />
        <StatCard
          icon={Wifi}
          label="Online Now"
          value={users.filter((u) => u.isOnline).length}
          color="bg-green-500/15 text-green-400"
        />
      </div>

      {/* ── filters bar ── */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filterRole={filterRole}
        onRoleChange={setFilterRole}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        filterOnline={filterOnline}
        onOnlineChange={setFilterOnline}
        filteredCount={filtered.length}
        totalCount={users.length}
      />

      {/* ── table ── */}
      <UsersTable
        filtered={filtered}
        users={users}
        onAction={handleAction}
        onVerifyEmail={handleVerifyEmail}
      />

      {/* ── confirm modal ── */}
      {modal && cfg && modal.type !== 'edit' && (
        <ConfirmModal
          open
          onClose={closeModal}
          onConfirm={handleConfirm}
          title={cfg.title}
          description={cfg.description}
          danger={cfg.danger}
          isPending={isPending}
        >
          <ModalForm
            cfg={cfg}
            reason={reason}
            onReasonChange={setReason}
            expiresAt={expiresAt}
            onExpiresAtChange={setExpiresAt}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            editName={editName}
            onNameChange={setEditName}
            editEmail={editEmail}
            onEmailChange={setEditEmail}
            editStudentId={editStudentId}
            onStudentIdChange={setEditStudentId}
            editAvatar={editAvatar}
            onAvatarChange={setEditAvatar}
            emailSubject={emailSubject}
            onEmailSubjectChange={setEmailSubject}
            emailBody={emailBody}
            onEmailBodyChange={setEmailBody}
            uploading={uploading}
            uploadError={uploadError}
            onUploadImage={handleImageUpload}
            userId={modal?.user?.id}
          />
        </ConfirmModal>
      )}

      {/* ── verify email popup ── */}
      {verifyModalUser && (
        <ConfirmModal
          open
          onClose={() => {
            if (!isVerifyingEmail) {
              setVerifyModalUser(null);
              setEmailTemplate('');
            }
          }}
          onConfirm={confirmVerifyEmail}
          title="Send Verification Email"
          description={`Send an activation email to ${verifyModalUser.name || verifyModalUser.email}?`}
          isPending={isVerifyingEmail}
        >
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-gray-300">
              Email Template
            </p>
            <textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
              rows={8}
              placeholder="Email content"
            />
          </div>
        </ConfirmModal>
      )}

      {/* ── edit user modal ── */}
      {modal && modal.type === 'edit' && (
        <UserFormPanel
          user={modal.user}
          onClose={closeModal}
          onRefresh={(userId, updates) => {
            updateUserLocally(userId, {
              name: updates.name,
              email: updates.email,
              avatar: updates.avatar,
              studentId: updates.studentId,
            });
            showToast(`${updates.name}'s profile has been updated.`);
          }}
        />
      )}

      {/* ── toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── messages thread modal ── */}
      {messagesModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMessagesModal(null)}
          />
          <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
            {/* header */}
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15">
                  <MessageSquare className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {messagesModal.user.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {messagesModal.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMessagesModal(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* thread */}
            <div
              className="flex-1 space-y-2.5 overflow-y-auto p-5"
              style={{ maxHeight: '340px' }}
            >
              {isLoadingThread ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader className="h-4 w-4 animate-spin" /> Loading messages…
                </div>
              ) : threadMessages.length === 0 ? (
                <p className="text-center text-sm text-gray-500">
                  No messages yet. Send the first one below.
                </p>
              ) : (
                threadMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.is_admin ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${msg.is_admin ? 'bg-sky-500/15 ring-sky-500/30' : 'bg-white/8 ring-white/15'}`}
                    >
                      {msg.is_admin ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </div>
                    <div
                      className={`max-w-[78%] rounded-xl px-3.5 py-2.5 ${msg.is_admin ? 'bg-sky-500/10 ring-1 ring-sky-500/20' : 'bg-white/6 ring-1 ring-white/10'}`}
                    >
                      <p
                        className={`mb-1 text-[10px] font-semibold ${msg.is_admin ? 'text-sky-400' : 'text-gray-400'}`}
                      >
                        {msg.is_admin ? 'Team (you)' : messagesModal.user.name}
                      </p>
                      <p className="text-sm leading-relaxed text-gray-200">
                        {msg.message}
                      </p>
                      {msg.created_at && (
                        <p className="mt-1 text-[10px] text-gray-600">
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
                ))
              )}
            </div>

            {/* reply box */}
            <div className="border-t border-white/8 p-4">
              <div className="flex gap-2">
                <textarea
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAdminReply();
                    }
                  }}
                  placeholder="Write a reply… (Enter to send)"
                  rows={2}
                  maxLength={1000}
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 focus:outline-none"
                />
                <button
                  onClick={handleAdminReply}
                  disabled={isSendingReply || !adminReply.trim()}
                  className="self-end rounded-xl bg-sky-600 px-3.5 py-2.5 text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSendingReply ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
