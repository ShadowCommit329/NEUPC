/**
 * @file Platform Categories Configuration
 * @description Categorization of competitive programming platforms
 */

export const PLATFORM_CATEGORIES = {
  popular: {
    label: 'Popular',
    icon: '🌟',
    platforms: [
      'codeforces',
      'atcoder',
      'leetcode',
      'codechef',
      'topcoder',
      'hackerrank',
    ],
  },
  global: {
    label: 'Global Contests',
    icon: '🌍',
    platforms: [
      'googlecodejam',
      'facebookhackercup',
      'topcoder',
      'hackerearth',
    ],
  },
  regional: {
    label: 'Regional',
    icon: '🗺️',
    platforms: [
      'luogu',
      'nowcoder',
      'codedrills',
      'yandex',
      'nerc',
      'tlx',
      'yukicoder',
      'acmp',
      'timus',
      'hsin',
    ],
  },
  classic: {
    label: 'Classic & Educational',
    icon: '🏆',
    platforms: [
      'ioi',
      'algotester',
      'cphof',
      'opencup',
      'robocontest',
      'ucup',
      'acmu',
      'usaco',
    ],
  },
  practice: {
    label: 'Practice Platforms',
    icon: '📚',
    platforms: [
      'spoj',
      'uva',
      'toph',
      'cses',
      'kattis',
      'lightoj',
      'vjudge',
      'cfgym',
      'eolymp',
      'dmoj',
      'csacademy',
      'geeksforgeeks',
      'codingame',
      'beecrowd',
    ],
  },
};

/**
 * Get category for a platform ID
 */
export function getCategoryForPlatform(platformId) {
  for (const [categoryId, category] of Object.entries(PLATFORM_CATEGORIES)) {
    if (category.platforms.includes(platformId)) {
      return { id: categoryId, ...category };
    }
  }
  return null;
}

/**
 * Get all platform IDs in display order
 */
export function getAllPlatformIds() {
  const ids = new Set();
  Object.values(PLATFORM_CATEGORIES).forEach((category) => {
    category.platforms.forEach((id) => ids.add(id));
  });
  return Array.from(ids);
}
