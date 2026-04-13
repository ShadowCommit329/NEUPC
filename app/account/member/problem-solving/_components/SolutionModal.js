/**
 * @file Solution Modal Component
 * @module SolutionModal
 *
 * Modal for viewing existing solutions or uploading new ones.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Code,
  Upload,
  FileText,
  Save,
  Loader2,
  ExternalLink,
  Download,
  Check,
} from 'lucide-react';
import CodeViewer from './CodeViewer';

const LANGUAGES = [
  'cpp',
  'c',
  'java',
  'python',
  'javascript',
  'typescript',
  'go',
  'rust',
  'kotlin',
  'swift',
  'ruby',
  'php',
  'csharp',
];

const DIFFICULTY_TIERS = ['easy', 'medium', 'hard', 'expert'];

const getPlatformLabel = (platform) => {
  if (typeof platform === 'string') return platform;
  if (platform && typeof platform === 'object') {
    return platform.name || platform.code || 'Unknown';
  }
  return 'Unknown';
};

function ViewMode({ problem, solution }) {
  const getSolutionCode = (item) =>
    item?.source_code ||
    item?.sourceCode ||
    item?.code ||
    item?.submission?.source_code ||
    item?.submissions?.source_code ||
    null;

  const fallbackSolution = Array.isArray(problem?.problem_solutions)
    ? problem.problem_solutions.find((item) => {
        const code = getSolutionCode(item);
        return typeof code === 'string' && code.trim().length > 0;
      }) ||
      problem.problem_solutions.find((item) => item?.is_primary) ||
      problem.problem_solutions[0]
    : null;

  const resolvedSolution = solution || fallbackSolution;
  const platformLabel = getPlatformLabel(problem?.platform);
  const solutionCode = getSolutionCode(resolvedSolution);
  const solutionLanguage =
    resolvedSolution?.language ||
    resolvedSolution?.languages?.code ||
    resolvedSolution?.languages?.name ||
    null;
  const uploadedAt = resolvedSolution?.created_at
    ? new Date(resolvedSolution.created_at).toLocaleString()
    : null;
  const updatedAt = resolvedSolution?.updated_at
    ? new Date(resolvedSolution.updated_at).toLocaleString()
    : null;

  return (
    <div className="space-y-4">
      {/* Problem Info */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-lg font-semibold text-white">
          {problem.problem_name}
        </h3>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="capitalize">{platformLabel}</span>
          {problem.difficulty_tier && (
            <span className="capitalize">{problem.difficulty_tier}</span>
          )}
          {problem.difficulty_rating && (
            <span>Rating: {problem.difficulty_rating}</span>
          )}
        </div>
        {problem.problem_url && (
          <a
            href={problem.problem_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Problem
          </a>
        )}
      </div>

      {/* Solution Details */}
      {resolvedSolution && (
        <div className="space-y-3">
          {/* Solution Type Badge */}
          <div className="flex items-center gap-2">
            {resolvedSolution.solution_type === 'auto_fetched' ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                <Check className="h-3 w-3" />
                Auto-Fetched
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
                <Upload className="h-3 w-3" />
                Manual Upload
              </div>
            )}
            {resolvedSolution.created_at && (
              <span className="text-xs text-gray-500">
                {new Date(resolvedSolution.created_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Metadata */}
          <div className="grid gap-3 sm:grid-cols-2">
            {solutionLanguage && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-500">Language</p>
                <p className="mt-1 text-sm font-medium text-white capitalize">
                  {solutionLanguage}
                </p>
              </div>
            )}
            {resolvedSolution.time_complexity && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-500">Time Complexity</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {resolvedSolution.time_complexity}
                </p>
              </div>
            )}
            {resolvedSolution.space_complexity && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-500">Space Complexity</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {resolvedSolution.space_complexity}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {(resolvedSolution.notes || resolvedSolution.personal_notes) && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="mb-2 text-xs font-medium text-gray-400">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-gray-300">
                {resolvedSolution.notes || resolvedSolution.personal_notes}
              </p>
            </div>
          )}

          {/* Source Code with Syntax Highlighting */}
          {solutionCode && (
            <CodeViewer
              code={solutionCode}
              language={solutionLanguage}
              title={problem.problem_name || problem.problem_id}
              maxHeight="400px"
            />
          )}

          {!solutionCode && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
              Source code is not available for this solution record.
            </div>
          )}

          {/* Uploaded File */}
          {resolvedSolution.file_url && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {resolvedSolution.file_name}
                    </p>
                    {resolvedSolution.file_size && (
                      <p className="text-xs text-gray-500">
                        {(resolvedSolution.file_size / 1024).toFixed(2)} KB
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href={resolvedSolution.file_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:border-blue-500/30 hover:bg-blue-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {uploadedAt && <span>Uploaded: {uploadedAt}</span>}
            {updatedAt &&
              resolvedSolution.updated_at !== resolvedSolution.created_at && (
                <span>Updated: {updatedAt}</span>
              )}
          </div>
        </div>
      )}

      {!resolvedSolution && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
          Solution details are unavailable for this problem right now.
        </div>
      )}
    </div>
  );
}

function UploadMode({ problem, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sourceCode: '',
    language: 'cpp',
    difficultyTier: problem.difficulty_tier || 'medium',
    difficultyRating: problem.difficulty_rating || '',
    category: '',
    topics: '',
    timeComplexity: '',
    spaceComplexity: '',
    notes: '',
  });
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sourceCode && !file) {
      alert('Please provide source code or upload a file');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('problemId', problem.problem_id);
      data.append('platform', problem.platform);
      data.append('problemName', problem.problem_name || '');
      data.append('problemUrl', problem.problem_url || '');
      data.append('sourceCode', formData.sourceCode);
      data.append('language', formData.language);
      data.append('difficultyTier', formData.difficultyTier);
      data.append('difficultyRating', formData.difficultyRating);
      data.append('category', formData.category);
      data.append('topics', formData.topics);
      data.append('timeComplexity', formData.timeComplexity);
      data.append('spaceComplexity', formData.spaceComplexity);
      data.append('notes', formData.notes);
      if (file) data.append('file', file);

      const response = await fetch('/api/problem-solving/solutions', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) throw new Error('Failed to upload solution');

      const result = await response.json();
      onSuccess?.(result);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Problem Info */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="text-lg font-semibold text-white">
          {problem.problem_name}
        </h3>
        <p className="text-sm text-gray-400 capitalize">{problem.platform}</p>
      </div>

      {/* Source Code */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Source Code
        </label>
        <textarea
          value={formData.sourceCode}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, sourceCode: e.target.value }))
          }
          rows={12}
          placeholder="Paste your solution code here..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder-gray-500 focus:border-white/20 focus:ring-2 focus:ring-white/10 focus:outline-none"
        />
      </div>

      {/* Language */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Language
          </label>
          <select
            value={formData.language}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, language: e.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/20 focus:ring-2 focus:ring-white/10 focus:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Difficulty
          </label>
          <select
            value={formData.difficultyTier}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                difficultyTier: e.target.value,
              }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/20 focus:ring-2 focus:ring-white/10 focus:outline-none"
          >
            {DIFFICULTY_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Complexity */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Time Complexity
          </label>
          <input
            type="text"
            value={formData.timeComplexity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                timeComplexity: e.target.value,
              }))
            }
            placeholder="e.g., O(n log n)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:ring-2 focus:ring-white/10 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Space Complexity
          </label>
          <input
            type="text"
            value={formData.spaceComplexity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                spaceComplexity: e.target.value,
              }))
            }
            placeholder="e.g., O(n)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:ring-2 focus:ring-white/10 focus:outline-none"
          />
        </div>
      </div>

      {/* Topics */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Topics (comma-separated)
        </label>
        <input
          type="text"
          value={formData.topics}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, topics: e.target.value }))
          }
          placeholder="e.g., dynamic programming, graphs, binary search"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:ring-2 focus:ring-white/10 focus:outline-none"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Notes (optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          rows={3}
          placeholder="Add any notes about your solution approach..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:ring-2 focus:ring-white/10 focus:outline-none"
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Upload File (optional)
        </label>
        <div className="flex items-center gap-3">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-gray-400 transition-all hover:border-white/30 hover:bg-white/8">
            <Upload className="h-4 w-4" />
            {file ? file.name : 'Choose file'}
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".cpp,.c,.java,.py,.js,.ts,.go,.rs,.kt,.swift,.rb,.php,.cs,.txt"
            />
          </label>
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-all hover:border-red-500/30 hover:bg-red-500/20"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-400 transition-all hover:bg-white/8 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-all hover:border-green-500/30 hover:bg-green-500/20 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Solution
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function SolutionModal({ problem, mode, onClose }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <Code className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {mode === 'view' ? 'View Solution' : 'Upload Solution'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          {mode === 'view' ? (
            <ViewMode problem={problem} solution={problem.solution} />
          ) : (
            <UploadMode problem={problem} onClose={onClose} />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
