/**
 * @file Problem Solving - Platform Registry
 * @module problem-solving-platforms
 *
 * Central registry for online judge platforms used by the Problem Solving feature.
 * Keep this module "pure" (no server-only imports) so it can be used from both
 * server code and client components.
 */

/**
 * Default UI configuration for unknown platforms
 */
const DEFAULT_UI = {
  short: '??',
  color: 'text-gray-400',
  bg: 'bg-gray-500/10',
  border: 'border-gray-500/20',
  hoverBg: 'hover:bg-gray-500/15',
  logo: null,
};

/**
 * Platform IDs are stored in DB as lowercase strings.
 * Add new platforms here and update SQL CHECK constraints accordingly.
 */
export const PROBLEM_SOLVING_PLATFORMS = [
  // ========================================
  // PLATFORMS WITH SYNC SUPPORT
  // ========================================
  {
    id: 'codeforces',
    name: 'Codeforces',
    description: 'Competitive programming platform',
    profileUrlPrefix: 'https://codeforces.com/profile/',
    handlePlaceholder: 'tourist',
    syncSupported: true,
    ui: {
      short: 'CF',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      hoverBg: 'hover:bg-red-500/15',
      logo: 'https://codeforces.org/s/0/favicon-96x96.png',
    },
  },
  {
    id: 'atcoder',
    name: 'AtCoder',
    description: 'Japanese competitive programming',
    profileUrlPrefix: 'https://atcoder.jp/users/',
    handlePlaceholder: 'tourist',
    syncSupported: true,
    ui: {
      short: 'AC',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      hoverBg: 'hover:bg-sky-500/15',
      logo: 'https://img.atcoder.jp/assets/atcoder.png',
    },
  },
  {
    id: 'leetcode',
    name: 'LeetCode',
    description: 'Coding interview preparation',
    profileUrlPrefix: 'https://leetcode.com/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'LC',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      hoverBg: 'hover:bg-amber-500/15',
      logo: 'https://assets.leetcode.com/static_assets/public/icons/favicon-96x96.png',
    },
  },
  {
    id: 'toph',
    name: 'Toph',
    description: 'Bangladesh competitive programming',
    profileUrlPrefix: 'https://toph.co/u/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'TP',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      hoverBg: 'hover:bg-emerald-500/15',
      logo: 'https://toph.co/images/favicon.png',
    },
  },
  {
    id: 'cses',
    name: 'CSES',
    description: 'Problem set and training',
    profileUrlPrefix: 'https://cses.fi/user/',
    handlePlaceholder: 'user_id',
    syncSupported: true,
    ui: {
      short: 'CS',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      hoverBg: 'hover:bg-indigo-500/15',
      logo: 'https://cses.fi/favicon.ico',
    },
  },
  {
    id: 'codechef',
    name: 'CodeChef',
    description: 'Competitive programming contests',
    profileUrlPrefix: 'https://www.codechef.com/users/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'CC',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      hoverBg: 'hover:bg-orange-500/15',
      logo: 'https://www.codechef.com/misc/favicon.ico',
    },
  },
  {
    id: 'topcoder',
    name: 'TopCoder',
    description: 'Algorithm competitions',
    profileUrlPrefix: 'https://www.topcoder.com/members/',
    handlePlaceholder: 'handle',
    syncSupported: true,
    ui: {
      short: 'TC',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      hoverBg: 'hover:bg-blue-500/15',
      logo: 'https://www.topcoder.com/wp-content/uploads/2020/05/cropped-TC-Icon-32x32.png',
    },
  },
  {
    id: 'hackerrank',
    name: 'HackerRank',
    description: 'Coding practice and interviews',
    profileUrlPrefix: 'https://www.hackerrank.com/profile/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'HR',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      hoverBg: 'hover:bg-green-500/15',
      logo: 'https://www.hackerrank.com/wp-content/uploads/2020/05/hackerrank_cursor_favicon_480px-150x150.png',
    },
  },
  {
    id: 'kattis',
    name: 'Kattis',
    description: 'Programming contests and practice',
    profileUrlPrefix: 'https://open.kattis.com/users/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'KT',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      hoverBg: 'hover:bg-rose-500/15',
      logo: 'https://open.kattis.com/favicon',
    },
  },
  {
    id: 'lightoj',
    name: 'LightOJ',
    description: 'Online judge',
    profileUrlPrefix: 'https://lightoj.com/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'LJ',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      hoverBg: 'hover:bg-cyan-500/15',
      logo: 'https://static.lightoj.com/assets/loj-logo-inverted.png',
    },
  },
  {
    id: 'uva',
    name: 'UVA',
    description: 'UVa Online Judge',
    profileUrlPrefix: 'https://uhunt.onlinejudge.org/id/',
    handlePlaceholder: 'user_id',
    syncSupported: true,
    ui: {
      short: 'UV',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      hoverBg: 'hover:bg-purple-500/15',
      logo: 'https://onlinejudge.org/favicon.ico',
    },
  },
  {
    id: 'spoj',
    name: 'SPOJ',
    description: 'Sphere Online Judge',
    profileUrlPrefix: 'https://www.spoj.com/users/',
    handlePlaceholder: 'username',
    syncSupported: true,
    // Note: SPOJ requires browser extension for sync due to Cloudflare protection
    requiresExtension: true,
    ui: {
      short: 'SP',
      color: 'text-lime-400',
      bg: 'bg-lime-500/10',
      border: 'border-lime-500/20',
      hoverBg: 'hover:bg-lime-500/15',
      logo: 'https://www.spoj.com/favicon.ico',
    },
  },
  {
    id: 'vjudge',
    name: 'VJudge',
    description: 'Virtual judge and aggregator',
    profileUrlPrefix: 'https://vjudge.net/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'VJ',
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      hoverBg: 'hover:bg-teal-500/15',
      logo: 'https://vjudge.net/favicon.ico',
    },
  },
  {
    id: 'cfgym',
    name: 'CF Gym',
    description: 'Codeforces Gym',
    profileUrlPrefix: 'https://codeforces.com/profile/',
    handlePlaceholder: 'tourist',
    syncSupported: true,
    ui: {
      short: 'CG',
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      hoverBg: 'hover:bg-pink-500/15',
      logo: 'https://codeforces.org/s/0/favicon-96x96.png',
    },
  },
  {
    id: 'csacademy',
    name: 'CS Academy',
    description: 'Competitive programming',
    profileUrlPrefix: 'https://csacademy.com/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'CA',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      hoverBg: 'hover:bg-violet-500/15',
      logo: 'https://csacademy.com/favicon.ico',
    },
  },
  {
    id: 'eolymp',
    name: 'E-Olymp',
    description: 'Online judge',
    profileUrlPrefix: 'https://www.eolymp.com/en/users/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'EO',
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/20',
      hoverBg: 'hover:bg-fuchsia-500/15',
      logo: 'https://www.eolymp.com/favicon.ico',
    },
  },
  {
    id: 'usaco',
    name: 'USACO',
    description: 'USA Computing Olympiad',
    profileUrlPrefix: 'https://usaco.org/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'US',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      hoverBg: 'hover:bg-yellow-500/15',
      logo: 'https://usaco.org/current/images/usaco_logo.png',
    },
  },
  {
    id: 'hackerearth',
    name: 'HackerEarth',
    description: 'Coding challenges and hackathons',
    profileUrlPrefix: 'https://www.hackerearth.com/@',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'HE',
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/20',
      hoverBg: 'hover:bg-slate-500/15',
      logo: 'https://www.hackerearth.com/favicon.ico',
    },
  },
  {
    id: 'dmoj',
    name: 'DMOJ',
    description: 'Modern Online Judge',
    profileUrlPrefix: 'https://dmoj.ca/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'DJ',
      color: 'text-blue-300',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      hoverBg: 'hover:bg-blue-500/15',
      logo: 'https://dmoj.ca/favicon.ico',
    },
  },
  // ========================================
  // GROUP 2: MAJOR GLOBAL PLATFORMS
  // ========================================
  {
    id: 'googlecodejam',
    name: 'Google Code Jam',
    description: 'Google programming competitions',
    profileUrlPrefix: 'https://codingcompetitions.withgoogle.com/profile/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'GC',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      hoverBg: 'hover:bg-blue-500/15',
      logo: 'https://codingcompetitions.withgoogle.com/favicon.ico',
    },
  },
  {
    id: 'facebookhackercup',
    name: 'Facebook Hacker Cup',
    description: 'Meta/Facebook programming competitions',
    profileUrlPrefix: 'https://www.facebook.com/codingcompetitions/hacker-cup/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'FB',
      color: 'text-blue-600',
      bg: 'bg-blue-600/10',
      border: 'border-blue-600/20',
      hoverBg: 'hover:bg-blue-600/15',
      logo: 'https://www.facebook.com/favicon.ico',
    },
  },
  {
    id: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    description: 'Programming contests and practice',
    profileUrlPrefix: 'https://auth.geeksforgeeks.org/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'GG',
      color: 'text-green-600',
      bg: 'bg-green-600/10',
      border: 'border-green-600/20',
      hoverBg: 'hover:bg-green-600/15',
      logo: 'https://www.geeksforgeeks.org/favicon.ico',
    },
  },
  {
    id: 'codingame',
    name: 'CodinGame',
    description: 'Programming game contests',
    profileUrlPrefix: 'https://www.codingame.com/profile/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'CG',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      hoverBg: 'hover:bg-purple-500/15',
      logo: 'https://www.codingame.com/favicon.ico',
    },
  },
  {
    id: 'beecrowd',
    name: 'Beecrowd',
    description: 'Brazilian online judge',
    profileUrlPrefix: 'https://judge.beecrowd.com/en/profile/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'BC',
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      hoverBg: 'hover:bg-yellow-500/15',
      logo: 'https://www.beecrowd.com.br/favicon.ico',
    },
  },
  // ========================================
  // GROUP 3: REGIONAL/NATIONAL PLATFORMS
  // ========================================
  {
    id: 'luogu',
    name: 'Luogu',
    description: 'Chinese competitive programming',
    profileUrlPrefix: 'https://www.luogu.com.cn/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'LG',
      color: 'text-red-600',
      bg: 'bg-red-600/10',
      border: 'border-red-600/20',
      hoverBg: 'hover:bg-red-600/15',
      logo: 'https://www.luogu.com.cn/favicon.ico',
    },
  },
  {
    id: 'nowcoder',
    name: 'NowCoder',
    description: 'Chinese ICPC-style contests',
    profileUrlPrefix: 'https://ac.nowcoder.com/acm/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'NC',
      color: 'text-orange-600',
      bg: 'bg-orange-600/10',
      border: 'border-orange-600/20',
      hoverBg: 'hover:bg-orange-600/15',
      logo: 'https://www.nowcoder.com/favicon.ico',
    },
  },
  {
    id: 'codedrills',
    name: 'CodeDrills',
    description: 'Indian programming contests',
    profileUrlPrefix: 'https://codedrills.io/users/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'CD',
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      hoverBg: 'hover:bg-indigo-500/15',
      logo: 'https://codedrills.io/favicon.ico',
    },
  },
  {
    id: 'yandex',
    name: 'Yandex Contest',
    description: 'Russian programming competitions',
    profileUrlPrefix: 'https://yandex.com/cup/profile/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'YX',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      hoverBg: 'hover:bg-red-500/15',
      logo: 'https://yandex.ru/favicon.ico',
    },
  },
  {
    id: 'nerc',
    name: 'NERC/ITMO',
    description: 'ICPC regional contests',
    profileUrlPrefix: 'https://nerc.itmo.ru/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'NR',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      hoverBg: 'hover:bg-blue-400/15',
      logo: 'https://nerc.itmo.ru/favicon.ico',
    },
  },
  {
    id: 'tlx',
    name: 'TLX/TOKI',
    description: 'Indonesian programming platform',
    profileUrlPrefix: 'https://tlx.toki.id/profiles/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'TL',
      color: 'text-teal-500',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      hoverBg: 'hover:bg-teal-500/15',
      logo: 'https://tlx.toki.id/favicon.ico',
    },
  },
  {
    id: 'yukicoder',
    name: 'Yukicoder',
    description: 'Japanese programming contests',
    profileUrlPrefix: 'https://yukicoder.me/users/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'YK',
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      hoverBg: 'hover:bg-pink-500/15',
      logo: 'https://yukicoder.me/favicon.ico',
    },
  },
  {
    id: 'acmp',
    name: 'ACMP',
    description: 'Russian programming platform',
    profileUrlPrefix: 'https://acmp.ru/index.asp?main=user&id=',
    handlePlaceholder: 'user_id',
    syncSupported: true,
    ui: {
      short: 'AM',
      color: 'text-gray-500',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      hoverBg: 'hover:bg-gray-500/15',
      logo: 'https://acmp.ru/favicon.ico',
    },
  },
  {
    id: 'timus',
    name: 'Timus Online Judge',
    description: 'Russian online judge',
    profileUrlPrefix: 'https://acm.timus.ru/author.aspx?id=',
    handlePlaceholder: 'user_id',
    syncSupported: true,
    ui: {
      short: 'TM',
      color: 'text-slate-500',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/20',
      hoverBg: 'hover:bg-slate-500/15',
      logo: 'https://acm.timus.ru/favicon.ico',
    },
  },
  {
    id: 'hsin',
    name: 'COCI',
    description: 'Croatian contests',
    profileUrlPrefix: 'https://hsin.hr/coci/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'CO',
      color: 'text-sky-600',
      bg: 'bg-sky-600/10',
      border: 'border-sky-600/20',
      hoverBg: 'hover:bg-sky-600/15',
      logo: 'https://hsin.hr/favicon.ico',
    },
  },
  // ========================================
  // GROUP 4: CLASSIC/EDUCATIONAL PLATFORMS
  // ========================================
  {
    id: 'ioi',
    name: 'IOI',
    description: 'International Olympiad in Informatics',
    profileUrlPrefix: 'https://stats.ioinformatics.org/people/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'IO',
      color: 'text-yellow-600',
      bg: 'bg-yellow-600/10',
      border: 'border-yellow-600/20',
      hoverBg: 'hover:bg-yellow-600/15',
      logo: 'https://ioinformatics.org/favicon.ico',
    },
  },
  {
    id: 'algotester',
    name: 'Algotester',
    description: 'Ukrainian programming platform',
    profileUrlPrefix: 'https://algotester.com/en/User/Profile/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'AT',
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      hoverBg: 'hover:bg-cyan-500/15',
      logo: 'https://algotester.com/favicon.ico',
    },
  },
  {
    id: 'cphof',
    name: 'CP Hall of Fame',
    description: 'Contest archive platform',
    profileUrlPrefix: 'https://cphof.org/profile/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'CP',
      color: 'text-amber-600',
      bg: 'bg-amber-600/10',
      border: 'border-amber-600/20',
      hoverBg: 'hover:bg-amber-600/15',
      logo: 'https://cphof.org/favicon.ico',
    },
  },
  {
    id: 'opencup',
    name: 'Open Cup',
    description: 'Team programming contests',
    profileUrlPrefix: 'https://opencup.ru/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'OC',
      color: 'text-lime-500',
      bg: 'bg-lime-500/10',
      border: 'border-lime-500/20',
      hoverBg: 'hover:bg-lime-500/15',
      logo: 'https://opencup.ru/favicon.ico',
    },
  },
  {
    id: 'robocontest',
    name: 'Robocontest',
    description: 'Uzbekistan programming platform',
    profileUrlPrefix: 'https://robocontest.uz/profile/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'RB',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      hoverBg: 'hover:bg-emerald-500/15',
      logo: 'https://robocontest.uz/favicon.ico',
    },
  },
  {
    id: 'ucup',
    name: 'Universal Cup',
    description: 'ICPC-style team contests',
    profileUrlPrefix: 'https://ucup.ac/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'UC',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      hoverBg: 'hover:bg-violet-500/15',
      logo: 'https://ucup.ac/favicon.ico',
    },
  },
  {
    id: 'acmu',
    name: 'ACM.U',
    description: 'Russian academic platform',
    profileUrlPrefix: 'https://acmu.ru/user/',
    handlePlaceholder: 'username',
    syncSupported: true,
    ui: {
      short: 'AU',
      color: 'text-rose-600',
      bg: 'bg-rose-600/10',
      border: 'border-rose-600/20',
      hoverBg: 'hover:bg-rose-600/15',
      logo: 'https://acm.university/favicon.ico',
    },
  },
];

export const PROBLEM_SOLVING_PLATFORM_IDS = PROBLEM_SOLVING_PLATFORMS.map(
  (p) => p.id
);

export const PROBLEM_SOLVING_SYNC_PLATFORM_IDS =
  PROBLEM_SOLVING_PLATFORMS.filter((p) => p.syncSupported).map((p) => p.id);

export function getProblemSolvingPlatform(platformId) {
  if (!platformId) return null;
  return PROBLEM_SOLVING_PLATFORMS.find((p) => p.id === platformId) || null;
}

export function isProblemSolvingPlatform(platformId) {
  return Boolean(getProblemSolvingPlatform(platformId));
}

export function getProblemSolvingPlatformUi(platformId) {
  const platform = getProblemSolvingPlatform(platformId);
  return platform?.ui || DEFAULT_UI;
}

export function getProblemSolvingPlatformName(platformId) {
  return getProblemSolvingPlatform(platformId)?.name || platformId || 'Unknown';
}

export function getProblemSolvingProfileUrl(platformId, handle) {
  const platform = getProblemSolvingPlatform(platformId);
  if (!platform?.profileUrlPrefix) return null;
  if (!handle) return platform.profileUrlPrefix;
  return `${platform.profileUrlPrefix}${handle}`;
}

/**
 * Get complete platform config for a platform
 * @param {string} platformId - Platform ID
 * @returns {Object|null} Full platform config or null
 */
export function getProblemSolvingPlatformConfig(platformId) {
  const platform = getProblemSolvingPlatform(platformId);
  if (!platform) return null;

  return {
    id: platform.id,
    name: platform.name,
    description: platform.description,
    short: platform.ui.short,
    color: platform.ui.color,
    bg: platform.ui.bg,
    border: platform.ui.border,
    hoverBg: platform.ui.hoverBg,
    logo: platform.ui.logo,
    url: platform.profileUrlPrefix,
    placeholder: platform.handlePlaceholder,
    syncSupported: platform.syncSupported,
  };
}

/**
 * Get all platform configs as a map
 * @returns {Object} Map of platform ID to config
 */
export function getAllPlatformConfigs() {
  return PROBLEM_SOLVING_PLATFORMS.reduce((acc, p) => {
    acc[p.id] = getProblemSolvingPlatformConfig(p.id);
    return acc;
  }, {});
}
