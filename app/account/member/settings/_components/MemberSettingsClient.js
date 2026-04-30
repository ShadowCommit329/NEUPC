'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import {
  User,
  Bell,
  Lock,
  Mail,
  Phone,
  Check,
  X,
  Loader2,
  BadgeCheck,
  AlertTriangle,
  Info,
  LogOut,
  Globe,
  KeyRound,
  Shield,
  Palette,
  ExternalLink,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Camera,
  Upload,
  Trash2,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateMemberInfoAction } from '@/app/_lib/member-profile-actions';
import {
  uploadAvatarAction,
  removeAvatarAction,
} from '@/app/_lib/avatar-actions';
import { signOutAction } from '@/app/_lib/actions';

// ─── Sidebar nav items ─────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'connected', label: 'Connected accounts', icon: ExternalLink },
  { id: 'danger', label: 'Danger zone', icon: AlertTriangle },
];

// ─── Status meta ───────────────────────────────────────────────────────────────
const STATUS_META = {
  active: {
    label: 'Active',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  suspended: {
    label: 'Suspended',
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
  },
  banned: {
    label: 'Banned',
    color: 'text-red-500 bg-red-500/10 border-red-500/20',
  },
  locked: {
    label: 'Locked',
    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
  },
};

// ─── Sidebar item (desktop) ───────────────────────────────────────────────────
function SideItem({ section, active, onClick }) {
  const Icon = section.icon;
  const isDanger = section.id === 'danger';
  return (
    <button
      onClick={() => onClick(section.id)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
        active
          ? 'bg-white/[0.07] text-white'
          : isDanger
            ? 'text-red-400/60 hover:bg-red-400/[0.06] hover:text-red-400'
            : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
      }`}
    >
      <Icon
        className={`size-[15px] shrink-0 ${
          active
            ? 'text-white/70'
            : isDanger
              ? 'text-red-400/50'
              : 'text-white/30'
        }`}
      />
      <span className="flex-1 truncate">{section.label}</span>
      {active && <ChevronRight className="size-3.5 text-white/30" />}
    </button>
  );
}

// ─── Mobile tab pill ──────────────────────────────────────────────────────────
function MobileTab({ section, active, onClick }) {
  const Icon = section.icon;
  const isDanger = section.id === 'danger';
  return (
    <button
      onClick={() => onClick(section.id)}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
        active
          ? 'border-white/20 bg-white/[0.09] text-white'
          : isDanger
            ? 'border-red-400/15 bg-transparent text-red-400/55 hover:border-red-400/25 hover:text-red-400'
            : 'border-white/[0.07] bg-transparent text-white/35 hover:border-white/15 hover:text-white/65'
      }`}
    >
      <Icon className="size-3.5 shrink-0" />
      {section.label}
    </button>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-[15px] font-semibold text-white/90">{title}</h2>
      {description && (
        <p className="mt-1 text-xs text-white/35">{description}</p>
      )}
    </div>
  );
}

// ─── Field block ───────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium tracking-wider text-white/40 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Read-only info row ────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, badge }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.05] py-3 last:border-0">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
        <Icon className="size-3.5 text-white/35" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10.5px] text-white/30">{label}</p>
        <p className="truncate text-[13px] text-white/65">
          {value || <span className="text-white/20 italic">Not set</span>}
        </p>
      </div>
      {badge && <div className="shrink-0 self-center">{badge}</div>}
    </div>
  );
}

// ─── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-white/[0.05] py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-white/65">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11.5px] text-white/30">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-checked={checked}
        role="switch"
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ${
          checked
            ? 'border-indigo-500 bg-indigo-500'
            : 'border-white/15 bg-white/8'
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Radio group ──────────────────────────────────────────────────────────────
function RadioGroup({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] py-3.5 last:border-0">
      <span className="text-[13px] font-medium text-white/65">{label}</span>
      <div className="flex overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium transition-colors sm:px-3 ${
              value === o.value
                ? 'bg-white/[0.08] text-white'
                : 'text-white/30 hover:text-white/55'
            }`}
          >
            {o.icon && <o.icon className="size-3.5" />}
            <span className="hidden sm:inline">{o.label}</span>
            <span className="sm:hidden">{o.label.slice(0, 3)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({
  name,
  defaultValue,
  placeholder,
  readOnly,
  prefix,
  type = 'text',
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] transition-colors focus-within:border-white/20">
      {prefix && (
        <span className="flex items-center border-r border-white/8 bg-white/[0.03] px-3 font-mono text-[11.5px] text-white/25 select-none">
          {prefix}
        </span>
      )}
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        className={`flex-1 bg-transparent px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 outline-none ${
          readOnly ? 'cursor-not-allowed text-white/25' : ''
        }`}
      />
    </div>
  );
}

// ─── Avatar Crop Modal ────────────────────────────────────────────────────────
function AvatarCropModal({ src, onApply, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const SIZE = 280; // output square px

  // draw whenever offset/zoom changes
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);

    const naturalMin = Math.min(img.naturalWidth, img.naturalHeight);
    const baseScale = SIZE / naturalMin;
    const scale = baseScale * zoom;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const cx = SIZE / 2 + offset.x - w / 2;
    const cy = SIZE / 2 + offset.y - h / 2;

    // clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx, cy, w, h);
    ctx.restore();

    // ring
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [offset, zoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  // pointer events for drag
  function onPointerDown(e) {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }
  function onPointerUp() {
    dragging.current = false;
  }

  function reset() {
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  }

  function apply() {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      onApply(new File([blob], 'avatar.png', { type: 'image/png' }));
    }, 'image/png');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="w-full overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl sm:max-w-[360px] sm:rounded-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[14px] font-semibold text-white/90">
              Crop &amp; position
            </p>
            <p className="mt-0.5 text-[11px] text-white/30">
              Drag to reposition · pinch or scroll to zoom
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex size-7 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition hover:bg-white/10 hover:text-white/70"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* hidden img for drawing */}
        <img
          ref={imgRef}
          src={src}
          onLoad={draw}
          className="hidden"
          alt=""
          crossOrigin="anonymous"
        />

        {/* canvas — full width with dark surround */}
        <div className="relative mx-5 mb-4 flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className="cursor-grab touch-none rounded-full ring-1 ring-white/10 active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
            {/* corner hint */}
            <span className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 text-[10px] text-white/20">
              <Move className="size-3" /> drag
            </span>
          </div>
        </div>

        {/* zoom */}
        <div className="mx-5 mt-7 mb-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/35 transition hover:bg-white/10 hover:text-white/70"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <div className="relative h-1 flex-1 rounded-full bg-white/[0.08]">
            <div
              className="absolute top-0 left-0 h-1 rounded-full bg-indigo-500/70 transition-all"
              style={{ width: `${((zoom - 0.5) / 2.5) * 100}%` }}
            />
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="absolute inset-0 h-1 w-full cursor-pointer opacity-0"
            />
          </div>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/35 transition hover:bg-white/10 hover:text-white/70"
          >
            <ZoomIn className="size-3.5" />
          </button>
        </div>
        <p className="mb-4 text-center text-[10px] text-white/20">
          {Math.round(zoom * 100)}%
        </p>

        {/* actions */}
        <div className="flex gap-2 border-t border-white/[0.06] px-5 py-4">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-[12px] text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-indigo-500 active:bg-indigo-700"
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Avatar Uploader ──────────────────────────────────────────────────────────
function AvatarUploader({ user }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);
  const [cropSrc, setCropSrc] = useState(null); // data URL → show modal
  const [pendingRef, setPendingRef] = useState(null); // input element ref for reset
  const isImage = user.avatar_url?.startsWith('/api/image/');

  const initials =
    user.avatar_url && user.avatar_url.length <= 3
      ? user.avatar_url
      : (user.full_name
          ?.split(' ')
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() ?? 'M');

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPendingRef(e.target);
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  }

  // "Relocate" — reload existing avatar into crop modal
  function handleRelocate() {
    setError(null);
    setCropSrc(user.avatar_url);
  }

  async function handleCropApply(file) {
    setCropSrc(null);
    if (pendingRef) {
      pendingRef.value = '';
      setPendingRef(null);
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const result = await uploadAvatarAction(fd);
      if (result?.error) setError(result.error);
      else router.refresh();
    } catch {
      setError('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleCropCancel() {
    setCropSrc(null);
    if (pendingRef) {
      pendingRef.value = '';
      setPendingRef(null);
    }
  }

  async function handleRemove() {
    setError(null);
    setRemoving(true);
    try {
      const result = await removeAvatarAction();
      if (result?.error) setError(result.error);
      else router.refresh();
    } catch {
      setError('Failed to remove.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* ── large avatar preview ── */}
          <div className="group relative shrink-0">
            {isImage ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="size-24 rounded-full object-cover shadow-lg ring-2 ring-white/10"
              />
            ) : (
              <div
                className="flex size-24 items-center justify-center rounded-full text-2xl font-bold shadow-lg ring-2 ring-white/10"
                style={{
                  background: 'linear-gradient(135deg,#4ade80,#22a360)',
                  color: '#03200f',
                }}
              >
                {initials}
              </div>
            )}
            {/* hover overlay — quick upload */}
            <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-full bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
              {uploading ? (
                <Loader2 className="size-5 animate-spin text-white" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
              <span className="text-[9px] font-medium tracking-wide text-white/80">
                {uploading ? 'Uploading…' : 'Change'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>

            {/* uploading ring */}
            {uploading && (
              <span className="pointer-events-none absolute inset-0 animate-pulse rounded-full ring-2 ring-indigo-500/50" />
            )}
          </div>

          {/* ── right column ── */}
          <div className="w-full flex-1">
            <p className="mb-0.5 text-[13px] font-semibold text-white/80">
              Profile photo
            </p>
            <p className="mb-4 text-[11.5px] text-white/30">
              Square image recommended · JPEG, PNG, WebP, GIF · Max 5 MB
            </p>

            {/* action buttons */}
            <div className="flex flex-wrap gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-[12px] font-medium text-indigo-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/20 disabled:opacity-40">
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {uploading ? 'Uploading…' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileChange}
                />
              </label>

              {isImage && (
                <button
                  type="button"
                  onClick={handleRelocate}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-[12px] font-medium text-white/50 transition hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-40"
                >
                  <Move className="size-3.5" /> Crop &amp; reposition
                </button>
              )}

              {isImage && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/15 bg-red-500/[0.06] px-3.5 py-2 text-[12px] font-medium text-red-400/70 transition hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                >
                  {removing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  {removing ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-red-400">
                <AlertTriangle className="size-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Section: Account ─────────────────────────────────────────────────────────
function AccountSection({ user }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const statusMeta = STATUS_META[user.account_status] ?? STATUS_META.pending;

  async function handleSubmit(formData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateMemberInfoAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setEditing(false);
        }, 1200);
      }
    });
  }

  return (
    <div className="space-y-8">
      <SectionHead
        title="Account"
        description="Your account status, personal details, and contact information"
      />

      {/* Status card */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <p className="mb-4 text-[11px] font-semibold tracking-widest text-white/30 uppercase">
          Account status
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.color}`}
            >
              {statusMeta.label}
            </span>
            {user.email_verified && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-0.5 text-[11px] text-emerald-400">
                <BadgeCheck className="size-3" /> Email verified
              </span>
            )}
            {user.phone_verified && (
              <span className="flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/8 px-2.5 py-0.5 text-[11px] text-sky-400">
                <Phone className="size-3" /> Phone verified
              </span>
            )}
          </div>
          <div className="text-right text-[11.5px] text-white/25">
            {user.created_at && (
              <p>
                Member since{' '}
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
            {user.last_login && (
              <p>
                Last login{' '}
                {new Date(user.last_login).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
        {user.status_reason && (
          <p className="mt-3 flex items-start gap-1.5 text-[11.5px] text-white/30">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {user.status_reason}
          </p>
        )}
      </div>

      {/* Avatar */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <div className="border-b border-white/[0.05] px-5 py-4">
          <p className="text-[13px] font-semibold text-white/75">Avatar</p>
          <p className="mt-0.5 text-[11.5px] text-white/30">
            Your photo shown across the platform
          </p>
        </div>
        <div className="px-5 py-4">
          <AvatarUploader user={user} />
        </div>
      </div>

      {/* Personal info */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
          <div>
            <p className="text-[13px] font-semibold text-white/75">
              Personal information
            </p>
            <p className="mt-0.5 text-[11.5px] text-white/30">
              Update your display name and contact details
            </p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-white/35 transition hover:bg-white/[0.07] hover:text-white/65"
            >
              Edit
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          {editing ? (
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <Input
                    name="full_name"
                    defaultValue={user.full_name}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    name="phone"
                    defaultValue={user.phone ?? ''}
                    placeholder="+880 1XXX XXXXXX"
                    type="tel"
                  />
                </Field>
              </div>
              <Field label="Email · read-only (OAuth)">
                <Input defaultValue={user.email} readOnly />
              </Field>

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-2.5 text-[12.5px] text-red-400">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-2.5 text-[12.5px] text-emerald-400">
                  Saved successfully.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-white/[0.13] disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-[12px] text-white/40 transition hover:bg-white/[0.07] hover:text-white/65"
                >
                  <X className="size-4" /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <InfoRow icon={User} label="Full name" value={user.full_name} />
              <InfoRow
                icon={Mail}
                label="Email"
                value={user.email}
                badge={
                  user.email_verified ? (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2 py-0.5 text-[10px] text-emerald-400">
                      <BadgeCheck className="size-3" /> Verified
                    </span>
                  ) : null
                }
              />
              <InfoRow icon={Phone} label="Phone" value={user.phone || null} />
              <InfoRow
                icon={Globe}
                label="Auth provider"
                value={
                  user.provider
                    ? user.provider.charAt(0).toUpperCase() +
                      user.provider.slice(1)
                    : 'Email / password'
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section: Notifications ───────────────────────────────────────────────────
function NotificationsSection() {
  const [eventReminders, setEventReminders] = useState(true);
  const [notices, setNotices] = useState(true);
  const [achievements, setAchievements] = useState(true);
  const [discussions, setDiscussions] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  return (
    <div className="space-y-8">
      <SectionHead
        title="Notifications"
        description="Choose which updates you want to receive"
      />
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <div className="border-b border-white/[0.05] px-5 py-4">
          <p className="text-[13px] font-semibold text-white/75">
            Email &amp; push
          </p>
          <p className="mt-0.5 text-[11.5px] text-white/30">
            Preferences saved locally for this session
          </p>
        </div>
        <div className="px-5">
          <ToggleRow
            label="Event reminders"
            description="Notify before registered events start"
            checked={eventReminders}
            onChange={setEventReminders}
          />
          <ToggleRow
            label="New notices"
            description="Important club announcements"
            checked={notices}
            onChange={setNotices}
          />
          <ToggleRow
            label="Achievement updates"
            description="When you earn new badges or milestones"
            checked={achievements}
            onChange={setAchievements}
          />
          <ToggleRow
            label="Discussion replies"
            description="When someone replies to your threads"
            checked={discussions}
            onChange={setDiscussions}
          />
          <ToggleRow
            label="Weekly digest"
            description="A summary of your activity every Monday"
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
          />
        </div>
        <p className="flex items-start gap-2 border-t border-white/[0.04] px-5 py-3.5 text-[11px] text-white/25">
          <Info className="mt-px size-3 shrink-0" />
          Email delivery is managed at the club level. These preferences are
          saved in your browser session.
        </p>
      </div>
    </div>
  );
}

// ─── Section: Appearance ──────────────────────────────────────────────────────
function AppearanceSection() {
  const [theme, setTheme] = useState('dark');
  const [density, setDensity] = useState('comfortable');
  const [accent, setAccent] = useState('indigo');

  const ACCENTS = [
    { value: 'indigo', label: 'Indigo', color: 'bg-indigo-500' },
    { value: 'violet', label: 'Violet', color: 'bg-violet-500' },
    { value: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
    { value: 'amber', label: 'Amber', color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8">
      <SectionHead
        title="Appearance"
        description="Customize the look and feel of your workspace"
      />
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <div className="border-b border-white/[0.05] px-5 py-4">
          <p className="text-[13px] font-semibold text-white/75">Interface</p>
        </div>
        <div className="px-5">
          <RadioGroup
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'system', label: 'System', icon: Monitor },
            ]}
          />
          <RadioGroup
            label="Density"
            value={density}
            onChange={setDensity}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </div>
        <div className="border-t border-white/[0.04] px-5 py-4">
          <p className="mb-3 text-[13px] font-medium text-white/65">
            Accent color
          </p>
          <div className="flex gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAccent(a.value)}
                title={a.label}
                className={`relative flex size-8 items-center justify-center rounded-full ${a.color} transition-transform hover:scale-110 ${accent === a.value ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-gray-950' : ''}`}
              >
                {accent === a.value && (
                  <Check className="size-3.5 text-white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-white/25">
            Appearance settings are not persisted yet — coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Security ────────────────────────────────────────────────────────
function SecuritySection({ user }) {
  return (
    <div className="space-y-8">
      <SectionHead
        title="Security"
        description="Authentication method and account security"
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
              <KeyRound className="size-4 text-white/35" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white/70">
                Authentication
              </p>
              <p className="text-[11.5px] text-white/30">
                {user.provider
                  ? `Managed by ${user.provider} OAuth — no password required`
                  : 'Email & password authentication'}
              </p>
            </div>
          </div>
          {user.provider && (
            <span className="rounded-full border border-sky-400/20 bg-sky-400/8 px-2.5 py-0.5 text-[10.5px] font-semibold text-sky-400">
              OAuth
            </span>
          )}
        </div>

        {user.suspension_expires_at && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5 text-amber-400">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-[13px] font-semibold text-amber-400">
                Account temporarily suspended
              </p>
              <p className="mt-0.5 text-[11.5px] text-amber-400/60">
                Suspension lifts on{' '}
                {new Date(user.suspension_expires_at).toLocaleDateString(
                  'en-US',
                  {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }
                )}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="mb-1 text-[13px] font-medium text-white/70">
            Active sessions
          </p>
          <p className="text-[11.5px] text-white/30">
            Session management coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Connected accounts ──────────────────────────────────────────────
function ConnectedSection({ user }) {
  const platforms = [
    { label: 'Google', key: 'google', connected: user.provider === 'google' },
    { label: 'GitHub', key: 'github', connected: user.provider === 'github' },
    {
      label: 'Facebook',
      key: 'facebook',
      connected: user.provider === 'facebook',
    },
  ];
  return (
    <div className="space-y-8">
      <SectionHead
        title="Connected accounts"
        description="OAuth providers linked to your NEUPC account"
      />
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        {platforms.map((p, i) => (
          <div
            key={p.key}
            className={`flex items-center justify-between gap-4 px-5 py-4 ${
              i < platforms.length - 1 ? 'border-b border-white/[0.04]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
                <Globe className="size-4 text-white/30" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-white/70">
                  {p.label}
                </p>
                <p className="text-[11.5px] text-white/30">
                  {p.connected ? 'Primary auth provider' : 'Not connected'}
                </p>
              </div>
            </div>
            {p.connected ? (
              <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-400">
                <Check className="size-3" /> Connected
              </span>
            ) : (
              <button className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-white/35 transition hover:bg-white/[0.07] hover:text-white/65">
                {' '}
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Danger zone ─────────────────────────────────────────────────────
function DangerSection() {
  return (
    <div className="space-y-8">
      <SectionHead
        title="Danger zone"
        description="Irreversible or sensitive account actions"
      />
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-white/70">Sign out</p>
            <p className="mt-0.5 text-[11.5px] text-white/30">
              End your session on this device. Your data stays safe.
            </p>
          </div>
          <form action={signOutAction} className="self-start sm:self-auto">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/8 px-4 py-2 text-[12.5px] font-medium text-red-400 transition hover:bg-red-400/15 hover:text-red-300"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-red-400/70">
              Delete account
            </p>
            <p className="mt-0.5 text-[11.5px] text-red-400/40">
              Permanently remove your account and all associated data. This
              cannot be undone.
            </p>
          </div>
          <button
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-2 text-[12.5px] font-medium text-red-400/40 sm:w-auto"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MemberSettingsClient({ user }) {
  const [active, setActive] = useState('account');

  const content = {
    account: <AccountSection user={user} />,
    notifications: <NotificationsSection />,
    appearance: <AppearanceSection />,
    security: <SecuritySection user={user} />,
    connected: <ConnectedSection user={user} />,
    danger: <DangerSection />,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-white/35">
          Manage your account, preferences, and security
        </p>
      </div>

      {/* Mobile: horizontal scrollable tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((s) => (
          <MobileTab
            key={s.id}
            section={s}
            active={active === s.id}
            onClick={setActive}
          />
        ))}
      </div>

      {/* sm+: two-column layout */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* Sticky sidebar nav — hidden on mobile */}
        <aside className="hidden w-[176px] shrink-0 sm:sticky sm:top-[70px] sm:block">
          <nav className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <SideItem
                key={s.id}
                section={s}
                active={active === s.id}
                onClick={setActive}
              />
            ))}
          </nav>
        </aside>

        {/* Content panel */}
        <div className="min-w-0 flex-1">{content[active]}</div>
      </div>
    </div>
  );
}
