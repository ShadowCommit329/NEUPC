/**
 * @file Roadmap detail page client component — professional redesign.
 * Full-bleed cover image hero, 3-column reading layout, sticky TOC,
 * reading progress, share sidebar, related roadmaps with thumbnails.
 *
 * @module RoadmapDetailClient
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import SafeImg from '@/app/_components/ui/SafeImg';
import { cn, getInitials, driveImageUrl } from '@/app/_lib/utils';
import { incrementRoadmapViewAction } from '@/app/_lib/roadmap-actions';
import { useScrollLock } from '@/app/_lib/hooks';
import JoinButton from '@/app/_components/ui/JoinButton';
import { createLowlight, common } from 'lowlight';
import { toHtml } from 'hast-util-to-html';

const lowlight = createLowlight(common);

// ─── Code block enhancement helpers ─────────────────────────────────────────

/** Wrap highlighted HTML into per-line spans for CSS line numbers */
function wrapCodeLines(html) {
  const lines = html.split('\n');
  if (lines.length > 0 && !lines[lines.length - 1]) lines.pop();
  let openSpans = [];
  return lines
    .map((raw) => {
      const reopened = openSpans.join('');
      const tagRe = /<(\/?)(span)([^>]*)>/g;
      let m;
      while ((m = tagRe.exec(raw)) !== null) {
        if (m[1] === '/') openSpans.pop();
        else openSpans.push(`<span${m[3]}>`);
      }
      const closers = [...openSpans]
        .reverse()
        .map(() => '</span>')
        .join('');
      return `<span class="code-line">${reopened}${raw || ' '}${closers}</span>`;
    })
    .join('');
}

const COPY_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

/**
 * Process an HTML string: find all <pre><code> blocks and apply
 * syntax highlighting + line-number wrapping directly in the markup.
 */
function highlightCodeBlocks(htmlString) {
  if (!htmlString) return htmlString;
  const knownLangs = lowlight.listLanguages();
  let blockIndex = 0;
  return htmlString.replace(
    /(<pre[^>]*>\s*<code)([^>]*)(>)([\s\S]*?)(<\/code>\s*<\/pre>)/gi,
    (_match, openTag, attrs, gt, codeContent, _closeTag) => {
      blockIndex++;
      const decoded = codeContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const langMatch = attrs.match(/class="[^"]*language-(\w+)/);
      let lang = langMatch ? langMatch[1] : null;

      let highlighted;
      try {
        if (lang && knownLangs.includes(lang)) {
          highlighted = toHtml(lowlight.highlight(lang, decoded));
        } else {
          const auto = lowlight.highlightAuto(decoded);
          highlighted = toHtml(auto);
          if (!lang && auto.data?.language) {
            lang = auto.data.language;
            if (attrs.includes('class="')) {
              attrs = attrs.replace(/class="/, `class="language-${lang} `);
            } else {
              attrs = ` class="language-${lang}"` + attrs;
            }
          }
        }
      } catch {
        highlighted = codeContent;
      }

      const wrapped = wrapCodeLines(highlighted);

      // Build toolbar HTML
      let toolbarHtml = `<div class="code-block-toolbar" data-block-index="${blockIndex}">`;
      toolbarHtml += '<span class="code-toolbar-actions">';
      toolbarHtml += `<button type="button" class="code-toolbar-btn code-copy-btn" aria-label="Copy code">${COPY_SVG}<span>Copy</span></button>`;
      toolbarHtml += '</span></div>';

      return `${openTag}${attrs}${gt}${wrapped}</code>${toolbarHtml}</pre>`;
    }
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHARE_PLATFORMS = [
  {
    key: 'twitter',
    label: 'Twitter / X',
    icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: 'M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z',
  },
];

const DIFFICULTY_CONFIGS = {
  advanced: {
    color: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    icon: '🔴',
    gradient: 'from-rose-500/20 to-pink-500/20',
  },
  intermediate: {
    color: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    icon: '🟡',
    gradient: 'from-amber-500/20 to-yellow-500/20',
  },
  beginner: {
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    icon: '🟢',
    gradient: 'from-emerald-500/20 to-green-500/20',
  },
};

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getReadTimeLabel(content) {
  const words = stripHtml(content).split(' ').filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min`;
}

// ─── TOC Item ─────────────────────────────────────────────────────────────────

function TOCItem({ section, level, isActive, isPast, sectionNum, onClick }) {
  return (
    <button
      data-section-id={section.id}
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-start gap-2 rounded-lg py-1.5 pr-3 text-left text-xs transition-all duration-150',
        level === 3 ? 'pl-8' : 'pl-3',
        isActive
          ? 'bg-primary-500/10 text-primary-300'
          : isPast
            ? 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            : 'text-gray-600 hover:bg-white/4 hover:text-gray-400'
      )}
    >
      {isActive && (
        <span className="bg-primary-400 absolute inset-y-1 left-0 w-0.5 rounded-full" />
      )}
      {level === 2 && sectionNum != null && (
        <span
          className={cn(
            'mt-0.5 shrink-0 font-mono text-[9px] leading-none font-bold tabular-nums',
            isActive
              ? 'text-primary-400/70'
              : isPast
                ? 'text-gray-600'
                : 'text-gray-700'
          )}
        >
          {String(sectionNum).padStart(2, '0')}
        </span>
      )}
      {level === 3 && (
        <span
          className={cn(
            'mt-1.5 h-1 w-1 shrink-0 rounded-full',
            isActive ? 'bg-primary-400' : isPast ? 'bg-gray-600' : 'bg-gray-700'
          )}
        />
      )}
      <span
        className={cn('line-clamp-2 leading-snug', isActive && 'font-medium')}
      >
        {section.title}
      </span>
    </button>
  );
}

// ─── Related Roadmap Card ─────────────────────────────────────────────────────

function RelatedRoadmapCard({ roadmap }) {
  const diffCfg =
    DIFFICULTY_CONFIGS[roadmap.difficulty] || DIFFICULTY_CONFIGS.beginner;
  return (
    <Link
      href={`/roadmaps/${roadmap.slug || roadmap.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/5 hover:shadow-lg hover:shadow-black/30"
    >
      {roadmap.thumbnail ? (
        <div className="relative aspect-video overflow-hidden">
          <SafeImg
            src={driveImageUrl(roadmap.thumbnail)}
            alt={roadmap.title || ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            fallback="/placeholder-roadmap.svg"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          {roadmap.category && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-[11px] font-semibold text-gray-200 backdrop-blur-sm">
              📚 {roadmap.category}
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-t-2xl bg-white/4 text-3xl">
          🗺️
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {!roadmap.thumbnail && roadmap.category && (
          <span className="flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-gray-300">
            📚 {roadmap.category}
          </span>
        )}
        <h4 className="line-clamp-2 text-sm leading-snug font-semibold text-gray-200 transition-colors group-hover:text-white">
          {roadmap.title}
        </h4>
        <div className="mt-auto flex items-center gap-2.5 border-t border-white/5 pt-3 text-[11px] text-gray-600">
          {roadmap.difficulty && (
            <span className={cn('flex items-center gap-1', diffCfg.color)}>
              {diffCfg.icon}{' '}
              {roadmap.difficulty.charAt(0).toUpperCase() +
                roadmap.difficulty.slice(1)}
            </span>
          )}
          {(roadmap.views ?? 0) > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {roadmap.views.toLocaleString()} views
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RoadmapDetailClient({
  roadmap: propRoadmap = {},
  relatedRoadmaps = [],
}) {
  const roadmap = propRoadmap;

  const [activeSection, setActiveSection] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [showMobileTOC, setShowMobileTOC] = useState(false);
  useScrollLock(showMobileTOC);
  const [copied, setCopied] = useState(false);
  const [tableOfContents, setTableOfContents] = useState([]);
  const contentRef = useRef(null);
  const tocNavRef = useRef(null);

  // ── Normalize roadmap fields ──────────────────────────────────────────────
  const meta = useMemo(() => {
    const authorName = roadmap.users?.full_name || 'NEUPC Team';
    const contentSource =
      typeof roadmap.content === 'string'
        ? roadmap.content
        : (roadmap.content?.html ?? roadmap.content?.text ?? '');
    const prerequisites = Array.isArray(roadmap.prerequisites)
      ? roadmap.prerequisites
      : [];
    const publishedDate = roadmap.created_at;
    const thumbnail = roadmap.thumbnail || null;

    return {
      title: roadmap.title || 'Untitled Roadmap',
      description: roadmap.description || '',
      category: roadmap.category || 'General',
      difficulty: roadmap.difficulty || 'beginner',
      estimatedDuration: roadmap.estimated_duration || '',
      authorName,
      authorInitials: getInitials(authorName),
      authorAvatar: roadmap.users?.avatar_url || null,
      date: publishedDate
        ? new Date(publishedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '',
      readTimeLabel: contentSource ? getReadTimeLabel(contentSource) : null,
      prerequisites,
      views: roadmap.views ?? 0,
      thumbnail,
      content: contentSource,
      featured: roadmap.is_featured ?? false,
    };
  }, [roadmap]);

  // ── Sync view count; increment views ──────────────────────────────────────
  useEffect(() => {
    setViewCount(meta.views || 0); // initial guess before live fetch
    if (!roadmap.id) return;
    const asyncIncrement = async () => {
      try {
        const fd = new FormData();
        fd.set('id', String(roadmap.id));
        const res = await incrementRoadmapViewAction(fd);
        if (res?.views) {
          setViewCount(res.views);
        } else {
          setViewCount((prev) => prev + 1); // fallback
        }
      } catch (err) {
        // fallback on error
        setViewCount((prev) => prev + 1);
      }
    };
    asyncIncrement();
  }, [roadmap.id, meta.views]);

  // ── Pre-process content: syntax highlighting ──────────────────────────────
  const enhancedContent = useMemo(
    () => highlightCodeBlocks(meta.content),
    [meta.content]
  );

  // ── Event delegation for code-block toolbar (Copy) ────────────────────────
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleClick = (e) => {
      const copyBtn = e.target.closest('.code-copy-btn');
      if (copyBtn) {
        const pre = copyBtn.closest('pre');
        if (!pre) return;
        const code = pre.querySelector('code');
        if (!code) return;
        const rawText = code.textContent || '';
        navigator.clipboard.writeText(rawText).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = `${CHECK_SVG}<span>Copied</span>`;
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `${COPY_SVG}<span>Copy</span>`;
          }, 2000);
        });
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [enhancedContent]);

  // ── TOC extraction ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!contentRef.current) return;
    const headings = contentRef.current.querySelectorAll('h2[id], h3[id]');
    const toc = Array.from(headings).map((h) => ({
      id: h.id,
      title: h.textContent,
      level: h.tagName === 'H3' ? 3 : 2,
    }));
    if (toc.length) {
      setTableOfContents(toc);
      setActiveSection(toc[0].id);
    }
  }, [enhancedContent]);

  // ── Scroll tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const total =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
      setShowScrollTop(window.scrollY > 400);
      if (tableOfContents.length) {
        for (let i = tableOfContents.length - 1; i >= 0; i--) {
          const el = document.getElementById(tableOfContents[i].id);
          if (el && el.getBoundingClientRect().top <= 140) {
            setActiveSection(tableOfContents[i].id);
            break;
          }
        }
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [tableOfContents]);

  // ── Auto-scroll TOC to active item ────────────────────────────────────────
  useEffect(() => {
    if (!tocNavRef.current || !activeSection) return;
    const el = tocNavRef.current.querySelector(
      `[data-section-id="${activeSection}"]`
    );
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeSection]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const scrollToTop = useCallback(
    () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    []
  );

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 100,
        behavior: 'smooth',
      });
    }
    setShowMobileTOC(false);
  }, []);

  const handleShare = useCallback(
    (platform) => {
      if (typeof window === 'undefined') return;
      const url = window.location.href;
      const map = {
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(meta.title)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      };
      if (map[platform])
        window.open(map[platform], '_blank', 'width=600,height=400');
    },
    [meta.title]
  );

  const handleCopy = useCallback(() => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const hasTOC = tableOfContents.length > 0;
  const diffCfg =
    DIFFICULTY_CONFIGS[meta.difficulty] || DIFFICULTY_CONFIGS.beginner;

  const activeIdx = tableOfContents.findIndex((t) => t.id === activeSection);
  let h2Count = 0;
  const tocItems = tableOfContents.map((s, i) => {
    if (s.level === 2) h2Count++;
    return {
      ...s,
      isPast: i < activeIdx,
      sectionNum: s.level === 2 ? h2Count : null,
    };
  });

  return (
    <>
      <main className="relative min-h-screen bg-[#060810] text-white">
        {/* ── Reading Progress Bar ─────────────────────────────────────────── */}
        <div className="fixed top-0 right-0 left-0 z-50 h-0.5 bg-white/5">
          <div
            className="from-primary-500 via-primary-400 to-primary-300 h-full bg-linear-to-r transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* ── Sticky Nav ───────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#060810]/80 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-450 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/roadmaps"
                  className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-sm text-gray-400 transition-all hover:border-white/20 hover:text-white"
                >
                  <svg
                    className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Roadmaps
                </Link>
                <span className="hidden text-gray-700 sm:block">/</span>
                <span className="hidden items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-gray-300 sm:flex">
                  📚 {meta.category}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-gray-600 tabular-nums md:block">
                  {Math.round(scrollProgress)}% read
                  {meta.readTimeLabel ? ` · ${meta.readTimeLabel}` : ''}
                </span>
                {hasTOC && (
                  <button
                    onClick={() => setShowMobileTOC(!showMobileTOC)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-all hover:text-white xl:hidden"
                    title="Table of Contents"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h7"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile TOC Overlay ────────────────────────────────────────────── */}
        {showMobileTOC && hasTOC && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowMobileTOC(false)}
            />
            <div className="absolute top-16 right-4 left-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <h3 className="text-sm font-semibold text-white">
                  Table of Contents
                </h3>
                <button
                  onClick={() => setShowMobileTOC(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <nav className="max-h-80 overflow-y-auto px-3 py-3">
                {tocItems.map((s) => (
                  <TOCItem
                    key={s.id}
                    section={s}
                    level={s.level}
                    isActive={activeSection === s.id}
                    isPast={s.isPast}
                    sectionNum={s.sectionNum}
                    onClick={() => scrollToSection(s.id)}
                  />
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* ── Hero: Full-bleed cover image ──────────────────────────────────── */}
        <div className="relative overflow-hidden">
          {meta.thumbnail ? (
            <>
              {/* Cover photo */}
              <div className="relative h-72 w-full overflow-hidden sm:h-96 md:h-112 lg:h-125">
                <SafeImg
                  src={driveImageUrl(meta.thumbnail)}
                  alt={meta.title}
                  className="h-full w-full scale-110 object-cover blur brightness-75"
                  fallback="/placeholder-roadmap.svg"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#060810] via-[#060810]/85 to-[#060810]/20" />
                <div className="absolute inset-0 bg-linear-to-r from-[#060810]/70 via-[#060810]/15 to-transparent" />
              </div>

              {/* Hero text, overlaid on cover */}
              <div className="relative mx-auto -mt-42 w-full max-w-450 px-4 pb-8 sm:-mt-56 sm:px-6 sm:pb-10 md:-mt-64 lg:-mt-80 lg:px-8 xl:-mt-88">
                <div className="relative overflow-hidden rounded-xl border border-white/14 bg-[#060810]/60 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:rounded-2xl sm:p-5 md:p-6 lg:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/8 via-transparent to-transparent" />
                  <div className="relative z-10">
                    <HeroContent
                      meta={meta}
                      diffCfg={diffCfg}
                      viewCount={viewCount}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* No thumbnail: standalone hero */
            <div className="relative py-14 md:py-20">
              <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="bg-primary-500/6 absolute -top-40 left-1/2 h-125 w-125 -translate-x-1/2 rounded-full blur-3xl" />
              </div>
              <div className="mx-auto w-full max-w-450 px-4 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-xl border border-white/12 bg-white/4 p-4 backdrop-blur-xl sm:rounded-2xl sm:p-5 md:p-6 lg:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/8 via-transparent to-transparent" />
                  <div className="relative z-10">
                    <HeroContent
                      meta={meta}
                      diffCfg={diffCfg}
                      viewCount={viewCount}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Divider ───────────────────────────────────────────────────────── */}
        <div className="border-t border-white/6" />

        {/* ── Main Reading Layout ───────────────────────────────────────────── */}
        <div className="mx-auto w-full max-w-450 px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div
            className={cn('flex gap-6 lg:gap-8', !hasTOC && 'justify-center')}
          >
            {/* ── Left sidebar: TOC ─────────────────────────────────────────── */}
            {hasTOC && (
              <aside
                className={cn(
                  'hidden shrink-0 transition-all duration-300 xl:block',
                  tocCollapsed ? 'w-11' : 'w-64'
                )}
              >
                <div className="sticky top-20">
                  {tocCollapsed ? (
                    /* ── Collapsed strip ────────────────────────────────── */
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-4">
                      <button
                        onClick={() => setTocCollapsed(false)}
                        title="Expand contents"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/8 hover:text-gray-300"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                      <div className="relative h-40 w-1 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="bg-primary-500 absolute top-0 left-0 w-full rounded-full transition-all duration-300"
                          style={{ height: `${scrollProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-600 tabular-nums">
                        {Math.round(scrollProgress)}%
                      </span>
                    </div>
                  ) : (
                    /* ── Expanded TOC ───────────────────────────────────── */
                    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg
                            className="text-primary-400 h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 12h16M4 18h7"
                            />
                          </svg>
                          <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                            Contents
                          </span>
                          <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] text-gray-600 tabular-nums">
                            {tocItems.filter((s) => s.level === 2).length}
                          </span>
                        </div>
                        <button
                          onClick={() => setTocCollapsed(true)}
                          title="Collapse"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-600 transition-all hover:bg-white/8 hover:text-gray-400"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                      </div>
                      {/* Independently scrollable nav */}
                      <nav
                        ref={tocNavRef}
                        className="max-h-[calc(100dvh-200px)] space-y-0.5 overflow-y-auto p-2"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                        }}
                      >
                        {tocItems.map((s) => (
                          <TOCItem
                            key={s.id}
                            section={s}
                            level={s.level}
                            isActive={activeSection === s.id}
                            isPast={s.isPast}
                            sectionNum={s.sectionNum}
                            onClick={() => scrollToSection(s.id)}
                          />
                        ))}
                      </nav>
                      {/* Footer: progress */}
                      <div className="border-t border-white/8 px-4 py-3">
                        <div className="mb-1.5 flex items-center justify-between text-[10px] text-gray-600">
                          <span>
                            {activeIdx >= 0 ? activeIdx + 1 : 0} /{' '}
                            {tableOfContents.length} sections
                          </span>
                          <span className="font-medium text-gray-500 tabular-nums">
                            {Math.round(scrollProgress)}%
                          </span>
                        </div>
                        <div className="h-0.5 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="bg-primary-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${scrollProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* ── Article ───────────────────────────────────────────────────── */}
            <article
              className={cn(
                'w-full min-w-0 transition-all duration-300',
                hasTOC && 'flex-1'
              )}
            >
              {/* ── Prerequisites Section ─────────────────────────────────── */}
              {meta.prerequisites.length > 0 && (
                <div className="mb-6 rounded-2xl border border-white/8 bg-white/3 p-5 sm:p-6 md:p-8">
                  <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-sm">
                      📋
                    </span>
                    Prerequisites
                  </h2>
                  <ul className="space-y-2.5">
                    {meta.prerequisites.map((prereq, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-gray-300"
                      >
                        <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/6 text-[10px] font-bold text-gray-500">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Content Area ─────────────────────────────────────────── */}
              {enhancedContent ? (
                <div
                  ref={contentRef}
                  className="blog-content mx-auto rounded-2xl border border-white/8 bg-white/3 p-4 transition-all duration-300 sm:p-6 md:p-8 lg:p-10"
                  dangerouslySetInnerHTML={{ __html: enhancedContent }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 p-16 text-center backdrop-blur-sm">
                  <div className="mb-4 text-5xl">📭</div>
                  <p className="text-gray-400">
                    No learning content available yet. Check back soon!
                  </p>
                </div>
              )}

              {/* ── Article footer: share + reactions ────────────────────── */}
              <div className="mt-8 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-6">
                {/* Stats row */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/6 pb-5">
                  <div className="flex items-center gap-4">
                    {/* View count */}
                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span className="tabular-nums">
                        {viewCount.toLocaleString()}
                      </span>
                      <span>views</span>
                    </span>
                    {/* Read time */}
                    {meta.readTimeLabel && (
                      <>
                        <span className="text-gray-700">·</span>
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.75}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          {meta.readTimeLabel} read
                        </span>
                      </>
                    )}
                  </div>
                  {/* Difficulty badge */}
                  {meta.difficulty && (
                    <span
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                        diffCfg.bg,
                        diffCfg.border,
                        diffCfg.color
                      )}
                    >
                      {diffCfg.icon}{' '}
                      {meta.difficulty.charAt(0).toUpperCase() +
                        meta.difficulty.slice(1)}
                    </span>
                  )}
                </div>

                {/* Share row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                    Share:
                  </span>
                  {SHARE_PLATFORMS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => handleShare(p.key)}
                      title={`Share on ${p.label}`}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d={p.icon} />
                      </svg>
                    </button>
                  ))}
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all',
                      copied
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                    )}
                  >
                    {copied ? (
                      <>
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        Copy link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ── CTA Section ──────────────────────────────────────────── */}
              <div className="border-primary-500/30 bg-primary-500/8 mt-8 rounded-2xl border p-6 text-center backdrop-blur-sm sm:p-8 md:p-10">
                <div className="mb-3 text-3xl">🚀</div>
                <h3 className="mb-3 text-2xl font-bold text-white">
                  Ready to start this roadmap?
                </h3>
                <p className="mb-6 text-gray-300">
                  Join NEUPC to access resources, connect with mentors, and
                  track your learning progress.
                </p>
                <JoinButton
                  href="/join"
                  className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-2 rounded-xl px-8 py-3 font-semibold text-white transition-all active:scale-95"
                >
                  Join NEUPC
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </JoinButton>
              </div>
            </article>
          </div>
        </div>

        {/* ── Related Roadmaps ───────────────────────────────────────────────── */}
        {relatedRoadmaps.length > 0 && (
          <div className="border-t border-white/8 py-14 md:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                    Continue learning
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Related Roadmaps
                  </h2>
                </div>
                <Link
                  href={`/roadmaps?category=${encodeURIComponent(meta.category)}`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-200"
                >
                  More in {meta.category} →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedRoadmaps.map((rm) => (
                  <RelatedRoadmapCard key={rm.id} roadmap={rm} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Back-to-roadmaps strip ───────────────────────────────────────── */}
        <div className="border-t border-white/8 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <p className="text-sm font-semibold text-white">
                  Found this roadmap helpful?
                </p>
                <p className="text-xs text-gray-500">
                  Explore more learning paths from the NEUPC knowledge hub.
                </p>
              </div>
              <Link
                href="/roadmaps"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-gray-300 transition-all hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                ← Back to all roadmaps
              </Link>
            </div>
          </div>
        </div>

        {/* ── Scroll to Top ─────────────────────────────────────────────────── */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed right-4 bottom-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-[#060810]/90 text-gray-400 shadow-xl backdrop-blur-sm transition-all hover:border-white/25 hover:text-white sm:right-6"
            title="Back to top"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </button>
        )}
      </main>
    </>
  );
}

// ─── Hero Content (shared between thumbnail and no-thumbnail variants) ────────

function HeroContent({ meta, diffCfg, viewCount }) {
  return (
    <>
      {/* Badges */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
        {meta.featured && (
          <span className="rounded-full border border-amber-500/45 bg-amber-500/18 px-2.5 py-1 text-[11px] font-semibold text-amber-200 shadow-sm sm:px-3 sm:text-xs">
            ✨ Featured
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-gray-200 sm:px-3 sm:text-xs">
          📚 {meta.category}
        </span>
        {meta.difficulty && (
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs',
              diffCfg.bg,
              diffCfg.border,
              diffCfg.color
            )}
          >
            {diffCfg.icon}{' '}
            {meta.difficulty.charAt(0).toUpperCase() + meta.difficulty.slice(1)}
          </span>
        )}
        {meta.estimatedDuration && (
          <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-gray-200 sm:px-3 sm:text-xs">
            ⏱️ {meta.estimatedDuration}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="mb-4 text-2xl leading-tight font-bold text-white drop-shadow-sm sm:mb-5 sm:text-3xl md:text-4xl lg:text-5xl xl:text-[3.25rem]">
        {meta.title}
      </h1>

      {/* Description */}
      {meta.description && (
        <p className="mb-5 max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base md:text-lg">
          {meta.description}
        </p>
      )}

      {/* Author + meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-400 sm:gap-x-5 sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary-500/20 text-primary-300 ring-primary-500/20 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold ring-1">
            {meta.authorAvatar ? (
              <SafeImg
                src={driveImageUrl(meta.authorAvatar)}
                alt={meta.authorName}
                className="h-full w-full rounded-full object-cover"
                fallback=""
              />
            ) : (
              meta.authorInitials
            )}
          </div>
          <span className="font-medium text-gray-200">{meta.authorName}</span>
        </div>
        {meta.date && (
          <>
            <span className="text-gray-600">·</span>
            <span>{meta.date}</span>
          </>
        )}
        {meta.readTimeLabel && (
          <>
            <span className="text-gray-600">·</span>
            <span>⏱ {meta.readTimeLabel} read</span>
          </>
        )}
        {viewCount > 0 && (
          <>
            <span className="text-gray-600">·</span>
            <span>👁 {viewCount.toLocaleString()} views</span>
          </>
        )}
      </div>
    </>
  );
}
