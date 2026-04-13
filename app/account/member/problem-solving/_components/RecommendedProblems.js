'use client';

import { useState, useEffect } from 'react';
import {
  SparklesIcon,
  AcademicCapIcon,
  ChartBarIcon,
  LightBulbIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

/**
 * RecommendedProblems Component
 *
 * Displays AI-powered problem recommendations based on:
 * - User's solving history
 * - Skill level
 * - Learning objectives
 * - Similar user behavior
 */
export default function RecommendedProblems({ userId }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('mixed');
  const [cached, setCached] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [selectedType]);

  const fetchRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/problem-solving/recommendations?limit=10&type=${selectedType}&refresh=${forceRefresh}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setCached(data.cached);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRecommendations(true);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'next_challenge':
        return <ChartBarIcon className="h-5 w-5" />;
      case 'learning':
        return <AcademicCapIcon className="h-5 w-5" />;
      case 'practice':
        return <LightBulbIcon className="h-5 w-5" />;
      default:
        return <SparklesIcon className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'next_challenge':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'learning':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'practice':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-300';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="text-primary-500 h-6 w-6" />
          <h2 className="text-primary-50 text-2xl font-bold">
            Recommended for You
          </h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="bg-primary-700 hover:bg-primary-600 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'mixed', label: 'All', icon: SparklesIcon },
          {
            value: 'next_challenge',
            label: 'Next Challenge',
            icon: ChartBarIcon,
          },
          { value: 'learning', label: 'Learning', icon: AcademicCapIcon },
          { value: 'practice', label: 'Practice', icon: LightBulbIcon },
        ].map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedType(type.value)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              selectedType === type.value
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-primary-700 bg-primary-800 text-primary-200 hover:bg-primary-700'
            }`}
          >
            <type.icon className="h-4 w-4" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Cache Indicator */}
      {cached && !loading && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-700 bg-blue-900/30 px-4 py-2 text-sm text-blue-300">
          <ClockIcon className="h-4 w-4" />
          Showing cached recommendations. Click refresh for latest suggestions.
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-primary-800 h-40 animate-pulse rounded-xl"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-red-300">
          <p className="font-medium">Error loading recommendations</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Recommendations List */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="bg-primary-800 border-primary-700 rounded-xl border px-8 py-12 text-center">
          <SparklesIcon className="text-primary-500 mx-auto h-12 w-12" />
          <h3 className="text-primary-50 mt-4 text-lg font-semibold">
            No recommendations yet
          </h3>
          <p className="text-primary-300 mt-2">
            Solve more problems to get personalized recommendations
          </p>
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <RecommendationCard
              key={rec.problem_uuid || index}
              recommendation={rec}
              index={index}
              getTypeIcon={getTypeIcon}
              getTypeColor={getTypeColor}
              getScoreColor={getScoreColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual Recommendation Card
 */
function RecommendationCard({
  recommendation,
  index,
  getTypeIcon,
  getTypeColor,
  getScoreColor,
}) {
  const problem = recommendation.problem || {};
  const score = Math.round(recommendation.recommendation_score || 0);

  return (
    <div className="group border-primary-700 bg-primary-800 hover:border-primary-600 hover:bg-primary-750 rounded-xl border p-6 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-primary-500 text-2xl font-bold">
              #{index + 1}
            </span>
            <a
              href={problem.problem_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-50 hover:text-secondary-400 text-lg font-semibold transition-colors"
            >
              {problem.problem_name || 'Unknown Problem'}
            </a>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Platform */}
            <span className="bg-primary-700 text-primary-200 rounded-md px-2 py-1 text-xs font-medium">
              {problem.platform?.toUpperCase() || 'N/A'}
            </span>

            {/* Difficulty */}
            {problem.difficulty_rating && (
              <span className="rounded-md border border-yellow-700 bg-yellow-900/30 px-2 py-1 text-xs font-medium text-yellow-300">
                {problem.difficulty_rating}
              </span>
            )}

            {/* Recommendation Type */}
            <span
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${getTypeColor(
                recommendation.recommendation_type
              )}`}
            >
              {getTypeIcon(recommendation.recommendation_type)}
              {recommendation.recommendation_type
                ?.replace('_', ' ')
                .toUpperCase()}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center">
          <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <div className="text-primary-400 text-xs">Match</div>
        </div>
      </div>

      {/* Recommendation Reason */}
      <p className="text-primary-300 mt-4 text-sm">
        {recommendation.recommendation_reason}
      </p>

      {/* Key Benefits */}
      {recommendation.key_benefits?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recommendation.key_benefits.map((benefit, i) => (
            <span
              key={i}
              className="rounded-md border border-green-800 bg-green-900/20 px-3 py-1 text-xs text-green-300"
            >
              ✓ {benefit}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      {problem.tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {problem.tags.slice(0, 5).map((tag, i) => (
            <span
              key={i}
              className="bg-primary-700 text-primary-300 rounded-md px-2 py-1 text-xs"
            >
              {tag}
            </span>
          ))}
          {problem.tags.length > 5 && (
            <span className="bg-primary-700 text-primary-400 rounded-md px-2 py-1 text-xs">
              +{problem.tags.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Score Breakdown (expandable) */}
      <details className="mt-4">
        <summary className="text-primary-400 hover:text-primary-300 cursor-pointer text-xs">
          View score breakdown
        </summary>
        <div className="bg-primary-900 mt-2 grid grid-cols-2 gap-2 rounded-lg p-3">
          <ScoreItem
            label="Content Match"
            score={recommendation.content_score}
            getScoreColor={getScoreColor}
          />
          <ScoreItem
            label="Skill Level"
            score={recommendation.skill_match_score}
            getScoreColor={getScoreColor}
          />
          <ScoreItem
            label="Learning Value"
            score={recommendation.learning_value_score}
            getScoreColor={getScoreColor}
          />
          <ScoreItem
            label="Collaborative"
            score={recommendation.collaborative_score}
            getScoreColor={getScoreColor}
          />
        </div>
      </details>

      {/* Action Button */}
      <div className="mt-4 flex gap-2">
        <a
          href={problem.problem_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary-600 hover:bg-primary-500 flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium text-white transition-colors"
        >
          Solve Problem
        </a>
        <button className="border-primary-600 bg-primary-800 text-primary-200 hover:bg-primary-700 rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
          Bookmark
        </button>
      </div>
    </div>
  );
}

/**
 * Score Item Component
 */
function ScoreItem({ label, score, getScoreColor }) {
  const roundedScore = Math.round(score || 0);
  return (
    <div className="flex items-center justify-between">
      <span className="text-primary-400 text-xs">{label}</span>
      <span className={`text-sm font-semibold ${getScoreColor(roundedScore)}`}>
        {roundedScore}
      </span>
    </div>
  );
}
