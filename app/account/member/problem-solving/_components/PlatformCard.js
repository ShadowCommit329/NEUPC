/**
 * @file Platform Card Component
 * @description Modern platform card with prominent logo, stats, and smooth interactions
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Trophy,
  Code2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Platform Logo - Shows image from platforms file with styled fallback
 */
function PlatformLogo({ config, size = 40, className = '' }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Show image if logo URL exists and hasn't errored
  const showImage = config?.logo && !imageError;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Fallback badge - shown initially or if image fails */}
      <div
        className={`absolute inset-0 inline-flex items-center justify-center rounded-xl font-bold shadow-lg transition-opacity duration-200 ${config?.bg || 'bg-zinc-700'} ${config?.color || 'text-white'} ${className} ${showImage && imageLoaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ fontSize: size * 0.38 }}
      >
        {config?.short || '??'}
      </div>

      {/* Platform logo image */}
      {showImage && (
        <img
          src={config.logo}
          alt={config.name || 'Platform'}
          width={size}
          height={size}
          className={`absolute inset-0 rounded-xl object-contain p-1.5 transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          style={{ backgroundColor: 'rgba(24, 24, 27, 0.5)' }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}

export { PlatformLogo };

/**
 * Rating badge with color coding
 */
function RatingBadge({ rating, platform }) {
  if (!rating || rating <= 0) return null;

  const getRatingStyle = (value, platform) => {
    // Codeforces-style rating colors
    if (platform === 'codeforces' || platform === 'cfgym') {
      if (value >= 2400) return 'bg-red-500/20 text-red-400 border-red-500/30';
      if (value >= 2100)
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      if (value >= 1900)
        return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      if (value >= 1600)
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      if (value >= 1400)
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      if (value >= 1200)
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
    // Generic rating colors
    if (value >= 2000)
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (value >= 1500) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (value >= 1000)
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${getRatingStyle(rating, platform)}`}
    >
      <Trophy className="h-3.5 w-3.5" />
      <span className="text-sm font-semibold">{rating.toLocaleString()}</span>
    </div>
  );
}

/**
 * Solved count badge
 */
function SolvedBadge({ solved }) {
  if (!solved || solved <= 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">
      <Code2 className="h-3.5 w-3.5" />
      <span className="text-sm font-medium">{solved.toLocaleString()}</span>
    </div>
  );
}

/**
 * Sync status indicator
 */
function SyncStatus({ lastSyncedAt, isSyncing }) {
  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-400">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  const lastSync = lastSyncedAt
    ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
        .replace('about ', '')
        .replace('less than a minute ago', 'just now')
    : null;

  if (!lastSync) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Clock className="h-3 w-3" />
        <span>Never synced</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
      <CheckCircle2 className="h-3 w-3 text-green-500" />
      <span>{lastSync}</span>
    </div>
  );
}

/**
 * Action button component
 */
function ActionButton({
  onClick,
  disabled,
  variant = 'default',
  children,
  title,
}) {
  const variants = {
    default:
      'border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white hover:border-zinc-600',
    danger:
      'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50',
    primary:
      'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

/**
 * Main Platform Card Component
 */
export default function PlatformCard({
  handle,
  stats,
  config,
  onSync,
  onDisconnect,
  isSyncing,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showManualSync, setShowManualSync] = useState(false);
  const [manualHtml, setManualHtml] = useState('');

  // Calculate stats
  const solved =
    stats?.solved ||
    (handle.platform === 'leetcode'
      ? (stats?.easy || 0) + (stats?.medium || 0) + (stats?.hard || 0)
      : 0);
  const rating = stats?.rating || 0;

  const handleDisconnect = () => {
    if (showConfirm) {
      onDisconnect(handle.platform);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 to-zinc-900/50 transition-all duration-300 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Accent gradient based on platform color */}
      <div
        className={`absolute inset-x-0 top-0 h-1 ${config.bg} opacity-60 transition-opacity group-hover:opacity-100`}
      />

      <div className="p-4 sm:p-5">
        {/* Header: Logo + Platform Info */}
        <div className="flex items-start gap-4">
          {/* Platform Logo */}
          <PlatformLogo config={config} size={48} />

          {/* Platform Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">
                {config.name}
              </h3>
              <a
                href={`${config.url}${handle.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                title="View profile"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <a
              href={`${config.url}${handle.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-block text-sm font-medium text-zinc-400 transition-colors hover:text-blue-400"
            >
              @{handle.handle}
            </a>

            {/* Sync Status */}
            <div className="mt-2">
              <SyncStatus
                lastSyncedAt={handle.last_synced_at}
                isSyncing={isSyncing}
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {(rating > 0 || solved > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <RatingBadge rating={rating} platform={handle.platform} />
            <SolvedBadge solved={solved} />
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-800/50 pt-4">
          <div className="flex items-center gap-2">
            {config.syncSupported && (
              <ActionButton
                onClick={() => onSync(handle.platform)}
                disabled={isSyncing}
                variant="primary"
                title="Sync data"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">Sync</span>
              </ActionButton>
            )}

            {handle.platform === 'spoj' && (
              <ActionButton
                onClick={() => setShowManualSync(!showManualSync)}
                variant="default"
                title="Manual HTML Sync"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Manual Import</span>
              </ActionButton>
            )}

            <div className="flex-1" />

            <ActionButton
              onClick={handleDisconnect}
              variant={showConfirm ? 'danger' : 'default'}
              title={showConfirm ? 'Click to confirm' : 'Disconnect'}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {showConfirm ? 'Confirm?' : 'Remove'}
              </span>
            </ActionButton>
          </div>
          
          {/* Manual HTML Sync Area for SPOJ */}
          {handle.platform === 'spoj' && showManualSync && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 overflow-hidden"
            >
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-3 shadow-inner">
                <label className="mb-2 block text-xs text-zinc-400">
                  Because SPOJ natively blocks automated syncing, you may optionally visit <a href={`https://www.spoj.com/users/${handle.handle}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">your profile</a>, press <strong>Ctrl+A</strong> then <strong>Ctrl+C</strong> to copy the entire page content, and paste it here:
                </label>
                <textarea
                  className="h-24 w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Paste profile HTML here..."
                  value={manualHtml}
                  onChange={(e) => setManualHtml(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <ActionButton
                     onClick={() => {
                        if (manualHtml.trim()) {
                            onSync(handle.platform, true, manualHtml);
                            setManualHtml('');
                            setShowManualSync(false);
                        }
                     }}
                     disabled={!manualHtml.trim() || isSyncing}
                     variant="primary"
                  >
                     <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                     Run Import
                  </ActionButton>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
