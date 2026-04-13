/**
 * @file Self Troubleshoot View Component
 * FAQ and self-help section for common issues.
 * Displays categorized FAQs with search functionality.
 *
 * @module SelfTroubleshootView
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Bug,
  CreditCard,
  Video,
  FileText,
  Settings,
  Users,
  RefreshCw,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from 'lucide-react';
import {
  fetchFAQsAction,
  searchFAQsAction,
} from '@/app/_lib/discussion-actions';

// Category icons mapping
const CATEGORY_ICONS = {
  general: HelpCircle,
  technical: Bug,
  billing: CreditCard,
  courses: Video,
  assignments: FileText,
  account: Settings,
  community: Users,
  features: Lightbulb,
};

// Category colors
const CATEGORY_COLORS = {
  general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  technical: 'bg-red-500/20 text-red-400 border-red-500/30',
  billing: 'bg-green-500/20 text-green-400 border-green-500/30',
  courses: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  assignments: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  account: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  community: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  features: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

/**
 * FAQ Item component.
 */
function FAQItem({ item, isExpanded, onToggle }) {
  const [feedback, setFeedback] = useState(null);

  const handleFeedback = (type) => {
    setFeedback(type);
    // Could send feedback to server here
  };

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="mt-0.5 text-gray-400">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-white">{item.question}</h4>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-11">
              {/* Answer content */}
              <div
                className="prose prose-sm prose-invert max-w-none text-gray-300"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />

              {/* Related links */}
              {item.related_links?.length > 0 && (
                <div className="mt-4">
                  <h5 className="mb-2 text-xs font-medium text-gray-500 uppercase">
                    Related Resources
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {item.related_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-white/20 hover:text-white"
                      >
                        {link.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div className="mt-4 flex items-center gap-4 border-t border-white/5 pt-4">
                <span className="text-xs text-gray-500">Was this helpful?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFeedback('yes')}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors ${
                      feedback === 'yes'
                        ? 'bg-green-500/20 text-green-400'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback('no')}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors ${
                      feedback === 'no'
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                    }`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    No
                  </button>
                </div>
                {feedback === 'no' && (
                  <span className="text-xs text-gray-500">
                    Consider asking in discussions
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * FAQ Category component.
 */
function FAQCategory({ category, items, expandedItems, onToggleItem }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = CATEGORY_ICONS[category.slug] || HelpCircle;
  const colorClasses =
    CATEGORY_COLORS[category.slug] || CATEGORY_COLORS.general;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Category header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${colorClasses}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-gray-400">{category.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">
            {items.length} FAQs
          </span>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* FAQ items */}
      <AnimatePresence>
        {isExpanded && items.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            {items.map((item) => (
              <FAQItem
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => onToggleItem(item.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Search results component.
 */
function SearchResults({ results, expandedItems, onToggleItem, onClear }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Search Results ({results.length})
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-gray-400 hover:text-gray-300"
        >
          Clear search
        </button>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="text-gray-400">No results found</p>
          <p className="mt-1 text-sm text-gray-500">
            Try different keywords or browse categories below
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          {results.map((item) => (
            <FAQItem
              key={item.id}
              item={item}
              isExpanded={expandedItems.has(item.id)}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Popular questions component.
 */
function PopularQuestions({ items, expandedItems, onToggleItem }) {
  if (!items?.length) return null;

  return (
    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-yellow-400">
        <Lightbulb className="h-5 w-5" />
        Most Common Questions
      </h3>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggleItem(item.id)}
            className="block w-full rounded-lg p-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
          >
            {item.question}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Self Troubleshoot View component.
 */
export default function SelfTroubleshootView({ onAskQuestion }) {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  // Fetch FAQs
  const fetchFAQs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFAQsAction();

      if (result.error) {
        setError(result.error);
        return;
      }

      const faqData = result.faqs || [];

      // Group by category
      const categoryMap = new Map();
      faqData.forEach((faq) => {
        const cat = faq.category || {
          id: 'general',
          name: 'General',
          slug: 'general',
        };
        if (!categoryMap.has(cat.id)) {
          categoryMap.set(cat.id, { ...cat, items: [] });
        }
        categoryMap.get(cat.id).items.push(faq);
      });

      setCategories(Array.from(categoryMap.values()));
      setFaqs(faqData);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError('Failed to load FAQs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  // Handle search
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchFAQsAction({ query: query.trim() });
      if (result.results) {
        setSearchResults(result.results);
      }
    } catch (err) {
      console.error('Error searching FAQs:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Toggle FAQ item
  const toggleItem = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Get popular questions (mock - in real app, track views/helpfulness)
  const popularQuestions = useMemo(() => {
    return faqs.slice(0, 5);
  }, [faqs]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={fetchFAQs}
          className="mx-auto mt-4 flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/30"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <BookOpen className="h-5 w-5 text-blue-400" />
            Self Troubleshoot
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Find answers to common questions and issues
          </p>
        </div>
        {onAskQuestion && (
          <button
            type="button"
            onClick={onAskQuestion}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-white/20 hover:text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Can't find answer? Ask
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for answers..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-4 pl-12 text-white placeholder-gray-500 transition-colors outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
        />
        {isSearching && (
          <RefreshCw className="absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {/* Search results or FAQ categories */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>
      ) : searchResults !== null ? (
        <SearchResults
          results={searchResults}
          expandedItems={expandedItems}
          onToggleItem={toggleItem}
          onClear={clearSearch}
        />
      ) : (
        <>
          {/* Popular questions */}
          <PopularQuestions
            items={popularQuestions}
            expandedItems={expandedItems}
            onToggleItem={toggleItem}
          />

          {/* FAQ Categories */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wider text-gray-500 uppercase">
              Browse by Category
            </h3>
            {categories.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center">
                <BookOpen className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                <p className="text-gray-400">No FAQs available yet</p>
              </div>
            ) : (
              categories.map((category) => (
                <FAQCategory
                  key={category.id}
                  category={category}
                  items={category.items}
                  expandedItems={expandedItems}
                  onToggleItem={toggleItem}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Still need help */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 text-center">
        <HelpCircle className="mx-auto mb-3 h-10 w-10 text-blue-400" />
        <h3 className="mb-2 font-semibold text-white">Still need help?</h3>
        <p className="mb-4 text-sm text-gray-400">
          If you couldn't find the answer you're looking for, feel free to
          create a new discussion.
        </p>
        {onAskQuestion && (
          <button
            type="button"
            onClick={onAskQuestion}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <MessageCircle className="h-4 w-4" />
            Create Discussion
          </button>
        )}
      </div>
    </div>
  );
}
