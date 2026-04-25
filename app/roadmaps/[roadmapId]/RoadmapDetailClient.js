'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import SafeImg from '@/app/_components/ui/SafeImg';
import { cn, getInitials, driveImageUrl } from '@/app/_lib/utils';
import { incrementRoadmapViewAction } from '@/app/_lib/roadmap-actions';
import { useScrollLock } from '@/app/_lib/hooks';
import JoinButton from '@/app/_components/ui/JoinButton';
import ScrollToTop from '@/app/_components/ui/ScrollToTop';
import { createLowlight, common } from 'lowlight';
import { toHtml } from 'hast-util-to-html';

const lowlight = createLowlight(common);

// ─── Code block helpers ───────────────────────────────────────────────────────

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
      const closers = [...openSpans].reverse().map(() => '</span>').join('');
      return `<span class="code-line">${reopened}${raw || ' '}${closers}</span>`;
    })
    .join('');
}

const COPY_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

function highlightCodeBlocks(htmlString) {
  if (!htmlString) return htmlString;
  const knownLangs = lowlight.listLanguages();
  let blockIndex = 0;
  return htmlString.replace(
    /(<pre[^>]*>\s*<code)([^>]*)(>)([\s\S]*?)(<\/code>\s*<\/pre>)/gi,
    (_match, openTag, attrs, gt, codeContent, _closeTag) => {
      blockIndex++;
      const decoded = codeContent
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
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
            attrs = attrs.includes('class="')
              ? attrs.replace(/class="/, `class="language-${lang} `)
              : ` class="language-${lang}"` + attrs;
          }
        }
      } catch {
        highlighted = codeContent;
      }
      const wrapped = wrapCodeLines(highlighted);
      const toolbarHtml = `<div class="code-block-toolbar" data-block-index="${blockIndex}"><span class="code-toolbar-actions"><button type="button" class="code-toolbar-btn code-copy-btn" aria-label="Copy code">${COPY_SVG}<span>Copy</span></button></span></div>`;
      return `${openTag}${attrs}${gt}${wrapped}</code>${toolbarHtml}</pre>`;
    }
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHARE_PLATFORMS = [
  {
    key: 'twitter', label: 'Twitter / X',
    icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    key: 'linkedin', label: 'LinkedIn',
    icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    key: 'facebook', label: 'Facebook',
    icon: 'M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z',
  },
];

const DIFF_CONFIG = {
  advanced:     { label: 'Advanced',     dot: 'bg-neon-violet', text: 'text-neon-violet', border: 'border-neon-violet/30', bg: 'bg-neon-violet/10' },
  intermediate: { label: 'Intermediate', dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-400/25',   bg: 'bg-amber-400/8'    },
  beginner:     { label: 'Beginner',     dot: 'bg-neon-lime',   text: 'text-neon-lime',   border: 'border-neon-lime/25',   bg: 'bg-neon-lime/8'    },
};

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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
        'group relative flex w-full items-center justify-between gap-2 py-2 pr-2 text-left transition-all duration-150',
        level === 3 ? 'pl-8' : 'pl-3',
        isActive
          ? 'text-neon-violet'
          : isPast
            ? 'text-zinc-500 hover:text-zinc-300'
            : 'text-zinc-600 hover:text-zinc-400'
      )}
    >
      {isActive && (
        <span className="bg-neon-violet absolute inset-y-1 left-0 w-0.5 rounded-full" />
      )}
      <span className="flex items-center gap-2 min-w-0">
        {level === 2 && sectionNum != null && (
          <span className={cn(
            'shrink-0 font-mono text-[9px] font-bold tabular-nums',
            isActive ? 'text-neon-violet/70' : isPast ? 'text-zinc-600' : 'text-zinc-700'
          )}>
            {String(sectionNum).padStart(2, '0')}
          </span>
        )}
        {level === 3 && (
          <span className={cn(
            'mt-0.5 h-1 w-1 shrink-0 rounded-full',
            isActive ? 'bg-neon-violet' : isPast ? 'bg-zinc-600' : 'bg-zinc-700'
          )} />
        )}
        <span className={cn(
          'line-clamp-2 leading-snug font-heading text-[10px] font-bold uppercase tracking-widest',
          isActive && 'font-black'
        )}>
          {section.title}
        </span>
      </span>
      <svg
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-transform',
          isActive ? 'text-neon-violet translate-x-0.5' : 'text-zinc-700 hidden group-hover:block group-hover:text-zinc-500'
        )}
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── Related Roadmap Card ─────────────────────────────────────────────────────

function RelatedRoadmapCard({ roadmap }) {
  const diff = (roadmap.difficulty || 'beginner').toLowerCase();
  const cfg = DIFF_CONFIG[diff] || DIFF_CONFIG.beginner;

  return (
    <Link
      href={`/roadmaps/${roadmap.slug || roadmap.id}`}
      className="holographic-card group block p-6 rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-violet hover:border-neon-violet/40"
    >
      <div className="font-mono text-neon-violet text-[9px] mb-4 font-bold tracking-widest uppercase">
        {roadmap.category || 'Roadmap'}
      </div>
      <h4 className="text-xl font-heading font-black text-white group-hover:text-neon-violet transition-colors uppercase tracking-tighter line-clamp-2">
        {roadmap.title}
      </h4>
      <div className="mt-6 flex items-center gap-4 text-[9px] font-mono tracking-widest uppercase">
        <span className={cn('flex items-center gap-1.5', cfg.text)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
          {cfg.label}
        </span>
        {(roadmap.views ?? 0) > 0 && (
          <>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span className="text-zinc-600">{roadmap.views.toLocaleString()} views</span>
          </>
        )}
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RoadmapDetailClient({ roadmap: propRoadmap = {}, relatedRoadmaps = [] }) {
  const roadmap = propRoadmap;

  const [activeSection, setActiveSection]     = useState('');
  const [scrollProgress, setScrollProgress]   = useState(0);
  const [viewCount, setViewCount]             = useState(0);
  const [tocCollapsed, setTocCollapsed]       = useState(false);
  const [showMobileTOC, setShowMobileTOC]     = useState(false);
  useScrollLock(showMobileTOC);
  const [copied, setCopied]                   = useState(false);
  const [tableOfContents, setTableOfContents] = useState([]);
  const contentRef = useRef(null);
  const tocNavRef  = useRef(null);

  // ── Normalize roadmap ─────────────────────────────────────────────────────
  const meta = useMemo(() => {
    const authorName = roadmap.users?.full_name || 'NEUPC Team';
    const contentSource =
      typeof roadmap.content === 'string'
        ? roadmap.content
        : (roadmap.content?.html ?? roadmap.content?.text ?? '');
    const prerequisites = Array.isArray(roadmap.prerequisites) ? roadmap.prerequisites : [];
    const thumbnail = roadmap.thumbnail || null;

    return {
      title: roadmap.title || 'Untitled Roadmap',
      description: roadmap.description || '',
      category: roadmap.category || 'General',
      difficulty: (roadmap.difficulty || 'beginner').toLowerCase(),
      estimatedDuration: roadmap.estimated_duration || '',
      authorName,
      authorInitials: getInitials(authorName),
      authorAvatar: roadmap.users?.avatar_url || null,
      date: roadmap.created_at
        ? new Date(roadmap.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      readTimeLabel: contentSource ? getReadTimeLabel(contentSource) : null,
      prerequisites,
      views: roadmap.views ?? 0,
      thumbnail,
      content: contentSource,
      featured: roadmap.is_featured ?? false,
    };
  }, [roadmap]);

  const diffCfg = DIFF_CONFIG[meta.difficulty] || DIFF_CONFIG.beginner;

  // ── View count ────────────────────────────────────────────────────────────
  useEffect(() => {
    setViewCount(meta.views || 0);
    if (!roadmap.id) return;
    const run = async () => {
      try {
        const fd = new FormData();
        fd.set('id', String(roadmap.id));
        const res = await incrementRoadmapViewAction(fd);
        if (res?.views) setViewCount(res.views);
        else setViewCount((p) => p + 1);
      } catch {
        setViewCount((p) => p + 1);
      }
    };
    run();
  }, [roadmap.id, meta.views]);

  // ── Syntax highlighting ───────────────────────────────────────────────────
  const enhancedContent = useMemo(() => highlightCodeBlocks(meta.content), [meta.content]);

  // ── Copy button delegation ────────────────────────────────────────────────
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handleClick = (e) => {
      const btn = e.target.closest('.code-copy-btn');
      if (!btn) return;
      const code = btn.closest('pre')?.querySelector('code');
      if (!code) return;
      navigator.clipboard.writeText(code.textContent || '').then(() => {
        btn.classList.add('copied');
        btn.innerHTML = `${CHECK_SVG}<span>Copied</span>`;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = `${COPY_SVG}<span>Copy</span>`;
        }, 2000);
      });
    };
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [enhancedContent]);

  // ── TOC extraction ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!contentRef.current) return;
    const headings = contentRef.current.querySelectorAll('h2[id], h3[id]');
    const toc = Array.from(headings).map((h) => ({
      id: h.id,
      title: h.textContent,
      level: h.tagName === 'H3' ? 3 : 2,
    }));
    if (toc.length) { setTableOfContents(toc); setActiveSection(toc[0].id); }
  }, [enhancedContent]);

  // ── Scroll tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
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

  // ── Auto-scroll TOC to active ─────────────────────────────────────────────
  useEffect(() => {
    if (!tocNavRef.current || !activeSection) return;
    tocNavRef.current.querySelector(`[data-section-id="${activeSection}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeSection]);

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      const nav = document.querySelector('[data-sticky-nav]');
      const offset = (nav?.offsetHeight ?? 60) + 16;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    }
    setShowMobileTOC(false);
  }, []);

  const handleShare = useCallback((platform) => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const map = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(meta.title)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    if (map[platform]) window.open(map[platform], '_blank', 'width=600,height=400');
  }, [meta.title]);

  const handleCopy = useCallback(() => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (!roadmap?.title) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0A0B] text-white">
        <div className="text-center">
          <div className="mb-6 font-mono text-[10px] tracking-[0.4em] text-neon-violet uppercase">ERROR_404</div>
          <h1 className="mb-3 font-heading text-5xl font-black uppercase text-white tracking-tighter">
            Path Not Found
          </h1>
          <p className="mb-8 font-mono text-sm tracking-wider text-zinc-500">
            This roadmap doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/roadmaps"
            className="inline-flex items-center gap-2 rounded-full bg-neon-lime px-8 py-3 font-heading text-[10px] font-black tracking-widest text-black uppercase transition-all shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.7)]"
          >
            ← Back to Roadmaps
          </Link>
        </div>
      </main>
    );
  }

  const hasTOC = tableOfContents.length > 0;
  const activeIdx = tableOfContents.findIndex((t) => t.id === activeSection);
  let h2Count = 0;
  const tocItems = tableOfContents.map((s, i) => {
    if (s.level === 2) h2Count++;
    return { ...s, isPast: i < activeIdx, sectionNum: s.level === 2 ? h2Count : null };
  });

  return (
    <main className="relative min-h-screen bg-[#0A0A0B] text-white">

      {/* ── Reading Progress Bar ─────────────────────────────────────────────── */}
      <div className="fixed top-0 right-0 left-0 z-50 h-0.5 bg-white/5">
        <div
          className="h-full transition-all duration-150"
          style={{
            width: `${scrollProgress}%`,
            background: 'linear-gradient(to right, #8B5CF6, #8B5CF6cc, #10B981)',
            boxShadow: '0 0 8px rgba(139,92,246,0.6)',
          }}
        />
      </div>

      {/* ── Sticky Mini Nav ──────────────────────────────────────────────────── */}
      <div
        data-sticky-nav
        className="sticky top-0 z-40 border-b border-[#27272A]/50 bg-[#0A0A0B]/80 backdrop-blur-xl"
      >
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/roadmaps"
                className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/3 px-3 py-1.5 font-heading text-[10px] tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
              >
                <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All Roadmaps
              </Link>
              <span className="hidden text-zinc-700 sm:block">/</span>
              {meta.category && (
                <span className="hidden rounded-full border border-neon-violet/25 bg-neon-violet/8 px-3 py-1 font-mono text-[9px] font-bold tracking-widest text-neon-violet uppercase sm:block">
                  {meta.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-[10px] tracking-wider text-zinc-600 tabular-nums uppercase md:block">
                {Math.round(scrollProgress)}%{meta.readTimeLabel ? ` · ${meta.readTimeLabel}` : ''}
              </span>
              {hasTOC && (
                <button
                  onClick={() => setShowMobileTOC(!showMobileTOC)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3F3F46] bg-white/5 text-zinc-400 transition-all hover:border-neon-violet/30 hover:text-neon-violet xl:hidden"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile TOC Overlay ────────────────────────────────────────────────── */}
      {showMobileTOC && hasTOC && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMobileTOC(false)} />
          <div className="holographic-card no-lift absolute top-16 right-4 left-4 overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
              <h3 className="font-mono text-[10px] font-bold tracking-[0.6em] text-neon-violet uppercase">Learning_Path</h3>
              <button onClick={() => setShowMobileTOC(false)} className="text-zinc-500 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="max-h-80 overflow-y-auto px-3 py-3">
              {tocItems.map((s) => (
                <TOCItem
                  key={s.id} section={s} level={s.level}
                  isActive={activeSection === s.id} isPast={s.isPast}
                  sectionNum={s.sectionNum} onClick={() => scrollToSection(s.id)}
                />
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20">

        {/* Background cover image */}
        {meta.thumbnail && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={driveImageUrl(meta.thumbnail)}
              alt=""
              aria-hidden
              className="h-full w-full object-cover opacity-10 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#05060B]/70 via-[#05060B]/40 to-[#05060B]" />
          </div>
        )}

        {/* Ambient glows — same as event/blog pages */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="grid-overlay absolute inset-0 opacity-15" />
          <div className="bg-neon-violet/8 absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full blur-[140px]" />
          <div className="bg-neon-lime/6 absolute top-1/2 -right-32 h-[400px] w-[400px] rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Back link */}
          <nav className="mb-6 sm:mb-8">
            <Link
              href="/roadmaps"
              className="group inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/3 px-4 py-2 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase backdrop-blur-sm transition-all hover:border-neon-lime/30 hover:text-neon-lime sm:text-[11px]"
            >
              <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Roadmaps
            </Link>
          </nav>

          {/* Category + featured eyebrow */}
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
            <span className={cn(
              'inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] font-bold tracking-widest uppercase sm:text-[10px]',
              meta.featured
                ? 'border-neon-lime/30 bg-neon-lime/10 text-neon-lime'
                : 'border-neon-violet/30 bg-neon-violet/10 text-neon-violet'
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', meta.featured ? 'bg-neon-lime' : 'bg-neon-violet')} />
              {meta.featured ? 'Featured' : meta.category}
            </span>
            <span className={cn(
              'inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] font-bold tracking-widest uppercase sm:text-[10px]',
              diffCfg.bg, diffCfg.border, diffCfg.text
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', diffCfg.dot)} />
              {diffCfg.label}
            </span>
            {meta.estimatedDuration && (
              <span className="inline-flex min-h-[28px] items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[9px] tracking-widest text-zinc-400 uppercase sm:text-[10px]">
                ⏱ {meta.estimatedDuration}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="kinetic-headline max-w-4xl font-heading text-[clamp(1.9rem,5vw+0.5rem,5.5rem)] font-black text-white uppercase [line-height:1.05] sm:[line-height:0.95]">
            {meta.title}
          </h1>

          {/* Author + meta chips — identical pattern to blog/event pages */}
          <div className="mt-6 grid grid-cols-2 gap-2.5 border-t border-white/8 pt-6 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3 sm:pt-8">
            <div className="col-span-2 flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 backdrop-blur-sm sm:col-span-1 sm:px-4">
              <div className="h-8 w-8 shrink-0 rounded-full border border-neon-violet/30 p-0.5">
                {meta.authorAvatar ? (
                  <SafeImg
                    src={driveImageUrl(meta.authorAvatar)}
                    alt={meta.authorName}
                    className="h-full w-full rounded-full object-cover"
                    fallback=""
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-neon-violet/20 font-heading text-[10px] font-black text-neon-violet">
                    {meta.authorInitials}
                  </div>
                )}
              </div>
              <div>
                <span className="block font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">Curator</span>
                <span className="mt-0.5 block font-heading text-[13px] font-bold text-white sm:text-sm">{meta.authorName}</span>
              </div>
            </div>
            {meta.date && (
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 backdrop-blur-sm sm:px-4">
                <span className="block font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">Published</span>
                <span className="mt-0.5 block font-heading text-[13px] font-bold text-white sm:text-sm">{meta.date}</span>
              </div>
            )}
            {meta.readTimeLabel && (
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 backdrop-blur-sm sm:px-4">
                <span className="block font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">Read Time</span>
                <span className="mt-0.5 block font-heading text-[13px] font-bold text-white sm:text-sm">{meta.readTimeLabel}</span>
              </div>
            )}
            {viewCount > 0 && (
              <div className="rounded-xl border border-neon-lime/15 bg-neon-lime/5 px-3 py-2.5 backdrop-blur-sm sm:px-4">
                <span className="block font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">Views</span>
                <span className="mt-0.5 block font-heading text-[13px] font-bold text-neon-lime sm:text-sm">{viewCount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {meta.description && (
            <p className="mt-6 max-w-3xl text-sm leading-[1.9] text-zinc-400 sm:mt-8 sm:text-base lg:text-[17px]">
              {meta.description}
            </p>
          )}
        </div>
      </section>

      {/* ── Section separator ─────────────────────────────────────────────────── */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      {/* ── Main Reading Layout ───────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className={cn(
          'flex transition-[gap] duration-300',
          !hasTOC && 'justify-center',
          hasTOC && (tocCollapsed ? 'gap-4 lg:gap-6' : 'gap-8 lg:gap-12')
        )}>

          {/* ── Left sidebar: TOC ─────────────────────────────────────────────── */}
          {hasTOC && (
            <aside className={cn(
              'hidden shrink-0 transition-[width] duration-300 ease-out xl:block',
              tocCollapsed ? 'xl:w-12' : 'xl:w-64'
            )}>
              <div className="sticky top-20">
                {tocCollapsed ? (
                  <div className="holographic-card no-lift flex flex-col items-center gap-3 rounded-2xl px-1 py-4">
                    <button
                      onClick={() => setTocCollapsed(false)}
                      title="Expand contents"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-neon-violet/10 hover:text-neon-violet"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </button>
                    <div className="relative h-32 w-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="bg-neon-violet absolute top-0 left-0 w-full rounded-full transition-all duration-300"
                        style={{ height: `${scrollProgress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-zinc-500 tabular-nums">{Math.round(scrollProgress)}%</span>
                  </div>
                ) : (
                  <div
                    className="overflow-hidden rounded-[2rem] border border-neon-violet/10"
                    style={{
                      background: 'rgba(20, 20, 22, 0.7)',
                      backdropFilter: 'blur(40px)',
                      boxShadow: '0 0 60px 0 rgba(139, 92, 246, 0.1)',
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-[#27272A]/50 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <svg className="h-3.5 w-3.5 text-neon-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        <span className="font-mono text-[10px] font-bold tracking-[0.4em] text-neon-violet uppercase">Learning_Path</span>
                        <span className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 tabular-nums">
                          {tocItems.filter((s) => s.level === 2).length}
                        </span>
                      </div>
                      <button
                        onClick={() => setTocCollapsed(true)}
                        title="Collapse"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition-all hover:bg-white/8 hover:text-neon-violet"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    </div>
                    <nav
                      ref={tocNavRef}
                      className="max-h-[calc(100dvh-200px)] space-y-0.5 overflow-y-auto p-3"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                    >
                      {tocItems.map((s) => (
                        <TOCItem
                          key={s.id} section={s} level={s.level}
                          isActive={activeSection === s.id} isPast={s.isPast}
                          sectionNum={s.sectionNum} onClick={() => scrollToSection(s.id)}
                        />
                      ))}
                    </nav>
                    <div className="border-t border-[#27272A]/50 px-6 py-4">
                      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-zinc-600">
                        <span>{activeIdx >= 0 ? activeIdx + 1 : 0} / {tableOfContents.length} sections</span>
                        <span className="font-bold text-neon-violet tabular-nums">{Math.round(scrollProgress)}%</span>
                      </div>
                      <div className="h-0.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="bg-neon-violet h-full rounded-full transition-all duration-300"
                          style={{ width: `${scrollProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* ── Article ───────────────────────────────────────────────────────── */}
          <article className={cn('w-full min-w-0 transition-all duration-300', hasTOC && (tocCollapsed ? 'lg:flex-1' : 'lg:w-2/3'))}>

            {/* Prerequisites */}
            {meta.prerequisites.length > 0 && (
              <div className="holographic-card no-lift mb-6 rounded-2xl p-5 sm:p-6 md:p-8">
                <h2 className="mb-4 flex items-center gap-2.5 font-heading text-lg font-black uppercase tracking-tighter text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-sm">📋</span>
                  Prerequisites
                </h2>
                <ul className="space-y-2.5">
                  {meta.prerequisites.map((prereq, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                      <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/6 font-mono text-[10px] font-bold text-zinc-500">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{prereq}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Content */}
            {enhancedContent ? (
              <div
                ref={contentRef}
                className="holographic-card no-lift blog-content mx-auto rounded-2xl p-4 transition-all duration-300 sm:p-6 md:p-8 lg:p-10"
                dangerouslySetInnerHTML={{ __html: enhancedContent }}
              />
            ) : (
              <div className="holographic-card no-lift flex flex-col items-center justify-center rounded-2xl p-16 text-center">
                <div className="mb-4 text-5xl">📭</div>
                <p className="font-mono text-sm tracking-wider text-zinc-500">
                  No learning content available yet. Check back soon!
                </p>
              </div>
            )}

            {/* Article footer: share */}
            <div className="holographic-card no-lift mt-8 rounded-2xl p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/6 pb-5">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-mono text-sm text-zinc-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="tabular-nums">{viewCount.toLocaleString()}</span> views
                  </span>
                  {meta.readTimeLabel && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="font-mono text-sm text-zinc-500">⏱ {meta.readTimeLabel} read</span>
                    </>
                  )}
                </div>
                <span className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold tracking-[0.18em] uppercase',
                  diffCfg.bg, diffCfg.border, diffCfg.text
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', diffCfg.dot)} />
                  {diffCfg.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Share:</span>
                {SHARE_PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleShare(p.key)}
                    title={`Share on ${p.label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3F3F46] bg-white/5 text-zinc-400 transition-all hover:border-neon-emerald/40 hover:text-neon-emerald"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d={p.icon} />
                    </svg>
                  </button>
                ))}
                <button
                  onClick={handleCopy}
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-full border px-3 font-mono text-[10px] font-bold transition-all',
                    copied
                      ? 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime'
                      : 'border-[#3F3F46] bg-white/5 text-zinc-400 hover:border-neon-violet/30 hover:text-neon-violet'
                  )}
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy link
                    </>
                  )}
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* ── Related Roadmaps ───────────────────────────────────────────────────── */}
      {relatedRoadmaps.length > 0 && (
        <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
          <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="bg-neon-violet/5 absolute top-1/4 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full blur-[150px]" />
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="bg-neon-lime h-px w-6 shrink-0" />
                  <span className="font-mono text-[10px] font-bold tracking-[0.4em] uppercase sm:text-[11px] text-neon-lime">Continue Learning</span>
                </div>
                <h2 className="kinetic-headline mt-3 font-heading text-2xl font-black text-white uppercase sm:text-3xl lg:text-4xl">
                  Related Roadmaps
                </h2>
              </div>
              <Link
                href="/roadmaps"
                className="w-fit shrink-0 rounded-full border border-white/10 bg-white/4 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-colors hover:border-neon-violet/40 hover:text-neon-violet sm:px-7 sm:py-3 sm:text-[11px]"
              >
                All Roadmaps →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedRoadmaps.map((rm) => (
                <RelatedRoadmapCard key={rm.id} roadmap={rm} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA — matches event and blog page pattern exactly ─────────────────── */}
      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="grid-overlay absolute inset-0 opacity-15" />
          <div className="bg-neon-lime/4 absolute top-1/2 left-1/2 h-[400px] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-full blur-[130px]" />
        </div>
        <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-neon-lime/15 bg-gradient-to-br from-neon-lime/5 via-transparent to-neon-violet/5 p-6 sm:rounded-3xl sm:p-10 lg:p-14">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3 md:items-center">
              <div className="md:col-span-2">
                <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.4em] text-neon-lime uppercase sm:text-[11px]">
                  /// Start Your Journey
                </p>
                <h2 className="font-heading text-2xl font-black leading-tight text-white uppercase sm:text-3xl lg:text-4xl">
                  Ready to follow this roadmap?
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400 sm:mt-4">
                  Join NEUPC to access resources, connect with mentors, and track your learning progress alongside a thriving community of programmers.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:flex-col md:items-end">
                <JoinButton
                  href="/join"
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-neon-lime px-6 py-3 font-heading text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] transition-shadow hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.7)] sm:min-h-0 sm:px-8 sm:py-3.5 sm:text-[11px]"
                >
                  Join the Club
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </JoinButton>
                <Link
                  href="/roadmaps"
                  className="text-center font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase underline-offset-4 transition-colors hover:text-zinc-200 hover:underline sm:text-[11px]"
                >
                  Browse Roadmaps →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </main>
  );
}
