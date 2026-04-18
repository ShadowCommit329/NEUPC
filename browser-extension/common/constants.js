/**
 * NEUPC Browser Extension - Constants
 * Central configuration for all supported platforms and data structures
 */

// ============================================================
// PLATFORM DEFINITIONS
// ============================================================

/**
 * Platform configuration with URL patterns, selectors, and API info
 * This is the single source of truth for platform support
 */
export const PLATFORMS = {
  // ==================== GROUP 1: CORE INTERNATIONAL ====================
  codeforces: {
    id: 'codeforces',
    name: 'Codeforces',
    shortName: 'CF',
    baseUrl: 'https://codeforces.com',
    hasApi: true,
    apiUrl: 'https://codeforces.com/api',
    hasRating: true,
    hasContests: true,
    urlPatterns: [
      '*://codeforces.com/*',
      '*://www.codeforces.com/*',
      '*://m.codeforces.com/*',
    ],
    submissionUrlPattern:
      /\/(?:contest|gym|group\/[^/]+\/contest)\/(\d+)\/submission\/(\d+)/,
    problemUrlPattern:
      /\/(?:contest|problemset\/problem)\/(\d+)\/([A-Za-z0-9]+)/,
    statusUrlPattern: /\/(?:submissions|status)/,
    profileUrlTemplate: 'https://codeforces.com/profile/{handle}',
    color: '#1890ff',
    icon: 'codeforces',
  },

  atcoder: {
    id: 'atcoder',
    name: 'AtCoder',
    shortName: 'AC',
    baseUrl: 'https://atcoder.jp',
    hasApi: true,
    apiUrl: 'https://atcoder.jp/api',
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://atcoder.jp/*', '*://www.atcoder.jp/*'],
    submissionUrlPattern: /\/contests\/([^/]+)\/submissions\/(\d+)/,
    problemUrlPattern: /\/contests\/([^/]+)\/tasks\/([a-z0-9_]+)/,
    statusUrlPattern: /\/contests\/[^/]+\/submissions/,
    profileUrlTemplate: 'https://atcoder.jp/users/{handle}',
    color: '#222222',
    icon: 'atcoder',
  },

  leetcode: {
    id: 'leetcode',
    name: 'LeetCode',
    shortName: 'LC',
    baseUrl: 'https://leetcode.com',
    hasApi: true, // GraphQL
    apiUrl: 'https://leetcode.com/graphql',
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://leetcode.com/*', '*://www.leetcode.com/*'],
    submissionUrlPattern: /\/submissions\/detail\/(\d+)/,
    problemUrlPattern: /\/problems\/([a-z0-9-]+)/,
    statusUrlPattern: /\/submissions/,
    profileUrlTemplate: 'https://leetcode.com/{handle}',
    color: '#ffa116',
    icon: 'leetcode',
  },

  toph: {
    id: 'toph',
    name: 'Toph',
    shortName: 'TP',
    baseUrl: 'https://toph.co',
    hasApi: false,
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://toph.co/*', '*://www.toph.co/*'],
    submissionUrlPattern: /\/s\/([a-z0-9]+)/,
    problemUrlPattern: /\/p\/([a-z0-9-]+)/,
    statusUrlPattern: /\/u\/[^/]+\/submissions/,
    profileUrlTemplate: 'https://toph.co/u/{handle}',
    color: '#6366f1',
    icon: 'toph',
  },

  cses: {
    id: 'cses',
    name: 'CSES',
    shortName: 'CS',
    baseUrl: 'https://cses.fi',
    hasApi: false,
    hasRating: false,
    hasContests: false,
    urlPatterns: ['*://cses.fi/*', '*://www.cses.fi/*'],
    submissionUrlPattern: /\/problemset\/result\/(\d+)/,
    problemUrlPattern: /\/problemset\/task\/(\d+)/,
    statusUrlPattern: /\/problemset\/list/,
    profileUrlTemplate: 'https://cses.fi/user/{handle}',
    color: '#2563eb',
    icon: 'cses',
  },

  codechef: {
    id: 'codechef',
    name: 'CodeChef',
    shortName: 'CC',
    baseUrl: 'https://www.codechef.com',
    hasApi: true,
    apiUrl: 'https://www.codechef.com/api',
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://codechef.com/*', '*://www.codechef.com/*'],
    submissionUrlPattern: /\/viewsolution\/(\d+)/,
    problemUrlPattern: /\/problems\/([A-Z0-9_]+)/,
    statusUrlPattern: /\/status/,
    profileUrlTemplate: 'https://www.codechef.com/users/{handle}',
    color: '#5b4638',
    icon: 'codechef',
  },

  hackerrank: {
    id: 'hackerrank',
    name: 'HackerRank',
    shortName: 'HR',
    baseUrl: 'https://www.hackerrank.com',
    hasApi: false,
    hasRating: false,
    hasContests: true,
    urlPatterns: ['*://hackerrank.com/*', '*://www.hackerrank.com/*'],
    submissionUrlPattern: /\/(?:rest\/)?(?:contests\/[^/]+\/)?challenges\/[^/]+\/submissions\/(?:code\/)?([^/?#]+)/,
    problemUrlPattern: /\/challenges\/([a-z0-9-]+)/,
    statusUrlPattern: /\/submissions/,
    profileUrlTemplate: 'https://www.hackerrank.com/{handle}',
    color: '#00ea64',
    icon: 'hackerrank',
  },

  kattis: {
    id: 'kattis',
    name: 'Kattis',
    shortName: 'KT',
    baseUrl: 'https://open.kattis.com',
    hasApi: false,
    hasRating: true,
    hasContests: true,
    urlPatterns: [
      '*://open.kattis.com/*',
      '*://www.kattis.com/*',
      '*://*.kattis.com/*',
    ],
    submissionUrlPattern: /\/submissions\/(\d+)/,
    problemUrlPattern: /\/problems\/([a-z0-9]+)/,
    statusUrlPattern: /\/users\/[^/]+$/,
    profileUrlTemplate: 'https://open.kattis.com/users/{handle}',
    color: '#1a1a1a',
    icon: 'kattis',
  },

  spoj: {
    id: 'spoj',
    name: 'SPOJ',
    shortName: 'SP',
    baseUrl: 'https://www.spoj.com',
    hasApi: false,
    hasRating: false,
    hasContests: false,
    urlPatterns: ['*://spoj.com/*', '*://www.spoj.com/*'],
    submissionUrlPattern: /\/submit\/([A-Z0-9_]+)\/id=(\d+)/,
    problemUrlPattern: /\/problems\/([A-Z0-9_]+)/,
    statusUrlPattern: /\/status/,
    profileUrlTemplate: 'https://www.spoj.com/users/{handle}',
    color: '#004785',
    icon: 'spoj',
  },

  uva: {
    id: 'uva',
    name: 'UVa Online Judge',
    shortName: 'UV',
    baseUrl: 'https://onlinejudge.org',
    hasApi: true,
    apiUrl: 'https://uhunt.onlinejudge.org/api',
    hasRating: false,
    hasContests: false,
    urlPatterns: [
      '*://onlinejudge.org/*',
      '*://uva.onlinejudge.org/*',
      '*://uhunt.onlinejudge.org/*',
    ],
    submissionUrlPattern:
      /\/index\.php\?option=com_onlinejudge.*Itemid=9.*sid=(\d+)/,
    problemUrlPattern: /\/index\.php\?option=com_onlinejudge.*problem=(\d+)/,
    statusUrlPattern: /\/index\.php.*option=com_onlinejudge.*Itemid=9/,
    profileUrlTemplate: 'https://uhunt.onlinejudge.org/id/{handle}',
    color: '#004B87',
    icon: 'uva',
  },

  lightoj: {
    id: 'lightoj',
    name: 'LightOJ',
    shortName: 'LO',
    baseUrl: 'https://lightoj.com',
    hasApi: false,
    hasRating: false,
    hasContests: true,
    urlPatterns: ['*://lightoj.com/*', '*://www.lightoj.com/*'],
    submissionUrlPattern: /\/submission\/(\d+)/,
    problemUrlPattern: /\/problem\/([a-z0-9-]+)/,
    statusUrlPattern: /\/submissions/,
    profileUrlTemplate: 'https://lightoj.com/user/{handle}',
    color: '#673ab7',
    icon: 'lightoj',
  },

  vjudge: {
    id: 'vjudge',
    name: 'Virtual Judge',
    shortName: 'VJ',
    baseUrl: 'https://vjudge.net',
    hasApi: true,
    apiUrl: 'https://vjudge.net/solution/data',
    hasRating: false,
    hasContests: true,
    urlPatterns: ['*://vjudge.net/*', '*://www.vjudge.net/*'],
    submissionUrlPattern: /\/solution\/(\d+)/,
    problemUrlPattern: /\/problem\/([^/]+\/[^/]+)/,
    statusUrlPattern: /\/status/,
    profileUrlTemplate: 'https://vjudge.net/user/{handle}',
    color: '#1976d2',
    icon: 'vjudge',
  },

  dmoj: {
    id: 'dmoj',
    name: 'DMOJ',
    shortName: 'DM',
    baseUrl: 'https://dmoj.ca',
    hasApi: true,
    apiUrl: 'https://dmoj.ca/api/v2',
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://dmoj.ca/*', '*://www.dmoj.ca/*'],
    submissionUrlPattern: /\/submission\/(\d+)/,
    problemUrlPattern: /\/problem\/([a-z0-9_]+)/,
    statusUrlPattern: /\/submissions/,
    profileUrlTemplate: 'https://dmoj.ca/user/{handle}',
    color: '#1a237e',
    icon: 'dmoj',
  },

  topcoder: {
    id: 'topcoder',
    name: 'TopCoder',
    shortName: 'TC',
    baseUrl: 'https://www.topcoder.com',
    hasApi: true,
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://topcoder.com/*', '*://www.topcoder.com/*'],
    submissionUrlPattern: /\/stat\?c=problem_solution.*cr=(\d+).*pm=(\d+)/,
    problemUrlPattern: /\/stat\?c=problem_statement.*pm=(\d+)/,
    statusUrlPattern: /\/tc\?module=History/,
    profileUrlTemplate: 'https://www.topcoder.com/members/{handle}',
    color: '#0ab88a',
    icon: 'topcoder',
  },

  // ==================== GROUP 2: REGIONAL PLATFORMS ====================
  beecrowd: {
    id: 'beecrowd',
    name: 'beecrowd',
    shortName: 'BC',
    baseUrl: 'https://judge.beecrowd.com',
    hasApi: false,
    hasRating: false,
    hasContests: true,
    urlPatterns: [
      '*://judge.beecrowd.com/*',
      '*://beecrowd.com.br/*',
      '*://www.beecrowd.com.br/*',
    ],
    submissionUrlPattern: /\/runs\/(?:code\/)?(\d+)/,
    problemUrlPattern: /\/problems\/(?:view\/)?(\d+)/,
    statusUrlPattern: /\/runs(?:\/|$)/,
    profileUrlTemplate: 'https://judge.beecrowd.com/en/profile/{handle}',
    color: '#6441a5',
    icon: 'beecrowd',
  },

  loj: {
    id: 'loj',
    name: 'LibreOJ',
    shortName: 'LJ',
    baseUrl: 'https://loj.ac',
    hasApi: true,
    hasRating: false,
    hasContests: true,
    urlPatterns: ['*://loj.ac/*', '*://www.loj.ac/*'],
    submissionUrlPattern: /\/s\/(\d+)/,
    problemUrlPattern: /\/p\/(\d+)/,
    statusUrlPattern: /\/submissions/,
    profileUrlTemplate: 'https://loj.ac/user/{handle}',
    color: '#9c27b0',
    icon: 'loj',
  },

  timus: {
    id: 'timus',
    name: 'Timus OJ',
    shortName: 'TM',
    baseUrl: 'https://acm.timus.ru',
    hasApi: false,
    hasRating: false,
    hasContests: false,
    urlPatterns: ['*://acm.timus.ru/*', '*://timus.ru/*'],
    submissionUrlPattern: /\/status\.aspx\?.*id=(\d+)/,
    problemUrlPattern: /\/problem\.aspx\?.*num=(\d+)/,
    statusUrlPattern: /\/status\.aspx/,
    profileUrlTemplate: 'https://acm.timus.ru/author.aspx?id={handle}',
    color: '#2e7d32',
    icon: 'timus',
  },

  bapsoj: {
    id: 'bapsoj',
    name: 'BAPS OJ',
    shortName: 'BP',
    baseUrl: 'https://bapsoj.org',
    hasApi: false,
    hasRating: false,
    hasContests: true,
    urlPatterns: ['*://bapsoj.org/*', '*://www.bapsoj.org/*'],
    submissionUrlPattern: /\/submissions\/(\d+)/,
    problemUrlPattern: /\/problems\/([A-Z0-9]+)/,
    statusUrlPattern: /\/submissions/,
    profileUrlTemplate: 'https://bapsoj.org/users/{handle}',
    color: '#e91e63',
    icon: 'bapsoj',
  },

  // ==================== GROUP 3: LEARNING PLATFORMS ====================
  hackerearth: {
    id: 'hackerearth',
    name: 'HackerEarth',
    shortName: 'HE',
    baseUrl: 'https://www.hackerearth.com',
    hasApi: false,
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://hackerearth.com/*', '*://www.hackerearth.com/*'],
    submissionUrlPattern: /\/submission\/(\d+)/,
    problemUrlPattern: /\/problem\/[^/]+\/([a-z0-9-]+)/,
    statusUrlPattern: /\/@[^/]+\/activity/,
    profileUrlTemplate: 'https://www.hackerearth.com/@{handle}',
    color: '#323754',
    icon: 'hackerearth',
  },

  codewars: {
    id: 'codewars',
    name: 'Codewars',
    shortName: 'CW',
    baseUrl: 'https://www.codewars.com',
    hasApi: true,
    apiUrl: 'https://www.codewars.com/api/v1',
    hasRating: true, // kyu system
    hasContests: false,
    urlPatterns: ['*://codewars.com/*', '*://www.codewars.com/*'],
    submissionUrlPattern:
      /\/kata\/[^/]+\/solutions\/[^/]+\/me\/groups\/([a-f0-9]+)/,
    problemUrlPattern: /\/kata\/([a-f0-9]+)/,
    statusUrlPattern: /\/users\/[^/]+\/completed/,
    profileUrlTemplate: 'https://www.codewars.com/users/{handle}',
    color: '#b1361e',
    icon: 'codewars',
  },

  exercism: {
    id: 'exercism',
    name: 'Exercism',
    shortName: 'EX',
    baseUrl: 'https://exercism.org',
    hasApi: true,
    apiUrl: 'https://exercism.org/api/v2',
    hasRating: false,
    hasContests: false,
    urlPatterns: ['*://exercism.org/*', '*://www.exercism.org/*'],
    submissionUrlPattern:
      /\/tracks\/[^/]+\/exercises\/[^/]+\/iterations\/(\d+)/,
    problemUrlPattern: /\/tracks\/([^/]+)\/exercises\/([^/]+)/,
    statusUrlPattern: /\/tracks\/[^/]+$/,
    profileUrlTemplate: 'https://exercism.org/profiles/{handle}',
    color: '#604fcd',
    icon: 'exercism',
  },

  projecteuler: {
    id: 'projecteuler',
    name: 'Project Euler',
    shortName: 'PE',
    baseUrl: 'https://projecteuler.net',
    hasApi: false,
    hasRating: false,
    hasContests: false,
    urlPatterns: ['*://projecteuler.net/*'],
    submissionUrlPattern: null, // No submission pages
    problemUrlPattern: /\/problem=(\d+)/,
    statusUrlPattern: /\/progress/,
    profileUrlTemplate: null,
    color: '#6e5494',
    icon: 'projecteuler',
  },

  // ==================== GROUP 4: CHINESE/REGIONAL ====================
  leetcodecn: {
    id: 'leetcodecn',
    name: 'LeetCode CN',
    shortName: 'LCN',
    baseUrl: 'https://leetcode.cn',
    hasApi: true,
    apiUrl: 'https://leetcode.cn/graphql',
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://leetcode.cn/*', '*://www.leetcode.cn/*'],
    submissionUrlPattern: /\/submissions\/detail\/(\d+)/,
    problemUrlPattern: /\/problems\/([a-z0-9-]+)/,
    statusUrlPattern: /\/submissions/,
    profileUrlTemplate: 'https://leetcode.cn/u/{handle}',
    color: '#ffa116',
    icon: 'leetcode',
  },

  luogu: {
    id: 'luogu',
    name: 'Luogu',
    shortName: 'LG',
    baseUrl: 'https://www.luogu.com.cn',
    hasApi: true,
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://luogu.com.cn/*', '*://www.luogu.com.cn/*'],
    submissionUrlPattern: /\/record\/(\d+)/,
    problemUrlPattern: /\/problem\/([A-Z]+\d+)/,
    statusUrlPattern: /\/record\/list/,
    profileUrlTemplate: 'https://www.luogu.com.cn/user/{handle}',
    color: '#3498db',
    icon: 'luogu',
  },

  acwing: {
    id: 'acwing',
    name: 'AcWing',
    shortName: 'AW',
    baseUrl: 'https://www.acwing.com',
    hasApi: false,
    hasRating: true,
    hasContests: true,
    urlPatterns: ['*://acwing.com/*', '*://www.acwing.com/*'],
    submissionUrlPattern: /\/solution\/content\/(\d+)/,
    problemUrlPattern: /\/problem\/content\/(\d+)/,
    statusUrlPattern: /\/activity\/content\/punch_the_clock/,
    profileUrlTemplate: 'https://www.acwing.com/user/myspace/index/{handle}',
    color: '#2ecc71',
    icon: 'acwing',
  },

  poj: {
    id: 'poj',
    name: 'POJ',
    shortName: 'PJ',
    baseUrl: 'http://poj.org',
    hasApi: false,
    hasRating: false,
    hasContests: false,
    urlPatterns: ['*://poj.org/*'],
    submissionUrlPattern: /\/showsource\?solution_id=(\d+)/,
    problemUrlPattern: /\/problem\?id=(\d+)/,
    statusUrlPattern: /\/status/,
    profileUrlTemplate: 'http://poj.org/userstatus?user_id={handle}',
    color: '#cc0000',
    icon: 'poj',
  },

  hdu: {
    id: 'hdu',
    name: 'HDU',
    shortName: 'HD',
    baseUrl: 'https://acm.hdu.edu.cn',
    hasApi: false,
    hasRating: false,
    hasContests: true,
    urlPatterns: ['*://acm.hdu.edu.cn/*'],
    submissionUrlPattern: /\/viewcode\.php\?rid=(\d+)/,
    problemUrlPattern: /\/showproblem\.php\?pid=(\d+)/,
    statusUrlPattern: /\/status\.php/,
    profileUrlTemplate: 'https://acm.hdu.edu.cn/userstatus.php?user={handle}',
    color: '#004080',
    icon: 'hdu',
  },

  aizu: {
    id: 'aizu',
    name: 'Aizu Online Judge',
    shortName: 'AZ',
    baseUrl: 'https://judge.u-aizu.ac.jp',
    hasApi: true,
    apiUrl: 'https://judgeapi.u-aizu.ac.jp',
    hasRating: false,
    hasContests: true,
    urlPatterns: ['*://judge.u-aizu.ac.jp/*', '*://onlinejudge.u-aizu.ac.jp/*'],
    submissionUrlPattern: /\/onlinejudge\/review\.jsp\?rid=(\d+)/,
    problemUrlPattern: /\/onlinejudge\/description\.jsp\?id=([A-Z0-9_]+)/,
    statusUrlPattern: /\/onlinejudge\/status_list\.jsp/,
    profileUrlTemplate:
      'https://judge.u-aizu.ac.jp/onlinejudge/user.jsp?id={handle}',
    color: '#006633',
    icon: 'aizu',
  },

  yosupo: {
    id: 'yosupo',
    name: 'Library Checker',
    shortName: 'YS',
    baseUrl: 'https://judge.yosupo.jp',
    hasApi: true,
    hasRating: false,
    hasContests: false,
    urlPatterns: ['*://judge.yosupo.jp/*'],
    submissionUrlPattern: /\/submission\/(\d+)/,
    problemUrlPattern: /\/problem\/([a-z_]+)/,
    statusUrlPattern: /\/submissions/,
    profileUrlTemplate: 'https://judge.yosupo.jp/user/{handle}',
    color: '#ff6b6b',
    icon: 'yosupo',
  },

  cfgym: {
    id: 'cfgym',
    name: 'Codeforces Gym',
    shortName: 'CG',
    baseUrl: 'https://codeforces.com/gym',
    hasApi: true,
    apiUrl: 'https://codeforces.com/api',
    hasRating: false,
    hasContests: true,
    urlPatterns: ['*://codeforces.com/gym/*'],
    submissionUrlPattern: /\/gym\/(\d+)\/submission\/(\d+)/,
    problemUrlPattern: /\/gym\/(\d+)\/problem\/([A-Za-z0-9]+)/,
    statusUrlPattern: /\/gym\/\d+\/status/,
    profileUrlTemplate: 'https://codeforces.com/profile/{handle}',
    color: '#1890ff',
    icon: 'codeforces',
  },
};

// ============================================================
// SUPPORTED PLATFORMS LIST
// ============================================================

/**
 * List of platform IDs that are fully supported for syncing
 */
export const SUPPORTED_PLATFORMS = [
  'codeforces',
  'atcoder',
  'leetcode',
  'toph',
  'cses',
  'codechef',
  'hackerrank',
  'kattis',
  'spoj',
  'uva',
  'lightoj',
  'vjudge',
  'dmoj',
  'topcoder',
  'beecrowd',
  'loj',
  'timus',
  'bapsoj',
  'hackerearth',
  'codewars',
  'exercism',
  'leetcodecn',
  'luogu',
  'acwing',
  'poj',
  'hdu',
  'aizu',
  'yosupo',
  'cfgym',
];

/**
 * Platforms that support bulk import via API
 */
export const BULK_IMPORT_PLATFORMS = [
  'codeforces',
  'atcoder',
  'leetcode',
  'vjudge',
  'dmoj',
  'codewars',
  'aizu',
  'cfgym',
];

// ============================================================
// DATA STRUCTURES
// ============================================================

/**
 * Standard submission data structure
 * All platform extractors should return data in this format
 */
export const SubmissionSchema = {
  // Required fields
  platform: '', // Platform ID (e.g., 'codeforces')
  problemId: '', // Problem identifier on platform
  submissionId: '', // Unique submission ID on platform
  verdict: '', // Normalized verdict (AC, WA, TLE, etc.)

  // Optional but recommended fields
  problemName: '', // Problem title
  problemUrl: '', // Direct URL to problem
  submissionUrl: '', // Direct URL to submission
  language: '', // Programming language used
  sourceCode: '', // Full source code
  executionTime: null, // Time in milliseconds
  memoryUsed: null, // Memory in KB
  submittedAt: '', // ISO 8601 timestamp

  // Additional metadata
  contestId: '', // Contest identifier if applicable
  difficultyRating: null, // Numeric difficulty (e.g., 800-3500)
  tags: [], // Problem tags/topics
  problemDescription: '', // Problem statement (optional)
  handle: '', // User handle on platform
};

/**
 * Standard problem data structure
 */
export const ProblemSchema = {
  platform: '',
  problemId: '',
  problemName: '',
  problemUrl: '',
  problemDescription: '',
  contestId: '',
  difficultyRating: null,
  tags: [],
  timeLimit: null, // in milliseconds
  memoryLimit: null, // in KB
};

// ============================================================
// VERDICTS
// ============================================================

/**
 * Standardized verdict codes
 */
export const VERDICTS = {
  AC: 'AC', // Accepted
  WA: 'WA', // Wrong Answer
  TLE: 'TLE', // Time Limit Exceeded
  MLE: 'MLE', // Memory Limit Exceeded
  RE: 'RE', // Runtime Error
  CE: 'CE', // Compilation Error
  PE: 'PE', // Presentation Error
  OLE: 'OLE', // Output Limit Exceeded
  ILE: 'ILE', // Idleness Limit Exceeded
  PC: 'PC', // Partially Correct
  PENDING: 'PENDING', // In queue/judging
  UNKNOWN: 'UNKNOWN', // Unknown verdict
};

/**
 * Verdict aliases for normalization
 */
export const VERDICT_ALIASES = {
  // Accepted variants
  ACCEPTED: 'AC',
  OK: 'AC',
  CORRECT: 'AC',
  SOLVED: 'AC',
  PASSED: 'AC',
  100: 'AC',
  SUCCESS: 'AC',

  // Wrong Answer variants
  WRONG_ANSWER: 'WA',
  'WRONG ANSWER': 'WA',
  INCORRECT: 'WA',
  FAILED: 'WA',

  // Time Limit variants
  TIME_LIMIT_EXCEEDED: 'TLE',
  'TIME LIMIT EXCEEDED': 'TLE',
  TIME_LIMIT: 'TLE',
  TIMEOUT: 'TLE',
  TIMELIMIT: 'TLE',

  // Memory Limit variants
  MEMORY_LIMIT_EXCEEDED: 'MLE',
  'MEMORY LIMIT EXCEEDED': 'MLE',
  MEMORY_LIMIT: 'MLE',
  OUT_OF_MEMORY: 'MLE',

  // Runtime Error variants
  RUNTIME_ERROR: 'RE',
  'RUNTIME ERROR': 'RE',
  RTE: 'RE',
  ERROR: 'RE',
  NZEC: 'RE',
  SIGSEGV: 'RE',
  SIGFPE: 'RE',
  SIGABRT: 'RE',

  // Compilation Error variants
  COMPILATION_ERROR: 'CE',
  'COMPILATION ERROR': 'CE',
  COMPILE_ERROR: 'CE',
  COMPILER_ERROR: 'CE',

  // Presentation Error variants
  PRESENTATION_ERROR: 'PE',
  'PRESENTATION ERROR': 'PE',
  FORMAT_ERROR: 'PE',

  // Output Limit variants
  OUTPUT_LIMIT: 'OLE',
  OUTPUT_LIMIT_EXCEEDED: 'OLE',

  // Idleness variants
  IDLENESS_LIMIT: 'ILE',
  IDLENESS_LIMIT_EXCEEDED: 'ILE',

  // Partial variants
  PARTIAL: 'PC',
  PARTIALLY_CORRECT: 'PC',
  PARTIALLY_ACCEPTED: 'PC',

  // Pending variants
  IN_QUEUE: 'PENDING',
  PENDING: 'PENDING',
  WAITING: 'PENDING',
  RUNNING: 'PENDING',
  TESTING: 'PENDING',
  JUDGING: 'PENDING',

  // Other
  SKIPPED: 'UNKNOWN',
  REJECTED: 'UNKNOWN',
  SECURITY_VIOLATION: 'UNKNOWN',
  CHALLENGED: 'WA',
  HACKED: 'WA',
};

// ============================================================
// LANGUAGES
// ============================================================

/**
 * Language normalization map
 */
export const LANGUAGE_MAP = {
  'C++': [
    'C++',
    'CPP',
    'G++',
    'C++11',
    'C++14',
    'C++17',
    'C++20',
    'C++23',
    'GNU C++',
    'GNU C++11',
    'GNU C++14',
    'GNU C++17',
    'GNU C++20',
    'MS C++',
    'Clang++',
  ],
  C: ['C', 'GNU C', 'C11', 'C99', 'C17', 'Clang'],
  Java: ['Java', 'JAVA', 'Java 8', 'Java 11', 'Java 17', 'Java 21', 'OpenJDK'],
  Python: [
    'Python',
    'Python 2',
    'Python 3',
    'Python2',
    'Python3',
    'PyPy',
    'PyPy2',
    'PyPy3',
  ],
  JavaScript: ['JavaScript', 'JS', 'Node.js', 'NodeJS', 'Node'],
  TypeScript: ['TypeScript', 'TS'],
  'C#': ['C#', 'CSharp', 'C Sharp', 'Mono C#', '.NET', 'Mono'],
  Go: ['Go', 'Golang'],
  Rust: ['Rust'],
  Kotlin: ['Kotlin', 'Kotlin/JVM'],
  Swift: ['Swift'],
  Ruby: ['Ruby'],
  PHP: ['PHP'],
  Perl: ['Perl'],
  Haskell: ['Haskell', 'GHC'],
  Scala: ['Scala'],
  D: ['D', 'DMD'],
  OCaml: ['OCaml'],
  Pascal: ['Pascal', 'Delphi', 'Free Pascal', 'FPC'],
  'F#': ['F#', 'FSharp'],
  Lua: ['Lua'],
  R: ['R'],
  Julia: ['Julia'],
  Elixir: ['Elixir'],
  Erlang: ['Erlang'],
  Clojure: ['Clojure'],
  Scheme: ['Scheme', 'Racket'],
  Lisp: ['Lisp', 'Common Lisp'],
  Bash: ['Bash', 'Shell', 'sh'],
  SQL: ['SQL', 'MySQL', 'PostgreSQL'],
  Assembly: ['Assembly', 'x86', 'ARM', 'NASM'],
};

// ============================================================
// API CONFIGURATION
// ============================================================

export const API_CONFIG = {
  defaultApiUrl: 'http://localhost:3000',
  productionApiUrl: 'https://neupc.vercel.app',
  endpoints: {
    extensionSync: '/api/problem-solving/extension-sync',
    bulkImport: '/api/problem-solving/bulk-import',
    syncStatus: '/api/problem-solving/sync-status',
    existingSubmissions: '/api/problem-solving/existing-submissions',
    extensionToken: '/api/problem-solving/extension-token',
    connectHandle: '/api/problem-solving/connect-handle',
  },
  requestTimeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  rateLimitDelay: 1000, // 1 second between submissions
  batchSize: 10, // Max submissions per batch
};

// ============================================================
// STORAGE KEYS
// ============================================================

export const STORAGE_KEYS = {
  // Authentication
  EXTENSION_TOKEN: 'extensionToken',
  API_URL: 'apiUrl',
  USER_DATA: 'userData',

  // Settings
  SETTINGS: 'settings',
  AUTO_SYNC: 'autoSync',
  SYNC_ENABLED: 'syncEnabled',
  CAPTURE_SOURCE_CODE: 'captureSourceCode',
  SHOW_NOTIFICATIONS: 'showNotifications',

  // Connected handles
  CONNECTED_HANDLES: 'connectedHandles',

  // Sync state
  LAST_SYNC: 'lastSync',
  SYNC_STATS: 'syncStats',
  SYNC_QUEUE: 'syncQueue',

  // Cache
  CACHED_SUBMISSIONS: 'cachedSubmissions',
  PROBLEMS_CACHE: 'problemsCache',
};

// ============================================================
// DEFAULT SETTINGS
// ============================================================

export const DEFAULT_SETTINGS = {
  apiUrl: API_CONFIG.defaultApiUrl,
  autoSync: true,
  syncEnabled: true,
  captureSourceCode: true,
  showNotifications: true,
  syncInterval: 300000, // 5 minutes
  batchSize: 10,
  retryAttempts: 3,
  darkMode: true,
  compactView: false,
};
