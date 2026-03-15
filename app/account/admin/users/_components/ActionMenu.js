/**
 * @file Action menu — dropdown menu for per-user actions (edit, suspend,
 *   ban, change role) with contextual option visibility.
 * @module AdminActionMenu
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  ShieldOff,
  Ban,
  Lock,
  ShieldCheck,
  MessageSquare,
  Mail,
} from 'lucide-react';

export default function ActionMenu({ user, onAction }) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dropdownHeight = 180; // approx max height
    const dropdownWidth = 192; // w-48
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight + 8;
    setDropdownStyle({
      position: 'fixed',
      right: window.innerWidth - rect.right,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      width: dropdownWidth,
      zIndex: 9999,
    });
  }, [open]);

  const actions = [];

  // Messages is always available for every user
  actions.push({
    key: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    color: 'text-sky-400',
  });

  if (user.email) {
    actions.push({
      key: 'email',
      label: 'Send Email',
      icon: Mail,
      color: 'text-blue-400',
    });
  }

  if (
    user.status === 'Suspended' ||
    user.status === 'Banned' ||
    user.status === 'Locked' ||
    user.status === 'Rejected'
  ) {
    actions.push({
      key: 'activate',
      label: 'Activate',
      icon: ShieldCheck,
      color: 'text-emerald-400',
    });
  }

  if (
    user.status !== 'Suspended' &&
    user.status !== 'Banned' &&
    user.status !== 'Locked' &&
    user.status !== 'Rejected'
  ) {
    actions.push({
      key: 'suspend',
      label: 'Suspend',
      icon: ShieldOff,
      color: 'text-orange-400',
    });
  }
  if (user.status !== 'Banned') {
    actions.push({
      key: 'ban',
      label: 'Ban',
      icon: Ban,
      color: 'text-red-400',
    });
  }
  if (user.status !== 'Locked') {
    actions.push({
      key: 'lock',
      label: 'Lock Account',
      icon: Lock,
      color: 'text-purple-400',
    });
  }

  if (actions.length === 0) return null;

  // Split into three groups: utility, safe, destructive
  const utilityActions = actions.filter((a) => a.key === 'messages' || a.key === 'email');
  const safeActions = actions.filter((a) => a.key === 'activate');
  const destructiveActions = actions.filter(
    (a) => a.key !== 'activate' && a.key !== 'messages' && a.key !== 'email'
  );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/8 hover:text-gray-300"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-9998"
              onClick={() => setOpen(false)}
            />
            <div
              style={dropdownStyle}
              className="overflow-hidden rounded-xl border border-white/10 bg-gray-950 shadow-2xl ring-1 ring-black/20"
            >
              {utilityActions.length > 0 && (
                <div className="p-1">
                  {utilityActions.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => {
                        setOpen(false);
                        onAction(a.key, user);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/6 ${a.color}`}
                    >
                      <a.icon className="h-4 w-4 shrink-0" />
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              {utilityActions.length > 0 &&
                (safeActions.length > 0 || destructiveActions.length > 0) && (
                  <div className="mx-1 border-t border-white/8" />
                )}
              {safeActions.length > 0 && (
                <div className="p-1">
                  {safeActions.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => {
                        setOpen(false);
                        onAction(a.key, user);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/6 ${a.color}`}
                    >
                      <a.icon className="h-4 w-4 shrink-0" />
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              {safeActions.length > 0 && destructiveActions.length > 0 && (
                <div className="mx-1 border-t border-white/8" />
              )}
              {destructiveActions.length > 0 && (
                <div className="p-1">
                  {destructiveActions.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => {
                        setOpen(false);
                        onAction(a.key, user);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/6 ${a.color}`}
                    >
                      <a.icon className="h-4 w-4 shrink-0" />
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
