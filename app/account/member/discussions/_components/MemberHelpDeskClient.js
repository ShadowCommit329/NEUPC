'use client';

import {
  useState,
  useCallback,
  useEffect,
  useTransition,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Eye,
  Pin,
  CheckCircle,
  RefreshCw,
  WifiOff,
  Users,
  Map,
  FileText,
  Lightbulb,
  BookOpen,
  Wifi,
} from 'lucide-react';
import {
  fetchDiscussionsAction,
  fetchUserStatsAction,
} from '@/app/_lib/discussion-actions';
import { useDiscussionRealtime } from '@/app/_hooks/useDiscussionRealtime';
import CreateDiscussionModal from './CreateDiscussionModal';
import DiscussionDetailView from './DiscussionDetailView';
import RoadmapView from './RoadmapView';
import ReleaseLogView from './ReleaseLogView';
import FeatureRequestsView from './FeatureRequestsView';
import SelfTroubleshootView from './SelfTroubleshootView';
import { formatRelativeTime } from '@/app/_lib/utils';

// ─── constants ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all', label: 'All', icon: MessageSquare },
  { key: 'help', label: 'Help', icon: null },
  { key: 'discussion', label: 'Discussion', icon: null },
  { key: 'show_tell', label: 'Show & Tell', icon: null },
  { key: 'announcements', label: 'Announcements', icon: null },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
  { key: 'release_log', label: 'Release Log', icon: FileText },
  { key: 'feature_requests', label: 'Feature Requests', icon: Lightbulb },
  { key: 'self_troubleshoot', label: 'Self Help', icon: BookOpen },
];

// Maps discussion `type` field → tab key
const TYPE_TO_TAB = {
  help: 'help',
  question: 'help',
  discussion: 'discussion',
  general: 'discussion',
  show_and_tell: 'show_tell',
  showcase: 'show_tell',
  announcement: 'announcements',
  feature_request: 'feature_requests',
};

// Tag pill colors per type
const TAG_STYLES = {
  help:          'bg-indigo-500/12 border border-indigo-500/20 text-indigo-300',
  question:      'bg-indigo-500/12 border border-indigo-500/20 text-indigo-300',
  discussion:    'bg-blue-500/12 border border-blue-500/20 text-blue-300',
  general:       'bg-blue-500/12 border border-blue-500/20 text-blue-300',
  show_and_tell: 'bg-amber-500/12 border border-amber-500/20 text-amber-300',
  showcase:      'bg-amber-500/12 border border-amber-500/20 text-amber-300',
  announcement:  'bg-red-500/12 border border-red-500/20 text-red-300',
  feature_request:'bg-violet-500/12 border border-violet-500/20 text-violet-300',
};

const TAG_LABELS = {
  help: 'Help',
  question: 'Help',
  discussion: 'Discussion',
  general: 'Discussion',
  show_and_tell: 'Show & Tell',
  showcase: 'Show & Tell',
  announcement: 'Announce',
  feature_request: 'Feature',
};

// Avatar gradient colors cycling
const AVATAR_COLORS = [
  'from-green-400 to-emerald-600 text-emerald-950',
  'from-indigo-400 to-indigo-700 text-white',
  'from-amber-400 to-orange-600 text-amber-950',
  'from-rose-400 to-rose-700 text-white',
  'from-violet-400 to-violet-700 text-white',
  'from-cyan-400 to-cyan-700 text-cyan-950',
  'from-slate-400 to-slate-600 text-white',
];

function avatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Thread row (matches HTML .thread-row) ───────────────────────────────────

function ThreadRow({ discussion, onClick }) {
  const {
    title,
    type,
    is_pinned,
    is_locked,
    reply_count = 0,
    views = 0,
    created_at,
    author,
  } = discussion;

  const tagStyle = TAG_STYLES[type] || TAG_STYLES.discussion;
  const tagLabel = TAG_LABELS[type] || 'Discussion';
  const authorName = author?.full_name || 'Anonymous';
  const color = avatarColor(authorName);
  const ago = created_at ? formatRelativeTime(created_at) : '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className="grid cursor-pointer border-b border-white/[0.06] transition-colors hover:bg-white/[0.03] last:border-b-0"
      style={{ gridTemplateColumns: '32px 1fr auto' , gap: '14px', alignItems: 'center', padding: '14px 18px' }}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold ${color}`}
      >
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt={authorName} className="h-full w-full rounded-full object-cover" />
        ) : (
          initials(authorName)
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-col gap-1">
        {/* Top row: tag + pinned + solved */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center rounded-full px-[7px] py-[2px] text-[11px] font-medium ${tagStyle}`}>
            {tagLabel}
          </span>
          {is_pinned && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-[7px] py-[2px] text-[11px] font-medium text-gray-400">
              <Pin className="h-[9px] w-[9px]" />
              Pinned
            </span>
          )}
          {is_locked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-[7px] py-[2px] text-[11px] font-medium text-green-400">
              <CheckCircle className="h-[9px] w-[9px]" />
              Solved
            </span>
          )}
        </div>

        {/* Title */}
        <div className="text-[13.5px] font-medium leading-[1.35] text-gray-100 line-clamp-1">
          {title}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
          <span>{authorName}</span>
          <span>·</span>
          <span>{ago}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1 text-[11.5px] text-gray-500">
          <MessageSquare className="h-[11px] w-[11px]" />
          <span className="tabular-nums">{reply_count}</span>
        </div>
        <div className="flex items-center gap-1 text-[11.5px] text-gray-500">
          <Eye className="h-[11px] w-[11px]" />
          <span className="tabular-nums">{views}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Temporary mock data ─────────────────────────────────────────────────────

const MOCK_DISCUSSIONS = [
  {
    id: 'mock-1',
    title: 'How to debug Express middleware order?',
    content: 'I keep getting 404s even though my route is defined. Middleware chain seems wrong.',
    type: 'help',
    status: 'open',
    is_pinned: false,
    is_locked: false,
    reply_count: 8,
    views: 142,
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    author: { id: 'u1', full_name: 'Eyasir Ahmed', avatar_url: null },
  },
  {
    id: 'mock-2',
    title: 'Best resources for graph algorithms?',
    content: 'Looking for good resources on BFS, DFS, Dijkstra and beyond.',
    type: 'discussion',
    status: 'open',
    is_pinned: true,
    is_locked: false,
    reply_count: 14,
    views: 312,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u2', full_name: 'Nusrat Jahan', avatar_url: null },
  },
  {
    id: 'mock-3',
    title: 'Bootcamp project showcase — week 4',
    content: 'Sharing my full-stack todo app with auth and Postgres.',
    type: 'show_and_tell',
    status: 'open',
    is_pinned: false,
    is_locked: false,
    reply_count: 23,
    views: 480,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u3', full_name: 'Tanvir Rahman', avatar_url: null },
  },
  {
    id: 'mock-4',
    title: 'PostgreSQL JOIN performance with 1M rows',
    content: 'My query takes 4 seconds. Index is there but EXPLAIN shows seq scan.',
    type: 'help',
    status: 'resolved',
    is_pinned: false,
    is_locked: true,
    reply_count: 12,
    views: 208,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u4', full_name: 'Sajid Hossain', avatar_url: null },
  },
  {
    id: 'mock-5',
    title: "Spring Cup '26 — registration open until Apr 15",
    content: 'Individual contest. ICPC-style problemset. Top 10 advance to nationals.',
    type: 'announcement',
    status: 'open',
    is_pinned: true,
    is_locked: false,
    reply_count: 4,
    views: 1820,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u5', full_name: 'NEUPC Team', avatar_url: null },
  },
  {
    id: 'mock-6',
    title: 'React useEffect dependency array — confused',
    content: 'When should I include functions in the dependency array?',
    type: 'help',
    status: 'open',
    is_pinned: false,
    is_locked: false,
    reply_count: 6,
    views: 95,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u6', full_name: 'Faisal Akhtar', avatar_url: null },
  },
  {
    id: 'mock-7',
    title: 'Built a CLI tool for CF problem fetching',
    content: 'Scrapes Codeforces and saves problems locally in markdown format.',
    type: 'show_and_tell',
    status: 'open',
    is_pinned: false,
    is_locked: false,
    reply_count: 19,
    views: 364,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u7', full_name: 'Mahmud Khan', avatar_url: null },
  },
  {
    id: 'mock-8',
    title: 'Weekly discussion: best CP practice strategy?',
    content: 'Do you focus on rating or topic-wise practice?',
    type: 'discussion',
    status: 'open',
    is_pinned: false,
    is_locked: false,
    reply_count: 31,
    views: 520,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u8', full_name: 'Rafia Islam', avatar_url: null },
  },
];

const MOCK_STATS = { total: 14, reply_count: 82, resolved: 38, open: 8, in_progress: 3 };

// ─── Main component ───────────────────────────────────────────────────────────

export default function MemberHelpDeskClient({
  initialDiscussions = [],
  initialStats = {},
  bootcamps = [],
  userId,
  userEmail,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [discussions, setDiscussions] = useState(
    initialDiscussions.length > 0 ? initialDiscussions : MOCK_DISCUSSIONS
  );
  const [stats, setStats] = useState(
    Object.keys(initialStats).length > 0 ? initialStats : MOCK_STATS
  );
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  // ── realtime ──
  const handleThreadInsert = useCallback((t) => {
    setDiscussions(prev => prev.some(d => d.id === t.id) ? prev : [t, ...prev]);
    setStats(prev => ({ ...prev, total: (prev.total || 0) + 1 }));
  }, []);
  const handleThreadUpdate = useCallback((t) => {
    setDiscussions(prev => prev.map(d => d.id === t.id ? { ...d, ...t } : d));
    if (selectedDiscussion?.id === t.id) setSelectedDiscussion(prev => ({ ...prev, ...t }));
  }, [selectedDiscussion?.id]);
  const handleThreadDelete = useCallback((t) => {
    setDiscussions(prev => prev.filter(d => d.id !== t.id));
    if (selectedDiscussion?.id === t.id) setSelectedDiscussion(null);
    setStats(prev => ({ ...prev, total: Math.max(0, (prev.total || 0) - 1) }));
  }, [selectedDiscussion?.id]);

  const { isConnected } = useDiscussionRealtime({
    onThreadInsert: handleThreadInsert,
    onThreadUpdate: handleThreadUpdate,
    onThreadDelete: handleThreadDelete,
    enabled: activeTab === 'all',
  });

  // ── data fetching ──
  const fetchDiscussions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchDiscussionsAction({ limit: 100 });
      if (result.error) setError(result.error);
      else if (result.data) setDiscussions(result.data);
    } catch (e) {
      setError(e.message || 'Failed to fetch discussions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const result = await fetchUserStatsAction();
      if (result.stats) setStats(result.stats);
    } catch {}
  }, []);

  useEffect(() => {
    if (initialDiscussions.length === 0 && discussions === MOCK_DISCUSSIONS) return;
    if (initialDiscussions.length === 0) fetchDiscussions();
    if (Object.keys(initialStats).length === 0) fetchStats();
  }, []);

  // ── derived ──
  const filtered = discussions.filter(d => {
    if (activeTab === 'all') return true;
    const mapped = TYPE_TO_TAB[d.type];
    return mapped === activeTab;
  });

  // Tab counts
  const tabCounts = {
    all: discussions.length,
    help: discussions.filter(d => ['help','question'].includes(d.type)).length,
    discussion: discussions.filter(d => ['discussion','general'].includes(d.type)).length,
    show_tell: discussions.filter(d => ['show_and_tell','showcase'].includes(d.type)).length,
    announcements: discussions.filter(d => d.type === 'announcement').length,
    roadmap: null,
    release_log: null,
    feature_requests: null,
    self_troubleshoot: null,
  };

  // Top contributors (derived from discussions)
  const contributors = (() => {
    const map = {};
    discussions.forEach(d => {
      if (!d.author) return;
      const key = d.author.id || d.author.full_name;
      if (!map[key]) map[key] = { ...d.author, count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 4);
  })();

  // ── special tab content ──
  const isSpecialTab = ['roadmap', 'release_log', 'feature_requests', 'self_troubleshoot'].includes(activeTab);

  if (selectedDiscussion) {
    return (
      <div className="pb-8 pt-6">
        <DiscussionDetailView
          discussion={selectedDiscussion}
          onBack={() => setSelectedDiscussion(null)}
          userId={userId}
          onUpdate={() => { fetchDiscussions(); fetchStats(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Page header ── */}
      <div className="pb-5 pt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">
              Discussions
            </h1>
            <p className="mt-1 text-[13px] text-white/40">
              {discussions.length} active threads
              {activeTab === 'all' && (
                <span
                  className={`ml-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] ${
                    isConnected
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {isConnected ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                  {isConnected ? 'Live' : 'Connecting'}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { fetchDiscussions(); fetchStats(); }}
              disabled={isLoading}
              className="flex h-[30px] items-center gap-1.5 rounded-md border border-white/[0.09] bg-transparent px-3 text-[12.5px] font-medium text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex h-[30px] items-center gap-1.5 rounded-md bg-gray-100 px-3 text-[12.5px] font-medium text-gray-900 transition-colors hover:bg-white"
            >
              <Plus className="h-3.5 w-3.5" />
              New thread
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-white/[0.06]">
        <div className="scrollbar-none -mb-px flex items-center gap-0.5 overflow-x-auto">
          {TABS.map(tab => {
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActiveTab(tab.key); setSelectedDiscussion(null); }}
                className={`inline-flex shrink-0 items-center gap-2 border-b-[1.5px] px-[14px] pb-[11px] pt-[10px] text-[12.5px] font-medium transition-colors ${
                  isActive
                    ? 'border-indigo-400 text-gray-100'
                    : 'border-transparent text-gray-500 hover:text-gray-200'
                }`}
              >
                {tab.label}
                {count != null && (
                  <span
                    className={`inline-flex h-[16px] items-center rounded-full px-1.5 text-[10.5px] font-medium tabular-nums ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'border border-white/[0.09] bg-white/[0.06] text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="pb-16 pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {/* ── Special tabs ── */}
            {activeTab === 'roadmap' && <RoadmapView />}
            {activeTab === 'release_log' && <ReleaseLogView />}
            {activeTab === 'feature_requests' && <FeatureRequestsView userId={userId} />}
            {activeTab === 'self_troubleshoot' && <SelfTroubleshootView />}

            {/* ── Thread list tabs (all / help / discussion / show_tell / announcements) ── */}
            {!isSpecialTab && (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: '1fr 320px' }}
              >
                {/* Left: thread list */}
                <div
                  className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#121317]"
                  style={{ minWidth: 0 }}
                >
                  {error ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <WifiOff className="mb-4 h-10 w-10 text-red-400" />
                      <p className="text-[13px] font-semibold text-white">Failed to load</p>
                      <p className="mt-1 text-[12px] text-gray-500">{error}</p>
                      <button
                        type="button"
                        onClick={fetchDiscussions}
                        className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-indigo-500"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    </div>
                  ) : isLoading || isPending ? (
                    <div className="divide-y divide-white/[0.06]">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex animate-pulse items-center gap-3.5 px-[18px] py-[14px]">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-white/[0.05]" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-16 rounded bg-white/[0.05]" />
                            <div className="h-3.5 w-3/4 rounded bg-white/[0.05]" />
                            <div className="h-3 w-32 rounded bg-white/[0.04]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <MessageSquare className="mb-4 h-10 w-10 text-gray-700" />
                      <p className="text-[13px] font-semibold text-white">No threads yet</p>
                      <p className="mt-1 text-[12px] text-gray-500">Be the first to start a discussion</p>
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-indigo-500"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New thread
                      </button>
                    </div>
                  ) : (
                    <div className="thread-list">
                      {filtered.map(d => (
                        <ThreadRow
                          key={d.id}
                          discussion={d}
                          onClick={() => setSelectedDiscussion(d)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right sidebar */}
                <div className="flex flex-col gap-4">
                  {/* Your stats */}
                  <div className="rounded-xl border border-white/[0.06] bg-[#121317] p-[18px]">
                    <p className="mb-3 text-[13px] font-medium text-gray-200">Your stats</p>
                    <div className="flex gap-6">
                      {[
                        { label: 'Threads', value: stats.total ?? discussions.filter(d => d.author?.id === userId).length },
                        { label: 'Replies', value: stats.reply_count ?? 0 },
                        { label: 'Solved', value: stats.resolved ?? 0 },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <div className="text-[20px] font-semibold leading-none tracking-tight text-gray-100 tabular-nums">
                            {value ?? 0}
                          </div>
                          <div className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-gray-500">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top contributors */}
                  <div className="rounded-xl border border-white/[0.06] bg-[#121317] p-[18px]">
                    <p className="mb-3 text-[13px] font-medium text-gray-200">Top contributors</p>
                    {contributors.length === 0 ? (
                      <p className="text-[12px] text-gray-600">No data yet</p>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {contributors.map((c, i) => {
                          const name = c.full_name || 'Anonymous';
                          const color = avatarColor(name);
                          return (
                            <div
                              key={c.id || name}
                              className="grid items-center gap-[9px] rounded-md px-2 py-1.5"
                              style={{ gridTemplateColumns: '22px 24px 1fr auto' }}
                            >
                              <span
                                className={`text-center text-[11.5px] font-medium tabular-nums ${
                                  i < 3 ? 'text-amber-400' : 'text-gray-500'
                                }`}
                              >
                                {i + 1}
                              </span>
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-semibold ${color}`}
                              >
                                {c.avatar_url ? (
                                  <img src={c.avatar_url} alt={name} className="h-full w-full rounded-full object-cover" />
                                ) : (
                                  initials(name)
                                )}
                              </div>
                              <span className="text-[12.5px] text-gray-200">{name}</span>
                              <span className="tabular-nums text-[12px] text-gray-500">{c.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Overview stats */}
                  <div className="rounded-xl border border-white/[0.06] bg-[#121317] p-[18px]">
                    <p className="mb-3 text-[13px] font-medium text-gray-200">Overview</p>
                    <div className="flex flex-col gap-2 text-[12px]">
                      {[
                        { label: 'Total threads', value: discussions.length },
                        { label: 'Open', value: discussions.filter(d => d.status === 'open').length },
                        { label: 'Resolved', value: discussions.filter(d => d.status === 'resolved').length },
                        { label: 'Pinned', value: discussions.filter(d => d.is_pinned).length },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-gray-500">{label}</span>
                          <span className="tabular-nums font-medium text-gray-200">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Create modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDiscussionModal
            bootcamps={bootcamps}
            onClose={() => setShowCreateModal(false)}
            onCreated={(d) => {
              setDiscussions(prev => [d, ...prev]);
              setShowCreateModal(false);
              fetchStats();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
