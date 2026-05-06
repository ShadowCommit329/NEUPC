const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
const daysAgoDate = (d) => new Date(now - d * 86400000).toISOString().split('T')[0];

const PROBLEMS = [
  { name: 'Two Sum', difficulty: 'Easy', tags: ['hash-map', 'array'] },
  { name: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', tags: ['sliding-window', 'string'] },
  { name: 'Median of Two Sorted Arrays', difficulty: 'Hard', tags: ['binary-search', 'divide-conquer'] },
  { name: 'Merge K Sorted Lists', difficulty: 'Hard', tags: ['heap', 'linked-list'] },
  { name: 'Climbing Stairs', difficulty: 'Easy', tags: ['dp'] },
  { name: 'Coin Change', difficulty: 'Medium', tags: ['dp', 'bfs'] },
  { name: 'Word Ladder', difficulty: 'Hard', tags: ['bfs', 'string'] },
  { name: 'Number of Islands', difficulty: 'Medium', tags: ['dfs', 'bfs', 'union-find'] },
  { name: 'LRU Cache', difficulty: 'Medium', tags: ['hash-map', 'linked-list', 'design'] },
  { name: 'Trapping Rain Water', difficulty: 'Hard', tags: ['two-pointer', 'stack', 'dp'] },
  { name: 'Valid Parentheses', difficulty: 'Easy', tags: ['stack', 'string'] },
  { name: 'Maximum Subarray', difficulty: 'Medium', tags: ['dp', 'divide-conquer'] },
  { name: 'Binary Tree Level Order Traversal', difficulty: 'Medium', tags: ['bfs', 'tree'] },
  { name: 'Course Schedule', difficulty: 'Medium', tags: ['dfs', 'topological-sort', 'graph'] },
  { name: 'Edit Distance', difficulty: 'Hard', tags: ['dp', 'string'] },
  { name: 'Find Median from Data Stream', difficulty: 'Hard', tags: ['heap', 'design'] },
  { name: 'Jump Game II', difficulty: 'Medium', tags: ['greedy', 'dp'] },
  { name: 'Reverse Linked List', difficulty: 'Easy', tags: ['linked-list', 'recursion'] },
  { name: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', tags: ['tree', 'design', 'dfs'] },
  { name: 'Longest Palindromic Subsequence', difficulty: 'Medium', tags: ['dp', 'string'] },
];

const CF_PROBLEMS = [
  { name: 'Polycarp and Coins', difficulty: 'Easy', tags: ['math', 'greedy'] },
  { name: 'Tokitsukaze and Strange Inequality', difficulty: 'Hard', tags: ['dp', 'combinatorics'] },
  { name: 'Grid Path', difficulty: 'Medium', tags: ['dp', 'graphs'] },
  { name: 'Vasya and String', difficulty: 'Medium', tags: ['string', 'two-pointer'] },
  { name: 'Segment Coloring', difficulty: 'Easy', tags: ['constructive', 'greedy'] },
  { name: 'XOR Triangle', difficulty: 'Hard', tags: ['bitmask', 'dp'] },
  { name: 'Increasing Sequence', difficulty: 'Easy', tags: ['greedy', 'math'] },
  { name: 'Tree Requests', difficulty: 'Hard', tags: ['dfs', 'tree', 'offline'] },
  { name: 'Minimum Spanning Tree', difficulty: 'Medium', tags: ['graphs', 'dsu'] },
  { name: 'Palindrome Partition', difficulty: 'Hard', tags: ['dp', 'string', 'palindrome'] },
];

const AC_PROBLEMS = [
  { name: 'Traveling Salesman Problem', difficulty: 'Hard', tags: ['bitmask-dp', 'graph'] },
  { name: 'Grid 1', difficulty: 'Easy', tags: ['dp', 'grid'] },
  { name: 'Longest Path', difficulty: 'Medium', tags: ['dp', 'dag'] },
  { name: 'Knapsack 1', difficulty: 'Medium', tags: ['dp', 'knapsack'] },
  { name: 'Independent Set', difficulty: 'Hard', tags: ['tree-dp', 'tree'] },
];

const PLATFORMS = ['leetcode', 'codeforces', 'atcoder'];

const platformProblems = {
  leetcode: PROBLEMS,
  codeforces: CF_PROBLEMS,
  atcoder: AC_PROBLEMS,
};

function makeSub(i) {
  const platform = PLATFORMS[i % 3];
  const pool = platformProblems[platform];
  const prob = pool[i % pool.length];
  const isAC = i % 7 !== 0;
  return {
    id: `sub-${i}`,
    platform,
    problem_id: `${platform}-prob-${i}`,
    problem_name: prob.name,
    verdict: isAC ? 'AC' : ['WA', 'TLE', 'MLE', 'RE'][i % 4],
    difficulty: prob.difficulty,
    tags: prob.tags,
    submitted_at: daysAgo(Math.floor(i * 0.4)),
  };
}

export const dummyData = {
  statistics: {
    total_solved: 1247,
    total_submissions: 3412,
    weighted_score: 9320.5,
    current_streak: 42,
    longest_streak: 67,
    easy_solved: 412,
    medium_solved: 618,
    hard_solved: 187,
    expert_solved: 30,
    accepted_rate: 76.4,
  },

  handles: [
    { platform: 'leetcode', handle: 'shadowcoder', rating: 2187, connected: true },
    { platform: 'codeforces', handle: 'shadow_cf', rating: 1963, connected: true },
    { platform: 'atcoder', handle: 'shadow_ac', rating: 1810, connected: true },
    { platform: 'codechef', handle: 'shadow_cc', rating: 1650, connected: true },
  ],

  allSubmissions: Array.from({ length: 80 }, (_, i) => makeSub(i)),

  dailyActivity: Array.from({ length: 365 }, (_, i) => {
    const base = i < 42 ? Math.floor(Math.random() * 6) + 1 : Math.floor(Math.random() * 5);
    return {
      activity_date: daysAgoDate(i),
      problems_solved: i % 11 === 0 ? 0 : base,
    };
  }),

  ratingHistory: [
    ...Array.from({ length: 20 }, (_, i) => ({
      platform: 'codeforces',
      rating: 1600 + i * 18 + (i % 3 === 0 ? -25 : 0),
      date: now - (20 - i) * 14 * 86400000,
      contest: `Codeforces Round ${800 + i}`,
    })),
    ...Array.from({ length: 15 }, (_, i) => ({
      platform: 'leetcode',
      rating: 1750 + i * 29 + (i % 4 === 0 ? -40 : 0),
      date: now - (15 - i) * 14 * 86400000,
      contest: `Weekly Contest ${350 + i}`,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      platform: 'atcoder',
      rating: 1600 + i * 21 + (i % 3 === 0 ? -15 : 0),
      date: now - (10 - i) * 21 * 86400000,
      contest: `AtCoder Regular Contest ${150 + i}`,
    })),
  ],

  contestHistory: [
    { id: 'c-0', platform: 'codeforces', contest_name: 'Codeforces Round 819 (Div. 1)', rating_change: +47, new_rating: 1963, rank: 312, total_participants: 8420, date: daysAgo(3) },
    { id: 'c-1', platform: 'leetcode', contest_name: 'Weekly Contest 398', rating_change: +29, new_rating: 2187, rank: 88, total_participants: 24100, date: daysAgo(7) },
    { id: 'c-2', platform: 'atcoder', contest_name: 'AtCoder Regular Contest 158', rating_change: +18, new_rating: 1810, rank: 254, total_participants: 5600, date: daysAgo(14) },
    { id: 'c-3', platform: 'codeforces', contest_name: 'Codeforces Round 817 (Div. 1)', rating_change: -22, new_rating: 1916, rank: 891, total_participants: 7980, date: daysAgo(17) },
    { id: 'c-4', platform: 'leetcode', contest_name: 'Biweekly Contest 129', rating_change: +55, new_rating: 2158, rank: 44, total_participants: 19800, date: daysAgo(21) },
    { id: 'c-5', platform: 'codeforces', contest_name: 'Educational Codeforces Round 163', rating_change: +38, new_rating: 1938, rank: 420, total_participants: 11200, date: daysAgo(28) },
    { id: 'c-6', platform: 'atcoder', contest_name: 'AtCoder Grand Contest 061', rating_change: -10, new_rating: 1792, rank: 378, total_participants: 4200, date: daysAgo(35) },
    { id: 'c-7', platform: 'leetcode', contest_name: 'Weekly Contest 396', rating_change: +22, new_rating: 2103, rank: 130, total_participants: 22700, date: daysAgo(42) },
    { id: 'c-8', platform: 'codechef', contest_name: 'CodeChef Starters 119', rating_change: +31, new_rating: 1650, rank: 201, total_participants: 6800, date: daysAgo(49) },
    { id: 'c-9', platform: 'codeforces', contest_name: 'Codeforces Round 815 (Div. 2)', rating_change: +64, new_rating: 1900, rank: 197, total_participants: 14300, date: daysAgo(56) },
  ],

  badges: [
    { id: 'b-1', name: '100 Day Streak', icon: '🔥', earned_at: daysAgo(5), rarity: 'epic' },
    { id: 'b-2', name: 'Hard Problem Slayer', icon: '⚔️', earned_at: daysAgo(12), rarity: 'rare' },
    { id: 'b-3', name: 'Contest Regular', icon: '🏆', earned_at: daysAgo(20), rarity: 'rare' },
    { id: 'b-4', name: 'Dynamic Programmer', icon: '🧠', earned_at: daysAgo(35), rarity: 'uncommon' },
    { id: 'b-5', name: 'Graph Master', icon: '🕸️', earned_at: daysAgo(60), rarity: 'uncommon' },
    { id: 'b-6', name: 'First Solve', icon: '⭐', earned_at: daysAgo(300), rarity: 'common' },
  ],
};
