/**
 * NEUPC Bulk History Collector
 * Add this to background.js for collecting submission history in bulk
 */

// Add this to your background.js
function normalizeCollectorVerdict(verdict) {
  if (!verdict) return 'UNKNOWN';

  const upper = String(verdict)
    .toUpperCase()
    .replace(/[_\s]+/g, '_');
  const verdictMap = {
    OK: 'AC',
    ACCEPTED: 'AC',
    WRONG_ANSWER: 'WA',
    TIME_LIMIT_EXCEEDED: 'TLE',
    MEMORY_LIMIT_EXCEEDED: 'MLE',
    RUNTIME_ERROR: 'RE',
    COMPILATION_ERROR: 'CE',
    IDLENESS_LIMIT_EXCEEDED: 'ILE',
    TESTING: 'PENDING',
    PARTIAL: 'PC',
  };

  return verdictMap[upper] || upper;
}

async function collectSubmissionHistory(platform, userHandle, maxPages = 50) {
  console.log(`[NEUPC] Starting bulk collection for ${platform}:${userHandle}`);

  const collectionStrategies = {
    codeforces: async () => {
      // Use Codeforces API - fetch all submissions (100000 is more than enough for any user)
      try {
        const response = await fetch(
          `https://codeforces.com/api/user.status?handle=${userHandle}&from=1&count=100000`
        );
        const data = await response.json();

        if (data.status !== 'OK') {
          throw new Error(data.comment || 'API error');
        }

        const submissions = data.result.map((sub) => ({
          platform: 'codeforces',
          handle: sub.author?.members?.[0]?.handle || userHandle,
          problemId: `${sub.problem.contestId}${sub.problem.index}`,
          problemName: sub.problem.name,
          problemUrl: `https://codeforces.com/contest/${sub.problem.contestId}/problem/${sub.problem.index}`,
          submissionId: sub.id.toString(),
          submissionUrl: `https://codeforces.com/contest/${sub.problem.contestId}/submission/${sub.id}`,
          verdict: normalizeCollectorVerdict(sub.verdict),
          language: sub.programmingLanguage,
          executionTime: sub.timeConsumedMillis,
          memoryUsed: Math.floor((sub.memoryConsumedBytes || 0) / 1024),
          submittedAt: new Date(sub.creationTimeSeconds * 1000).toISOString(),
          sourceCode: null,
        }));

        return submissions;
      } catch (error) {
        console.error('[NEUPC] Codeforces API error:', error);
        return [];
      }
    },

    atcoder: async () => {
      try {
        const encodedHandle = encodeURIComponent(
          String(userHandle || '').trim()
        );
        const submissions = [];
        const seenSubmissionIds = new Set();
        let fromSecond = 0;
        const pageSize = 500;
        const maxBatches = 400;

        for (let batchIndex = 0; batchIndex < maxBatches; batchIndex++) {
          const response = await fetch(
            `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodedHandle}&from_second=${fromSecond}`
          );

          if (!response.ok) {
            throw new Error(`AtCoder API HTTP ${response.status}`);
          }

          const batch = await response.json();
          if (!Array.isArray(batch) || batch.length === 0) {
            break;
          }

          for (const sub of batch) {
            if (!sub || sub.id == null) continue;
            const submissionId = String(sub.id);
            if (seenSubmissionIds.has(submissionId)) continue;
            seenSubmissionIds.add(submissionId);
            submissions.push(sub);
          }

          const lastEpochSecond = Number(batch[batch.length - 1]?.epoch_second);
          if (!Number.isFinite(lastEpochSecond) || batch.length < pageSize) {
            break;
          }

          const nextFromSecond = Math.floor(lastEpochSecond) + 1;
          if (
            !Number.isFinite(nextFromSecond) ||
            nextFromSecond <= fromSecond
          ) {
            break;
          }

          fromSecond = nextFromSecond;
        }

        const allSubmissions = submissions.map((sub) => ({
          platform: 'atcoder',
          handle: userHandle,
          problemId: sub.problem_id,
          problemName: sub.problem_id, // API doesn't provide full name
          problemUrl: `https://atcoder.jp/contests/${sub.contest_id}/tasks/${sub.problem_id}`,
          submissionId: sub.id.toString(),
          submissionUrl: `https://atcoder.jp/contests/${sub.contest_id}/submissions/${sub.id}`,
          verdict: normalizeCollectorVerdict(sub.result),
          language: sub.language,
          executionTime: sub.execution_time,
          memoryUsed: Math.floor((sub.memory || 0) / 1024),
          submittedAt: new Date(sub.epoch_second * 1000).toISOString(),
          sourceCode: null,
        }));

        return allSubmissions;
      } catch (error) {
        console.error('[NEUPC] AtCoder API error:', error);
        return [];
      }
    },

    leetcode: async () => {
      // LeetCode requires GraphQL API
      try {
        const query = `
          query getAcSubmissions($username: String!, $limit: Int, $offset: Int) {
            recentAcSubmissionList(username: $username, limit: $limit, offset: $offset) {
              id
              title
              titleSlug
              timestamp
              statusDisplay
              lang
              runtime
              memory
              url
            }
          }
        `;

        const allSubmissions = [];
        let offset = 0;
        const limit = 100;

        while (offset < 50000) {
          // Max 50000 submissions
          const response = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: { username: userHandle, limit, offset },
            }),
          });

          const data = await response.json();
          const submissions = data.data.recentAcSubmissionList || [];

          if (submissions.length === 0) break;

          allSubmissions.push(
            ...submissions.map((sub) => ({
              platform: 'leetcode',
              handle: userHandle,
              problemId: sub.titleSlug,
              problemName: sub.title,
              problemUrl: `https://leetcode.com/problems/${sub.titleSlug}/`,
              submissionId: sub.id,
              submissionUrl: `https://leetcode.com/submissions/detail/${sub.id}/`,
              verdict: 'AC',
              language: sub.lang,
              executionTime: parseInt(sub.runtime) || null,
              memoryUsed: parseFloat(sub.memory) * 1024 || null, // Convert MB to KB
              submittedAt: new Date(
                parseInt(sub.timestamp) * 1000
              ).toISOString(),
              sourceCode: null,
            }))
          );

          offset += limit;
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limiting
        }

        return allSubmissions;
      } catch (error) {
        console.error('[NEUPC] LeetCode API error:', error);
        return [];
      }
    },
  };

  const strategy = collectionStrategies[platform];
  if (!strategy) {
    throw new Error(`No collection strategy for platform: ${platform}`);
  }

  return await strategy();
}

// Add message handler for bulk collection
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collectBulkHistory') {
    collectSubmissionHistory(request.platform, request.handle)
      .then((submissions) => {
        console.log(
          `[NEUPC] Collected ${submissions.length} submissions from ${request.platform}`
        );
        sendResponse({ success: true, submissions, count: submissions.length });
      })
      .catch((error) => {
        console.error('[NEUPC] Bulk collection error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});
