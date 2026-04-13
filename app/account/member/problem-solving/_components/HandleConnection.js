'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Plus, X, RefreshCw, Loader2 } from 'lucide-react';
import { PROBLEM_SOLVING_PLATFORMS } from '@/app/_lib/problem-solving-platforms';

const PLATFORMS = PROBLEM_SOLVING_PLATFORMS.map((p) => ({
  id: p.id,
  name: p.name,
  color: p.ui.color,
  url: p.profileUrlPrefix,
  placeholder: p.handlePlaceholder,
  syncSupported: p.syncSupported,
}));

const getSolved = (stats, id) => {
  if (!stats) return 0;
  if (id === 'leetcode')
    return (stats.easy || 0) + (stats.medium || 0) + (stats.hard || 0);
  return stats.solved || 0;
};

export default function HandleConnection({
  handles = [],
  statistics = {},
  onConnect,
  onDisconnect,
  onSyncPlatform,
  isConnecting,
  isSyncing,
  syncingPlatform,
  error,
}) {
  const [connecting, setConnecting] = useState(null);
  const [handle, setHandle] = useState('');
  const [expanded, setExpanded] = useState(false);

  const connected = handles.map((h) => h.platform);
  const available = PLATFORMS.filter((p) => !connected.includes(p.id));
  const stats = statistics?.platform_stats || {};

  const submit = async (e) => {
    e.preventDefault();
    if (!handle.trim()) return;
    try {
      await onConnect(connecting, handle.trim());
      setConnecting(null);
      setHandle('');
    } catch {}
  };

  return (
    <div>
      {/* Connected Platforms */}
      {handles.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
              Connected
            </span>
            <span className="text-[11px] text-gray-600">
              {handles.length}/{PLATFORMS.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {handles.map((h) => {
              const p =
                PLATFORMS.find((x) => x.id === h.platform) || PLATFORMS[0];
              const solved = getSolved(stats[h.platform], h.platform);
              return (
                <div
                  key={h.platform}
                  className="group inline-flex items-center gap-2 rounded-md bg-gray-800/60 px-2.5 py-1.5"
                >
                  <span className={`text-[11px] font-semibold ${p.color}`}>
                    {p.name}
                  </span>
                  <a
                    href={`${p.url}${h.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white"
                  >
                    {h.handle}
                    <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                  </a>
                  {solved > 0 && (
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      {solved}
                    </span>
                  )}
                  <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                    {p.syncSupported && (
                      <button
                        onClick={() => onSyncPlatform(h.platform)}
                        disabled={isSyncing}
                        className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-2.5 w-2.5 ${syncingPlatform === h.platform ? 'animate-spin' : ''}`}
                        />
                      </button>
                    )}
                    <button
                      onClick={() => onDisconnect(h.platform)}
                      className="p-0.5 text-gray-600 hover:text-red-400"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect Form */}
      <AnimatePresence>
        {connecting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <form
              onSubmit={submit}
              className="flex items-center gap-2 rounded-md bg-gray-800/60 p-2"
            >
              <span
                className={`text-[11px] font-semibold ${PLATFORMS.find((p) => p.id === connecting)?.color}`}
              >
                {PLATFORMS.find((p) => p.id === connecting)?.name}
              </span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder={
                  PLATFORMS.find((p) => p.id === connecting)?.placeholder
                }
                className="flex-1 bg-transparent px-2 py-1 text-[11px] text-white placeholder-gray-600 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!handle.trim() || isConnecting}
                className="rounded bg-white px-2.5 py-1 text-[11px] font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Add'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConnecting(null);
                  setHandle('');
                }}
                className="p-0.5 text-gray-600 hover:text-gray-400"
              >
                <X className="h-3 w-3" />
              </button>
            </form>
            {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Platforms */}
      {!connecting && available.length > 0 && (
        <div>
          <span className="mb-1.5 block text-[11px] font-medium tracking-wide text-gray-500 uppercase">
            Add
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(expanded ? available : available.slice(0, 6)).map((p) => (
              <button
                key={p.id}
                onClick={() => setConnecting(p.id)}
                disabled={isConnecting}
                className="inline-flex items-center gap-1 rounded-md bg-gray-800/40 px-2 py-1 text-[11px] text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300 disabled:opacity-50"
              >
                <Plus className={`h-2.5 w-2.5 ${p.color}`} />
                {p.name}
              </button>
            ))}
            {available.length > 6 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-2 py-1 text-[11px] text-gray-600 hover:text-gray-400"
              >
                {expanded ? 'less' : `+${available.length - 6}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {handles.length === 0 && !connecting && (
        <p className="text-[11px] text-gray-600">No platforms connected</p>
      )}
    </div>
  );
}
