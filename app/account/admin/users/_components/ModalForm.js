/**
 * @file Modal form — generic form-in-dialog wrapper used for creating
 *   and editing user records with dynamic field configuration.
 * @module AdminModalForm
 */

import { ChevronDown, Upload, Trash2, Loader2 } from 'lucide-react';
import { driveImageUrl } from '@/app/_lib/utils';
import { ROLES } from './constants';

export default function ModalForm({
  cfg,
  reason,
  onReasonChange,
  expiresAt,
  onExpiresAtChange,
  selectedRole,
  onRoleChange,
  editName,
  onNameChange,
  editEmail,
  onEmailChange,
  editStudentId,
  onStudentIdChange,
  editAvatar,
  onAvatarChange,
  emailSubject,
  onEmailSubjectChange,
  emailBody,
  onEmailBodyChange,
  uploading = false,
  uploadError = null,
  onUploadImage,
  userId,
}) {
  return (
    <>
      {/* Reason textarea */}
      {cfg?.showReason && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-300">
            Reason{' '}
            <span className="text-gray-500">
              {cfg.title === 'Activate User' ? '(optional)' : '(required)'}
            </span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={2}
            placeholder="Provide a clear reason for this action…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
      )}

      {/* Email Subject Input */}
      {cfg?.showEmailSubject && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-300">
            Subject <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => onEmailSubjectChange(e.target.value)}
            placeholder="Email Subject..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
      )}

      {/* Email Body Textarea */}
      {cfg?.showEmailBody && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-300">
            Message Body <span className="text-red-400">*</span>
          </label>
          <textarea
            value={emailBody}
            onChange={(e) => onEmailBodyChange(e.target.value)}
            rows={5}
            placeholder="Write your email here... (HTML tags are supported)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
      )}

      {/* Expiry datetime */}
      {cfg?.showExpiry && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-300">
            Suspension Expires <span className="text-red-400">*required</span>
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => onExpiresAtChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
      )}

      {/* Role select */}
      {cfg?.showRole && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-300">
            New Role <span className="text-gray-500">(required)</span>
          </label>
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="bg-gray-900">
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      )}

      {/* Edit user fields */}
      {cfg?.showEdit && (
        <>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-300">
              Full Name <span className="text-gray-500">(required)</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-300">
              Email <span className="text-gray-500">(required)</span>
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="e.g., john@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-300">
              Student ID <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={editStudentId}
              onChange={(e) => onStudentIdChange(e.target.value)}
              placeholder="e.g., STU-2024-001"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-300">
              User Avatar <span className="text-gray-500">(optional)</span>
            </label>

            {/* Upload section */}
            <div className="space-y-3">
              {/* Preview / upload area */}
              {editAvatar ? (
                <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={driveImageUrl(editAvatar)}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E`;
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onAvatarChange('')}
                    className="absolute top-2 right-2 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/20 px-2 py-1 text-xs font-medium text-red-300 backdrop-blur-sm transition-all hover:border-red-500/50 hover:bg-red-500/30"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/2 px-6 py-8 text-center transition-all hover:border-blue-500/30 hover:bg-blue-500/5 ${
                    uploading ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="mb-2 h-6 w-6 animate-spin text-blue-400" />
                  ) : (
                    <Upload className="mb-2 h-6 w-6 text-gray-600" />
                  )}
                  <p className="text-sm font-medium text-gray-300">
                    {uploading ? 'Uploading…' : 'Click to upload avatar'}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    JPEG, PNG, WebP, or GIF
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onUploadImage && userId) {
                        onUploadImage(file, userId);
                      }
                    }}
                  />
                </label>
              )}

              {uploadError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  Or paste image URL (optional)
                </label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => onAvatarChange(e.target.value)}
                  placeholder="e.g., https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
