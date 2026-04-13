'use client';

/**
 * Client Component: Problem Solving Data Extraction Interface
 */

import { useState } from 'react';

const PLATFORMS = [
  'codeforces',
  'atcoder',
  'leetcode',
  'toph',
  'cses',
  'codechef',
  'topcoder',
  'hackerrank',
  'kattis',
  'lightoj',
  'uva',
  'spoj',
  'vjudge',
  'cfgym',
  'csacademy',
  'eolymp',
  'usaco',
];

export default function ExtractionClient() {
  const [extractionType, setExtractionType] = useState('all');
  const [userId, setUserId] = useState('');
  const [platform, setPlatform] = useState('codeforces');
  const [leaderboardType, setLeaderboardType] = useState('overall');
  const [minSolved, setMinSolved] = useState(0);
  const [limit, setLimit] = useState(100);
  const [format, setFormat] = useState('json');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let url;
      let params = new URLSearchParams();

      switch (extractionType) {
        case 'user':
          if (!userId.trim()) {
            throw new Error('User ID is required');
          }
          url = `/api/problem-solving/extract/user/${userId}`;
          break;

        case 'all':
          url = '/api/problem-solving/extract/all';
          if (minSolved > 0) params.append('minSolved', minSolved);
          if (limit > 0) params.append('limit', limit);
          if (includeInactive) params.append('includeInactive', 'true');
          params.append('format', format);
          break;

        case 'platform':
          url = `/api/problem-solving/extract/platform/${platform}`;
          break;

        case 'leaderboard':
          url = '/api/problem-solving/extract/leaderboard';
          params.append('type', leaderboardType);
          params.append('limit', limit);
          params.append('format', format);
          break;
      }

      const finalUrl = params.toString() ? `${url}?${params}` : url;
      const response = await fetch(finalUrl);

      if (format === 'csv') {
        // Download CSV
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `extraction-${extractionType}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        setResult({ message: 'CSV downloaded successfully' });
      } else {
        // Display JSON
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Extraction failed');
        }

        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!result) return;

    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-${extractionType}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Extraction Type Selection */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Extraction Type</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <button
            onClick={() => setExtractionType('all')}
            className={`rounded-lg border-2 p-4 transition ${
              extractionType === 'all'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">All Users</div>
            <div className="text-sm text-gray-600">
              Extract data for all users
            </div>
          </button>

          <button
            onClick={() => setExtractionType('user')}
            className={`rounded-lg border-2 p-4 transition ${
              extractionType === 'user'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Single User</div>
            <div className="text-sm text-gray-600">
              Extract specific user data
            </div>
          </button>

          <button
            onClick={() => setExtractionType('platform')}
            className={`rounded-lg border-2 p-4 transition ${
              extractionType === 'platform'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Platform</div>
            <div className="text-sm text-gray-600">
              Extract platform-specific data
            </div>
          </button>

          <button
            onClick={() => setExtractionType('leaderboard')}
            className={`rounded-lg border-2 p-4 transition ${
              extractionType === 'leaderboard'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Leaderboard</div>
            <div className="text-sm text-gray-600">
              Extract leaderboard data
            </div>
          </button>
        </div>
      </div>

      {/* Configuration Options */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Configuration</h2>
        <div className="space-y-4">
          {extractionType === 'user' && (
            <div>
              <label className="mb-2 block text-sm font-medium">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {extractionType === 'platform' && (
            <div>
              <label className="mb-2 block text-sm font-medium">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {extractionType === 'leaderboard' && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Leaderboard Type
              </label>
              <select
                value={leaderboardType}
                onChange={(e) => setLeaderboardType(e.target.value)}
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="overall">Overall (All-Time)</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          {(extractionType === 'all' || extractionType === 'leaderboard') && (
            <div>
              <label className="mb-2 block text-sm font-medium">Limit</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
                placeholder="Number of results (0 = no limit)"
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {extractionType === 'all' && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Minimum Solved
                </label>
                <input
                  type="number"
                  value={minSolved}
                  onChange={(e) => setMinSolved(parseInt(e.target.value) || 0)}
                  placeholder="Minimum problems solved"
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm font-medium">
                  Include inactive users
                </label>
              </div>
            </>
          )}

          {(extractionType === 'all' || extractionType === 'leaderboard') && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Export Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="json"
                    checked={format === 'json'}
                    onChange={(e) => setFormat(e.target.value)}
                    className="mr-2"
                  />
                  JSON
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={(e) => setFormat(e.target.value)}
                    className="mr-2"
                  />
                  CSV
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Extract Button */}
      <div>
        <button
          onClick={handleExtract}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? 'Extracting...' : 'Extract Data'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="font-semibold text-red-800">Error</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Result Display */}
      {result && format === 'json' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Results</h2>
            <button
              onClick={downloadJSON}
              className="rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
            >
              Download JSON
            </button>
          </div>

          {/* Summary */}
          {result.success && (
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {result.total_users !== undefined && (
                  <div>
                    <div className="text-sm text-gray-600">Total Users</div>
                    <div className="text-2xl font-bold">
                      {result.total_users}
                    </div>
                  </div>
                )}
                {result.total_entries !== undefined && (
                  <div>
                    <div className="text-sm text-gray-600">Total Entries</div>
                    <div className="text-2xl font-bold">
                      {result.total_entries}
                    </div>
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600">Errors</div>
                    <div className="text-2xl font-bold text-red-600">
                      {result.errors.length}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-600">Extracted At</div>
                  <div className="text-sm font-medium">
                    {new Date(result.extracted_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* JSON Preview */}
          <div className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}

      {result && format === 'csv' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="font-semibold text-green-800">Success</div>
          <div className="text-green-600">{result.message}</div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="mb-2 font-semibold text-blue-800">
          Supported Platforms (17)
        </div>
        <div className="text-sm text-blue-600">
          Codeforces, AtCoder, LeetCode, Toph, CSES, CodeChef, TopCoder,
          HackerRank, Kattis, LightOJ, UVA, SPOJ, VJudge, CF Gym, CS Academy,
          E-Olymp, USACO
        </div>
      </div>
    </div>
  );
}
