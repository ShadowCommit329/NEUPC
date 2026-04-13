'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  XMarkIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  StarIcon as StarOutline,
  DocumentTextIcon,
  SparklesIcon,
  LightBulbIcon,
  CpuChipIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  ClockIcon,
  PlusIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PaperAirplaneIcon,
  TagIcon,
  AcademicCapIcon,
  ChartBarIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import CodeViewer from './CodeViewer';

function normalizeTagString(tag) {
  if (!tag) return '';
  if (typeof tag === 'string') {
    return tag.trim().toLowerCase();
  }
  if (typeof tag === 'object') {
    const raw = tag.code || tag.name || '';
    return raw.toString().trim().toLowerCase();
  }
  return '';
}

function toTagCode(tag) {
  return normalizeTagString(tag)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizePlatformValue(platform) {
  if (typeof platform === 'string') {
    return platform.trim().toLowerCase();
  }

  if (platform && typeof platform === 'object') {
    const raw = platform.code || platform.name || '';
    return raw.toString().trim().toLowerCase();
  }

  return '';
}

function formatDatabaseFieldValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ProblemDetailModal({ problem, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('problem');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaved, setNotesSaved] = useState(true);
  const [similarProblems, setSimilarProblems] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [similarLoading, setSimilarLoading] = useState(false);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

  // Submissions state (timeline)
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsFetched, setSubmissionsFetched] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [submissionAnalyzing, setSubmissionAnalyzing] = useState(null);

  // Tags management state
  const [allTags, setAllTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [tagLoading, setTagLoading] = useState(false);
  const [updatedDescription, setUpdatedDescription] = useState(null);
  const [formattingDescription, setFormattingDescription] = useState(false);

  const isMountedRef = useRef(true);

  // Close on Escape key and disable background scroll
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    // Disable background scroll
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Cleanup effect
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getSolutionCode = useCallback(
    (item) =>
      item?.source_code ||
      item?.sourceCode ||
      item?.code ||
      item?.submission?.source_code ||
      item?.submissions?.source_code ||
      '',
    []
  );

  const getSolutionLanguage = useCallback(
    (item) =>
      item?.language || item?.languages?.code || item?.languages?.name || '',
    []
  );

  const problemSolutions = useMemo(
    () =>
      Array.isArray(problem.problem_solutions) ? problem.problem_solutions : [],
    [problem.problem_solutions]
  );
  const hasSolution = problemSolutions.length > 0;
  const normalizedPlatform = normalizePlatformValue(problem.platform);
  const platformLabel = normalizedPlatform
    ? normalizedPlatform.toUpperCase()
    : 'UNKNOWN';
  const solution =
    problemSolutions.find((item) => {
      const code = getSolutionCode(item);
      return typeof code === 'string' && code.trim().length > 0;
    }) ||
    problemSolutions.find((item) => item?.is_primary) ||
    problemSolutions[0] ||
    null;
  const solutionSourceCode = getSolutionCode(solution);

  const originalTagSet = useMemo(
    () => new Set((problem.tags || []).map((tag) => normalizeTagString(tag))),
    [problem.tags]
  );

  const submissionIdSet = useMemo(
    () =>
      new Set(
        allSubmissions
          .map((sub) => sub?.submission_id)
          .filter((id) => id !== null && id !== undefined)
          .map((id) => String(id))
      ),
    [allSubmissions]
  );

  const solutionBySubmissionId = useMemo(() => {
    const map = new Map();

    for (const sol of problemSolutions) {
      const submissionId = sol?.submission_id;
      if (submissionId === null || submissionId === undefined) {
        continue;
      }

      const key = String(submissionId);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, sol);
        continue;
      }

      const existingRank =
        (existing?.is_primary ? 1000 : 0) +
        (Number(existing?.version_number) || 0);
      const currentRank =
        (sol?.is_primary ? 1000 : 0) + (Number(sol?.version_number) || 0);

      if (currentRank > existingRank) {
        map.set(key, sol);
      }
    }

    return map;
  }, [problemSolutions]);

  const standaloneSolutions = useMemo(
    () =>
      problemSolutions.filter((sol) => {
        const submissionId = sol?.submission_id;
        if (submissionId === null || submissionId === undefined) {
          return true;
        }
        return !submissionIdSet.has(String(submissionId));
      }),
    [problemSolutions, submissionIdSet]
  );

  const databaseSections = useMemo(() => {
    const sections = [
      {
        id: 'problem-record',
        title: 'Problem Record',
        data: problem.db_problem_fields,
      },
      {
        id: 'user-solve-record',
        title: 'User Solve Record',
        data: problem.db_user_solve_fields,
      },
      {
        id: 'latest-unsolved-attempt',
        title: 'Latest Unsolved Attempt',
        data: problem.db_latest_unsolved_attempt,
      },
      {
        id: 'platform-record',
        title: 'Platform Relation',
        data: problem.db_platform_fields,
      },
      {
        id: 'difficulty-tier-record',
        title: 'Difficulty Tier Relation',
        data: problem.db_difficulty_tier_fields,
      },
      {
        id: 'solution-records',
        title: 'Solution Records',
        data: problem.db_solution_records,
      },
    ];

    const mappedSections = sections
      .map((section) => {
        if (!section.data || typeof section.data !== 'object') {
          return { ...section, entries: [] };
        }

        const entries = Object.entries(section.data).sort(([a], [b]) =>
          a.localeCompare(b)
        );

        return { ...section, entries };
      })
      .filter((section) => section.entries.length > 0);

    if (mappedSections.length > 0) {
      return mappedSections;
    }

    const fallbackEntries = Object.entries(problem || {})
      .filter(([, value]) => typeof value !== 'function')
      .sort(([a], [b]) => a.localeCompare(b));

    if (fallbackEntries.length === 0) {
      return [];
    }

    return [
      {
        id: 'problem-payload-fallback',
        title: 'Problem Payload (Fallback)',
        entries: fallbackEntries,
      },
    ];
  }, [problem]);

  const fetchFavoriteStatus = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const res = await fetch('/api/problem-solving/favorites');
      if (!isMountedRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (!isMountedRef.current) return;
        const isFav = data.favorites?.some(
          (f) =>
            f.problem_id === problem.problem_id &&
            f.platform === normalizedPlatform
        );
        setIsFavorite(isFav);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch favorites:', error);
    }
  }, [problem.problem_id, normalizedPlatform]);

  const fetchNotes = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const res = await fetch(
        `/api/problem-solving/notes?problem_id=${problem.problem_id}&platform=${normalizedPlatform}`
      );
      if (!isMountedRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (!isMountedRef.current) return;
        if (data.notes && data.notes.length > 0) {
          setNotes(data.notes[0].content);
        } else if (problem.notes) {
          setNotes(problem.notes);
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch notes:', error);
      if (problem.notes) {
        setNotes(problem.notes);
      }
    }
  }, [problem.problem_id, normalizedPlatform, problem.notes]);

  const fetchAllSubmissions = useCallback(async () => {
    if (!isMountedRef.current) return;
    setSubmissionsLoading(true);
    try {
      const params = new URLSearchParams({
        platform: normalizedPlatform,
      });
      if (problem.problem_name) params.set('problemName', problem.problem_name);
      if (problem.problem_id) params.set('problemId', problem.problem_id);

      const res = await fetch(`/api/problem-solving/submissions?${params}`);
      if (!isMountedRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (!isMountedRef.current) return;
        setAllSubmissions(data.data?.submissions || []);
      } else {
        if (!isMountedRef.current) return;
        setAllSubmissions([]);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch submissions:', error);
      setAllSubmissions([]);
    } finally {
      if (isMountedRef.current) {
        setSubmissionsLoading(false);
        setSubmissionsFetched(true);
      }
    }
  }, [problem.problem_name, problem.problem_id, normalizedPlatform]);

  const fetchTags = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const res = await fetch(
        `/api/problem-solving/tags?problemId=${problem.problem_id}&platform=${normalizedPlatform}`
      );
      if (!isMountedRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (!isMountedRef.current) return;
        const normalizedTags = [...(data.tags?.all || problem.tags || [])]
          .map((tag) => normalizeTagString(tag))
          .filter(Boolean);
        setAllTags([...new Set(normalizedTags)]);
      }
    } catch {
      if (!isMountedRef.current) return;
      const fallbackTags = [...(problem.tags || [])]
        .map((tag) => normalizeTagString(tag))
        .filter(Boolean);
      setAllTags([...new Set(fallbackTags)]);
    }
  }, [problem.problem_id, normalizedPlatform, problem.tags]);

  const addTag = async () => {
    const normalizedTag = normalizeTagString(newTag);
    const tagCode = toTagCode(normalizedTag);
    if (!normalizedTag || !tagCode || tagLoading || !isMountedRef.current) {
      return;
    }

    setTagLoading(true);
    try {
      const res = await fetch('/api/problem-solving/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.problem_id,
          platform: normalizedPlatform,
          tag: normalizedTag,
          tagCode,
        }),
      });

      if (!isMountedRef.current) return;
      if (res.ok) {
        setAllTags((prev) =>
          prev.includes(normalizedTag) ? prev : [...prev, normalizedTag]
        );
        setNewTag('');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to add tag:', error);
    } finally {
      if (isMountedRef.current) {
        setTagLoading(false);
      }
    }
  };

  const removeTag = async (tagToRemove) => {
    const tagCode = toTagCode(tagToRemove);
    if (!tagCode || !isMountedRef.current) return;

    setTagLoading(true);
    try {
      const res = await fetch(
        `/api/problem-solving/tags?problemId=${problem.problem_id}&platform=${normalizedPlatform}&tagCode=${encodeURIComponent(tagCode)}`,
        { method: 'DELETE' }
      );

      if (!isMountedRef.current) return;
      if (res.ok) {
        setAllTags((prev) => prev.filter((t) => t !== tagToRemove));
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to remove tag:', error);
    } finally {
      if (isMountedRef.current) {
        setTagLoading(false);
      }
    }
  };

  const formatDescription = async () => {
    if (
      !problem.problem_description ||
      formattingDescription ||
      !isMountedRef.current
    )
      return;

    setFormattingDescription(true);
    try {
      const res = await fetch('/api/problem-solving/format-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.problem_id,
          platform: normalizedPlatform,
          description: problem.problem_description,
        }),
      });

      if (!isMountedRef.current) return;

      if (res.ok) {
        const data = await res.json();
        if (!isMountedRef.current) return;
        setUpdatedDescription(data.formattedDescription);
      } else {
        console.error('Failed to format description:', res.status);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to format description:', error);
    } finally {
      if (isMountedRef.current) {
        setFormattingDescription(false);
      }
    }
  };

  const analyzeSubmission = async (submission) => {
    if (
      submissionAnalyzing === submission.submission_id ||
      !isMountedRef.current
    )
      return;

    setSubmissionAnalyzing(submission.submission_id);
    try {
      const res = await fetch('/api/problem-solving/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTextId: problem.problem_id,
          problemName: problem.problem_name,
          platform: normalizedPlatform,
          submissionId: submission.submission_id,
          sourceCode: getSolutionCode(submission),
          language: getSolutionLanguage(submission),
          verdict: submission.verdict,
          analyzeType: 'submission',
          forceReanalyze: true,
        }),
      });

      if (!isMountedRef.current) return;
      if (res.ok) {
        await fetchAllSubmissions();
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to analyze submission:', error);
    } finally {
      if (isMountedRef.current) {
        setSubmissionAnalyzing(null);
      }
    }
  };

  const fetchSimilarProblems = useCallback(async () => {
    if (!isMountedRef.current) return;
    setSimilarLoading(true);
    try {
      const res = await fetch(
        `/api/problem-solving/similar?problem_id=${problem.problem_id}&platform=${normalizedPlatform}`
      );
      if (!isMountedRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (!isMountedRef.current) return;
        setSimilarProblems(data.similar || []);
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch similar problems:', error);
    } finally {
      if (isMountedRef.current) {
        setSimilarLoading(false);
      }
    }
  }, [problem.problem_id, normalizedPlatform]);

  const fetchAIAnalysis = useCallback(
    async (forceReanalyze = false, promptOverride = null) => {
      if (aiLoading || !isMountedRef.current) return;

      const useCustomPrompt = promptOverride || customPrompt;

      if (
        !forceReanalyze &&
        !useCustomPrompt &&
        solution?.ai_analysis_status === 'completed'
      ) {
        if (!isMountedRef.current) return;
        setAiAnalysis({
          status: 'completed',
          source: 'cached',
          timeComplexity: solution.time_complexity,
          spaceComplexity: solution.space_complexity,
          keyConcepts: solution.topics || [],
          approachExplanation: solution.notes || solution.personal_notes,
        });
        return;
      }

      if (!hasSolution) {
        if (!isMountedRef.current) return;
        setAiError('No solution available for AI analysis');
        return;
      }

      setAiLoading(true);
      setAiError(null);

      try {
        const submissionsForAnalysis = allSubmissions
          .map((s) => {
            const sourceCode = getSolutionCode(s);
            if (!sourceCode) return null;

            return {
              submissionId: s.submission_id,
              sourceCode,
              language: getSolutionLanguage(s),
              verdict: s.verdict,
              submittedAt: s.submitted_at,
            };
          })
          .filter(Boolean);

        const res = await fetch('/api/problem-solving/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemTextId: problem.problem_id,
            problemName: problem.problem_name,
            problemDescription: problem.problem_description,
            problemUrl: problem.problem_url,
            platform: normalizedPlatform,
            existingTags: problem.tags || [],
            difficultyRating: problem.difficulty_rating,
            sourceCode: solutionSourceCode,
            language: getSolutionLanguage(solution),
            verdict: solution?.verdict || 'AC',
            submissionId: solution?.submission_id,
            allSubmissions: submissionsForAnalysis,
            forceReanalyze: forceReanalyze || !!useCustomPrompt,
            analyzeType:
              submissionsForAnalysis.length > 0 ? 'combined' : 'full',
            customPrompt: useCustomPrompt || null,
          }),
        });

        if (!isMountedRef.current) return;

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Analysis failed');
        }

        const data = await res.json();

        if (!isMountedRef.current) return;

        if (data.success) {
          const solutionAnalysis = data.results?.solution?.analysis;

          setAiAnalysis({
            status: 'completed',
            source: 'fresh',
            problemSummary:
              solutionAnalysis?.problemSummary || solutionAnalysis?.summary,
            userApproach: solutionAnalysis?.userApproach,
            timeComplexity: solutionAnalysis?.timeComplexity,
            spaceComplexity: solutionAnalysis?.spaceComplexity,
            alternativeApproaches:
              solutionAnalysis?.alternativeApproaches || [],
            keyConcepts: solutionAnalysis?.keyConcepts || [],
            optimizationTips: solutionAnalysis?.optimizationTips || [],
            edgeCases: solutionAnalysis?.edgeCases || [],
            commonMistakes: solutionAnalysis?.commonMistakes || [],
            codeQuality: solutionAnalysis?.codeQuality,
            whyFailed: solutionAnalysis?.whyFailed,
            approachExplanation: solutionAnalysis?.approachExplanation,
            learningJourney: solutionAnalysis?.learningJourney,
            failedAttemptsSummary: solutionAnalysis?.failedAttemptsSummary,
          });
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        setAiError(error.message || 'Analysis failed');
      } finally {
        if (isMountedRef.current) {
          setAiLoading(false);
        }
      }
    },
    [
      aiLoading,
      customPrompt,
      solution,
      hasSolution,
      allSubmissions,
      solutionSourceCode,
      getSolutionCode,
      getSolutionLanguage,
      problem.problem_id,
      problem.problem_name,
      problem.problem_description,
      problem.problem_url,
      normalizedPlatform,
      problem.tags,
      problem.difficulty_rating,
    ]
  );

  useEffect(() => {
    fetchFavoriteStatus();
    fetchNotes();
    fetchTags();
  }, [fetchFavoriteStatus, fetchNotes, fetchTags]);

  useEffect(() => {
    if (activeTab === 'similar' && similarProblems.length === 0) {
      fetchSimilarProblems();
    }
  }, [activeTab, similarProblems.length, fetchSimilarProblems]);

  useEffect(() => {
    if (
      activeTab === 'submissions' &&
      !submissionsFetched &&
      !submissionsLoading
    ) {
      fetchAllSubmissions();
    }
  }, [activeTab, submissionsFetched, submissionsLoading, fetchAllSubmissions]);

  useEffect(() => {
    if (activeTab === 'ai-analysis' && !aiAnalysis && !aiLoading && !aiError) {
      if (!submissionsFetched && !submissionsLoading) {
        fetchAllSubmissions().then(() => {
          fetchAIAnalysis();
        });
      } else {
        fetchAIAnalysis();
      }
    }
  }, [
    activeTab,
    aiAnalysis,
    aiLoading,
    aiError,
    submissionsFetched,
    submissionsLoading,
    fetchAllSubmissions,
    fetchAIAnalysis,
  ]);

  const toggleFavorite = async () => {
    if (!isMountedRef.current) return;
    setFavoriteLoading(true);
    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const res = await fetch('/api/problem-solving/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: problem.problem_id,
          platform: normalizedPlatform,
        }),
      });
      if (!isMountedRef.current) return;
      if (res.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to toggle favorite:', error);
    } finally {
      if (isMountedRef.current) {
        setFavoriteLoading(false);
      }
    }
  };

  const saveNotes = useCallback(async () => {
    if (notesSaved || !isMountedRef.current) return;
    setNotesLoading(true);
    try {
      if (notes.trim() === '') {
        await fetch('/api/problem-solving/notes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem_id: problem.problem_id,
            platform: normalizedPlatform,
          }),
        });
      } else {
        await fetch('/api/problem-solving/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem_id: problem.problem_id,
            platform: normalizedPlatform,
            content: notes,
          }),
        });
      }
      if (!isMountedRef.current) return;
      setNotesSaved(true);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to save notes:', error);
    } finally {
      if (isMountedRef.current) {
        setNotesLoading(false);
      }
    }
  }, [notes, notesSaved, problem.problem_id, normalizedPlatform]);

  useEffect(() => {
    if (notesSaved) return;
    const timer = setTimeout(saveNotes, 1000);
    return () => clearTimeout(timer);
  }, [notes, notesSaved, saveNotes]);

  const getDifficultyColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'easy':
        return 'text-green-400 bg-green-500/20';
      case 'medium':
        return 'text-amber-400 bg-amber-500/20';
      case 'hard':
        return 'text-orange-400 bg-orange-500/20';
      case 'expert':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPlatformColor = (platform) => {
    const colors = {
      codeforces: 'bg-blue-500/20 text-blue-400',
      atcoder: 'bg-emerald-500/20 text-emerald-400',
      leetcode: 'bg-amber-500/20 text-amber-400',
      vjudge: 'bg-purple-500/20 text-purple-400',
    };
    return (
      colors[normalizePlatformValue(platform)] || 'bg-gray-500/20 text-gray-400'
    );
  };

  const tabs = [
    { id: 'problem', label: 'Problem', icon: DocumentTextIcon },
    {
      id: 'submissions',
      label: 'Submissions',
      icon: ClockIcon,
      badge: allSubmissions.length > 0 || hasSolution,
    },
    {
      id: 'ai-analysis',
      label: 'AI Analysis',
      icon: SparklesIcon,
      badge: aiAnalysis?.status === 'completed',
    },
    { id: 'similar', label: 'Similar', icon: LightBulbIcon },
    { id: 'notes', label: 'Notes', icon: DocumentTextIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${getPlatformColor(problem.platform)}`}
            >
              {platformLabel}
            </span>
            {problem.difficulty_tier && (
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${getDifficultyColor(problem.difficulty_tier)}`}
              >
                {problem.difficulty_tier}
              </span>
            )}
            {problem.difficulty_rating && (
              <span className="text-sm text-gray-400">
                {problem.difficulty_rating}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white">
            {problem.problem_name || problem.problem_id}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {problem.problem_url && (
            <a
              href={problem.problem_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              title="Open in new tab"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </a>
          )}
          <button
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className={`rounded-lg p-2 transition-colors ${
              isFavorite
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-gray-400 hover:bg-gray-800 hover:text-amber-400'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favoriteLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            ) : isFavorite ? (
              <StarSolid className="h-5 w-5" />
            ) : (
              <StarOutline className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            title="Close (Esc)"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="w-72 overflow-y-auto border-r border-gray-800 bg-gray-900"
          style={{ flexShrink: 0 }}
        >
          <div className="space-y-6 p-6">
            {/* Quick Stats */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
                <ChartBarIcon className="h-4 w-4" />
                Statistics
              </h3>
              <div className="space-y-2">
                {problem.first_solved_at && (
                  <div className="rounded-lg bg-gray-800 p-3">
                    <div className="text-xs text-gray-500">First Solved</div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      {new Date(problem.first_solved_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {problem.solve_count != null && (
                  <div className="rounded-lg bg-gray-800 p-3">
                    <div className="text-xs text-gray-500">Times Solved</div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      {problem.solve_count}
                    </div>
                  </div>
                )}
                {problem.attempt_count != null && (
                  <div className="rounded-lg bg-gray-800 p-3">
                    <div className="text-xs text-gray-500">Attempts</div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      {problem.attempt_count}
                    </div>
                  </div>
                )}
                {problem.personal_rating != null && (
                  <div className="rounded-lg bg-gray-800 p-3">
                    <div className="text-xs text-gray-500">My Rating</div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      {problem.personal_rating} / 10
                    </div>
                  </div>
                )}
                {problem.best_time_ms != null && (
                  <div className="rounded-lg bg-gray-800 p-3">
                    <div className="text-xs text-gray-500">Best Time</div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      {problem.best_time_ms >= 1000
                        ? `${(problem.best_time_ms / 1000).toFixed(2)}s`
                        : `${problem.best_time_ms}ms`}
                    </div>
                  </div>
                )}
                {problem.best_memory_kb != null && (
                  <div className="rounded-lg bg-gray-800 p-3">
                    <div className="text-xs text-gray-500">Best Memory</div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      {problem.best_memory_kb >= 1024
                        ? `${Math.round(problem.best_memory_kb / 1024)}MB`
                        : `${problem.best_memory_kb}KB`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contest Info */}
            {problem.contest_id && (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-gray-400">
                  CONTEST
                </h3>
                <p className="text-sm text-gray-300">{problem.contest_id}</p>
              </div>
            )}

            {/* Time & Memory Limits */}
            {(problem.time_limit_ms || problem.memory_limit_kb) && (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-gray-400">
                  LIMITS
                </h3>
                <div className="space-y-1 text-sm text-gray-300">
                  {problem.time_limit_ms && (
                    <div>
                      Time:{' '}
                      {problem.time_limit_ms >= 1000
                        ? `${problem.time_limit_ms / 1000}s`
                        : `${problem.time_limit_ms}ms`}
                    </div>
                  )}
                  {problem.memory_limit_kb && (
                    <div>
                      Memory:{' '}
                      {problem.memory_limit_kb >= 1024
                        ? `${Math.round(problem.memory_limit_kb / 1024)}MB`
                        : `${problem.memory_limit_kb}KB`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
                <TagIcon className="h-4 w-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="group relative flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-300"
                  >
                    {tag}
                    {!originalTagSet.has(normalizeTagString(tag)) && (
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hidden rounded-full group-hover:inline-flex hover:text-red-400"
                      >
                        <XCircleIcon className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add tag..."
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={addTag}
                  disabled={!newTag.trim() || tagLoading}
                  className="rounded-lg bg-blue-500/20 p-1.5 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                >
                  {tagLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                  ) : (
                    <PlusIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden bg-gray-950">
          {/* Tab Bar */}
          <div className="sticky top-0 z-10 flex overflow-x-auto border-b border-gray-800 bg-gray-900">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-6 py-4 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge && (
                  <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Problem Tab */}
            {activeTab === 'problem' && (
              <div className="space-y-6 p-6">
                {/* Description */}
                {(problem.problem_description || problem.problem_notes) && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">
                        Description
                      </h3>
                      {problem.problem_description && !updatedDescription && (
                        <button
                          onClick={formatDescription}
                          disabled={formattingDescription}
                          className="flex items-center gap-2 rounded-lg bg-purple-500/20 px-3 py-1.5 text-sm text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
                          title="Format description using AI"
                        >
                          {formattingDescription ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                              Formatting...
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="h-4 w-4" />
                              Format with AI
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-300">
                        {updatedDescription ||
                          problem.problem_description ||
                          problem.problem_notes}
                      </p>
                      {updatedDescription && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-2">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          <span className="text-xs text-green-400">
                            ✓ Description formatted and saved to database
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Input Format */}
                {problem.input_format && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">
                      Input Format
                    </h3>
                    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                      <p className="text-sm whitespace-pre-wrap text-gray-300">
                        {problem.input_format}
                      </p>
                    </div>
                  </div>
                )}

                {/* Output Format */}
                {problem.output_format && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">
                      Output Format
                    </h3>
                    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                      <p className="text-sm whitespace-pre-wrap text-gray-300">
                        {problem.output_format}
                      </p>
                    </div>
                  </div>
                )}

                {/* Examples */}
                {problem.examples &&
                  Array.isArray(problem.examples) &&
                  problem.examples.length > 0 && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
                        <BeakerIcon className="h-4 w-4" />
                        Examples
                      </h3>
                      <div className="space-y-3">
                        {problem.examples.map((example, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
                          >
                            <div className="mb-3 text-xs font-semibold text-gray-400">
                              Example {idx + 1}
                            </div>
                            <div className="space-y-2">
                              <div>
                                <div className="mb-1 text-xs font-medium text-gray-500">
                                  Input:
                                </div>
                                <pre className="overflow-x-auto rounded bg-gray-900 p-2 text-xs text-green-400">
                                  {example.input}
                                </pre>
                              </div>
                              <div>
                                <div className="mb-1 text-xs font-medium text-gray-500">
                                  Output:
                                </div>
                                <pre className="overflow-x-auto rounded bg-gray-900 p-2 text-xs text-blue-400">
                                  {example.output}
                                </pre>
                              </div>
                              {example.explanation && (
                                <div>
                                  <div className="mb-1 text-xs font-medium text-gray-500">
                                    Explanation:
                                  </div>
                                  <p className="text-xs whitespace-pre-wrap text-gray-400">
                                    {example.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Constraints */}
                {problem.constraints && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-300">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Constraints
                    </h3>
                    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                      <p className="text-sm whitespace-pre-wrap text-gray-300">
                        {problem.constraints}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tutorial/Editorial */}
                {(problem.tutorial_url ||
                  problem.tutorial_content ||
                  problem.tutorial_solutions?.length > 0) && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
                      <AcademicCapIcon className="h-4 w-4" />
                      Editorial/Tutorial
                    </h3>
                    <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                      {problem.tutorial_url && (
                        <a
                          href={problem.tutorial_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                        >
                          Open Tutorial
                          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        </a>
                      )}
                      {problem.tutorial_content && (
                        <p className="text-sm whitespace-pre-wrap text-gray-300">
                          {problem.tutorial_content}
                        </p>
                      )}
                      {problem.tutorial_solutions?.length > 0 && (
                        <div className="border-t border-gray-700 pt-3">
                          <div className="mb-2 text-xs font-semibold text-gray-400">
                            Tutorial Solutions (
                            {problem.tutorial_solutions.length})
                          </div>
                          <div className="space-y-2">
                            {problem.tutorial_solutions.map((sol, idx) => (
                              <div
                                key={idx}
                                className="rounded bg-gray-900/50 p-2"
                              >
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-purple-400">
                                    {sol.approach_name || `Solution ${idx + 1}`}
                                  </span>
                                  {sol.language && (
                                    <span className="rounded bg-blue-500/20 px-2 py-0.5 text-blue-400">
                                      {String(sol.language).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                {sol.explanation && (
                                  <p className="mt-1 text-xs text-gray-400">
                                    {sol.explanation}
                                  </p>
                                )}
                                {sol.code && (
                                  <pre className="mt-2 overflow-x-auto rounded bg-gray-950 p-2 text-xs text-gray-300">
                                    {sol.code}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Database Information */}
                {databaseSections.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
                      <DocumentTextIcon className="h-4 w-4" />
                      Database Information
                    </h3>
                    <div className="space-y-3">
                      {databaseSections.map((section) => (
                        <div
                          key={section.id}
                          className="rounded-xl border border-cyan-500/20 bg-linear-to-br from-cyan-500/10 via-gray-900 to-transparent p-4"
                        >
                          <div className="mb-3 text-xs font-semibold tracking-wide text-cyan-200 uppercase">
                            {section.title}
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            {section.entries.map(([fieldName, fieldValue]) => (
                              <div
                                key={`${section.id}-${fieldName}`}
                                className="rounded-lg border border-gray-700 bg-gray-900/80 p-2"
                              >
                                <div className="mb-1 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                                  {fieldName}
                                </div>
                                <pre className="max-h-32 overflow-auto text-xs whitespace-pre-wrap text-gray-200">
                                  {formatDatabaseFieldValue(fieldValue)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div className="space-y-6 p-6">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-blue-500/20 bg-linear-to-br from-blue-500/10 via-sky-500/5 to-transparent p-4">
                    <div className="text-xs font-semibold tracking-wide text-blue-300 uppercase">
                      Activity Stream
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">
                      {allSubmissions.length}
                    </div>
                    <div className="text-xs text-blue-200/80">
                      Imported submissions
                    </div>
                  </div>
                  <div className="rounded-2xl border border-indigo-500/20 bg-linear-to-br from-indigo-500/10 via-fuchsia-500/5 to-transparent p-4">
                    <div className="text-xs font-semibold tracking-wide text-indigo-300 uppercase">
                      Standalone Vault
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">
                      {standaloneSolutions.length}
                    </div>
                    <div className="text-xs text-indigo-200/80">
                      Saved solutions without a linked submission
                    </div>
                  </div>
                </div>

                {submissionsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}

                {!submissionsLoading &&
                  allSubmissions.length === 0 &&
                  standaloneSolutions.length === 0 && (
                  <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
                    <SparklesIcon className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                    <p className="text-gray-400">
                      No submissions or saved solutions yet
                    </p>
                  </div>
                )}

                {!submissionsLoading &&
                  allSubmissions.length === 0 &&
                  standaloneSolutions.length > 0 && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
                    No imported submissions yet. Showing standalone vault entries
                    below.
                  </div>
                )}

                {!submissionsLoading && allSubmissions.length > 0 && (
                  <div className="space-y-3">
                    {allSubmissions.map((sub, idx) => {
                      const submissionCode = getSolutionCode(sub);
                      const submissionLanguage = getSolutionLanguage(sub);
                      const linkedSolution =
                        sub?.submission_id !== null &&
                        sub?.submission_id !== undefined
                          ? solutionBySubmissionId.get(String(sub.submission_id))
                          : null;
                      const isAccepted =
                        sub.verdict === 'AC' ||
                        sub.verdict === 'OK' ||
                        sub.verdict === 'Accepted';
                      const isExpanded =
                        expandedSubmission === sub.submission_id;

                      return (
                        <div
                          key={idx}
                          className={`overflow-hidden rounded-lg border ${
                            isAccepted
                              ? 'border-green-500/30 bg-green-500/5'
                              : 'border-red-500/30 bg-red-500/5'
                          }`}
                        >
                          <button
                            onClick={() =>
                              setExpandedSubmission(
                                isExpanded ? null : sub.submission_id
                              )
                            }
                            className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-800/30"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <span
                                className={`rounded px-2 py-0.5 text-sm font-medium ${
                                  isAccepted
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {sub.verdict}
                              </span>
                              {submissionLanguage && (
                                <span className="text-sm text-gray-400">
                                  {submissionLanguage}
                                </span>
                              )}
                              {sub.is_unsolved_attempt && (
                                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                                  Unsolved attempt
                                </span>
                              )}
                              {linkedSolution && (
                                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
                                  Saved solution
                                  {linkedSolution.version_number
                                    ? ` v${linkedSolution.version_number}`
                                    : ''}
                                </span>
                              )}
                              {isAccepted &&
                                (sub.ai_time_complexity ||
                                  sub.ai_space_complexity) && (
                                  <div className="flex gap-2 text-xs">
                                    {sub.ai_time_complexity && (
                                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-300">
                                        {sub.ai_time_complexity}
                                      </span>
                                    )}
                                    {sub.ai_space_complexity && (
                                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-300">
                                        {sub.ai_space_complexity}
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm whitespace-nowrap text-gray-500">
                                {sub.submitted_at
                                  ? new Date(sub.submitted_at).toLocaleString()
                                  : 'Unknown'}
                              </span>
                              {isExpanded ? (
                                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="space-y-3 border-t border-gray-700 p-4">
                              {(sub.execution_time_ms || sub.memory_kb) && (
                                <div className="flex gap-4 text-sm">
                                  {sub.execution_time_ms && (
                                    <span className="text-gray-400">
                                      Time:{' '}
                                      <span className="text-white">
                                        {sub.execution_time_ms}ms
                                      </span>
                                    </span>
                                  )}
                                  {sub.memory_kb && (
                                    <span className="text-gray-400">
                                      Memory:{' '}
                                      <span className="text-white">
                                        {Math.round(sub.memory_kb / 1024)}MB
                                      </span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {submissionCode && (
                                <div>
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-300">
                                      Source Code
                                    </span>
                                    <button
                                      onClick={async () => {
                                        await navigator.clipboard.writeText(
                                          submissionCode
                                        );
                                        setCopied(true);
                                        setTimeout(
                                          () => setCopied(false),
                                          2000
                                        );
                                      }}
                                      className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
                                    >
                                      {copied ? (
                                        <>
                                          <CheckIcon className="h-3 w-3" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <ClipboardIcon className="h-3 w-3" />
                                          Copy
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <CodeViewer
                                    code={submissionCode}
                                    language={submissionLanguage}
                                    submissionId={sub.submission_id}
                                    maxHeight="250px"
                                  />
                                </div>
                              )}

                              {linkedSolution && (
                                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded bg-indigo-400/20 px-2 py-0.5 font-semibold text-indigo-200 uppercase">
                                      Linked solution
                                    </span>
                                    {linkedSolution.version_number && (
                                      <span className="rounded bg-blue-500/20 px-2 py-0.5 text-blue-200">
                                        v{linkedSolution.version_number}
                                      </span>
                                    )}
                                    {linkedSolution.is_primary && (
                                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-200">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                  {(linkedSolution.notes ||
                                    linkedSolution.personal_notes) && (
                                    <p className="mt-2 text-xs whitespace-pre-wrap text-gray-300">
                                      {linkedSolution.notes ||
                                        linkedSolution.personal_notes}
                                    </p>
                                  )}
                                </div>
                              )}

                              {!isAccepted && sub.ai_why_failed && (
                                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                                  <div className="mb-1 flex items-center gap-2 text-sm font-medium text-red-400">
                                    <ExclamationTriangleIcon className="h-4 w-4" />
                                    Why It Failed
                                  </div>
                                  <p className="text-sm text-gray-300">
                                    {sub.ai_why_failed}
                                  </p>
                                </div>
                              )}

                              {!isAccepted &&
                                !sub.ai_why_failed &&
                                submissionCode && (
                                  <button
                                    onClick={() => analyzeSubmission(sub)}
                                    disabled={
                                      submissionAnalyzing === sub.submission_id
                                    }
                                    className="flex items-center gap-2 rounded-lg bg-purple-500/20 px-3 py-1.5 text-sm text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
                                  >
                                    {submissionAnalyzing ===
                                    sub.submission_id ? (
                                      <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                                        Analyzing...
                                      </>
                                    ) : (
                                      <>
                                        <CpuChipIcon className="h-4 w-4" />
                                        Analyze Why Failed
                                      </>
                                    )}
                                  </button>
                                )}

                              {isAccepted &&
                                !sub.ai_time_complexity &&
                                submissionCode && (
                                  <button
                                    onClick={() => analyzeSubmission(sub)}
                                    disabled={
                                      submissionAnalyzing === sub.submission_id
                                    }
                                    className="flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-1.5 text-sm text-blue-300 hover:bg-blue-500/30 disabled:opacity-50"
                                  >
                                    {submissionAnalyzing ===
                                    sub.submission_id ? (
                                      <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                                        Analyzing...
                                      </>
                                    ) : (
                                      <>
                                        <CpuChipIcon className="h-4 w-4" />
                                        Analyze Complexity
                                      </>
                                    )}
                                  </button>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-4 border-t border-gray-800 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300">
                      Standalone Solution Vault
                    </h3>
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      {standaloneSolutions.length}
                    </span>
                  </div>

                  {standaloneSolutions.length === 0 ? (
                    <div className="rounded-2xl border border-indigo-500/20 bg-linear-to-br from-indigo-500/10 via-sky-500/5 to-transparent p-6 text-center">
                      <CodeBracketIcon className="mx-auto mb-3 h-10 w-10 text-indigo-300/70" />
                      <p className="text-sm text-indigo-100/90">
                        Every solution linked to a submission is shown directly
                        in the timeline above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {standaloneSolutions.map((sol, idx) => {
                        const solutionCode = getSolutionCode(sol);
                        const solutionLanguage = getSolutionLanguage(sol);
                        const codeExists =
                          typeof solutionCode === 'string' &&
                          solutionCode.trim().length > 0;
                        return (
                          <div
                            key={idx}
                            className="overflow-hidden rounded-2xl border border-indigo-500/30 bg-linear-to-br from-gray-900 via-indigo-950/40 to-sky-950/30"
                          >
                            <div className="border-b border-indigo-500/20 bg-indigo-500/10 p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="rounded bg-indigo-400/25 px-3 py-1 text-sm font-semibold text-indigo-100">
                                    Vault Entry
                                  </span>
                                  <span className="rounded bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300">
                                    Version {sol.version_number || idx + 1}
                                  </span>
                                  {sol.is_primary && (
                                    <span className="rounded bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">
                                      Primary
                                    </span>
                                  )}
                                  {solutionLanguage && (
                                    <span className="rounded bg-fuchsia-500/20 px-3 py-1 text-sm font-medium text-fuchsia-300">
                                      {solutionLanguage}
                                    </span>
                                  )}
                                  {sol.verdict && (
                                    <span
                                      className={`rounded px-3 py-1 text-sm font-medium ${
                                        sol.verdict === 'AC' ||
                                        sol.verdict === 'Accepted'
                                          ? 'bg-green-500/20 text-green-300'
                                          : 'bg-red-500/20 text-red-400'
                                      }`}
                                    >
                                      {sol.verdict}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(sol.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 p-4">
                              {(sol.time_complexity ||
                                sol.space_complexity) && (
                                <div className="flex gap-3">
                                  {sol.time_complexity && (
                                    <div className="rounded border border-red-500/30 bg-red-500/10 p-2">
                                      <div className="text-xs font-medium text-red-400">
                                        Time
                                      </div>
                                      <div className="mt-0.5 font-mono text-sm text-red-300">
                                        {sol.time_complexity}
                                      </div>
                                    </div>
                                  )}
                                  {sol.space_complexity && (
                                    <div className="rounded border border-orange-500/30 bg-orange-500/10 p-2">
                                      <div className="text-xs font-medium text-orange-400">
                                        Space
                                      </div>
                                      <div className="mt-0.5 font-mono text-sm text-orange-300">
                                        {sol.space_complexity}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {sol.topics && sol.topics.length > 0 && (
                                <div>
                                  <div className="mb-2 text-xs font-medium text-gray-400">
                                    Topics Used
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {sol.topics.map((topic, i) => (
                                      <span
                                        key={i}
                                        className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300"
                                      >
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(sol.notes || sol.personal_notes) && (
                                <div>
                                  <div className="mb-2 text-xs font-medium text-gray-400">
                                    Notes
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap text-gray-300">
                                    {sol.notes || sol.personal_notes}
                                  </p>
                                </div>
                              )}

                              {codeExists && (
                                <div>
                                  <div className="mb-2 text-xs font-medium tracking-wide text-indigo-300 uppercase">
                                    Snapshot Code
                                  </div>
                                  <CodeViewer
                                    code={solutionCode}
                                    language={solutionLanguage}
                                    submissionId={sol.submission_id}
                                    maxHeight="300px"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Analysis Tab */}
            {activeTab === 'ai-analysis' && (
              <div className="space-y-6 p-6">
                {aiLoading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="mb-4 h-10 w-10 animate-spin rounded-full border-3 border-purple-500 border-t-transparent" />
                    <p className="text-gray-400">Analyzing solution...</p>
                  </div>
                )}

                {aiError && !aiLoading && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <h3 className="font-semibold text-red-400">
                        Analysis Failed
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-gray-300">{aiError}</p>
                    <button
                      onClick={() => {
                        setAiError(null);
                        fetchAIAnalysis(true);
                      }}
                      className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/30"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Retry
                    </button>
                  </div>
                )}

                {!hasSolution && !aiLoading && !aiError && (
                  <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
                    <SparklesIcon className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                    <p className="text-gray-400">No solution to analyze</p>
                  </div>
                )}

                {aiAnalysis && !aiLoading && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5 text-purple-400" />
                        <span className="text-sm text-purple-400">
                          {aiAnalysis.source === 'cached'
                            ? 'AI Analysis (Cached)'
                            : 'AI Analysis'}
                        </span>
                      </div>
                      <button
                        onClick={() => fetchAIAnalysis(true)}
                        className="flex items-center gap-2 rounded-lg bg-purple-500/20 px-3 py-1.5 text-sm text-purple-300 hover:bg-purple-500/30"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        Re-analyze
                      </button>
                    </div>

                    {aiAnalysis.problemSummary && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                        <h4 className="mb-2 text-sm font-semibold text-blue-400">
                          Problem Summary
                        </h4>
                        <p className="text-sm leading-relaxed text-gray-300">
                          {aiAnalysis.problemSummary}
                        </p>
                      </div>
                    )}

                    {aiAnalysis.userApproach && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                        <h4 className="mb-2 text-sm font-semibold text-green-400">
                          Your Approach:{' '}
                          {aiAnalysis.userApproach.name || 'Custom Solution'}
                        </h4>
                        <p className="text-sm text-gray-300">
                          {aiAnalysis.userApproach.explanation ||
                            aiAnalysis.approachExplanation}
                        </p>
                      </div>
                    )}

                    {(aiAnalysis.timeComplexity ||
                      aiAnalysis.spaceComplexity) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {aiAnalysis.timeComplexity && (
                          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                              <CpuChipIcon className="h-4 w-4" />
                              Time Complexity
                            </div>
                            <div className="font-mono text-xl font-semibold text-white">
                              {aiAnalysis.timeComplexity}
                            </div>
                          </div>
                        )}
                        {aiAnalysis.spaceComplexity && (
                          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                              <BeakerIcon className="h-4 w-4" />
                              Space Complexity
                            </div>
                            <div className="font-mono text-xl font-semibold text-white">
                              {aiAnalysis.spaceComplexity}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {aiAnalysis.keyConcepts?.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-300">
                          Key Concepts
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {aiAnalysis.keyConcepts.map((concept, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-300"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiAnalysis.alternativeApproaches?.length > 0 && (
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
                          <LightBulbIcon className="h-4 w-4 text-amber-400" />
                          Alternative Approaches
                        </h4>
                        <div className="space-y-2">
                          {aiAnalysis.alternativeApproaches.map(
                            (approach, i) => (
                              <div
                                key={i}
                                className="rounded-lg border border-gray-700 bg-gray-800 p-3"
                              >
                                <div className="mb-1 font-medium text-amber-400">
                                  {approach.name}
                                </div>
                                <p className="text-sm text-gray-400">
                                  {approach.explanation}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {aiAnalysis.optimizationTips?.length > 0 && (
                      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-400">
                          <SparklesIcon className="h-4 w-4" />
                          Optimization Tips
                        </h4>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {aiAnalysis.optimizationTips.map((tip, i) => (
                            <li key={i}>- {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hasSolution && (
                      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                        <button
                          onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                          className="flex w-full items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <PaperAirplaneIcon className="h-5 w-5 text-purple-400" />
                            <span className="font-medium text-gray-300">
                              Ask AI a Question
                            </span>
                          </div>
                          {showCustomPrompt ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>

                        {showCustomPrompt && (
                          <div className="mt-4 space-y-3">
                            <textarea
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              placeholder="Ask anything about this problem..."
                              rows={4}
                              className="w-full rounded-lg border border-gray-600 bg-gray-900 p-3 text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setCustomPrompt('');
                                  setShowCustomPrompt(false);
                                }}
                                className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (customPrompt.trim()) {
                                    fetchAIAnalysis(true, customPrompt);
                                    setShowCustomPrompt(false);
                                  }
                                }}
                                disabled={!customPrompt.trim() || aiLoading}
                                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                              >
                                <PaperAirplaneIcon className="h-4 w-4" />
                                Ask AI
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Similar Tab */}
            {activeTab === 'similar' && (
              <div className="space-y-6 p-6">
                {similarLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}

                {!similarLoading && (
                  <>
                    {suggestions && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-400">
                          <LightBulbIcon className="h-4 w-4" />
                          Suggestions
                        </h4>
                        <p className="text-sm text-gray-300">
                          {suggestions.tip}
                        </p>
                        {suggestions.relatedTopics?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {suggestions.relatedTopics.map((topic, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {similarProblems.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-300">
                          Similar Problems ({similarProblems.length})
                        </h4>
                        {similarProblems.map((p) => (
                          <div
                            key={`${p.platform}-${p.problem_id}`}
                            className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-3 hover:bg-gray-800"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium ${getPlatformColor(p.platform)}`}
                              >
                                {String(p.platform || '??')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </span>
                              <div>
                                <div className="font-medium text-white">
                                  {p.problem_name || p.problem_id}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {p.difficulty_tier && (
                                <span
                                  className={`rounded px-2 py-0.5 text-xs ${getDifficultyColor(p.difficulty_tier)}`}
                                >
                                  {p.difficulty_tier}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {p.similarity_score}% match
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
                        <p className="text-gray-400">
                          No similar problems found
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-300">
                    Personal Notes
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    {notesLoading ? (
                      <span className="text-gray-500">Saving...</span>
                    ) : notesSaved ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckIcon className="h-3 w-3" />
                        Saved
                      </span>
                    ) : (
                      <span className="text-amber-400">Unsaved changes</span>
                    )}
                  </div>
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setNotesSaved(false);
                  }}
                  placeholder="Add your personal notes..."
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 p-4 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  style={{ minHeight: '400px' }}
                />

                <div className="text-xs text-gray-500">
                  Notes are auto-saved. They are private and only visible to
                  you.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
