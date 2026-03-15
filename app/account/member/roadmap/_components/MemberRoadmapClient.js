/**
 * @file Member roadmap client — interactive skill-building roadmap
 *   with topic nodes, progress tracking, and recommended resources.
 * @module MemberRoadmapClient
 */

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Map as MapIcon,
  Search,
  X,
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  BookOpen,
  Code2,
  Cpu,
  Database,
  Globe,
  Layers,
  BarChart2,
  Star,
  ExternalLink,
  Lock,
  Trophy,
  Zap,
  FileText,
  Video,
  Link2,
  CheckCheck,
  RotateCcw,
  Target,
  TrendingUp,
  Sparkles,
  ChevronUp,
  AlertCircle,
  Bookmark,
  Users,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = (userId, roadmapId) =>
  `roadmap_progress_${userId}_${roadmapId}`;

function loadProgress(userId, roadmapId) {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId, roadmapId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveProgress(userId, roadmapId, set) {
  try {
    localStorage.setItem(
      STORAGE_KEY(userId, roadmapId),
      JSON.stringify([...set])
    );
  } catch {}
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DIFF_CONFIG = {
  beginner: {
    label: 'Beginner',
    color: 'text-green-300',
    bg: 'bg-green-500/12',
    border: 'border-green-500/25',
    dot: 'bg-green-400',
  },
  intermediate: {
    label: 'Intermediate',
    color: 'text-yellow-300',
    bg: 'bg-yellow-500/12',
    border: 'border-yellow-500/25',
    dot: 'bg-yellow-400',
  },
  advanced: {
    label: 'Advanced',
    color: 'text-red-300',
    bg: 'bg-red-500/12',
    border: 'border-red-500/25',
    dot: 'bg-red-400',
  },
};

const ITEM_TYPE_CONFIG = {
  article: {
    Icon: FileText,
    label: 'Article',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  video: {
    Icon: Video,
    label: 'Video',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  problem: {
    Icon: Code2,
    label: 'Problem',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  project: {
    Icon: Layers,
    label: 'Project',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  resource: {
    Icon: BookOpen,
    label: 'Resource',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  quiz: {
    Icon: Target,
    label: 'Quiz',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  default: {
    Icon: BookOpen,
    label: 'Read',
    color: 'text-gray-400',
    bg: 'bg-white/6',
  },
};

const CATEGORY_ICONS = {
  web: Globe,
  'web development': Globe,
  frontend: Globe,
  backend: Database,
  data: BarChart2,
  'data science': BarChart2,
  ai: Cpu,
  ml: Cpu,
  'ai/ml': Cpu,
  'machine learning': Cpu,
  competitive: Code2,
  'competitive programming': Code2,
  cp: Code2,
  devops: Layers,
  cloud: Layers,
  design: Sparkles,
  security: Lock,
  mobile: Zap,
};

function getCategoryIcon(category) {
  if (!category) return BookOpen;
  const key = category.toLowerCase();
  for (const [k, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return BookOpen;
}

function diffConf(d) {
  return DIFF_CONFIG[d] || DIFF_CONFIG.beginner;
}
function itemConf(t) {
  return ITEM_TYPE_CONFIG[t] || ITEM_TYPE_CONFIG.default;
}

function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Count total checkable items across all stages
function countItems(stages) {
  return stages.reduce((sum, s) => sum + (s.items?.length ?? 0), 0);
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function Stat({ icon: Icon, value, label, color }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="font-semibold text-white">{value}</span>
      <span className="text-gray-600">{label}</span>
    </div>
  );
}

// ─── Roadmap Card ─────────────────────────────────────────────────────────────
function RoadmapCard({ roadmap, onOpen, userId }) {
  const dc = diffConf(roadmap.difficulty);
  const CatIcon = getCategoryIcon(roadmap.category);

  // Progress tracking — currently content is HTML-based (not structured JSON stages),
  // so there are no individual checkable items. Set to 0 until stage-based content is restored.
  const total = 0;
  const pct = 0;

  return (
    <button
      onClick={() => onOpen(roadmap)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-5 text-left transition-all hover:border-white/15 hover:bg-white/5 hover:shadow-lg hover:shadow-black/20 active:scale-[0.99]"
    >
      {/* Featured badge */}
      {roadmap.is_featured && (
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold text-yellow-300">
          <Star className="h-2.5 w-2.5" /> Featured
        </div>
      )}

      {/* Category icon + label */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/6">
          <CatIcon className="h-4.5 w-4.5 text-blue-300" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
            {roadmap.category}
          </p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${dc.bg} ${dc.border} ${dc.color}`}
          >
            {dc.label}
          </span>
        </div>
      </div>

      {/* Title + desc */}
      <h3 className="mb-1.5 line-clamp-2 text-sm font-bold text-white transition-colors group-hover:text-blue-200">
        {roadmap.title}
      </h3>
      {roadmap.description && (
        <p className="mb-3 line-clamp-2 text-[11px] text-gray-500">
          {roadmap.description}
        </p>
      )}

      {/* Progress bar (if started) */}
      {total > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-gray-600">
              {pct > 0 ? 'Progress' : 'Not started'}
            </span>
            <span
              className={
                pct === 100 ? 'font-bold text-green-400' : 'text-gray-600'
              }
            >
              {pct}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        {roadmap.estimated_duration && (
          <Stat
            icon={Clock}
            value={roadmap.estimated_duration}
            label=""
            color="text-blue-400"
          />
        )}
        {roadmap.views > 0 && (
          <Stat
            icon={Eye}
            value={fmtNum(roadmap.views)}
            label="views"
            color="text-gray-500"
          />
        )}
        {total > 0 && (
          <Stat
            icon={Target}
            value={total}
            label="topics"
            color="text-purple-400"
          />
        )}
      </div>

      {/* CTA */}
      <div
        className={`mt-3 flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all ${
          pct === 100
            ? 'border-green-500/25 bg-green-500/10 text-green-300'
            : pct > 0
              ? 'border-blue-500/25 bg-blue-500/10 text-blue-300'
              : 'border-white/8 bg-white/4 text-gray-300 group-hover:border-white/15 group-hover:text-white'
        }`}
      >
        <span>
          {pct === 100
            ? 'Completed ✓'
            : pct > 0
              ? 'Continue Learning'
              : 'Start Roadmap'}
        </span>
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

// ─── Stage Section ────────────────────────────────────────────────────────────
function StageSection({ stage, stageIndex, progress, onToggle, totalStages }) {
  const [open, setOpen] = useState(stageIndex === 0);
  const items = stage.items ?? [];
  const doneHere = items.filter((item) => {
    const key = item.id ?? `${stageIndex}-${items.indexOf(item)}`;
    return progress.has(key);
  }).length;
  const pct =
    items.length > 0 ? Math.round((doneHere / items.length) * 100) : 0;
  const isComplete = pct === 100 && items.length > 0;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isComplete
          ? 'border-green-500/20 bg-green-500/3'
          : 'border-white/8 bg-white/3'
      }`}
    >
      {/* Stage header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-all hover:bg-white/2"
      >
        {/* Number badge */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
            isComplete
              ? 'bg-green-500/20 text-green-300'
              : 'bg-white/8 text-gray-300'
          }`}
        >
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : stageIndex + 1}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{stage.title}</p>
          <p className="text-[10px] text-gray-500">
            {doneHere}/{items.length} completed · {pct}%
          </p>
        </div>

        {/* Mini progress */}
        <div className="mr-2 hidden flex-col items-end gap-1.5 sm:flex">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
        )}
      </button>

      {/* Items */}
      {open && (
        <div className="space-y-1 border-t border-white/6 px-3 pt-2 pb-3">
          {items.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-600">
              No items in this stage yet.
            </p>
          ) : (
            items.map((item, iIdx) => {
              const key = item.id ?? `${stageIndex}-${iIdx}`;
              const done = progress.has(key);
              const tc = itemConf(item.type);
              const ItemIcon = tc.Icon;
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 rounded-xl p-3 transition-all ${
                    done
                      ? 'border border-green-500/12 bg-green-500/5'
                      : 'border border-transparent hover:bg-white/3'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => onToggle(key)}
                    className="mt-0.5 shrink-0 transition-transform hover:scale-110 active:scale-95"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-green-400" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 text-gray-600 hover:text-gray-400" />
                    )}
                  </button>

                  {/* Type chip */}
                  <div
                    className={`mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-lg ${tc.bg}`}
                  >
                    <ItemIcon className={`h-3 w-3 ${tc.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-snug font-medium transition-colors ${done ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-600">
                        {item.description}
                      </p>
                    )}
                    {item.estimated_time && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-600">
                        <Clock className="h-2.5 w-2.5" /> {item.estimated_time}
                      </span>
                    )}
                  </div>

                  {/* Link */}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-white/8 bg-white/4 px-2.5 py-1.5 text-[10px] text-gray-400 transition-colors hover:bg-white/8 hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-2.5 w-2.5" /> Open
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Roadmap Detail View ──────────────────────────────────────────────────────
function RoadmapDetail({ roadmap, userId, onBack }) {
  const dc = diffConf(roadmap.difficulty);
  const CatIcon = getCategoryIcon(roadmap.category);
  // No stages parsing with HTML content
  const stages = [];
  const total = 0;

  const [progress, setProgress] = useState(new Set());

  const doneCount = useMemo(() => {
    return [...progress].length;
  }, [progress]);

  const pct = 0;

  const toggle = useCallback(
    (key) => {
      setProgress((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        saveProgress(userId, roadmap.id, next);
        return next;
      });
    },
    [userId, roadmap.id]
  );

  function resetProgress() {
    const empty = new Set();
    saveProgress(userId, roadmap.id, empty);
    setProgress(empty);
  }

  function markAll() {
    const all = new Set();
    stages.forEach((s, si) =>
      (s.items ?? []).forEach((item, ii) => all.add(item.id ?? `${si}-${ii}`))
    );
    saveProgress(userId, roadmap.id, all);
    setProgress(all);
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Roadmaps
      </button>

      {/* Hero card */}
      <div className="rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
              <CatIcon className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                  {roadmap.category}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${dc.bg} ${dc.border} ${dc.color}`}
                >
                  {dc.label}
                </span>
                {roadmap.is_featured && (
                  <span className="flex items-center gap-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                    <Star className="h-2.5 w-2.5" /> Featured
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {roadmap.title}
              </h1>
              {roadmap.description && (
                <p className="mt-1.5 max-w-xl text-sm text-gray-400">
                  {roadmap.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2 self-start">
            {total > 0 && pct < 100 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1.5 rounded-xl border border-green-500/25 bg-green-500/10 px-3.5 py-2 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500/20"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark All
              </button>
            )}
            {doneCount > 0 && (
              <button
                onClick={resetProgress}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-3.5 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/8"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-white/6 pt-4">
          {roadmap.estimated_duration && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5 text-blue-400" />{' '}
              {roadmap.estimated_duration}
            </div>
          )}
          {roadmap.views > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Eye className="h-3.5 w-3.5 text-gray-500" />{' '}
              {fmtNum(roadmap.views)} views
            </div>
          )}
          {total > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Target className="h-3.5 w-3.5 text-purple-400" /> {total} topics
            </div>
          )}
          {stages.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Layers className="h-3.5 w-3.5 text-orange-400" /> {stages.length}{' '}
              stages
            </div>
          )}
        </div>

        {/* Prerequisites */}
        {roadmap.prerequisites?.length > 0 && (
          <div className="mt-4 rounded-xl border border-yellow-500/15 bg-yellow-500/6 px-4 py-3">
            <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-yellow-400 uppercase">
              Prerequisites
            </p>
            <div className="flex flex-wrap gap-1.5">
              {roadmap.prerequisites.map((p, i) => (
                <span
                  key={i}
                  className="rounded-lg border border-yellow-500/15 bg-yellow-500/8 px-2.5 py-1 text-[11px] text-yellow-300"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-white">{pct}% Complete</span>
              <span className="text-gray-500">
                {doneCount} / {total} topics
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100
                    ? 'bg-green-500'
                    : 'bg-linear-to-r from-blue-500 to-blue-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct === 100 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
                <Trophy className="h-3.5 w-3.5" /> Roadmap completed! Excellent
                work.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {roadmap.content ? (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <BookOpen className="h-5 w-5 text-blue-400" />
            Learning Guide
          </h2>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm sm:p-8">
            <div
              className="blog-content prose prose-invert max-w-none prose-headings:text-white prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2 prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-blue-400 prose-a:underline hover:prose-a:text-blue-300 prose-strong:text-white prose-li:text-gray-300 prose-li:marker:text-gray-600 prose-ul:space-y-1.5 prose-ol:space-y-1.5 prose-code:text-blue-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-pre:p-4 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400 prose-hr:border-white/10 prose-table:border-collapse prose-table:w-full prose-tr:border-b prose-tr:border-white/10 prose-th:text-left prose-th:font-semibold prose-th:text-white prose-th:py-2 prose-th:px-3 prose-th:bg-white/5 prose-td:text-gray-300 prose-td:py-2 prose-td:px-3"
              dangerouslySetInnerHTML={{
                __html:
                  typeof roadmap.content === 'string'
                    ? roadmap.content
                    : (roadmap.content?.html ?? ''),
              }}
            />
          </div>
        </div>
      ) : stages.length > 0 ? (
        <div className="space-y-3">
          {stages.map((stage, si) => (
            <StageSection
              key={stage.id ?? si}
              stage={stage}
              stageIndex={si}
              progress={progress}
              onToggle={toggle}
              totalStages={stages.length}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <BookOpen className="mb-3 h-12 w-12 text-gray-700" />
          <p className="text-sm font-medium text-gray-500">
            Content is being prepared
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Check back soon — this roadmap's content will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MemberRoadmapClient({ roadmaps, userId }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');

  // If a roadmap is open, show detail
  if (selected) {
    return (
      <RoadmapDetail
        roadmap={selected}
        userId={userId}
        onBack={() => setSelected(null)}
      />
    );
  }

  // Derived category list
  const categories = useMemo(() => {
    const seen = new Map();
    roadmaps.forEach((r) => {
      if (r.category) seen.set(r.category, (seen.get(r.category) || 0) + 1);
    });
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [roadmaps]);

  const filtered = useMemo(() => {
    return roadmaps.filter((r) => {
      if (catFilter !== 'all' && r.category !== catFilter) return false;
      if (diffFilter !== 'all' && r.difficulty !== diffFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
      );
    });
  }, [roadmaps, catFilter, diffFilter, search]);

  const featured = roadmaps.filter((r) => r.is_featured);
  const totalTopics = roadmaps.length; // Count of roadmaps

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Learning Roadmaps
          </h1>
          <p className="text-sm text-gray-500">
            Structured paths to guide your growth.
          </p>
        </div>
        {featured.length > 0 && (
          <div className="flex items-center gap-1.5 self-start rounded-xl border border-yellow-500/20 bg-yellow-500/8 px-3.5 py-2 sm:self-auto">
            <Star className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300">
              {featured.length} featured
            </span>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            icon: MapIcon,
            label: 'Total Roadmaps',
            value: roadmaps.length,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            icon: Layers,
            label: 'Categories',
            value: categories.length,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
          {
            icon: Target,
            label: 'Total Topics',
            value: totalTopics,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}
            >
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl leading-none font-bold text-white tabular-nums">
                {value}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search roadmaps…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-9 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:bg-white/6 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <select
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value)}
            className="w-36 appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-3.5 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* ── Category chips ── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCatFilter('all')}
            className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
              catFilter === 'all'
                ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                : 'border-white/8 bg-white/3 text-gray-400 hover:bg-white/6 hover:text-gray-200'
            }`}
          >
            All{' '}
            <span className="ml-1 text-[10px] opacity-60">
              ({roadmaps.length})
            </span>
          </button>
          {categories.map(([cat, count]) => {
            const CatIcon = getCategoryIcon(cat);
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat === catFilter ? 'all' : cat)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                  catFilter === cat
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                    : 'border-white/8 bg-white/3 text-gray-400 hover:bg-white/6 hover:text-gray-200'
                }`}
              >
                <CatIcon className="h-3 w-3" /> {cat}{' '}
                <span className="opacity-50">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
          <MapIcon className="mb-3 h-12 w-12 text-gray-700" />
          <p className="text-sm font-medium text-gray-500">
            {roadmaps.length === 0
              ? 'No roadmaps published yet'
              : 'No roadmaps match your filters'}
          </p>
          {(search || catFilter !== 'all' || diffFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setCatFilter('all');
                setDiffFilter('all');
              }}
              className="mt-2 text-xs text-blue-400 transition-colors hover:text-blue-300"
            >
              Clear filters ×
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] text-gray-600">
            <span>
              Showing{' '}
              <span className="font-medium text-white">{filtered.length}</span>{' '}
              roadmap{filtered.length !== 1 ? 's' : ''}
            </span>
            {(search || catFilter !== 'all' || diffFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setCatFilter('all');
                  setDiffFilter('all');
                }}
                className="text-blue-400 transition-colors hover:text-blue-300"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <RoadmapCard
                key={r.id}
                roadmap={r}
                onOpen={setSelected}
                userId={userId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
