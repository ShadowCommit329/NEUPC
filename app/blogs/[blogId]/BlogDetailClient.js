/**
 * @file Blog detail page client component — professional redesign.
 * Full-bleed cover image hero, 3-column reading layout, sticky TOC,
 * reading progress, like/share sidebar, related articles with thumbnails.
 *
 * @module BlogDetailClient
 */

'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useTransition,
} from 'react';
import Link from 'next/link';
import SafeImg from '@/app/_components/ui/SafeImg';
import CodePlayground from '@/app/_components/ui/CodePlayground';
import { cn, getInitials, driveImageUrl } from '@/app/_lib/utils';
import { getCategoryConfig, getCategoryLabel } from '@/app/_lib/blog-config';
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
      const tagRe = /<(\/?)span([^>]*)>/g;
      let m;
      while ((m = tagRe.exec(raw)) !== null) {
        if (m[1] === '/') openSpans.pop();
        else openSpans.push(`<span${m[2]}>`);
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

const PLAY_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.98-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"/></svg>';

const EXECUTABLE_LANGUAGES = new Set([
  'c',
  'cpp',
  'csharp',
  'go',
  'java',
  'javascript',
  'php',
  'python',
  'ruby',
  'rust',
  'typescript',
]);

const LANGUAGE_LABELS = {
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  java: 'Java',
  javascript: 'JavaScript',
  php: 'PHP',
  python: 'Python',
  ruby: 'Ruby',
  rust: 'Rust',
  typescript: 'TypeScript',
};

function normalizeCodeLanguage(language) {
  const normalized = String(language || '')
    .trim()
    .toLowerCase();

  const aliases = {
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    cplusplus: 'cpp',
    csharp: 'csharp',
    cs: 'csharp',
    go: 'go',
    golang: 'go',
    java: 'java',
    javascript: 'javascript',
    js: 'javascript',
    php: 'php',
    py: 'python',
    python: 'python',
    rb: 'ruby',
    ruby: 'ruby',
    rs: 'rust',
    rust: 'rust',
    ts: 'typescript',
    typescript: 'typescript',
  };

  return aliases[normalized] || normalized;
}

function canExecuteLanguage(language) {
  return EXECUTABLE_LANGUAGES.has(normalizeCodeLanguage(language));
}

function getCodeLanguageLabel(language) {
  const normalized = normalizeCodeLanguage(language);
  return LANGUAGE_LABELS[normalized] || normalized || 'Code';
}

/**
 * Process an HTML string: find all <pre><code> blocks and apply
 * syntax highlighting + line-number wrapping directly in the markup.
 * Works synchronously on the string — no DOM needed.
 */
function highlightCodeBlocks(htmlString) {
  if (!htmlString) return htmlString;
  const knownLangs = lowlight.listLanguages();
  let blockIndex = 0;
  return htmlString.replace(
    /(<pre[^>]*>\s*<code)([^>]*)(>)([\s\S]*?)(<\/code>\s*<\/pre>)/gi,
    (_match, openTag, attrs, gt, codeContent, _closeTag) => {
      blockIndex++;
      // Decode HTML entities for highlighting
      const decoded = codeContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Detect language from class attribute
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
            // Inject the detected language class
            if (attrs.includes('class="')) {
              attrs = attrs.replace(/class="/, `class="language-${lang} `);
            } else {
              attrs = ` class="language-${lang}"` + attrs;
            }
          }
        }
      } catch {
        highlighted = codeContent; // fallback: leave untouched
      }

      const wrapped = wrapCodeLines(highlighted);
      const normalized = normalizeCodeLanguage(lang || '');

      // Build toolbar HTML — sits in the tab-bar area
      let toolbarHtml = `<div class="code-block-toolbar" data-block-index="${blockIndex}">`;
      toolbarHtml += '<span class="code-toolbar-actions">';
      toolbarHtml += `<button type="button" class="code-toolbar-btn code-copy-btn" aria-label="Copy code">${COPY_SVG}<span>Copy</span></button>`;
      if (canExecuteLanguage(normalized)) {
        toolbarHtml += `<button type="button" class="code-toolbar-btn code-run-btn" data-lang="${normalized}" aria-label="Run ${getCodeLanguageLabel(normalized)} code">${PLAY_SVG}<span>Run</span></button>`;
      }
      toolbarHtml += '</span></div>';

      return `${openTag}${attrs}${gt}${wrapped}</code>${toolbarHtml}</pre>`;
    }
  );
}

import BlogComments from '@/app/_components/ui/BlogComments';
import { incrementViewAction, likePostAction } from '@/app/_lib/blog-actions';
import { useScrollLock } from '@/app/_lib/hooks';

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_SIZES = [
  { id: 'sm', label: 'S', value: '0.875rem' },
  { id: 'md', label: 'M', value: '1rem' },
  { id: 'lg', label: 'L', value: '1.125rem' },
  { id: 'xl', label: 'XL', value: '1.25rem' },
  { id: 'xxl', label: '2X', value: '1.375rem' },
];

const FONT_FAMILIES = [
  { id: 'sans', label: 'Sans', style: '"Inter", system-ui, sans-serif' },
  { id: 'serif', label: 'Serif', style: 'Georgia, "Times New Roman", serif' },
  {
    id: 'novel',
    label: 'Novel',
    style: '"Palatino Linotype", Palatino, Georgia, serif',
  },
  { id: 'mono', label: 'Mono', style: '"JetBrains Mono", Consolas, monospace' },
];

const BG_THEMES = [
  { id: 'dark', bg: '#060810', label: 'Dark' },
  { id: 'midnight', bg: '#02040d', label: 'Midnight' },
  { id: 'warm', bg: '#0f0c09', label: 'Warm' },
  { id: 'sepia', bg: '#1a1208', label: 'Sepia' },
  { id: 'forest', bg: '#07100c', label: 'Forest' },
  { id: 'slate', bg: '#0a0d14', label: 'Slate' },
];

const LINE_HEIGHTS = { compact: '1.6', relaxed: '1.85', spacious: '2.15' };
const LETTER_SPACINGS = { tight: '-0.01em', normal: '0em', wide: '0.04em' };
const PARA_SPACINGS = { tight: '0.5rem', normal: '1rem', loose: '1.75rem' };

const CONTENT_WIDTHS = {
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  wide: 'max-w-5xl',
  full: 'max-w-none',
};

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

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getExcerptFromContent(content, maxLen = 180) {
  const plain = stripHtml(content);
  if (!plain) return '';
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trimEnd()}...`;
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim()).filter(Boolean);
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getReadTimeLabel(blog, contentSource) {
  const rawRT = blog.read_time || blog.readTime;
  if (rawRT && String(rawRT).trim()) {
    const text = String(rawRT).trim();
    return text.includes('min') ? text : `${text} min`;
  }

  const words = stripHtml(contentSource).split(' ').filter(Boolean).length;
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

// ─── Related Blog Card ────────────────────────────────────────────────────────

function RelatedBlogCard({ blog }) {
  const cfg = getCategoryConfig(blog.category);

  return (
    <Link
      href={`/blogs/${blog.slug || blog.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/5 hover:shadow-lg hover:shadow-black/30"
    >
      {blog.thumbnail ? (
        <div className="relative aspect-video overflow-hidden">
          <SafeImg
            src={driveImageUrl(blog.thumbnail)}
            alt={blog.title || ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            fallback="/placeholder-blog.svg"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          {blog.category && (
            <span
              className={cn(
                'absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm',
                cfg.badge
              )}
            >
              <span>{cfg.emoji}</span>
              {cfg.label}
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-t-2xl bg-white/4 text-3xl">
          {cfg.emoji}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {!blog.thumbnail && blog.category && (
          <span
            className={cn(
              'flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              cfg.badge
            )}
          >
            <span>{cfg.emoji}</span>
            {cfg.label}
          </span>
        )}
        <h4 className="line-clamp-2 text-sm leading-snug font-semibold text-gray-200 transition-colors group-hover:text-white">
          {blog.title}
        </h4>
        <div className="mt-auto flex items-center gap-2.5 border-t border-white/5 pt-3 text-[11px] text-gray-600">
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            {blog.read_time || blog.readTime || '5'} min read
          </span>
          {(blog.views ?? 0) > 0 && (
            <>
              <span>·</span>
              <span>{blog.views.toLocaleString()} views</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BlogDetailClient({
  blog = {},
  relatedBlogs = [],
  initialComments = [],
  currentUser = null,
}) {
  const [activeSection, setActiveSection] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  // like + view
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [liking, startLikeTransition] = useTransition();
  // reading prefs
  const [fontSize, setFontSize] = useState('md');
  const [fontFamily, setFontFamily] = useState('sans');
  const [bgTheme, setBgTheme] = useState('dark');
  const [lineHeight, setLineHeight] = useState('relaxed');
  const [letterSpacing, setLetterSpacing] = useState('normal');
  const [paraSpacing, setParaSpacing] = useState('normal');
  const [textAlign, setTextAlign] = useState('left');
  const [contentWidth, setContentWidth] = useState('full');
  const [focusMode, setFocusMode] = useState(false);
  // ui
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [showReadingSettings, setShowReadingSettings] = useState(false);
  const [showMobileTOC, setShowMobileTOC] = useState(false);
  useScrollLock(showMobileTOC);
  const [copied, setCopied] = useState(false);
  const [tableOfContents, setTableOfContents] = useState([]);
  const [runnerState, setRunnerState] = useState({
    isOpen: false,
    blockIndex: null,
    language: '',
    originalCode: '',
    draftCode: '',
    stdin: '',
  });
  const [runnerResult, setRunnerResult] = useState(null);
  const [runnerError, setRunnerError] = useState('');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatError, setFormatError] = useState('');
  const contentRef = useRef(null);
  const tocNavRef = useRef(null);

  // ── Normalise blog fields ──────────────────────────────────────────────────
  const meta = useMemo(() => {
    const authorName =
      blog.users?.full_name ||
      blog.author?.full_name ||
      blog.author?.name ||
      blog.author_name ||
      'NEUPC Team';

    const contentSource =
      blog.content || blog.body || blog.description || blog.summary || '';
    const excerpt =
      blog.excerpt ||
      blog.summary ||
      blog.description ||
      getExcerptFromContent(contentSource);

    const category =
      blog.category?.name || blog.category_label || blog.category || 'Article';

    const publishedDate =
      blog.published_at || blog.publish_date || blog.created_at;

    const thumbnail =
      blog.thumbnail ||
      blog.cover_image ||
      blog.featured_image ||
      blog.image ||
      blog.banner ||
      null;

    return {
      title: blog.title || blog.name || 'Untitled',
      excerpt,
      category,
      authorName,
      authorInitials: getInitials(authorName),
      authorAvatar:
        blog.users?.avatar_url ||
        blog.author?.avatar_url ||
        blog.author_avatar ||
        null,
      blogDate: publishedDate
        ? new Date(publishedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '',
      readTimeLabel: getReadTimeLabel(blog, contentSource),
      tags: normalizeTags(blog.tags),
      views: blog.views ?? 0,
      likes: blog.likes ?? 0,
      thumbnail,
      content: contentSource,
      featured: blog.is_featured ?? false,
    };
  }, [blog]);

  // ── Sync like/view counts from meta; check localStorage; increment views ──
  useEffect(() => {
    setLikeCount(meta.likes);
    setViewCount(meta.views + 1); // optimistic: count this visit
    const key = `neupc-liked-blog-${blog.id}`;
    setLiked(!!localStorage.getItem(key));
    // Fire-and-forget view increment
    const fd = new FormData();
    fd.set('id', String(blog.id));
    incrementViewAction(fd).catch(() => {});
  }, [blog.id, meta.likes, meta.views]);

  // ── Pre-process content: syntax highlighting + line numbers (synchronous) ──
  const enhancedContent = useMemo(
    () => highlightCodeBlocks(meta.content),
    [meta.content]
  );

  const openCodeRunner = useCallback((payload) => {
    setRunnerResult(null);
    setRunnerError('');
    setRunnerState({
      isOpen: true,
      blockIndex: payload.blockIndex,
      language: normalizeCodeLanguage(payload.language),
      originalCode: payload.code,
      draftCode: payload.code,
      stdin: '',
    });
  }, []);

  const closeCodeRunner = useCallback(() => {
    setRunnerState((prev) => ({
      ...prev,
      isOpen: false,
    }));
    setRunnerResult(null);
    setRunnerError('');
    setFormatError('');
    setIsRunningCode(false);
  }, []);

  const handleRunnerExecute = useCallback(async () => {
    const language = normalizeCodeLanguage(runnerState.language);
    if (!canExecuteLanguage(language)) {
      setRunnerError(
        'This code block language is not supported by the online runner.'
      );
      return;
    }

    if (!runnerState.draftCode.trim()) {
      setRunnerError('Add some code before running this block.');
      return;
    }

    setIsRunningCode(true);
    setRunnerError('');
    setRunnerResult(null);

    try {
      const response = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code: runnerState.draftCode,
          stdin: runnerState.stdin,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to execute code.');
      }

      setRunnerResult(data?.result || null);
    } catch (error) {
      setRunnerError(error?.message || 'Failed to execute code.');
    } finally {
      setIsRunningCode(false);
    }
  }, [runnerState.draftCode, runnerState.language, runnerState.stdin]);

  const FORMATTABLE_LANGUAGES = new Set([
    // Prettier built-in
    'javascript',
    'typescript',
    'jsx',
    'tsx',
    'css',
    'scss',
    'html',
    'json',
    'yaml',
    'markdown',
    // Prettier + plugin
    'java',
    'php',
    // sql-formatter
    'sql',
    'mysql',
    'postgresql',
    // Basic normaliser (tab→spaces, trailing whitespace)
    'python',
    'go',
    'rust',
    'c',
    'cpp',
    'c++',
  ]);

  const handleFormat = useCallback(async () => {
    if (!runnerState.draftCode.trim()) return;
    setIsFormatting(true);
    setFormatError('');
    try {
      const res = await fetch('/api/code/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: runnerState.draftCode,
          language: runnerState.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Format failed.');
      setRunnerState((prev) => ({ ...prev, draftCode: data.formatted }));
    } catch (err) {
      setFormatError(err?.message || 'Could not format code.');
    } finally {
      setIsFormatting(false);
    }
  }, [runnerState.draftCode, runnerState.language]);

  // ── Event delegation for code-block toolbar (Copy + Run) ──────────────────
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleClick = (e) => {
      // ── Copy button ──
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
        return;
      }

      // ── Run button ──
      const runBtn = e.target.closest('.code-run-btn');
      if (runBtn) {
        const pre = runBtn.closest('pre');
        if (!pre) return;
        const code = pre.querySelector('code');
        if (!code) return;
        const toolbar = runBtn.closest('.code-block-toolbar');
        const blockIndex = toolbar
          ? Number(toolbar.dataset.blockIndex) || 1
          : 1;
        const language = runBtn.dataset.lang || '';
        openCodeRunner({
          blockIndex,
          language,
          code: code.textContent || '',
        });
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [openCodeRunner]);

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
  }, [meta.content]);

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

  // ── Persist / restore reading preferences ─────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('neupc-reading-prefs');
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.fontSize) setFontSize(p.fontSize);
      if (p.fontFamily) setFontFamily(p.fontFamily);
      if (p.bgTheme) setBgTheme(p.bgTheme);
      if (p.lineHeight) setLineHeight(p.lineHeight);
      if (p.letterSpacing) setLetterSpacing(p.letterSpacing);
      if (p.paraSpacing) setParaSpacing(p.paraSpacing);
      if (p.textAlign) setTextAlign(p.textAlign);
      if (p.contentWidth) setContentWidth(p.contentWidth);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'neupc-reading-prefs',
        JSON.stringify({
          fontSize,
          fontFamily,
          bgTheme,
          lineHeight,
          letterSpacing,
          paraSpacing,
          textAlign,
          contentWidth,
        })
      );
    } catch {
      /* ignore */
    }
  }, [
    fontSize,
    fontFamily,
    bgTheme,
    lineHeight,
    letterSpacing,
    paraSpacing,
    textAlign,
    contentWidth,
  ]);

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

  const handleLike = useCallback(() => {
    if (liked || liking) return;
    startLikeTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(blog.id));
      const res = await likePostAction(fd);
      if (res?.likes) {
        setLikeCount(res.likes);
        setLiked(true);
        try {
          localStorage.setItem(`neupc-liked-blog-${blog.id}`, '1');
        } catch {
          /* ignore */
        }
      }
    });
  }, [liked, liking, blog.id]);

  // ── Not found guard ────────────────────────────────────────────────────────
  if (!blog?.title) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060810] text-white">
        <div className="text-center">
          <div className="mb-4 text-6xl">📭</div>
          <h1 className="mb-3 text-3xl font-bold">Blog Not Found</h1>
          <p className="mb-8 text-gray-400">
            This article doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/blogs"
            className="bg-primary-600 hover:bg-primary-500 rounded-xl px-6 py-3 font-semibold text-white transition-all"
          >
            ← Back to Blogs
          </Link>
        </div>
      </main>
    );
  }

  const hasTOC = tableOfContents.length > 0;
  const catCls = getCategoryConfig(meta.category).badge;
  const currentBg = BG_THEMES.find((t) => t.id === bgTheme)?.bg ?? '#060810';

  // Pre-compute TOC metadata (section numbers + read status)
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
      <main
        className="relative min-h-screen text-white transition-colors duration-500"
        style={{ background: currentBg }}
      >
        {' '}
        {/* ── Reading Progress Bar ─────────────────────────────────────────── */}
        <div className="fixed top-0 right-0 left-0 z-50 h-0.5 bg-white/5">
          <div
            className="from-primary-500 via-primary-400 to-primary-300 h-full bg-linear-to-r transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
        {/* ── Sticky Nav ───────────────────────────────────────────────────── */}
        <div
          className="sticky top-0 z-40 border-b border-white/8 backdrop-blur-xl transition-colors duration-500"
          style={{ backgroundColor: `${currentBg}cc` }}
        >
          <div className="mx-auto w-full max-w-450 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/blogs"
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
                  Blogs
                </Link>
                <span className="hidden text-gray-700 sm:block">/</span>
                <span
                  className={cn(
                    'hidden items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold sm:flex',
                    catCls
                  )}
                >
                  <span>{getCategoryConfig(meta.category).emoji}</span>
                  {getCategoryLabel(meta.category)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-gray-600 tabular-nums md:block">
                  {Math.round(scrollProgress)}% read · {meta.readTimeLabel}
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
                  fallback="/placeholder-blog.svg"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#060810] via-[#060810]/85 to-[#060810]/20" />
                <div className="absolute inset-0 bg-linear-to-r from-[#060810]/70 via-[#060810]/15 to-transparent" />
              </div>

              {/* Hero text, overlaid on cover */}
              <div className="relative mx-auto -mt-42 w-full max-w-450 px-4 pb-8 sm:-mt-56 sm:px-6 sm:pb-10 md:-mt-64 lg:-mt-80 lg:px-8 xl:-mt-88">
                <div className="relative overflow-hidden rounded-xl border border-white/14 bg-[#060810]/60 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:rounded-2xl sm:p-5 md:p-6 lg:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/8 via-transparent to-transparent" />
                  <div className="relative z-10">
                    <HeroContent meta={meta} catCls={catCls} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* No thumbnail: standalone hero */
            <div className="relative py-14 md:py-20">
              {/* Subtle ambient glow */}
              <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="bg-primary-500/6 absolute -top-40 left-1/2 h-125 w-125 -translate-x-1/2 rounded-full blur-3xl" />
              </div>
              <div className="mx-auto w-full max-w-450 px-4 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-xl border border-white/12 bg-white/4 p-4 backdrop-blur-xl sm:rounded-2xl sm:p-5 md:p-6 lg:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/8 via-transparent to-transparent" />
                  <div className="relative z-10">
                    <HeroContent meta={meta} catCls={catCls} />
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
                  tocCollapsed ? 'w-11' : 'w-64',
                  focusMode && 'opacity-25 hover:opacity-100'
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
                      {/* Independently scrollable nav — auto-scrolls to active */}
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
              {/* ── Reading Controls ──────────────────────────────────────── */}
              <div className="mb-5 space-y-3">
                {/* Toolbar row */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-2.5">
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    <svg
                      className="text-primary-400 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <span className="hidden sm:inline">Reading</span>
                    {/* Live settings badge */}
                    <span className="hidden items-center gap-1 rounded-md bg-white/6 px-2 py-0.5 text-[10px] text-gray-600 tabular-nums sm:flex">
                      <span
                        style={{
                          fontFamily: FONT_FAMILIES.find(
                            (f) => f.id === fontFamily
                          )?.style,
                        }}
                      >
                        {FONT_FAMILIES.find((f) => f.id === fontFamily)?.label}
                      </span>
                      <span className="text-gray-700">·</span>
                      <span>
                        {FONT_SIZES.find((f) => f.id === fontSize)?.label}
                      </span>
                      {bgTheme !== 'dark' && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span className="capitalize">{bgTheme}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Font size */}
                    <div className="flex items-center gap-0.5">
                      {FONT_SIZES.map((fs) => (
                        <button
                          key={fs.id}
                          onClick={() => setFontSize(fs.id)}
                          className={cn(
                            'rounded px-2 py-0.5 text-xs font-semibold transition-all',
                            fontSize === fs.id
                              ? 'bg-primary-500/20 text-primary-300'
                              : 'text-gray-500 hover:text-gray-300'
                          )}
                        >
                          {fs.label}
                        </button>
                      ))}
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    {/* Customize toggle */}
                    <button
                      onClick={() => setShowReadingSettings((p) => !p)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all',
                        showReadingSettings
                          ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                          : 'border-white/10 bg-white/5 text-gray-500 hover:text-gray-300'
                      )}
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
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Customize</span>
                    </button>
                  </div>
                </div>

                {/* Reading settings panel */}
                {showReadingSettings && (
                  <div className="rounded-xl border border-white/10 bg-[#0d1117]/90 p-5 shadow-2xl backdrop-blur-xl">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                      {/* ── Typeface ── */}
                      <div className="space-y-2.5">
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">
                          Typeface
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {FONT_FAMILIES.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setFontFamily(f.id)}
                              className={cn(
                                'rounded-lg border px-2 py-2 text-xs transition-all',
                                fontFamily === f.id
                                  ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                                  : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'
                              )}
                              style={{ fontFamily: f.style }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Size & Alignment ── */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">
                          Size & Align
                        </p>
                        <div className="flex gap-1">
                          {FONT_SIZES.map((fs) => (
                            <button
                              key={fs.id}
                              onClick={() => setFontSize(fs.id)}
                              className={cn(
                                'flex-1 rounded-lg border py-1.5 text-[11px] font-semibold transition-all',
                                fontSize === fs.id
                                  ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                                  : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'
                              )}
                            >
                              {fs.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          {[
                            {
                              id: 'left',
                              label: 'Left',
                              d: 'M3 6h18M3 12h12M3 18h15',
                            },
                            {
                              id: 'justify',
                              label: 'Justify',
                              d: 'M3 6h18M3 12h18M3 18h18',
                            },
                          ].map((a) => (
                            <button
                              key={a.id}
                              onClick={() => setTextAlign(a.id)}
                              className={cn(
                                'flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition-all',
                                textAlign === a.id
                                  ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                                  : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'
                              )}
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d={a.d}
                                />
                              </svg>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Spacing ── */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">
                          Spacing
                        </p>
                        <div>
                          <p className="mb-1.5 text-[10px] text-gray-600">
                            Line height
                          </p>
                          <div className="flex gap-1">
                            {Object.keys(LINE_HEIGHTS).map((lh) => (
                              <button
                                key={lh}
                                onClick={() => setLineHeight(lh)}
                                className={cn(
                                  'flex-1 rounded-lg border py-1.5 text-[11px] capitalize transition-all',
                                  lineHeight === lh
                                    ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                                    : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'
                                )}
                              >
                                {lh.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[10px] text-gray-600">
                            Letter spacing
                          </p>
                          <div className="flex gap-1">
                            {Object.keys(LETTER_SPACINGS).map((ls) => (
                              <button
                                key={ls}
                                onClick={() => setLetterSpacing(ls)}
                                className={cn(
                                  'flex-1 rounded-lg border py-1.5 text-[11px] capitalize transition-all',
                                  letterSpacing === ls
                                    ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                                    : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'
                                )}
                              >
                                {ls.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[10px] text-gray-600">
                            Paragraph gap
                          </p>
                          <div className="flex gap-1">
                            {Object.keys(PARA_SPACINGS).map((ps) => (
                              <button
                                key={ps}
                                onClick={() => setParaSpacing(ps)}
                                className={cn(
                                  'flex-1 rounded-lg border py-1.5 text-[11px] capitalize transition-all',
                                  paraSpacing === ps
                                    ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                                    : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'
                                )}
                              >
                                {ps.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── Theme & Layout ── */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">
                          Theme & Layout
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {BG_THEMES.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setBgTheme(t.id)}
                              title={t.label}
                              className={cn(
                                'h-8 w-8 rounded-lg transition-all',
                                bgTheme === t.id
                                  ? 'ring-primary-400 scale-110 ring-2 ring-offset-1 ring-offset-[#0d1117]'
                                  : 'ring-1 ring-white/15 hover:ring-white/30'
                              )}
                              style={{ background: t.bg }}
                            />
                          ))}
                        </div>
                        <div>
                          <p className="mb-1.5 text-[10px] text-gray-600">
                            Content width
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Object.keys(CONTENT_WIDTHS).map((id) => (
                              <button
                                key={id}
                                onClick={() => setContentWidth(id)}
                                className={cn(
                                  'rounded-lg border py-1.5 text-xs capitalize transition-all',
                                  contentWidth === id
                                    ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                                    : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'
                                )}
                              >
                                {id}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => setFocusMode((p) => !p)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all',
                            focusMode
                              ? 'border-primary-500/40 bg-primary-500/10 text-primary-300'
                              : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'
                          )}
                        >
                          <span>Focus mode</span>
                          <div
                            className={cn(
                              'relative flex h-4 w-7 items-center rounded-full border transition-all',
                              focusMode
                                ? 'border-primary-500/50 bg-primary-500/30'
                                : 'border-white/15 bg-white/5'
                            )}
                          >
                            <div
                              className={cn(
                                'absolute h-3 w-3 rounded-full transition-all duration-200',
                                focusMode
                                  ? 'bg-primary-400 left-3.5'
                                  : 'left-0.5 bg-gray-600'
                              )}
                            />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Reset footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
                      <p className="text-[10px] text-gray-600">
                        Settings saved in your browser
                      </p>
                      <button
                        onClick={() => {
                          setFontSize('md');
                          setFontFamily('sans');
                          setBgTheme('dark');
                          setLineHeight('relaxed');
                          setLetterSpacing('normal');
                          setParaSpacing('normal');
                          setTextAlign('left');
                          setContentWidth('wide');
                          setFocusMode(false);
                        }}
                        className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[11px] text-gray-500 transition-all hover:border-white/20 hover:text-gray-300"
                      >
                        Reset defaults
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Article body */}
              <div
                ref={contentRef}
                className={cn(
                  'blog-content mx-auto rounded-2xl border border-white/8 bg-white/3 p-4 transition-all duration-300 sm:p-6 md:p-8 lg:p-10',
                  CONTENT_WIDTHS[contentWidth]
                )}
                style={{
                  '--blog-fs':
                    FONT_SIZES.find((f) => f.id === fontSize)?.value ?? '1rem',
                  '--blog-ff': FONT_FAMILIES.find((f) => f.id === fontFamily)
                    ?.style,
                  '--blog-ls': LETTER_SPACINGS[letterSpacing],
                  '--blog-ps': PARA_SPACINGS[paraSpacing],
                  '--blog-bg': currentBg,
                  lineHeight: LINE_HEIGHTS[lineHeight],
                  textAlign,
                }}
                dangerouslySetInnerHTML={{ __html: enhancedContent }}
              />

              {/* Article footer: reactions + tags + share */}
              <div className="mt-8 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-6">
                {/* ── Reactions row ────────────────────────────────────────── */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/6 pb-5">
                  <div className="flex items-center gap-3">
                    {/* Like button */}
                    <button
                      onClick={handleLike}
                      disabled={liked || liking}
                      aria-label={liked ? 'Already liked' : 'Like this post'}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200',
                        liked
                          ? 'cursor-default border-rose-500/40 bg-rose-500/10 text-rose-400'
                          : liking
                            ? 'cursor-wait border-white/10 bg-white/5 text-gray-400'
                            : 'border-white/10 bg-white/5 text-gray-400 hover:border-rose-500/30 hover:bg-rose-500/8 hover:text-rose-300 active:scale-95'
                      )}
                    >
                      <svg
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          liking && 'animate-pulse'
                        )}
                        fill={liked ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      <span className="tabular-nums">
                        {likeCount.toLocaleString()}
                      </span>
                      {liked ? (
                        <span className="text-xs text-rose-400/70">Liked</span>
                      ) : (
                        <span className="text-xs text-gray-600">Like</span>
                      )}
                    </button>
                  </div>
                  {/* View count */}
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
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
                </div>
                {meta.tags.length > 0 && (
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                      Tags:
                    </span>
                    {meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:text-white"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
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
            </article>
          </div>
        </div>
        {/* ── Comments ──────────────────────────────────────────────────────── */}
        <div className="border-t border-white/6 py-14 md:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <BlogComments
              blogId={blog.id}
              initialComments={initialComments}
              currentUser={currentUser}
            />
          </div>
        </div>
        {/* ── Related Articles ──────────────────────────────────────────────── */}
        {relatedBlogs.length > 0 && (
          <div className="border-t border-white/8 py-14 md:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                    Keep reading
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Related Articles
                  </h2>
                </div>
                <Link
                  href={`/blogs?category=${encodeURIComponent(meta.category)}`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-200"
                >
                  More in {getCategoryLabel(meta.category)} →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedBlogs.map((b) => (
                  <RelatedBlogCard key={b.id} blog={b} />
                ))}
              </div>
            </div>
          </div>
        )}
        {/* ── Back-to-blogs strip ───────────────────────────────────────────── */}
        <div className="border-t border-white/8 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <p className="text-sm font-semibold text-white">
                  Enjoyed this article?
                </p>
                <p className="text-xs text-gray-500">
                  Explore more from the NEUPC knowledge hub.
                </p>
              </div>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-gray-300 transition-all hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                ← Back to all articles
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

      <CodePlayground
        state={runnerState}
        result={runnerResult}
        error={runnerError}
        formatError={formatError}
        isRunning={isRunningCode}
        isFormatting={isFormatting}
        onClose={closeCodeRunner}
        onRun={handleRunnerExecute}
        onFormat={handleFormat}
        onDraftChange={(value) =>
          setRunnerState((prev) => ({ ...prev, draftCode: value }))
        }
        onStdinChange={(value) =>
          setRunnerState((prev) => ({ ...prev, stdin: value }))
        }
        onReset={() =>
          setRunnerState((prev) => ({
            ...prev,
            draftCode: prev.originalCode,
            stdin: '',
          }))
        }
        onLanguageChange={(lang) =>
          setRunnerState((prev) => ({ ...prev, language: lang }))
        }
        getLanguageLabel={getCodeLanguageLabel}
      />
    </>
  );
}

// ─── Hero Content (shared between thumbnail and no-thumbnail variants) ────────

function HeroContent({ meta, catCls }) {
  return (
    <>
      {/* Badges */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
        {meta.featured && (
          <span className="rounded-full border border-amber-500/45 bg-amber-500/18 px-2.5 py-1 text-[11px] font-semibold text-amber-200 shadow-sm sm:px-3 sm:text-xs">
            ✨ Featured
          </span>
        )}
        <span
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs',
            catCls
          )}
        >
          <span>{getCategoryConfig(meta.category).emoji}</span>
          {getCategoryLabel(meta.category)}
        </span>
      </div>

      {/* Title */}
      <h1 className="mb-4 text-2xl leading-tight font-bold text-white drop-shadow-sm sm:mb-5 sm:text-3xl md:text-4xl lg:text-5xl xl:text-[3.25rem]">
        {meta.title}
      </h1>

      {/* Excerpt */}
      {meta.excerpt && (
        <p className="mb-5 max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base md:text-lg">
          {meta.excerpt}
        </p>
      )}

      {/* Tags */}
      {meta.tags.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5 sm:mb-6 sm:gap-2">
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg border border-white/12 bg-white/6 px-2 py-0.5 text-[11px] text-gray-300 sm:px-2.5 sm:py-1 sm:text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
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
        {meta.blogDate && (
          <>
            <span className="text-gray-600">·</span>
            <span>{meta.blogDate}</span>
          </>
        )}
        <span className="text-gray-600">·</span>
        <span>⏱ {meta.readTimeLabel} read</span>
        {meta.views > 0 && (
          <>
            <span className="text-gray-600">·</span>
            <span>👁 {meta.views.toLocaleString()} views</span>
          </>
        )}
      </div>
    </>
  );
}
