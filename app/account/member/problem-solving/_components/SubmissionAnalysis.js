'use client';

import { useState } from 'react';
import {
  CodeBracketIcon,
  CpuChipIcon,
  LightBulbIcon,
  ClockIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SparklesIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

/**
 * SubmissionAnalysis Component
 *
 * Displays comprehensive AI analysis of a code submission including:
 * - Algorithms & techniques used
 * - Code quality metrics
 * - Time/space complexity
 * - Learning points
 * - Improvement suggestions
 *
 * NOTE: Does NOT auto-analyze. Only analyzes when user clicks the button.
 * Shows cached analysis if available from database.
 */
export default function SubmissionAnalysis({
  solutionId,
  sourceCode,
  language,
  problemDescription,
  problemTags,
  verdict,
  existingAnalysis, // Pre-loaded analysis from API (cached in database)
  onAnalysisComplete,
}) {
  const [analysis, setAnalysis] = useState(existingAnalysis || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(!!existingAnalysis);

  // Check if existing analysis has meaningful data
  const hasAnalysis =
    analysis &&
    ((analysis.code_patterns &&
      Object.keys(analysis.code_patterns).length > 0) ||
      analysis.techniques_used?.length > 0 ||
      analysis.algorithms_detected?.length > 0 ||
      analysis.quality_score);

  // NO auto-fetch - only analyze when user clicks the button

  const fetchAnalysis = async (forceReanalyze = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/problem-solving/analyze-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution_id: solutionId,
          source_code: sourceCode,
          language: language,
          problem_description: problemDescription,
          problem_tags: problemTags,
          verdict: verdict,
          force_reanalyze: forceReanalyze,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.details ||
            `Failed to analyze submission (${response.status})`
        );
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setCached(data.cached);

      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }
    } catch (err) {
      console.error('Error analyzing submission:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    fetchAnalysis(false);
  };

  const handleReanalyze = () => {
    fetchAnalysis(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="bg-primary-800 border-primary-700 rounded-xl border p-6">
        <div className="flex items-center gap-3">
          <div className="border-primary-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          <div>
            <p className="text-primary-50 font-medium">
              Analyzing submission...
            </p>
            <p className="text-primary-400 text-sm">
              This may take a few seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-700 bg-red-900/30 p-6">
        <div className="flex items-center gap-2 text-red-300">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>Error: {error}</span>
        </div>
        <button
          onClick={() => fetchAnalysis(true)}
          className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!hasAnalysis) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 text-center">
        <SparklesIcon className="mx-auto h-12 w-12 text-purple-500" />
        <h3 className="mt-4 text-lg font-semibold text-gray-100">
          AI Code Analysis
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          Get detailed insights: algorithms, techniques, complexity, and
          improvement suggestions
        </p>
        <button
          onClick={handleAnalyze}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          <SparklesIcon className="h-4 w-4" />
          Analyze This Submission
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BeakerIcon className="text-primary-500 h-6 w-6" />
          <h2 className="text-primary-50 text-xl font-bold">Code Analysis</h2>
          {cached && (
            <span className="rounded-md border border-blue-700 bg-blue-900/30 px-2 py-1 text-xs text-blue-300">
              Cached
            </span>
          )}
        </div>
        <button
          onClick={handleReanalyze}
          disabled={loading}
          className="bg-primary-700 text-primary-200 hover:bg-primary-600 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Re-analyze
        </button>
      </div>

      {/* Quality Score & Signature */}
      <div className="grid grid-cols-2 gap-4">
        <QualityScoreCard score={analysis.quality_score} />
        <SignatureCard
          signature={analysis.solution_signature}
          difficultyMatch={analysis.difficulty_match}
        />
      </div>

      {/* Complexity */}
      <ComplexityCard
        timeComplexity={analysis.estimated_time_complexity}
        spaceComplexity={analysis.estimated_space_complexity}
      />

      {/* Techniques & Algorithms */}
      <TechniquesCard
        techniques={analysis.techniques_used}
        algorithms={analysis.algorithms_detected}
        dataStructures={analysis.data_structures_used}
      />

      {/* Code Style */}
      <CodeStyleCard style={analysis.code_style} />

      {/* Key Insights */}
      {analysis.key_insights?.length > 0 && (
        <InsightsCard insights={analysis.key_insights} />
      )}

      {/* Learning Points */}
      {analysis.learning_points?.length > 0 && (
        <LearningPointsCard points={analysis.learning_points} />
      )}

      {/* Improvement Suggestions */}
      {analysis.improvement_suggestions?.length > 0 && (
        <ImprovementsCard suggestions={analysis.improvement_suggestions} />
      )}

      {/* Verdict Analysis (for non-AC) */}
      {analysis.verdict_analysis?.likely_cause && (
        <VerdictAnalysisCard analysis={analysis.verdict_analysis} />
      )}

      {/* Code Metrics */}
      <MetricsCard metrics={analysis.code_metrics} />
    </div>
  );
}

/**
 * Quality Score Card
 */
function QualityScoreCard({ score }) {
  const getScoreColor = (s) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-blue-400';
    if (s >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (s) => {
    if (s >= 90) return 'Excellent';
    if (s >= 80) return 'Very Good';
    if (s >= 70) return 'Good';
    if (s >= 60) return 'Decent';
    if (s >= 40) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 flex items-center gap-2 text-sm">
        <ChartBarIcon className="h-4 w-4" />
        Quality Score
      </div>
      <div className={`mt-2 text-4xl font-bold ${getScoreColor(score)}`}>
        {score}
        <span className="text-primary-500 text-lg">/100</span>
      </div>
      <div className="text-primary-300 mt-1 text-sm">
        {getScoreLabel(score)}
      </div>
    </div>
  );
}

/**
 * Solution Signature Card
 */
function SignatureCard({ signature, difficultyMatch }) {
  const matchColors = {
    appropriate: 'bg-green-900/30 text-green-300 border-green-700',
    under_engineered: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
    over_engineered: 'bg-blue-900/30 text-blue-300 border-blue-700',
  };

  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 flex items-center gap-2 text-sm">
        <CpuChipIcon className="h-4 w-4" />
        Solution Approach
      </div>
      <div className="text-primary-50 mt-2 text-lg font-semibold">
        {signature
          ?.replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown'}
      </div>
      {difficultyMatch && (
        <span
          className={`mt-2 inline-block rounded-md border px-2 py-1 text-xs ${matchColors[difficultyMatch] || matchColors.appropriate}`}
        >
          {difficultyMatch.replace('_', ' ').toUpperCase()}
        </span>
      )}
    </div>
  );
}

/**
 * Complexity Card
 */
function ComplexityCard({ timeComplexity, spaceComplexity }) {
  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 mb-3 flex items-center gap-2 text-sm">
        <ClockIcon className="h-4 w-4" />
        Complexity Analysis
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-primary-400 text-xs">Time Complexity</div>
          <div className="font-mono text-lg font-semibold text-green-400">
            {timeComplexity || 'Unknown'}
          </div>
        </div>
        <div>
          <div className="text-primary-400 text-xs">Space Complexity</div>
          <div className="font-mono text-lg font-semibold text-blue-400">
            {spaceComplexity || 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Techniques Card
 */
function TechniquesCard({ techniques, algorithms, dataStructures }) {
  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 mb-3 flex items-center gap-2 text-sm">
        <CodeBracketIcon className="h-4 w-4" />
        Detected Techniques & Algorithms
      </div>

      {techniques?.length > 0 && (
        <div className="mb-3">
          <div className="text-primary-500 mb-2 text-xs">Techniques</div>
          <div className="flex flex-wrap gap-2">
            {techniques.map((t, i) => (
              <span
                key={i}
                className="rounded-md border border-purple-700 bg-purple-900/30 px-2 py-1 text-xs text-purple-300"
              >
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {algorithms?.length > 0 && (
        <div className="mb-3">
          <div className="text-primary-500 mb-2 text-xs">Algorithms</div>
          <div className="flex flex-wrap gap-2">
            {algorithms.map((a, i) => (
              <span
                key={i}
                className="rounded-md border border-blue-700 bg-blue-900/30 px-2 py-1 text-xs text-blue-300"
              >
                {a.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {dataStructures?.length > 0 && (
        <div>
          <div className="text-primary-500 mb-2 text-xs">Data Structures</div>
          <div className="flex flex-wrap gap-2">
            {dataStructures.map((d, i) => (
              <span
                key={i}
                className="rounded-md border border-green-700 bg-green-900/30 px-2 py-1 text-xs text-green-300"
              >
                {d.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {!techniques?.length &&
        !algorithms?.length &&
        !dataStructures?.length && (
          <p className="text-primary-400 text-sm">
            No specific techniques detected
          </p>
        )}
    </div>
  );
}

/**
 * Code Style Card
 */
function CodeStyleCard({ style }) {
  if (!style || Object.keys(style).length === 0) return null;

  const metrics = [
    { key: 'readability', label: 'Readability' },
    { key: 'efficiency', label: 'Efficiency' },
    { key: 'maintainability', label: 'Maintainability' },
    { key: 'idiomaticity', label: 'Idiomaticity' },
    { key: 'naming_quality', label: 'Naming' },
    { key: 'structure_quality', label: 'Structure' },
  ];

  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 mb-3 flex items-center gap-2 text-sm">
        <SparklesIcon className="h-4 w-4" />
        Code Style Assessment
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ key, label }) => {
          const value = style[key];
          if (value === undefined) return null;
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-primary-300 text-sm">{label}</span>
              <div className="flex items-center gap-2">
                <div className="bg-primary-700 h-2 w-20 rounded-full">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ width: `${(value / 10) * 100}%` }}
                  />
                </div>
                <span className="text-primary-200 font-mono text-sm">
                  {value}/10
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Key Insights Card
 */
function InsightsCard({ insights }) {
  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 mb-3 flex items-center gap-2 text-sm">
        <LightBulbIcon className="h-4 w-4" />
        Key Insights
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li
            key={i}
            className="text-primary-200 flex items-start gap-2 text-sm"
          >
            <span className="text-yellow-400">💡</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Learning Points Card
 */
function LearningPointsCard({ points }) {
  const importanceColors = {
    high: 'border-red-600 bg-red-900/20',
    medium: 'border-yellow-600 bg-yellow-900/20',
    low: 'border-green-600 bg-green-900/20',
  };

  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 mb-3 flex items-center gap-2 text-sm">
        <AcademicCapIcon className="h-4 w-4" />
        Learning Points
      </div>
      <div className="space-y-3">
        {points.map((point, i) => (
          <div
            key={i}
            className={`rounded-lg border-l-4 p-3 ${importanceColors[point.importance] || importanceColors.medium}`}
          >
            <div className="text-primary-50 font-medium">{point.concept}</div>
            <div className="text-primary-300 text-sm">{point.application}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Improvements Card
 */
function ImprovementsCard({ suggestions }) {
  const typeIcons = {
    performance: '⚡',
    readability: '📖',
    safety: '🛡️',
    style: '✨',
  };

  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 mb-3 flex items-center gap-2 text-sm">
        <ExclamationTriangleIcon className="h-4 w-4" />
        Improvement Suggestions
      </div>
      <div className="space-y-3">
        {suggestions.map((suggestion, i) => (
          <div key={i} className="bg-primary-900 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span>{typeIcons[suggestion.type] || '💡'}</span>
              <span className="text-primary-500 text-xs uppercase">
                {suggestion.type}
              </span>
              <span
                className={`ml-auto rounded px-2 py-0.5 text-xs ${
                  suggestion.impact === 'high'
                    ? 'bg-red-900/50 text-red-300'
                    : suggestion.impact === 'moderate'
                      ? 'bg-yellow-900/50 text-yellow-300'
                      : 'bg-green-900/50 text-green-300'
                }`}
              >
                {suggestion.impact} impact
              </span>
            </div>
            <p className="text-primary-200 mt-2 text-sm">
              {suggestion.suggestion}
            </p>
            {suggestion.line_numbers?.length > 0 && (
              <p className="text-primary-500 mt-1 text-xs">
                Lines: {suggestion.line_numbers.join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Verdict Analysis Card (for non-AC submissions)
 */
function VerdictAnalysisCard({ analysis }) {
  return (
    <div className="rounded-xl border border-red-700 bg-red-900/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-red-300">
        <ExclamationTriangleIcon className="h-4 w-4" />
        Why It Failed: {analysis.verdict}
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs text-red-400">Likely Cause</div>
          <p className="text-sm text-red-200">{analysis.likely_cause}</p>
        </div>

        {analysis.fix_suggestion && (
          <div>
            <div className="text-xs text-green-400">Suggested Fix</div>
            <p className="text-sm text-green-200">{analysis.fix_suggestion}</p>
          </div>
        )}

        {analysis.problematic_lines?.length > 0 && (
          <div>
            <div className="text-primary-400 text-xs">Problematic Lines</div>
            <p className="text-primary-300 text-sm">
              Lines: {analysis.problematic_lines.join(', ')}
            </p>
          </div>
        )}

        {analysis.test_case_hint && (
          <div>
            <div className="text-xs text-yellow-400">Test Case Hint</div>
            <p className="text-sm text-yellow-200">{analysis.test_case_hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Code Metrics Card
 */
function MetricsCard({ metrics }) {
  if (!metrics || Object.keys(metrics).length === 0) return null;

  return (
    <div className="bg-primary-800 border-primary-700 rounded-xl border p-4">
      <div className="text-primary-400 mb-3 flex items-center gap-2 text-sm">
        <ChartBarIcon className="h-4 w-4" />
        Code Metrics
      </div>
      <div className="grid grid-cols-3 gap-4">
        {metrics.lines_of_code !== undefined && (
          <MetricItem label="Lines of Code" value={metrics.lines_of_code} />
        )}
        {metrics.cyclomatic_complexity !== undefined && (
          <MetricItem
            label="Complexity"
            value={metrics.cyclomatic_complexity}
          />
        )}
        {metrics.nesting_depth !== undefined && (
          <MetricItem label="Max Nesting" value={metrics.nesting_depth} />
        )}
        {metrics.function_count !== undefined && (
          <MetricItem label="Functions" value={metrics.function_count} />
        )}
        {metrics.variable_count !== undefined && (
          <MetricItem label="Variables" value={metrics.variable_count} />
        )}
        {metrics.comment_ratio !== undefined && (
          <MetricItem
            label="Comment %"
            value={`${Math.round(metrics.comment_ratio * 100)}%`}
          />
        )}
      </div>
    </div>
  );
}

function MetricItem({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-primary-50 text-2xl font-bold">{value}</div>
      <div className="text-primary-400 text-xs">{label}</div>
    </div>
  );
}
