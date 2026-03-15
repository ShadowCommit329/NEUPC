/**
 * @file Member certificates client — browsable list of earned
 *   certificates with download and share options.
 * @module MemberCertificatesClient
 */

'use client';

import { useState } from 'react';
import { useScrollLock } from '@/app/_lib/hooks';
import {
  Award,
  Download,
  ExternalLink,
  BadgeCheck,
  Shield,
  Star,
  Trophy,
  Hash,
  Calendar,
  X,
  Search,
  Filter,
} from 'lucide-react';

const TYPE_META = {
  participation: {
    label: 'Participation',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    icon: Award,
  },
  completion: {
    label: 'Completion',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    icon: BadgeCheck,
  },
  achievement: {
    label: 'Achievement',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    icon: Trophy,
  },
  appreciation: {
    label: 'Appreciation',
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    icon: Star,
  },
};

function CertificateCard({ cert, onOpen }) {
  const meta = TYPE_META[cert.certificate_type] ?? TYPE_META.participation;
  const TypeIcon = meta.icon;
  const linkedName = cert.events?.title ?? cert.contests?.title ?? null;

  return (
    <div
      className="group relative flex cursor-pointer flex-col gap-4 rounded-2xl border border-white/8 bg-white/3 p-5 transition-all duration-200 hover:border-white/16 hover:bg-white/6"
      onClick={() => onOpen(cert)}
    >
      {/* top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5">
          <TypeIcon className="size-5 text-white/60" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color}`}
          >
            {meta.label}
          </span>
          {cert.verified && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <Shield className="size-3" />
              Verified
            </span>
          )}
        </div>
      </div>

      {/* title */}
      <div className="flex-1">
        <h3 className="text-sm leading-snug font-semibold text-white/90 transition-colors group-hover:text-white">
          {cert.title}
        </h3>
        {linkedName && (
          <p className="mt-1 truncate text-xs text-white/40">{linkedName}</p>
        )}
      </div>

      {/* footer */}
      <div className="flex items-end justify-between border-t border-white/6 pt-3">
        <div>
          <p className="text-[10px] tracking-wider text-white/30 uppercase">
            Cert #
          </p>
          <p className="max-w-28 truncate font-mono text-xs text-white/50">
            {cert.certificate_number}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-wider text-white/30 uppercase">
            Issued
          </p>
          <p className="text-xs text-white/50">
            {cert.issue_date
              ? new Date(cert.issue_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function CertificateModal({ cert, onClose }) {
  useScrollLock();
  if (!cert) return null;
  const meta = TYPE_META[cert.certificate_type] ?? TYPE_META.participation;
  const TypeIcon = meta.icon;
  const linkedName = cert.events?.title ?? cert.contests?.title ?? null;
  const linkedSlug = cert.events?.slug ?? cert.contests?.slug ?? null;
  const linkedPath = cert.events
    ? `/events/${linkedSlug}`
    : cert.contests
      ? `/contests/${linkedSlug}`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/12 bg-[#0d0d0f] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-white/40 transition hover:bg-white/8 hover:text-white"
        >
          <X className="size-4" />
        </button>

        {/* header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-white/5">
            <TypeIcon className="size-6 text-white/60" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">{cert.title}</h2>
            <span
              className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color}`}
            >
              {meta.label}
            </span>
          </div>
        </div>

        {/* description */}
        {cert.description && (
          <p className="mb-5 text-sm leading-relaxed text-white/50">
            {cert.description}
          </p>
        )}

        {/* details grid */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/8 bg-white/3 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] tracking-wider text-white/30 uppercase">
              <Hash className="size-3" />
              Certificate Number
            </p>
            <p className="font-mono text-xs break-all text-white/70">
              {cert.certificate_number}
            </p>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/3 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] tracking-wider text-white/30 uppercase">
              <Calendar className="size-3" />
              Issue Date
            </p>
            <p className="text-xs text-white/70">
              {cert.issue_date
                ? new Date(cert.issue_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            </p>
          </div>

          {cert.verified && (
            <div className="col-span-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
              <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Shield className="size-3.5" />
                This certificate is verified and authentic.
              </p>
            </div>
          )}

          {linkedName && (
            <div className="col-span-2 rounded-xl border border-white/8 bg-white/3 p-3">
              <p className="mb-1 text-[10px] tracking-wider text-white/30 uppercase">
                {cert.events ? 'Event' : 'Contest'}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/70">{linkedName}</p>
                {linkedPath && (
                  <a
                    href={linkedPath}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-2 py-1 text-[10px] text-white/40 transition hover:bg-white/8 hover:text-white/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* actions */}
        <div className="flex gap-2">
          {cert.certificate_url ? (
            <a
              href={cert.certificate_url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/8 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/12 hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="size-4" />
              Download Certificate
            </a>
          ) : (
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/3 py-2.5 text-sm text-white/30">
              No download available
            </div>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/6 hover:text-white/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemberCertificatesClient({ certificates, userName }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // all | event | contest

  const certTypes = [
    'all',
    ...Object.keys(TYPE_META).filter((t) =>
      certificates.some((c) => c.certificate_type === t)
    ),
  ];

  const filtered = certificates.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.certificate_number.toLowerCase().includes(search.toLowerCase()) ||
      (c.events?.title ?? c.contests?.title ?? '')
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchType = typeFilter === 'all' || c.certificate_type === typeFilter;
    const matchSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'event' && !!c.events) ||
      (sourceFilter === 'contest' && !!c.contests);

    return matchSearch && matchType && matchSource;
  });

  // stats
  const verified = certificates.filter((c) => c.verified).length;
  const eventCerts = certificates.filter((c) => c.events).length;
  const contestCerts = certificates.filter((c) => c.contests).length;

  return (
    <>
      <CertificateModal cert={selected} onClose={() => setSelected(null)} />

      {/* page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          My Certificates
        </h1>
        <p className="text-sm text-white/40">
          All certificates earned by {userName ?? 'you'}
        </p>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Total',
            value: certificates.length,
            icon: Award,
            color: 'text-blue-400',
          },
          {
            label: 'Verified',
            value: verified,
            icon: Shield,
            color: 'text-emerald-400',
          },
          {
            label: 'From Events',
            value: eventCerts,
            icon: Trophy,
            color: 'text-violet-400',
          },
          {
            label: 'From Contests',
            value: contestCerts,
            icon: Star,
            color: 'text-amber-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5">
              <Icon className={`size-4 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* search */}
        <div className="relative max-w-xs flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certificates…"
            className="w-full rounded-xl border border-white/8 bg-white/4 py-2.5 pr-4 pl-9 text-sm text-white placeholder-white/30 transition outline-none focus:border-white/20 focus:bg-white/6"
          />
        </div>

        {/* chip filters */}
        <div className="flex flex-wrap gap-2">
          {/* source */}
          <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
            {['all', 'event', 'contest'].map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  sourceFilter === s
                    ? 'bg-white/12 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* type */}
          {certTypes.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {certTypes.map((t) => {
                const m = TYPE_META[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                      typeFilter === t
                        ? t === 'all'
                          ? 'border-white/20 bg-white/12 text-white'
                          : m?.color
                        : 'border-white/8 bg-white/3 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : (m?.label ?? t)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/8 bg-white/3 py-20">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
            <Award className="size-7 text-white/20" />
          </div>
          <div className="text-center">
            <p className="font-medium text-white/60">No certificates found</p>
            <p className="mt-1 text-sm text-white/30">
              {certificates.length === 0
                ? 'Participate in events and contests to earn certificates.'
                : 'Try adjusting the filters.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} onOpen={setSelected} />
          ))}
        </div>
      )}
    </>
  );
}
