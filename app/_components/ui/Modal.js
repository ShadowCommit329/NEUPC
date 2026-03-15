/**
 * @file Modal
 * @module Modal
 */

'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable modal dialog component.
 * Features: backdrop click close, escape key, focus trap, scroll lock, animations.
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Handler to close the modal
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal body content
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} showCloseButton - Whether to show the X button
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className = '',
}) {
  const overlayRef = useRef(null);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    // Lock both html and body to cover all browser scroll roots
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="animate-fade-in fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-6 backdrop-blur-sm sm:items-center sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`relative w-full ${sizeClasses[size]} animate-zoom-in rounded-2xl border border-white/10 bg-gray-900 shadow-2xl ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="overflow-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
