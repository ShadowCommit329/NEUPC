/**
 * @file Confirm modal — reusable confirmation dialog for destructive
 *   user actions (delete, suspend, ban) with customisable message.
 * @module AdminConfirmModal
 */

'use client';

import { X, AlertCircle, Loader2 } from 'lucide-react';
import { useScrollLock } from '@/app/_lib/hooks';

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  danger = false,
  children,
  isPending,
}) {
  useScrollLock(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-gray-500 hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={`mb-4 inline-flex rounded-xl p-3 ${danger ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}
        >
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
        <p className="mb-5 text-sm text-gray-400">{description}</p>

        {children}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              danger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isPending ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </span>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
