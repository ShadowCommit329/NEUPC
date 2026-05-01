'use client';

import { useState } from 'react';
import { useScrollLock } from '@/app/_lib/hooks';
import {
  Award,
  Download,
  ExternalLink,
  Shield,
  Star,
  Trophy,
  X,
  Search,
  Check,
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_META = {
  participation: {
    label: 'Participation',
    pill: 'bg-[rgba(96,165,250,0.12)] border-[rgba(96,165,250,0.2)] text-[#93c5fd]',
    bannerGlow: 'rgba(96,165,250,0.18)',
    sealGradient: 'linear-gradient(135deg,#60a5fa,#2563eb)',
  },
  completion: {
    label: 'Completion',
    pill: 'bg-[rgba(124,131,255,0.12)] border-[rgba(124,131,255,0.20)] text-[#aab0ff]',
    bannerGlow: 'rgba(124,131,255,0.18)',
    sealGradient: 'linear-gradient(135deg,#7c83ff,#5b62cc)',
  },
  achievement: {
    label: 'Achievement',
    pill: 'bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.2)] text-[#fcd34d]',
    bannerGlow: 'rgba(251,191,36,0.18)',
    sealGradient: 'linear-gradient(135deg,#fbbf24,#d97706)',
  },
  appreciation: {
    label: 'Appreciation',
    pill: 'bg-[rgba(167,139,250,0.12)] border-[rgba(167,139,250,0.2)] text-[#c4b5fd]',
    bannerGlow: 'rgba(167,139,250,0.18)',
    sealGradient: 'linear-gradient(135deg,#a78bfa,#7c3aed)',
  },
};

function fmtDate(iso, opts) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', opts);
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CertCard({ cert, onOpen }) {
  const meta = TYPE_META[cert.certificate_type] ?? TYPE_META.participation;
  const linkedName = cert.events?.title ?? cert.contests?.title ?? null;

  return (
    <div
      onClick={() => onOpen(cert)}
      className="cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-[#121317] transition-colors duration-150 hover:border-white/[0.09]"
    >
      {/* Banner */}
      <div
        className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-[22px] py-[22px]"
        style={{
          background: `radial-gradient(circle at 80% 30%, ${meta.bannerGlow}, transparent 60%), #181a1f`,
        }}
      >
        {/* Seal */}
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg"
          style={{
            background: meta.sealGradient,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.10) inset, 0 4px 12px rgba(0,0,0,0.30)',
          }}
        >
          <Award size={28} strokeWidth={1.6} />
        </div>

        {/* Issuer + verified */}
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[12px] font-medium text-white/70">NEUPC</span>
          {cert.verified && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.12)] px-[7px] py-0.5 text-[11px] font-medium text-[#86efac]">
              <Check size={11} strokeWidth={2} />
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 px-[18px] py-4">
        <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white/90">
          {cert.title}
        </h3>

        {linkedName && (
          <p className="truncate text-[12px] text-white/40">{linkedName}</p>
        )}

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-4 border-t border-white/[0.05] pt-3">
          <div>
            <p className="mb-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/25">
              Awarded
            </p>
            <p className="font-mono text-[12.5px] text-white/70">
              {fmtDate(cert.issue_date, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/25">
              Certificate ID
            </p>
            <p className="truncate font-mono text-[12.5px] text-white/70">
              {cert.certificate_number}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 border-t border-white/[0.05] pt-3">
          {cert.certificate_url ? (
            <a
              href={cert.certificate_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.09] bg-[#1f2127] px-[11px] py-1.5 text-[12px] font-medium text-white/75 transition hover:border-white/[0.14] hover:text-white/90"
            >
              <Download size={13} strokeWidth={1.6} />
              Download PDF
            </a>
          ) : null}
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(cert); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-transparent bg-transparent px-[11px] py-1.5 text-[12px] font-medium text-white/50 transition hover:bg-[#1f2127] hover:text-white/80"
          >
            <ExternalLink size={13} strokeWidth={1.6} />
            Verify online
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function CertModal({ cert, onClose }) {
  useScrollLock();
  if (!cert) return null;

  const meta = TYPE_META[cert.certificate_type] ?? TYPE_META.participation;
  const linkedName = cert.events?.title ?? cert.contests?.title ?? null;
  const linkedSlug = cert.events?.slug ?? cert.contests?.slug ?? null;
  const linkedPath = cert.events
    ? `/events/${linkedSlug}`
    : cert.contests
      ? `/contests/${linkedSlug}`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d0e11] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-md p-1.5 text-white/40 transition hover:bg-white/[0.08] hover:text-white/70"
        >
          <X size={16} strokeWidth={1.6} />
        </button>

        {/* Banner */}
        <div
          className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-[22px] py-[22px]"
          style={{
            background: `radial-gradient(circle at 80% 30%, ${meta.bannerGlow}, transparent 60%), #181a1f`,
          }}
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
            style={{
              background: meta.sealGradient,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.10) inset, 0 4px 12px rgba(0,0,0,0.30)',
            }}
          >
            <Award size={28} strokeWidth={1.6} />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[12px] font-medium text-white/70">NEUPC</span>
            {cert.verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.12)] px-[7px] py-0.5 text-[11px] font-medium text-[#86efac]">
                <Check size={11} strokeWidth={2} />
                Verified
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <h2 className="mb-1.5 text-[20px] font-semibold leading-snug tracking-[-0.01em] text-white/90">
            {cert.title}
          </h2>
          {cert.description && (
            <p className="mb-5 text-[13px] leading-relaxed text-white/45">
              {cert.description}
            </p>
          )}

          {/* Detail grid */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/25">
                Awarded
              </p>
              <p className="text-[12.5px] text-white/75">
                {fmtDate(cert.issue_date, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/25">
                Certificate ID
              </p>
              <p className="break-all font-mono text-[12.5px] text-white/75">
                {cert.certificate_number}
              </p>
            </div>

            {cert.verified && (
              <div className="col-span-2 rounded-lg border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.08)] p-4">
                <div className="flex items-center gap-2">
                  <Shield size={16} strokeWidth={1.6} className="text-[#4ade80]" />
                  <p className="text-[13px] text-[#4ade80]">
                    This certificate is verified and authentic
                  </p>
                </div>
              </div>
            )}

            {linkedName && (
              <div className="col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/25">
                  {cert.events ? 'Event' : 'Contest'}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] text-white/75">{linkedName}</p>
                  {linkedPath && (
                    <a
                      href={linkedPath}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md p-1.5 text-white/40 transition hover:bg-white/[0.08] hover:text-white/70"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={14} strokeWidth={1.6} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {cert.certificate_url ? (
              <a
                href={cert.certificate_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.10] bg-white/[0.06] px-4 py-2.5 text-[12.5px] font-medium text-white/75 transition hover:bg-white/[0.10] hover:text-white/90"
              >
                <Download size={14} strokeWidth={1.6} />
                Download PDF
              </a>
            ) : (
              <div className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[12.5px] text-white/30">
                No download available
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-md border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12.5px] text-white/50 transition hover:bg-white/[0.07] hover:text-white/70"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MemberCertificatesClient({ certificates, userName }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const certTypes = [
    'all',
    ...Object.keys(TYPE_META).filter((t) =>
      certificates.some((c) => c.certificate_type === t)
    ),
  ];

  const filtered = certificates.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(q) ||
      c.certificate_number.toLowerCase().includes(q) ||
      (c.events?.title ?? c.contests?.title ?? '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || c.certificate_type === typeFilter;
    return matchSearch && matchType;
  });

  const verified = certificates.filter((c) => c.verified).length;
  const fromEvents = certificates.filter((c) => c.events).length;
  const fromContests = certificates.filter((c) => c.contests).length;

  const STATS = [
    { label: 'Total', value: certificates.length, accent: '#60a5fa', Icon: Award },
    { label: 'Verified', value: verified, accent: '#4ade80', Icon: Shield },
    { label: 'From Events', value: fromEvents, accent: '#a78bfa', Icon: Trophy },
    { label: 'From Contests', value: fromContests, accent: '#fbbf24', Icon: Star },
  ];

  return (
    <>
      <CertModal cert={selected} onClose={() => setSelected(null)} />

      <div className="space-y-5">
        {/* Page head */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">
              Certificates
            </h1>
            <p className="mt-1 text-[13px] text-white/40">
              {certificates.length} verified{' '}
              {certificates.length === 1 ? 'certificate' : 'certificates'} · all
              blockchain-anchored
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.09] bg-[#1f2127] px-[11px] py-[6px] text-[12.5px] font-medium text-white/75 transition hover:border-white/[0.14] hover:text-white/90">
            <Download size={13} strokeWidth={1.6} />
            Download all
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-4">
          {STATS.map(({ label, value, accent, Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.06] bg-[#121317] px-4 py-[14px]"
            >
              <p className="mb-1.5 text-[11.5px] font-medium text-white/40">{label}</p>
              <p
                className="font-['Inter'] text-[26px] font-semibold leading-none tracking-[-0.02em] text-white/90 tabular-nums"
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <Search
              size={14}
              strokeWidth={1.6}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/30"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search certificates…"
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] py-[7px] pr-3 pl-9 text-[12.5px] text-white/85 placeholder-white/20 outline-none transition focus:border-white/20 focus:bg-white/[0.05]"
            />
          </div>

          {certTypes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {certTypes.map((t) => {
                const active = typeFilter === t;
                const m = TYPE_META[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition border ${
                      active
                        ? 'border-white/[0.14] bg-white/[0.08] text-white/90'
                        : 'border-white/[0.06] bg-transparent text-white/40 hover:text-white/60'
                    }`}
                  >
                    {t === 'all' ? 'All' : m?.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/[0.06] bg-[#121317] py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
              <Award size={28} strokeWidth={1.6} className="text-white/20" />
            </div>
            <div className="text-center">
              <p className="font-medium text-white/50">No certificates found</p>
              <p className="mt-1 text-[12.5px] text-white/30">
                {certificates.length === 0
                  ? 'Participate in events and contests to earn certificates.'
                  : 'Try adjusting the filters.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {filtered.map((cert) => (
              <CertCard key={cert.id} cert={cert} onOpen={setSelected} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
