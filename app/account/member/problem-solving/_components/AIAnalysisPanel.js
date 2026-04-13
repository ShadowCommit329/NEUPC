/**
 * @file AI Analysis Panel Component
 * @module AIAnalysisPanel
 *
 * Displays comprehensive AI analysis for a solution including:
 * - User's approach explanation
 * - Time/Space complexity
 * - Optimization suggestions
 * - Why failed (for non-AC)
 * - Personal notes (editable)
 * - Re-analyze option
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Brain,
  Clock,
  HardDrive,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Code2,
  BookOpen,
  Sparkles,
  Save,
  Edit3,
  X,
  AlertCircle,
  Zap,
  Target,
  ListChecks,
} from 'lucide-react';

/**
 * AIAnalysisPanel - Shows AI analysis for a submission
 *
 * @param {Object} props
 * @param {string} props.submissionId - The submission ID to analyze
 * @param {string} props.sourceCode - The source code to analyze
 * @param {string} props.language - Programming language
 * @param {string} props.verdict - Submission verdict (AC, WA, TLE, etc.)
 * @param {string} props.problemName - Name of the problem
 * @param {string} props.problemDescription - Problem description (optional)
 * @param {Object} props.existingAnalysis - Pre-loaded analysis data (optional)
 * @param {Function} props.onAnalysisComplete - Callback when analysis completes
 */
export default function AIAnalysisPanel({
  submissionId,
  sourceCode,
  language,
  verdict,
  problemName,
  problemDescription,
  existingAnalysis = null,
  onAnalysisComplete = null,
}) {
  const [analysis, setAnalysis] = useState(existingAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [personalNotes, setPersonalNotes] = useState(
    existingAnalysis?.personal_notes || ''
  );
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const isMountedRef = useRef(true);

  const isAccepted =
    verdict === 'AC' || verdict === 'OK' || verdict === 'Accepted';

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update analysis when existingAnalysis changes
  useEffect(() => {
    if (existingAnalysis) {
      setAnalysis(existingAnalysis);
      setPersonalNotes(existingAnalysis.personal_notes || '');
    }
  }, [existingAnalysis]);

  // Trigger AI analysis
  const handleAnalyze = useCallback(
    async (forceReanalyze = false) => {
      if (loading || !sourceCode) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/problem-solving/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId,
            sourceCode,
            language,
            verdict,
            problemName,
            problemDescription,
            analyzeType: 'solution',
            forceReanalyze,
          }),
        });

        if (!isMountedRef.current) return;

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Analysis failed');
        }

        if (data.success && data.results?.solution?.analysis) {
          const analysisData = data.results.solution.analysis;
          setAnalysis(analysisData);

          if (onAnalysisComplete) {
            onAnalysisComplete(analysisData);
          }
        } else if (data.results?.solution?.status === 'already_analyzed') {
          // Already analyzed, use existing data
          setAnalysis(data.results.solution.data);
        } else {
          throw new Error('No analysis data returned');
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('AI Analysis failed:', err);
        setError(err.message);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [
      submissionId,
      sourceCode,
      language,
      verdict,
      problemName,
      problemDescription,
      loading,
      onAnalysisComplete,
    ]
  );

  // Save personal notes
  const handleSaveNotes = useCallback(async () => {
    if (savingNotes || !submissionId) return;

    setSavingNotes(true);

    try {
      const res = await fetch('/api/problem-solving/ai-analyze/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          personalNotes,
        }),
      });

      if (!isMountedRef.current) return;

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save notes');
      }

      setEditingNotes(false);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to save notes:', err);
      setError(err.message);
    } finally {
      if (isMountedRef.current) {
        setSavingNotes(false);
      }
    }
  }, [submissionId, personalNotes, savingNotes]);

  // Check if analysis exists and is complete
  const hasAnalysis =
    analysis &&
    (analysis.ai_analysis_status === 'completed' ||
      analysis.userApproach ||
      analysis.ai_user_approach);

  // Extract analysis data (handle both API response and DB format)
  const userApproach = analysis?.userApproach || analysis?.ai_user_approach;
  const timeComplexity =
    analysis?.timeComplexity || analysis?.ai_time_complexity;
  const spaceComplexity =
    analysis?.spaceComplexity || analysis?.ai_space_complexity;
  const optimizationTips =
    analysis?.optimizationTips || analysis?.ai_optimization_tips || [];
  const edgeCases = analysis?.edgeCases || analysis?.ai_edge_cases || [];
  const commonMistakes =
    analysis?.commonMistakes || analysis?.ai_common_mistakes || [];
  const codeQuality = analysis?.codeQuality || analysis?.ai_code_quality || {};
  const whyFailed = analysis?.whyFailed || analysis?.ai_why_failed;
  const alternativeApproaches =
    analysis?.alternativeApproaches ||
    analysis?.ai_alternative_approaches ||
    [];

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-gray-800/50">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/20 p-2">
            <Brain className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Analysis</h3>
            <p className="text-xs text-gray-400">
              {hasAnalysis
                ? 'Analysis complete'
                : loading
                  ? 'Analyzing...'
                  : 'Click to analyze'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Analyze / Re-analyze button */}
          {!loading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAnalyze(hasAnalysis);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                hasAnalysis
                  ? 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                  : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              }`}
              title={hasAnalysis ? 'Re-analyze' : 'Analyze with AI'}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{hasAnalysis ? 'Re-analyze' : 'Analyze'}</span>
            </button>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-purple-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Analyzing...</span>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="space-y-4 p-4">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  Analysis Failed
                </p>
                <p className="mt-1 text-xs text-red-300/70">{error}</p>
              </div>
            </div>
          )}

          {/* No Analysis Yet */}
          {!hasAnalysis && !loading && !error && (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto mb-3 h-12 w-12 text-purple-400/50" />
              <p className="mb-4 text-sm text-gray-400">
                Get AI-powered insights about your solution
              </p>
              <button
                onClick={() => handleAnalyze(false)}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500/30"
              >
                <Brain className="h-4 w-4" />
                Analyze Solution
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {hasAnalysis && (
            <div className="space-y-4">
              {/* Why Failed (for non-AC) */}
              {!isAccepted && whyFailed && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-red-400">
                        Why This Solution Failed ({verdict})
                      </h4>
                      <p className="text-sm leading-relaxed text-gray-300">
                        {whyFailed}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Verdict badge for AC */}
              {isAccepted && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium text-green-400">
                    Accepted Solution
                  </span>
                </div>
              )}

              {/* User's Approach */}
              {userApproach && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <Code2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
                    <div className="flex-1">
                      <h4 className="mb-1 text-sm font-semibold text-white">
                        Your Approach:{' '}
                        <span className="text-blue-400">
                          {userApproach.name || 'Analysis'}
                        </span>
                      </h4>
                      <p className="mb-2 text-sm leading-relaxed text-gray-300">
                        {userApproach.explanation}
                      </p>
                      {userApproach.whyItWorks && (
                        <p className="text-xs text-gray-400 italic">
                          {userApproach.whyItWorks}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Complexity Analysis */}
              <div className="grid grid-cols-2 gap-3">
                {timeComplexity && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-gray-400">
                        Time Complexity
                      </span>
                    </div>
                    <p className="font-mono text-sm font-semibold text-white">
                      {timeComplexity}
                    </p>
                  </div>
                )}
                {spaceComplexity && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs text-gray-400">
                        Space Complexity
                      </span>
                    </div>
                    <p className="font-mono text-sm font-semibold text-white">
                      {spaceComplexity}
                    </p>
                  </div>
                )}
              </div>

              {/* Code Quality */}
              {codeQuality &&
                (codeQuality.readability || codeQuality.efficiency) && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-indigo-400" />
                      <h4 className="text-sm font-semibold text-white">
                        Code Quality
                      </h4>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {codeQuality.readability && (
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            codeQuality.readability === 'good'
                              ? 'bg-green-500/20 text-green-400'
                              : codeQuality.readability === 'average'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          Readability: {codeQuality.readability}
                        </span>
                      )}
                      {codeQuality.efficiency && (
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            codeQuality.efficiency === 'optimal'
                              ? 'bg-green-500/20 text-green-400'
                              : codeQuality.efficiency === 'suboptimal'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          Efficiency: {codeQuality.efficiency}
                        </span>
                      )}
                    </div>
                    {codeQuality.suggestions?.length > 0 && (
                      <ul className="space-y-1">
                        {codeQuality.suggestions.map((suggestion, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs text-gray-400"
                          >
                            <span className="mt-0.5 text-indigo-400">-</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

              {/* Optimization Tips */}
              {optimizationTips?.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Optimization Tips
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {optimizationTips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-300"
                      >
                        <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Edge Cases */}
              {edgeCases?.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Edge Cases to Consider
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {edgeCases.map((edge, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-300"
                      >
                        <span className="text-orange-400">-</span>
                        {edge}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Mistakes */}
              {commonMistakes?.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-rose-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Common Mistakes to Avoid
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {commonMistakes.map((mistake, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-300"
                      >
                        <span className="text-rose-400">-</span>
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alternative Approaches */}
              {alternativeApproaches?.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-teal-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Alternative Approaches
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {alternativeApproaches.map((approach, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-teal-400">
                            {approach.name}
                          </span>
                          <div className="flex gap-2 text-xs">
                            {approach.timeComplexity && (
                              <span className="text-gray-400">
                                Time: {approach.timeComplexity}
                              </span>
                            )}
                            {approach.spaceComplexity && (
                              <span className="text-gray-400">
                                Space: {approach.spaceComplexity}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          {approach.explanation}
                        </p>
                        {approach.tradeoffs && (
                          <p className="mt-1 text-xs text-gray-500 italic">
                            {approach.tradeoffs}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Notes */}
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-violet-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Personal Notes
                    </h4>
                  </div>
                  {!editingNotes && (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="text-xs text-gray-400 transition-colors hover:text-white"
                    >
                      {personalNotes ? 'Edit' : 'Add notes'}
                    </button>
                  )}
                </div>

                {editingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={personalNotes}
                      onChange={(e) => setPersonalNotes(e.target.value)}
                      placeholder="Add your personal notes, learnings, or reminders about this solution..."
                      className="h-24 w-full resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-violet-500/50 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingNotes(false);
                          setPersonalNotes(
                            existingAnalysis?.personal_notes || ''
                          );
                        }}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/[0.06]"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs text-violet-400 transition-colors hover:bg-violet-500/30 disabled:opacity-50"
                      >
                        {savingNotes ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                ) : personalNotes ? (
                  <p className="text-sm whitespace-pre-wrap text-gray-300">
                    {personalNotes}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No personal notes yet. Click &quot;Add notes&quot; to add
                    your thoughts.
                  </p>
                )}
              </div>

              {/* Analysis metadata */}
              {analysis?.analyzedAt && (
                <p className="text-center text-xs text-gray-500">
                  Analyzed {new Date(analysis.analyzedAt).toLocaleDateString()}{' '}
                  at {new Date(analysis.analyzedAt).toLocaleTimeString()}
                  {analysis.analyzedBy && ` by ${analysis.analyzedBy}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
