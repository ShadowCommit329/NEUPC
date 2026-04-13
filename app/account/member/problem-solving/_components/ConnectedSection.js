/**
 * @file Connected Section Component
 * @description Modern header with platform count, sync controls, and add button
 */

'use client';

import { RefreshCw, Plus, Link2, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConnectedSection({
  count,
  onSyncAll,
  onAddPlatform,
  isSyncing,
  hasConnected,
  isAddExpanded,
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Title & Count */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-blue-500/20">
          <Link2 className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {hasConnected ? 'Connected Platforms' : 'Platform Accounts'}
          </h3>
          {hasConnected && (
            <p className="text-sm text-zinc-500">
              {count} platform{count !== 1 ? 's' : ''} linked
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {hasConnected && (
        <div className="flex items-center gap-2">
          {/* Sync All Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSyncAll}
            disabled={isSyncing}
            className="flex h-9 items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-4 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`}
            />
            <span>{isSyncing ? 'Syncing...' : 'Sync All'}</span>
          </motion.button>

          {/* Add Platform Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAddPlatform}
            className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/30"
          >
            {isAddExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Add Platform</span>
              </>
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}
