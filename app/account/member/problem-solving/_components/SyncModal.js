/**
 * @file Sync Modal Component
 * @module SyncModal
 *
 * A modal dialog that displays during sync operations with progress information
 * and shows detailed sync status. Does not freeze background scroll.
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Trophy,
  Code2,
  BarChart3,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';

// Sync stages configuration
const SYNC_STAGES = {
  preparing: {
    label: 'Preparing sync...',
    icon: Loader2,
    color: 'text-blue-400',
  },
  submissions: {
    label: 'Syncing submissions',
    icon: Code2,
    color: 'text-emerald-400',
  },
  ratings: {
    label: 'Syncing rating history',
    icon: BarChart3,
    color: 'text-purple-400',
  },
  contests: {
    label: 'Syncing contest history',
    icon: Trophy,
    color: 'text-amber-400',
  },
  saving: {
    label: 'Saving to database',
    icon: Database,
    color: 'text-cyan-400',
  },
  complete: {
    label: 'Sync complete!',
    icon: CheckCircle2,
    color: 'text-emerald-400',
  },
  error: {
    label: 'Sync failed',
    icon: XCircle,
    color: 'text-red-400',
  },
};

function SyncStageItem({ stage, currentStage, completedStages }) {
  const config = SYNC_STAGES[stage];
  const Icon = config.icon;
  const isActive = currentStage === stage;
  const isCompleted = completedStages.includes(stage);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${
        isActive
          ? 'bg-white/[0.06] ring-1 ring-white/10'
          : isCompleted
            ? 'bg-emerald-500/[0.06]'
            : 'opacity-50'
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          isActive
            ? 'bg-white/10'
            : isCompleted
              ? 'bg-emerald-500/20'
              : 'bg-white/5'
        }`}
      >
        {isActive ? (
          <Loader2 className={`h-4 w-4 animate-spin ${config.color}`} />
        ) : isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <Icon className="h-4 w-4 text-gray-500" />
        )}
      </div>
      <span
        className={`text-sm font-medium ${
          isActive
            ? 'text-white'
            : isCompleted
              ? 'text-emerald-400'
              : 'text-gray-500'
        }`}
      >
        {config.label}
      </span>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto"
        >
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
        </motion.div>
      )}
    </motion.div>
  );
}

function ModalContent({
  syncType,
  platformName,
  currentStage,
  completedStages,
  syncResult,
  error,
  onClose,
}) {
  const isComplete = currentStage === 'complete' || currentStage === 'error';
  const hasError = currentStage === 'error' || error;

  // Stages to show based on sync type
  const stagesToShow =
    syncType === 'full'
      ? ['preparing', 'submissions', 'ratings', 'contests', 'saving']
      : ['preparing', 'submissions', 'saving'];

  // Title based on sync type
  const getSyncTitle = () => {
    if (hasError) return 'Sync Failed';
    if (isComplete) return 'Sync Complete!';
    if (syncType === 'platform' && platformName) {
      return `Syncing ${platformName}`;
    }
    return syncType === 'full'
      ? 'Full Sync in Progress'
      : 'Quick Sync in Progress';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50">
      {/* Header gradient */}
      <div
        className={`h-1 ${hasError ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}
      />

      {/* Close button for completed state */}
      {isComplete && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Content */}
      <div className="p-5 sm:p-6">
        {/* Title */}
        <div className="mb-5 flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${
              hasError
                ? 'bg-red-500/20'
                : isComplete
                  ? 'bg-emerald-500/20'
                  : 'bg-blue-500/20'
            }`}
          >
            {hasError ? (
              <XCircle className="h-5 w-5 text-red-400 sm:h-6 sm:w-6" />
            ) : isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 sm:h-6 sm:w-6" />
            ) : (
              <RefreshCw className="h-5 w-5 animate-spin text-blue-400 sm:h-6 sm:w-6" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white sm:text-lg">
              {getSyncTitle()}
            </h3>
            <p className="text-xs text-gray-400 sm:text-sm">
              {hasError
                ? 'An error occurred during sync'
                : isComplete
                  ? 'Your data is now up to date'
                  : 'Please wait while we sync your data...'}
            </p>
          </div>
        </div>

        {/* Progress stages */}
        {!isComplete && (
          <div className="mb-5 space-y-2">
            {stagesToShow.map((stage) => (
              <SyncStageItem
                key={stage}
                stage={stage}
                currentStage={currentStage}
                completedStages={completedStages}
              />
            ))}
          </div>
        )}

        {/* Error message */}
        {hasError && error && (
          <div className="mb-5 rounded-lg bg-red-500/10 p-3 ring-1 ring-red-500/20 sm:p-4">
            <p className="text-xs text-red-400 sm:text-sm">{error}</p>
          </div>
        )}

        {/* Success result */}
        {isComplete && !hasError && syncResult && (
          <div className="mb-5 space-y-3">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              {syncResult.synced !== undefined && (
                <div className="rounded-lg bg-white/[0.04] p-2.5 text-center ring-1 ring-white/5 sm:p-3">
                  <div className="text-lg font-bold text-emerald-400 sm:text-xl">
                    {syncResult.synced}
                  </div>
                  <div className="text-[9px] text-gray-500 sm:text-[10px]">
                    Submissions
                  </div>
                </div>
              )}
              {syncResult.ratingHistorySynced !== undefined && (
                <div className="rounded-lg bg-white/[0.04] p-2.5 text-center ring-1 ring-white/5 sm:p-3">
                  <div className="text-lg font-bold text-purple-400 sm:text-xl">
                    {syncResult.ratingHistorySynced}
                  </div>
                  <div className="text-[9px] text-gray-500 sm:text-[10px]">
                    Ratings
                  </div>
                </div>
              )}
              {syncResult.contestHistorySynced !== undefined && (
                <div className="rounded-lg bg-white/[0.04] p-2.5 text-center ring-1 ring-white/5 sm:p-3">
                  <div className="text-lg font-bold text-amber-400 sm:text-xl">
                    {syncResult.contestHistorySynced}
                  </div>
                  <div className="text-[9px] text-gray-500 sm:text-[10px]">
                    Contests
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            {syncResult.message && (
              <p className="text-center text-[10px] text-gray-400 sm:text-xs">
                {syncResult.message}
              </p>
            )}

            {/* Already up to date message */}
            {syncResult.synced === 0 &&
              syncResult.ratingHistorySynced === 0 &&
              syncResult.contestHistorySynced === 0 && (
                <div className="rounded-lg bg-blue-500/10 p-2.5 text-center ring-1 ring-blue-500/20 sm:p-3">
                  <p className="text-xs text-blue-400 sm:text-sm">
                    Your data is already up to date!
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Close button (only when complete) */}
        {isComplete && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClose}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:py-3 ${
              hasError
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {hasError ? 'Close' : 'Done'}
          </motion.button>
        )}

        {/* Cancel hint when syncing */}
        {!isComplete && (
          <p className="mt-4 text-center text-[10px] text-gray-600 sm:text-xs">
            Please do not close this window
          </p>
        )}
      </div>
    </div>
  );
}

export default function SyncModal({
  isOpen,
  syncType = 'quick', // 'quick', 'full', or 'platform'
  platformName = null, // For platform-specific syncs
  currentStage = 'preparing',
  completedStages = [],
  syncResult = null,
  error = null,
  onClose,
}) {
  const isComplete = currentStage === 'complete' || currentStage === 'error';

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape' && isComplete) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isComplete, onClose]);

  // Don't render if not open or if we're on the server
  if (!isOpen || typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - semi-transparent overlay, allows scroll */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/50"
            onClick={isComplete ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Modal container - centered, doesn't block scroll */}
          <div
            className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto w-full max-w-sm sm:max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <ModalContent
                syncType={syncType}
                platformName={platformName}
                currentStage={currentStage}
                completedStages={completedStages}
                syncResult={syncResult}
                error={error}
                onClose={onClose}
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  // Use portal to render at document body level
  return createPortal(modalContent, document.body);
}
