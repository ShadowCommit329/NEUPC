/**
 * @file Add Platform Section Component
 * @description Modern platform picker with search and categorized view
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { usePlatformSearch } from './usePlatformSearch';

/**
 * Modal Overlay Component - Backdrop for modal dialog
 */
function ModalOverlay({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
    />
  );
}

/**
 * Modal Dialog Component - Container for popup content
 */
function ModalDialog({ isOpen, onClose, children, title }) {
  // Freeze background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <ModalOverlay onClose={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-700/50 bg-linear-to-br from-zinc-800/95 to-zinc-900/95 shadow-2xl backdrop-blur-xl sm:max-h-[85vh] sm:w-[90vw] md:max-h-[90vh] md:w-[85vw] lg:w-[75vw] xl:max-h-[90vh] xl:w-[60vw] 2xl:w-[50vw]"
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-700/50 bg-linear-to-r from-zinc-800/80 to-zinc-900/80 px-6 py-4 backdrop-blur">
              {title && (
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              )}
              <button
                onClick={onClose}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-white"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Platform Logo - Shows image from platforms file with styled fallback
 */
function PlatformLogo({ config, size = 32 }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const showImage = config?.logo && !imageError;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Fallback badge */}
      <div
        className={`absolute inset-0 inline-flex items-center justify-center rounded-xl font-bold shadow-lg transition-opacity duration-200 ${config?.bg || 'bg-zinc-700'} ${config?.color || 'text-white'} ${showImage && imageLoaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ fontSize: size * 0.38 }}
      >
        {config?.short || '??'}
      </div>

      {/* Platform logo image */}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element -- Dynamic third-party logos are loaded directly and gracefully fallback to initials on error.
        <img
          src={config.logo}
          alt={config.name || 'Platform'}
          width={size}
          height={size}
          className={`absolute inset-0 rounded-xl object-contain p-1.5 transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: 'rgba(24, 24, 27, 0.5)' }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}

/**
 * Platform selection item
 */
function PlatformItem({ platform, config, onClick, disabled }) {
  return (
    <button
      onClick={() => onClick(platform.id)}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 text-left transition-all hover:scale-[1.01] hover:border-zinc-700 hover:bg-zinc-800/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <PlatformLogo config={config} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white group-hover:text-blue-400">
          {config.name}
        </div>
        <div className="truncate text-xs text-zinc-500">
          {platform.description || config.placeholder}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
    </button>
  );
}

/**
 * Connect form for entering username
 */
function ConnectForm({
  platformId,
  config,
  onSubmit,
  onCancel,
  isLoading,
  error,
}) {
  const [handle, setHandle] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [platformId]);

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (handle.trim()) {
          onSubmit(platformId, handle.trim());
        }
      }}
      className="overflow-hidden rounded-2xl border border-zinc-700/50 bg-linear-to-br from-zinc-800/80 to-zinc-900/80 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-700/50 p-4">
        <PlatformLogo config={config} size={44} />
        <div className="flex-1">
          <h4 className="text-base font-semibold text-white">{config.name}</h4>
          <p className="text-sm text-zinc-400">Enter your username or handle</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Input */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={config.placeholder}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 flex-1 items-center justify-center rounded-xl border border-zinc-700 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!handle.trim() || isLoading}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-sm font-medium text-white transition-all hover:from-blue-500 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Connect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.form>
  );
}

/**
 * Category section - shows first row by default, expandable
 */
function CategorySection({
  category,
  platforms,
  platformConfig,
  onPlatformClick,
  disabled,
}) {
  const [expanded, setExpanded] = useState(false);

  // Show 3 items initially (first row on lg screens)
  const initialCount = 3;
  const hasMore = platforms.length > initialCount;
  const visiblePlatforms = expanded
    ? platforms
    : platforms.slice(0, initialCount);
  const remainingCount = platforms.length - initialCount;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/20">
      {/* Category Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{category.icon}</span>
          <span className="text-sm font-medium text-zinc-200">
            {category.label}
          </span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
            {platforms.length}
          </span>
        </div>
      </div>

      {/* Platform Grid */}
      <div className="p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlatforms.map((platform) => (
            <PlatformItem
              key={platform.id}
              platform={platform}
              config={platformConfig[platform.id]}
              onClick={onPlatformClick}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Show More / Less Button */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700/50 py-2 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-800/30 hover:text-zinc-300"
          >
            {expanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show {remainingCount} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Platform Selection Modal Content - Shows list of platforms with search
 */
function PlatformSelectionContent({
  availablePlatforms,
  platformConfig,
  onPlatformClick,
  isConnecting,
}) {
  const { searchQuery, setSearchQuery, groupedPlatforms, hasResults } =
    usePlatformSearch(availablePlatforms, platformConfig);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="sticky top-0 z-10">
        <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search platforms..."
          autoFocus
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 pr-10 pl-11 text-sm text-white placeholder-zinc-500 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Sections */}
      {hasResults ? (
        <div className="space-y-4">
          {Object.entries(groupedPlatforms).map(([categoryId, category]) => (
            <CategorySection
              key={categoryId}
              category={category}
              platforms={category.platforms}
              platformConfig={platformConfig}
              onPlatformClick={onPlatformClick}
              disabled={isConnecting}
            />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-zinc-800 py-12 text-center"
        >
          <Search className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
          <p className="text-sm font-medium text-zinc-500">
            No platforms found
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            Clear search
          </button>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Main Add Platform Section with Modal Dialog
 */
export default function AddPlatformSection({
  availablePlatforms,
  platformConfig,
  onConnect,
  isConnecting,
  error,
  isExpanded,
  onToggleExpanded,
  hasConnected,
}) {
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [backStack, setBackStack] = useState([]);

  const handleConnect = async (platformId, handle) => {
    try {
      await onConnect(platformId, handle);
      setConnectingPlatform(null);
      setBackStack([]);
      if (isExpanded) {
        onToggleExpanded();
      }
    } catch {
      // Error handled by parent
    }
  };

  const handlePlatformSelect = (platformId) => {
    setBackStack([...backStack, platformId]);
    setConnectingPlatform(platformId);
  };

  const handleGoBack = () => {
    const newStack = [...backStack];
    newStack.pop();
    setBackStack(newStack);
    setConnectingPlatform(
      newStack.length > 0 ? newStack[newStack.length - 1] : null
    );
  };

  const handleCloseModal = () => {
    setConnectingPlatform(null);
    setBackStack([]);
    if (isExpanded) {
      onToggleExpanded();
    }
  };

  return (
    <div className={hasConnected ? 'border-t border-zinc-800/50 pt-6' : ''}>
      <ModalDialog
        isOpen={isExpanded}
        onClose={handleCloseModal}
        title={
          connectingPlatform
            ? platformConfig[connectingPlatform]?.name
            : 'Add Platform'
        }
      >
        {/* Back Button - Show when selecting a specific platform */}
        {connectingPlatform && (
          <button
            onClick={handleGoBack}
            className="mb-4 flex items-center gap-2 rounded-lg p-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {/* Connect Form - Show when platform selected */}
        {connectingPlatform ? (
          <ConnectForm
            platformId={connectingPlatform}
            config={platformConfig[connectingPlatform]}
            onSubmit={handleConnect}
            onCancel={handleGoBack}
            isLoading={isConnecting}
            error={error}
          />
        ) : (
          /* Platform Selection - Show when no platform selected */
          <PlatformSelectionContent
            availablePlatforms={availablePlatforms}
            platformConfig={platformConfig}
            onPlatformClick={handlePlatformSelect}
            isConnecting={isConnecting}
          />
        )}
      </ModalDialog>
    </div>
  );
}
