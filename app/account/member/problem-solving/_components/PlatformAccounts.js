/**
 * @file Platform Accounts Component
 * @description Professional multi-platform account management
 * @author NEUPC Team
 *
 * Design System:
 * - Glassmorphism cards with subtle borders
 * - Consistent 4px spacing scale
 * - Micro-interactions for engagement
 * - Clear visual hierarchy
 * - Accessible color contrasts
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Trophy,
  Target,
  Flame,
  Plus,
  X,
  RefreshCw,
  Loader2,
  Trash2,
  MoreHorizontal,
  Search,
  Link2,
  Zap,
  Star,
  Globe,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ClipboardPaste,
  FileText,
} from 'lucide-react';

// ============================================
// PLATFORM CONFIGURATION
// ============================================

const PLATFORMS = {
  // Tier 1: Major Global Platforms
  codeforces: {
    name: 'Codeforces',
    shortName: 'CF',
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-500',
    bgSubtle: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    ring: 'ring-blue-500/30',
    shadow: 'shadow-blue-500/20',
    profileUrl: (h) => `https://codeforces.com/profile/${h}`,
    icon: '🔵',
    tier: 1,
  },
  atcoder: {
    name: 'AtCoder',
    shortName: 'AC',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500',
    bgSubtle: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/30',
    shadow: 'shadow-emerald-500/20',
    profileUrl: (h) => `https://atcoder.jp/users/${h}`,
    icon: '🟢',
    tier: 1,
  },
  leetcode: {
    name: 'LeetCode',
    shortName: 'LC',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500',
    bgSubtle: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    ring: 'ring-amber-500/30',
    shadow: 'shadow-amber-500/20',
    profileUrl: (h) => `https://leetcode.com/${h}`,
    icon: '🟡',
    tier: 1,
  },
  codechef: {
    name: 'CodeChef',
    shortName: 'CC',
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-500',
    bgSubtle: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    ring: 'ring-purple-500/30',
    shadow: 'shadow-purple-500/20',
    profileUrl: (h) => `https://www.codechef.com/users/${h}`,
    icon: '🟣',
    tier: 1,
  },
  topcoder: {
    name: 'TopCoder',
    shortName: 'TC',
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-red-500',
    bgSubtle: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    ring: 'ring-red-500/30',
    shadow: 'shadow-red-500/20',
    profileUrl: (h) => `https://www.topcoder.com/members/${h}`,
    icon: '🔴',
    tier: 1,
  },

  // Tier 2: Popular Platforms
  hackerrank: {
    name: 'HackerRank',
    shortName: 'HR',
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500',
    bgSubtle: 'bg-green-500/10',
    border: 'border-green-500/20',
    text: 'text-green-400',
    ring: 'ring-green-500/30',
    shadow: 'shadow-green-500/20',
    profileUrl: (h) => `https://www.hackerrank.com/${h}`,
    icon: '💚',
    tier: 2,
  },
  hackerearth: {
    name: 'HackerEarth',
    shortName: 'HE',
    gradient: 'from-indigo-500 to-blue-500',
    bg: 'bg-indigo-500',
    bgSubtle: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    text: 'text-indigo-400',
    ring: 'ring-indigo-500/30',
    shadow: 'shadow-indigo-500/20',
    profileUrl: (h) => `https://www.hackerearth.com/@${h}`,
    icon: '🌍',
    tier: 2,
  },
  geeksforgeeks: {
    name: 'GeeksforGeeks',
    shortName: 'GFG',
    gradient: 'from-green-600 to-green-500',
    bg: 'bg-green-600',
    bgSubtle: 'bg-green-600/10',
    border: 'border-green-600/20',
    text: 'text-green-500',
    ring: 'ring-green-600/30',
    shadow: 'shadow-green-600/20',
    profileUrl: (h) => `https://auth.geeksforgeeks.org/user/${h}`,
    icon: '📗',
    tier: 2,
  },
  spoj: {
    name: 'SPOJ',
    shortName: 'SP',
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-500',
    bgSubtle: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
    ring: 'ring-cyan-500/30',
    shadow: 'shadow-cyan-500/20',
    profileUrl: (h) => `https://www.spoj.com/users/${h}`,
    icon: '🔷',
    tier: 2,
  },
  kattis: {
    name: 'Kattis',
    shortName: 'KT',
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500',
    bgSubtle: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    text: 'text-pink-400',
    ring: 'ring-pink-500/30',
    shadow: 'shadow-pink-500/20',
    profileUrl: (h) => `https://open.kattis.com/users/${h}`,
    icon: '🩷',
    tier: 2,
  },
  cses: {
    name: 'CSES',
    shortName: 'CS',
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-500',
    bgSubtle: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    ring: 'ring-violet-500/30',
    shadow: 'shadow-violet-500/20',
    profileUrl: (h) => `https://cses.fi/user/${h}`,
    icon: '💜',
    tier: 2,
  },
  dmoj: {
    name: 'DMOJ',
    shortName: 'DM',
    gradient: 'from-emerald-600 to-green-500',
    bg: 'bg-emerald-600',
    bgSubtle: 'bg-emerald-600/10',
    border: 'border-emerald-600/20',
    text: 'text-emerald-500',
    ring: 'ring-emerald-600/30',
    shadow: 'shadow-emerald-600/20',
    profileUrl: (h) => `https://dmoj.ca/user/${h}`,
    icon: '🍁',
    tier: 2,
  },
  csacademy: {
    name: 'CS Academy',
    shortName: 'CSA',
    gradient: 'from-indigo-500 to-violet-500',
    bg: 'bg-indigo-500',
    bgSubtle: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    text: 'text-indigo-400',
    ring: 'ring-indigo-500/30',
    shadow: 'shadow-indigo-500/20',
    profileUrl: (h) => `https://csacademy.com/user/${h}`,
    icon: '🎓',
    tier: 2,
  },

  // Tier 3: Regional Platforms
  vjudge: {
    name: 'VJudge',
    shortName: 'VJ',
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-500',
    bgSubtle: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    ring: 'ring-orange-500/30',
    shadow: 'shadow-orange-500/20',
    profileUrl: (h) => `https://vjudge.net/user/${h}`,
    icon: '🟠',
    tier: 3,
  },
  toph: {
    name: 'Toph',
    shortName: 'TP',
    gradient: 'from-teal-500 to-cyan-500',
    bg: 'bg-teal-500',
    bgSubtle: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    text: 'text-teal-400',
    ring: 'ring-teal-500/30',
    shadow: 'shadow-teal-500/20',
    profileUrl: (h) => `https://toph.co/u/${h}`,
    icon: '🌊',
    tier: 3,
  },
  lightoj: {
    name: 'LightOJ',
    shortName: 'LO',
    gradient: 'from-yellow-500 to-amber-500',
    bg: 'bg-yellow-500',
    bgSubtle: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    ring: 'ring-yellow-500/30',
    shadow: 'shadow-yellow-500/20',
    profileUrl: (h) => `https://lightoj.com/user/${h}`,
    icon: '💡',
    tier: 3,
  },
  eolymp: {
    name: 'E-Olymp',
    shortName: 'EO',
    gradient: 'from-sky-500 to-blue-500',
    bg: 'bg-sky-500',
    bgSubtle: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    text: 'text-sky-400',
    ring: 'ring-sky-500/30',
    shadow: 'shadow-sky-500/20',
    profileUrl: (h) => `https://www.eolymp.com/en/users/${h}`,
    icon: '🏅',
    tier: 3,
  },
  uva: {
    name: 'UVa Judge',
    shortName: 'UVA',
    gradient: 'from-violet-600 to-purple-500',
    bg: 'bg-violet-600',
    bgSubtle: 'bg-violet-600/10',
    border: 'border-violet-600/20',
    text: 'text-violet-500',
    ring: 'ring-violet-600/30',
    shadow: 'shadow-violet-600/20',
    profileUrl: (h) => `https://uhunt.onlinejudge.org/id/${h}`,
    icon: '📚',
    tier: 3,
  },
  usaco: {
    name: 'USACO',
    shortName: 'USA',
    gradient: 'from-red-600 to-red-500',
    bg: 'bg-red-600',
    bgSubtle: 'bg-red-600/10',
    border: 'border-red-600/20',
    text: 'text-red-500',
    ring: 'ring-red-600/30',
    shadow: 'shadow-red-600/20',
    profileUrl: () => `http://usaco.org/`,
    icon: '🇺🇸',
    tier: 3,
  },
  cfgym: {
    name: 'CF Gym',
    shortName: 'GYM',
    gradient: 'from-blue-600 to-indigo-500',
    bg: 'bg-blue-600',
    bgSubtle: 'bg-blue-600/10',
    border: 'border-blue-600/20',
    text: 'text-blue-500',
    ring: 'ring-blue-600/30',
    shadow: 'shadow-blue-600/20',
    profileUrl: (h) => `https://codeforces.com/profile/${h}`,
    icon: '🏋️',
    tier: 3,
  },
  beecrowd: {
    name: 'Beecrowd',
    shortName: 'BC',
    gradient: 'from-yellow-600 to-yellow-500',
    bg: 'bg-yellow-600',
    bgSubtle: 'bg-yellow-600/10',
    border: 'border-yellow-600/20',
    text: 'text-yellow-500',
    ring: 'ring-yellow-600/30',
    shadow: 'shadow-yellow-600/20',
    profileUrl: (h) => `https://www.beecrowd.com.br/judge/en/profile/${h}`,
    icon: '🐝',
    tier: 3,
  },
  codingame: {
    name: 'CodinGame',
    shortName: 'CG',
    gradient: 'from-yellow-400 to-orange-400',
    bg: 'bg-yellow-400',
    bgSubtle: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
    text: 'text-yellow-300',
    ring: 'ring-yellow-400/30',
    shadow: 'shadow-yellow-400/20',
    profileUrl: (h) => `https://www.codingame.com/profile/${h}`,
    icon: '🎮',
    tier: 3,
  },

  // Tier 4: Asian/Regional Platforms
  luogu: {
    name: 'Luogu',
    shortName: 'LG',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500',
    bgSubtle: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    ring: 'ring-blue-500/30',
    shadow: 'shadow-blue-500/20',
    profileUrl: (h) => `https://www.luogu.com.cn/user/${h}`,
    icon: '🇨🇳',
    tier: 4,
  },
  nowcoder: {
    name: 'NowCoder',
    shortName: 'NC',
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-500',
    bgSubtle: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    ring: 'ring-orange-500/30',
    shadow: 'shadow-orange-500/20',
    profileUrl: (h) => `https://ac.nowcoder.com/acm/contest/profile/${h}`,
    icon: '🧑‍💻',
    tier: 4,
  },
  yukicoder: {
    name: 'yukicoder',
    shortName: 'YC',
    gradient: 'from-pink-400 to-rose-400',
    bg: 'bg-pink-400',
    bgSubtle: 'bg-pink-400/10',
    border: 'border-pink-400/20',
    text: 'text-pink-300',
    ring: 'ring-pink-400/30',
    shadow: 'shadow-pink-400/20',
    profileUrl: (h) => `https://yukicoder.me/users/${h}`,
    icon: '❄️',
    tier: 4,
  },
  tlx: {
    name: 'TLX Toki',
    shortName: 'TLX',
    gradient: 'from-blue-600 to-blue-500',
    bg: 'bg-blue-600',
    bgSubtle: 'bg-blue-600/10',
    border: 'border-blue-600/20',
    text: 'text-blue-500',
    ring: 'ring-blue-600/30',
    shadow: 'shadow-blue-600/20',
    profileUrl: (h) => `https://tlx.toki.id/profiles/${h}`,
    icon: '🇮🇩',
    tier: 4,
  },
  yandex: {
    name: 'Yandex',
    shortName: 'YA',
    gradient: 'from-red-500 to-yellow-500',
    bg: 'bg-red-500',
    bgSubtle: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    ring: 'ring-red-500/30',
    shadow: 'shadow-red-500/20',
    profileUrl: () => `https://contest.yandex.ru/`,
    icon: '🔍',
    tier: 4,
  },
  timus: {
    name: 'Timus',
    shortName: 'TM',
    gradient: 'from-blue-700 to-blue-600',
    bg: 'bg-blue-700',
    bgSubtle: 'bg-blue-700/10',
    border: 'border-blue-700/20',
    text: 'text-blue-600',
    ring: 'ring-blue-700/30',
    shadow: 'shadow-blue-700/20',
    profileUrl: (h) => `https://acm.timus.ru/author.aspx?id=${h}`,
    icon: '🏔️',
    tier: 4,
  },
  acmp: {
    name: 'ACMP',
    shortName: 'ACMP',
    gradient: 'from-green-600 to-emerald-500',
    bg: 'bg-green-600',
    bgSubtle: 'bg-green-600/10',
    border: 'border-green-600/20',
    text: 'text-green-500',
    ring: 'ring-green-600/30',
    shadow: 'shadow-green-600/20',
    profileUrl: (h) => `https://acmp.ru/index.asp?main=user&id=${h}`,
    icon: '🇷🇺',
    tier: 4,
  },

  // Tier 5: Competition Platforms
  googlecodejam: {
    name: 'Google Contests',
    shortName: 'GCJ',
    gradient: 'from-blue-500 to-green-500',
    bg: 'bg-blue-500',
    bgSubtle: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    ring: 'ring-blue-500/30',
    shadow: 'shadow-blue-500/20',
    profileUrl: () => `https://codingcompetitions.withgoogle.com/`,
    icon: '🔷',
    tier: 5,
  },
  facebookhackercup: {
    name: 'Meta Hacker Cup',
    shortName: 'MHC',
    gradient: 'from-blue-600 to-indigo-600',
    bg: 'bg-blue-600',
    bgSubtle: 'bg-blue-600/10',
    border: 'border-blue-600/20',
    text: 'text-blue-500',
    ring: 'ring-blue-600/30',
    shadow: 'shadow-blue-600/20',
    profileUrl: () => `https://www.facebook.com/codingcompetitions/hacker-cup`,
    icon: '🔵',
    tier: 5,
  },
  codedrills: {
    name: 'CodeDrills',
    shortName: 'CD',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500',
    bgSubtle: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/30',
    shadow: 'shadow-emerald-500/20',
    profileUrl: (h) => `https://codedrills.io/profile/${h}`,
    icon: '🔧',
    tier: 5,
  },
  ioi: {
    name: 'IOI',
    shortName: 'IOI',
    gradient: 'from-violet-600 to-purple-600',
    bg: 'bg-violet-600',
    bgSubtle: 'bg-violet-600/10',
    border: 'border-violet-600/20',
    text: 'text-violet-500',
    ring: 'ring-violet-600/30',
    shadow: 'shadow-violet-600/20',
    profileUrl: () => `https://stats.ioinformatics.org/`,
    icon: '🏆',
    tier: 5,
  },
  opencup: {
    name: 'OpenCup',
    shortName: 'OC',
    gradient: 'from-amber-500 to-yellow-500',
    bg: 'bg-amber-500',
    bgSubtle: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    ring: 'ring-amber-500/30',
    shadow: 'shadow-amber-500/20',
    profileUrl: () => `https://opencup.ru/`,
    icon: '🏅',
    tier: 5,
  },
  ucup: {
    name: 'Universal Cup',
    shortName: 'UC',
    gradient: 'from-violet-500 to-indigo-500',
    bg: 'bg-violet-500',
    bgSubtle: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    ring: 'ring-violet-500/30',
    shadow: 'shadow-violet-500/20',
    profileUrl: () => `https://ucup.ac/`,
    icon: '🌐',
    tier: 5,
  },
  hsin: {
    name: 'COCI',
    shortName: 'COCI',
    gradient: 'from-red-600 to-rose-500',
    bg: 'bg-red-600',
    bgSubtle: 'bg-red-600/10',
    border: 'border-red-600/20',
    text: 'text-red-500',
    ring: 'ring-red-600/30',
    shadow: 'shadow-red-600/20',
    profileUrl: () => `https://hsin.hr/coci/`,
    icon: '🇭🇷',
    tier: 5,
  },
  robocontest: {
    name: 'Robocontest',
    shortName: 'RC',
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-500',
    bgSubtle: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
    ring: 'ring-cyan-500/30',
    shadow: 'shadow-cyan-500/20',
    profileUrl: (h) => `https://robocontest.uz/profile/${h}`,
    icon: '🤖',
    tier: 5,
  },
  algotester: {
    name: 'Algotester',
    shortName: 'AT',
    gradient: 'from-teal-500 to-emerald-500',
    bg: 'bg-teal-500',
    bgSubtle: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    text: 'text-teal-400',
    ring: 'ring-teal-500/30',
    shadow: 'shadow-teal-500/20',
    profileUrl: (h) => `https://algotester.com/en/User/Profile/${h}`,
    icon: '📊',
    tier: 5,
  },
};

const TIER_INFO = {
  1: { label: 'Popular', icon: Star, color: 'text-yellow-400' },
  2: { label: 'Recommended', icon: Zap, color: 'text-blue-400' },
  3: { label: 'Regional', icon: Globe, color: 'text-emerald-400' },
  4: { label: 'Asian', icon: Globe, color: 'text-purple-400' },
  5: { label: 'Competitions', icon: Trophy, color: 'text-amber-400' },
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PlatformAccounts({
  handles = [],
  statistics = {},
  onConnect,
  onDisconnect,
  onSyncPlatform,
  isConnecting = false,
  isSyncing = false,
  syncingPlatform = null,
  error,
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [handleInput, setHandleInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllConnected, setShowAllConnected] = useState(false);

  // Number of platforms to show in collapsed view (first row)
  // Responsive: 2 on mobile, 3 on tablet, 4 on desktop
  const VISIBLE_COUNT = 4;

  // Memoized data
  const connectedPlatforms = useMemo(
    () => handles.map((h) => h.platform),
    [handles]
  );

  const availablePlatforms = useMemo(
    () => Object.keys(PLATFORMS).filter((p) => !connectedPlatforms.includes(p)),
    [connectedPlatforms]
  );

  const filteredPlatforms = useMemo(() => {
    if (!searchQuery.trim()) return availablePlatforms;
    const query = searchQuery.toLowerCase();
    return availablePlatforms.filter(
      (p) =>
        PLATFORMS[p].name.toLowerCase().includes(query) ||
        PLATFORMS[p].shortName.toLowerCase().includes(query)
    );
  }, [availablePlatforms, searchQuery]);

  const groupedPlatforms = useMemo(() => {
    return filteredPlatforms.reduce((acc, id) => {
      const tier = PLATFORMS[id].tier;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(id);
      return acc;
    }, {});
  }, [filteredPlatforms]);

  // Visible handles based on expanded/collapsed state
  const visibleHandles = useMemo(() => {
    if (showAllConnected || handles.length <= VISIBLE_COUNT) {
      return handles;
    }
    return handles.slice(0, VISIBLE_COUNT);
  }, [handles, showAllConnected, VISIBLE_COUNT]);

  const hiddenCount = handles.length - VISIBLE_COUNT;
  const hasMorePlatforms = handles.length > VISIBLE_COUNT;

  // Handlers
  const handleConnect = useCallback(() => {
    if (selectedPlatform && handleInput.trim() && onConnect) {
      onConnect(selectedPlatform, handleInput.trim());
      setHandleInput('');
      setSelectedPlatform('');
      setShowModal(false);
      setSearchQuery('');
    }
  }, [selectedPlatform, handleInput, onConnect]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedPlatform('');
    setHandleInput('');
    setSearchQuery('');
  }, []);

  const totalPlatforms = Object.keys(PLATFORMS).length;

  return (
    <section className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/20">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Connected Platforms
              </h2>
              <p className="text-sm text-gray-400">
                {handles.length} of {totalPlatforms} platforms linked
              </p>
            </div>
          </div>
        </div>

        {availablePlatforms.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
          >
            <span className="absolute inset-0 bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 transition-opacity group-hover:opacity-100" />
            <Plus className="relative h-4 w-4" />
            <span className="relative">Add Platform</span>
            <Sparkles className="relative h-4 w-4 opacity-60" />
          </motion.button>
        )}
      </div>

      {/* ===== ERROR ALERT ===== */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 backdrop-blur-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-sm text-red-200">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PLATFORM CARDS GRID ===== */}
      {handles.length > 0 ? (
        <div className="space-y-4">
          {/* Platform Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {visibleHandles.map((handle) => (
                <PlatformCard
                  key={handle.platform}
                  handle={handle}
                  stats={statistics?.platform_stats?.[handle.platform] || {}}
                  config={
                    PLATFORMS[handle.platform] ||
                    getDefaultConfig(handle.platform)
                  }
                  onSync={() => onSyncPlatform?.(handle.platform)}
                  onSyncWithHtml={(manualHtml) => onSyncPlatform?.(handle.platform, manualHtml)}
                  onDisconnect={() => onDisconnect?.(handle.platform)}
                  isSyncing={syncingPlatform === handle.platform}
                  isAnySyncing={isSyncing}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Show All / Show Less Toggle */}
          {hasMorePlatforms && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAllConnected(!showAllConnected)}
                className="group flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-5 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-gray-600 hover:bg-gray-800 hover:text-white"
              >
                {showAllConnected ? (
                  <>
                    <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                    Show Less
                  </>
                ) : (
                  <>
                    <span>View All {handles.length} Platforms</span>
                    <span className="flex items-center justify-center rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-400">
                      +{hiddenCount}
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </div>
      ) : (
        /* ===== EMPTY STATE ===== */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-gray-800 bg-linear-to-br from-gray-900 via-gray-900 to-gray-800 p-8 text-center sm:p-12"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          <div className="relative">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-gray-800 to-gray-700 shadow-xl">
              <Link2 className="h-10 w-10 text-gray-500" />
            </div>

            <h3 className="mb-2 text-xl font-bold text-white">
              Link Your First Platform
            </h3>
            <p className="mx-auto mb-8 max-w-md text-gray-400">
              Connect your competitive programming accounts to track your
              progress, ratings, and achievements across {totalPlatforms}+
              platforms.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              className="group inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 px-8 py-4 font-semibold text-white shadow-xl shadow-purple-500/25 transition-all hover:shadow-2xl hover:shadow-purple-500/30"
            >
              <Plus className="h-5 w-5" />
              Connect Platform
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </motion.button>

            {/* Quick Platform Icons */}
            <div className="mt-8 flex items-center justify-center gap-2">
              {[
                'codeforces',
                'leetcode',
                'atcoder',
                'codechef',
                'hackerrank',
              ].map((p) => (
                <div
                  key={p}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800/50 text-lg backdrop-blur-sm"
                >
                  {PLATFORMS[p].icon}
                </div>
              ))}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800/50 text-xs font-medium text-gray-500 backdrop-blur-sm">
                +{totalPlatforms - 5}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== ADD PLATFORM MODAL ===== */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-purple-600">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Add Platform
                    </h3>
                    <p className="text-sm text-gray-400">
                      {availablePlatforms.length} platforms available
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="border-b border-gray-800 px-6 py-4">
                <div className="relative">
                  <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search platforms..."
                    className="w-full rounded-xl border border-gray-700 bg-gray-800/50 py-3 pr-4 pl-11 text-sm text-white placeholder-gray-500 transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Platform List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {Object.keys(groupedPlatforms).length > 0 ? (
                  Object.keys(groupedPlatforms)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((tier) => {
                      const TierIcon = TIER_INFO[tier]?.icon || Star;
                      return (
                        <div key={tier} className="mb-6 last:mb-0">
                          {/* Tier Header */}
                          <div className="mb-3 flex items-center gap-2">
                            <TierIcon
                              className={`h-4 w-4 ${TIER_INFO[tier]?.color || 'text-gray-400'}`}
                            />
                            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                              {TIER_INFO[tier]?.label || `Tier ${tier}`}
                            </span>
                            <span className="text-xs text-gray-600">
                              ({groupedPlatforms[tier].length})
                            </span>
                          </div>

                          {/* Platform Cards - Full Name Display */}
                          <div className="grid gap-2 sm:grid-cols-2">
                            {groupedPlatforms[tier].map((platformId) => {
                              const platform = PLATFORMS[platformId];
                              const isSelected =
                                selectedPlatform === platformId;
                              return (
                                <motion.button
                                  key={platformId}
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() =>
                                    setSelectedPlatform(platformId)
                                  }
                                  className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                    isSelected
                                      ? `${platform.bgSubtle} ${platform.border} ring-2 ${platform.ring}`
                                      : 'border-gray-800 hover:border-gray-700 hover:bg-gray-800/50'
                                  }`}
                                >
                                  {/* Platform Icon */}
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${
                                      isSelected
                                        ? platform.bgSubtle
                                        : 'bg-gray-800'
                                    }`}
                                  >
                                    <span className="text-xl">
                                      {platform.icon}
                                    </span>
                                  </div>

                                  {/* Platform Info */}
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className={`truncate font-semibold transition-colors ${
                                        isSelected
                                          ? platform.text
                                          : 'text-white group-hover:text-white'
                                      }`}
                                    >
                                      {platform.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {platform.shortName}
                                    </div>
                                  </div>

                                  {/* Selection Indicator */}
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-r ${platform.gradient}`}
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-white" />
                                    </motion.div>
                                  )}

                                  {/* Hover Arrow */}
                                  {!isSelected && (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-600 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-gray-400 group-hover:opacity-100" />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Search className="mb-3 h-8 w-8 opacity-50" />
                    <p className="text-sm">
                      No platforms match &quot;{searchQuery}&quot;
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-3 text-xs text-purple-400 hover:text-purple-300"
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </div>

              {/* Handle Input & Actions */}
              <div className="border-t border-gray-800 px-6 py-5">
                {/* Selected Platform Preview */}
                <AnimatePresence mode="wait">
                  {selectedPlatform && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`mb-4 flex items-center gap-3 rounded-xl ${PLATFORMS[selectedPlatform].bgSubtle} border ${PLATFORMS[selectedPlatform].border} p-3`}
                    >
                      <span className="text-2xl">
                        {PLATFORMS[selectedPlatform].icon}
                      </span>
                      <div className="flex-1">
                        <div
                          className={`font-semibold ${PLATFORMS[selectedPlatform].text}`}
                        >
                          {PLATFORMS[selectedPlatform].name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Selected platform
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPlatform('')}
                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/20 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Handle Input */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Username / Handle
                  </label>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    placeholder={
                      selectedPlatform
                        ? `Enter your ${PLATFORMS[selectedPlatform].name} handle`
                        : 'Select a platform above first'
                    }
                    disabled={!selectedPlatform}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-white placeholder-gray-500 transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-gray-700 px-4 py-3 font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleConnect}
                    disabled={
                      !selectedPlatform || !handleInput.trim() || isConnecting
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-3 font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:shadow-xl hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4" />
                        Connect
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ============================================
// PLATFORM CARD COMPONENT
// ============================================

function PlatformCard({
  handle,
  stats,
  config,
  onSync,
  onSyncWithHtml,
  onDisconnect,
  isSyncing,
  isAnySyncing,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showManualImport, setShowManualImport] = useState(false);
  const [manualHtmlInput, setManualHtmlInput] = useState('');
  const canSync = typeof onSync === 'function';
  const isSpoj = handle.platform === 'spoj';

  // Build available stats - prioritize sync data, then handle data
  const availableStats = useMemo(() => {
    const statItems = [];

    // Get values from stats (sync checkpoint data) or handle
    const rating = stats?.rating || handle?.current_rating || handle?.rating;
    const maxRating = stats?.max_rating || handle?.max_rating;
    const submissions = stats?.total_submissions || 0;
    const solved = stats?.solved_count || 0;
    const contests = stats?.contest_count || 0;

    // Show submissions count (most relevant for sync)
    if (submissions > 0) {
      statItems.push({ icon: Zap, label: 'Subs', value: submissions });
    }

    // Show solved count
    if (solved > 0) {
      statItems.push({ icon: Target, label: 'Solved', value: solved });
    }

    // Show rating if available
    if (rating && rating > 0) {
      statItems.push({ icon: Trophy, label: 'Rating', value: rating });
    }

    // Show max rating if different from current
    if (maxRating && maxRating > 0 && maxRating !== rating) {
      statItems.push({ icon: TrendingUp, label: 'Max', value: maxRating });
    }

    // Show contests if available
    if (contests > 0) {
      statItems.push({ icon: Flame, label: 'Contests', value: contests });
    }

    return statItems;
  }, [stats, handle]);

  // Determine sync status for visual indicator
  const syncStatus = stats?.sync_status || 'pending';
  const _hasError = syncStatus === 'failed' && stats?.error_message;

  return (
    <motion.div
      layout
      variants={cardVariants}
      className={`group relative flex h-full flex-col overflow-visible rounded-2xl border ${config.border} bg-linear-to-br from-gray-900 via-gray-900 to-gray-800 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${config.shadow} ${menuOpen ? 'z-30' : 'z-0'}`}
    >
      {/* Top Gradient Line */}
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${config.gradient}`}
      />

      {/* Hover Glow */}
      <div
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        style={{
          background: `radial-gradient(circle at 50% 0%, ${config.bg.replace('bg-', '')}10, transparent 60%)`,
        }}
      />

      {/* Content */}
      <div className="relative flex flex-1 flex-col p-4">
        {/* Header Row */}
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Platform Icon */}
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.bgSubtle} ring-1 ${config.ring}`}
            >
              <span className="text-xl">{config.icon}</span>
            </div>

            {/* Handle Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-white">
                  {handle.handle}
                </span>
                {handle.is_verified && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                )}
              </div>
              <span className={`text-xs font-medium ${config.text}`}>
                {config.name}
              </span>
            </div>
          </div>

          {/* Menu Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-gray-500 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white ${menuOpen ? 'border-white/15 bg-white/10 text-white' : ''}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {menuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute top-full right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border border-gray-700/90 bg-gray-800/95 shadow-2xl backdrop-blur"
                  >
                    <a
                      href={config.profileUrl(handle.handle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Profile
                    </a>
                    {canSync && (
                      <button
                        onClick={() => {
                          onSync?.();
                          setMenuOpen(false);
                        }}
                        disabled={isSyncing || isAnySyncing}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
                      >
                        {isSyncing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {isSyncing ? 'Syncing...' : 'Sync Data'}
                      </button>
                    )}
                    {isSpoj && (
                      <button
                        onClick={() => {
                          setShowManualImport(!showManualImport);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                      >
                        <ClipboardPaste className="h-4 w-4" />
                        Manual Import
                      </button>
                    )}
                    <div className="mx-3 my-1 h-px bg-gray-700" />
                    <button
                      onClick={() => {
                        onDisconnect?.();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Disconnect
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stats Row - Show sync status and available stats */}
        {availableStats.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3">
            {/* Sync status indicator */}
            {syncStatus === 'completed' && (
              <div className="flex shrink-0 items-center gap-1 rounded-md border border-green-500/20 bg-green-500/10 px-2 py-1">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />
                <span className="text-[10px] text-green-400">Synced</span>
              </div>
            )}
            {syncStatus === 'failed' && (
              <div
                className="flex shrink-0 items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1"
                title={stats?.error_message || 'Sync failed'}
              >
                <AlertCircle className="h-3 w-3 shrink-0 text-red-400" />
                <span className="text-[10px] text-red-400">Failed</span>
              </div>
            )}
            {availableStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-white/5 bg-white/4 px-2 py-1"
                >
                  <Icon className={`h-3 w-3 shrink-0 ${config.text}`} />
                  <span className="text-[10px] text-gray-500">
                    {stat.label}
                  </span>
                  <span className={`text-[11px] font-semibold ${config.text}`}>
                    {stat.value.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state - show sync status or prompt to sync */}
        {availableStats.length === 0 && (
          <div className="mt-auto border-t border-white/5 pt-3">
            {syncStatus === 'failed' ? (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] text-red-400">
                  {stats?.error_message ? 'Sync failed' : 'Sync error'}
                </span>
              </div>
            ) : syncStatus === 'in_progress' || isSyncing ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                <span className="text-[11px] text-blue-400">Syncing...</span>
              </div>
            ) : canSync ? (
              <span className="text-[11px] text-gray-500">
                Click menu → Sync Data
              </span>
            ) : (
              <span className="text-[11px] text-gray-500">
                No stats available yet
              </span>
            )}
          </div>
        )}
      </div>

      {/* SPOJ Manual Import Panel */}
      <AnimatePresence>
        {isSpoj && showManualImport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">
                  Manual Import (Cloudflare bypass)
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-500">
                SPOJ blocks automated syncing. Visit your{' '}
                <a
                  href={config.profileUrl(handle.handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 underline hover:text-amber-300"
                >
                  SPOJ profile
                </a>
                , select all (Ctrl+A), copy (Ctrl+C), then paste below.
              </p>
              <textarea
                value={manualHtmlInput}
                onChange={(e) => setManualHtmlInput(e.target.value)}
                placeholder="Paste your SPOJ profile page content here..."
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-xs text-white placeholder-gray-500 transition-all focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowManualImport(false);
                    setManualHtmlInput('');
                  }}
                  className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (manualHtmlInput.trim() && onSyncWithHtml) {
                      onSyncWithHtml(manualHtmlInput.trim());
                      setShowManualImport(false);
                      setManualHtmlInput('');
                    }
                  }}
                  disabled={!manualHtmlInput.trim() || isSyncing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Import
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Progress Bar */}
      {isSyncing && (
        <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-gray-800">
          <motion.div
            className={`h-full bg-linear-to-r ${config.gradient}`}
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: 'linear',
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultConfig(platformId) {
  return {
    name: platformId,
    shortName: platformId.slice(0, 3).toUpperCase(),
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-500',
    bgSubtle: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    text: 'text-gray-400',
    ring: 'ring-gray-500/30',
    shadow: 'shadow-gray-500/20',
    profileUrl: () => '#',
    icon: '📋',
    tier: 5,
  };
}
