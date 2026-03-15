/**
 * @file Full-screen overlay panel for creating / editing blog posts.
 *   Professional UI with sectioned cards, sticky header, live preview,
 *   sidebar navigation, AI image generation, and AI text assistance.
 *
 * @module AdminBlogFormPanel
 */

'use client';

import {
  useState,
  useTransition,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  PlusCircle,
  Edit3,
  AlertCircle,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Tag,
  FileText,
  Settings,
  Image as ImageIcon,
  Sparkles,
  Wand2,
  Hash,
  Clock,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import {
  CATEGORIES,
  STATUSES,
  getStatusConfig,
  getCategoryConfig,
  generateSlug,
} from './blogConfig';
import {
  createBlogAction,
  updateBlogAction,
  uploadBlogImageAction,
  deleteBlogImageAction,
  generateBlogImageAction,
  generateBlogTextAction,
} from '@/app/_lib/blog-actions';
import { IMAGE_MODELS, DEFAULT_MODEL } from '@/app/_lib/image-gen';
import { TEXT_MODELS, DEFAULT_TEXT_MODEL } from '@/app/_lib/text-gen';
import { driveImageUrl } from '@/app/_lib/utils';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';
import { createLowlight, common } from 'lowlight';
import { toHtml } from 'hast-util-to-html';

const lowlightInstance = createLowlight(common);

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

/** Process HTML string: highlight code blocks + wrap lines (no DOM needed) */
function highlightCodeBlocksAdmin(htmlString) {
  if (!htmlString) return htmlString;
  const knownLangs = lowlightInstance.listLanguages();
  return htmlString.replace(
    /(<pre[^>]*>\s*<code)([^>]*)(>)([\s\S]*?)(<\/code>\s*<\/pre>)/gi,
    (_match, openTag, attrs, gt, codeContent, closeTag) => {
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
          highlighted = toHtml(lowlightInstance.highlight(lang, decoded));
        } else {
          const auto = lowlightInstance.highlightAuto(decoded);
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
      return `${openTag}${attrs}${gt}${wrapCodeLines(highlighted)}${closeTag}`;
    }
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Style constants                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-blue-500/40 focus:bg-white/7 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 scheme-dark';

const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-400';

const hintCls = 'mt-1.5 text-[11px] text-gray-600';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Sub-components                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

function FormSection({ icon: Icon, title, description, children, id }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-white/8 bg-white/3 p-5 backdrop-blur-sm transition-colors hover:border-white/12 sm:p-7"
    >
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Toggle({ value, onChange, label, description }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 transition-all hover:border-white/15 hover:bg-white/5"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div
        role="switch"
        aria-checked={value}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          value ? 'bg-amber-500' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            value ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
}

function PillSelect({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  getExtra,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const val = getValue ? getValue(opt) : opt;
        const label = getLabel ? getLabel(opt) : opt;
        const extra = getExtra ? getExtra(opt) : null;
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
              active
                ? 'border-blue-500/40 bg-blue-500/15 text-blue-300 shadow-sm shadow-blue-500/10'
                : 'border-white/8 bg-white/3 text-gray-500 hover:border-white/15 hover:bg-white/6 hover:text-gray-300'
            }`}
          >
            {extra && <span className="mr-1.5">{extra}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, sectionId }) {
  return (
    <a
      href={`#${sectionId}`}
      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
        active
          ? 'bg-blue-500/10 text-blue-400'
          : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </a>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Live preview                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

function LivePreview({
  title,
  excerpt,
  content,
  category,
  status,
  thumbnail,
  tags,
  isFeatured,
  readTime,
}) {
  const previewRef = useRef(null);
  const cc = getCategoryConfig(category);

  // Pre-process content: syntax highlighting + line wrapping (synchronous)
  const enhancedContent = useMemo(
    () => highlightCodeBlocksAdmin(content),
    [content]
  );

  // Copy-to-clipboard buttons (needs DOM)
  useEffect(() => {
    if (!previewRef.current) return;
    const codeBlocks = previewRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      const pre = block.parentElement;
      if (pre.querySelector('.code-copy-btn')) return;
      const rawText = block.textContent || '';
      if (!rawText.trim()) return;

      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = COPY_SVG;
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(rawText).then(() => {
          btn.classList.add('copied');
          btn.innerHTML = CHECK_SVG;
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = COPY_SVG;
          }, 2000);
        });
      });
      pre.appendChild(btn);
    });
  }, [enhancedContent]);

  const tagList = tags
    ? tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const statusMap = {
    draft: {
      label: 'Draft',
      dot: 'bg-gray-400',
      bg: 'bg-gray-500/15 border-gray-500/30',
      text: 'text-gray-300',
    },
    published: {
      label: 'Published',
      dot: 'bg-emerald-400',
      bg: 'bg-emerald-500/15 border-emerald-500/30',
      text: 'text-emerald-300',
    },
    archived: {
      label: 'Archived',
      dot: 'bg-amber-400',
      bg: 'bg-amber-500/15 border-amber-500/30',
      text: 'text-amber-300',
    },
  };
  const statusCfg = statusMap[status] || statusMap.draft;

  return (
    <div className="flex h-full flex-col bg-linear-to-b from-[#0F172A] via-[#0a1120] to-[#0F172A]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-black/40 to-black/80" />
        <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-purple-500/15 blur-3xl" />

        {/* Thumbnail */}
        {thumbnail && (
          <div className="relative h-48 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={driveImageUrl(thumbnail)}
              alt={title || 'Cover'}
              className="h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#0F172A] via-[#0F172A]/60 to-transparent" />
          </div>
        )}

        <div className={`relative px-5 ${thumbnail ? '-mt-20' : 'pt-8'} pb-6`}>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {category && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold ${cc.color}`}
              >
                {cc.emoji} {cc.short}
              </span>
            )}
            {isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
                ⭐ Featured
              </span>
            )}
            {readTime && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] text-gray-400">
                <Clock className="h-2.5 w-2.5" /> {readTime} min read
              </span>
            )}
          </div>

          <h1 className="text-lg leading-tight font-bold text-white sm:text-xl">
            {title || (
              <span className="text-gray-500 italic">Untitled Post</span>
            )}
          </h1>

          {excerpt && (
            <p className="mt-2 text-xs leading-relaxed text-gray-400">
              {excerpt}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {content && (
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <div
              ref={previewRef}
              className="blog-content text-xs leading-relaxed text-gray-300"
              dangerouslySetInnerHTML={{ __html: enhancedContent }}
            />
          </div>
        )}
        {!content && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-white/8 py-12 text-center">
            <div>
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-700" />
              <p className="text-xs text-gray-600">
                Content preview will appear here…
              </p>
            </div>
          </div>
        )}

        {tagList.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium text-blue-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* AI Writing Assistant                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

function AiWriteButton({ mode, onGenerated, context, existingContent }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(DEFAULT_TEXT_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const modeLabels = {
    title: 'Generate Title',
    excerpt: 'Generate Excerpt',
    content: 'Generate Content',
    improve: 'Improve Content',
  };

  const placeholders = {
    title: 'e.g. A guide to dynamic programming for beginners',
    excerpt: 'e.g. Write a short teaser for an article about graph algorithms',
    content:
      'e.g. Create content for a tutorial on competitive programming techniques',
    improve: 'e.g. Make it more professional and add more structure',
  };

  const handleGenerate = async () => {
    if (loading) return;
    if (!prompt.trim() && mode !== 'improve') return;
    setError(null);
    setLoading(true);
    try {
      const fullPrompt = context
        ? `Blog context: ${context}\n\nRequest: ${prompt}`
        : prompt;
      const result = await generateBlogTextAction(
        fullPrompt,
        mode,
        model,
        existingContent
      );
      if (result?.error) {
        setError(result.error);
      } else if (result?.text) {
        onGenerated(result.text);
        setPrompt('');
        setOpen(false);
      }
    } catch {
      setError('Generation failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-300 transition-all hover:border-purple-500/40 hover:bg-purple-500/20"
      >
        <Sparkles className="h-3 w-3" />
        {mode === 'improve' ? 'AI Improve' : 'AI Write'}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <Sparkles className="h-3.5 w-3.5" />
          {modeLabels[mode]}
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md p-0.5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {TEXT_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModel(m.id)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
              model === m.id
                ? 'border border-purple-500/50 bg-purple-500/20 text-purple-200'
                : 'border border-white/8 bg-white/3 text-gray-500 hover:border-white/15 hover:text-gray-300'
            }`}
            title={m.description}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder={placeholders[mode]}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || (!prompt.trim() && mode !== 'improve')}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wand2 className="h-3 w-3" />
          )}
          {loading ? 'Writing…' : 'Generate'}
        </button>
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Sections for sidebar nav                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SECTIONS = [
  { id: 'basic', icon: FileText, label: 'Basic Info' },
  { id: 'media', icon: ImageIcon, label: 'Cover Image' },
  { id: 'category', icon: Tag, label: 'Category & Status' },
  { id: 'extras', icon: Settings, label: 'Details & Extras' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Main component                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function BlogFormPanel({ post, onClose, onSaved }) {
  const isEdit = !!post;
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const submitStatusRef = useRef(null);
  const contentUploadedUrlsRef = useRef([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [activeSection, setActiveSection] = useState('basic');
  const [closing, setClosing] = useState(false);

  // ── form state ─────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugManual, setSlugManual] = useState(!!isEdit);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [thumbnail, setThumbnail] = useState(post?.thumbnail ?? '');
  const [category, setCategory] = useState(post?.category ?? '');
  const [status, setStatus] = useState(post?.status ?? 'draft');
  const [tags, setTags] = useState(post?.tags?.join(', ') ?? '');
  const [isFeatured, setIsFeatured] = useState(post?.is_featured ?? false);
  const [readTime, setReadTime] = useState(post?.read_time ?? '');
  const [readTimeManual, setReadTimeManual] = useState(false);

  // ── cover image upload state ───────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  // ── auto-generate slug ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManual]);

  // ── auto-estimate read time ────────────────────────────────────────────────
  useEffect(() => {
    if (readTimeManual) return;
    if (content) {
      const text = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = text ? text.split(' ').length : 0;
      setReadTime(String(Math.max(1, Math.round(words / 200))));
    }
  }, [content, readTimeManual]);

  // ── lock body scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  // ── escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && !isPending) handleClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // ── intersection observer for sidebar ─────────────────────────────────────
  useEffect(() => {
    const container = panelRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { root: container, rootMargin: '-100px 0px -60% 0px', threshold: 0.1 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = container.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // ── close with animation ───────────────────────────────────────────────────
  function handleClose() {
    if (isPending) return;
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }

  // ── progress ───────────────────────────────────────────────────────────────
  const progress = (() => {
    let filled = 0;
    const total = 4; // title, content, category, excerpt
    if (title.trim()) filled++;
    if (content.trim()) filled++;
    if (category) filled++;
    if (excerpt.trim()) filled++;
    return Math.round((filled / total) * 100);
  })();

  // ── AI cover image generation ──────────────────────────────────────────────
  const handleGenerateImage = useCallback(async () => {
    if (generating || aiPrompt.trim().length < 3) return;
    setGenerateError(null);
    setGenerating(true);
    try {
      const result = await generateBlogImageAction(aiPrompt.trim(), aiModel);
      if (result?.error) {
        setGenerateError(result.error);
      } else if (result?.url) {
        if (thumbnail) {
          deleteBlogImageAction(thumbnail).catch(() => {});
        }
        setThumbnail(result.url);
        setAiPrompt('');
      }
    } catch {
      setGenerateError('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [aiPrompt, aiModel, generating, thumbnail]);

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setError(null);

      const fd = new FormData();
      if (isEdit) fd.set('id', post.id);
      fd.set('title', title);
      fd.set('slug', slug);
      fd.set('excerpt', excerpt);
      fd.set('content', content);
      fd.set('category', category);
      const resolvedStatus =
        submitStatusRef.current ??
        e.target.querySelector('input[name="status"]')?.value ??
        status;
      submitStatusRef.current = null;
      fd.set('status', resolvedStatus);
      const th = e.target.querySelector('input[name="thumbnail"]')?.value ?? '';
      if (th) fd.set('thumbnail', th);
      fd.set('tags', tags);
      fd.set('is_featured', String(isFeatured));
      if (readTime) fd.set('read_time', readTime);

      startTransition(async () => {
        const action = isEdit ? updateBlogAction : createBlogAction;
        const result = await action(fd);

        if (result?.error) {
          setError(result.error);
          panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // Clean up orphaned content images
        if (contentUploadedUrlsRef.current.length > 0) {
          const finalContent = content || '';
          const orphans = contentUploadedUrlsRef.current.filter(
            (url) => !finalContent.includes(url)
          );
          orphans.forEach((url) => deleteBlogImageAction(url).catch(() => {}));
          contentUploadedUrlsRef.current = [];
        }

        setSuccess(true);
        setTimeout(() => {
          onSaved?.();
          onClose();
        }, 800);
      });
    },
    [
      isEdit,
      post,
      title,
      excerpt,
      content,
      category,
      status,
      tags,
      isFeatured,
      readTime,
      slug,
      onSaved,
      onClose,
    ]
  );

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
          closing ? 'opacity-0' : 'animate-in fade-in'
        }`}
        onClick={handleClose}
      />

      {/* Full-screen panel */}
      <div
        className={`relative m-2 flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0a0d14] shadow-2xl shadow-black/50 transition-all duration-300 sm:m-3 lg:m-4 ${
          closing ? 'scale-95 opacity-0' : 'animate-in fade-in zoom-in-95'
        }`}
      >
        {/* ─── Sticky header ──────────────────────────────────────────────── */}
        <div className="z-30 shrink-0 border-b border-white/8 bg-[#0a0d14]/95 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                {isEdit ? (
                  <Edit3 className="h-4.5 w-4.5 text-blue-400" />
                ) : (
                  <PlusCircle className="h-4.5 w-4.5 text-blue-400" />
                )}
              </div>
              <div>
                <h1 className="text-sm font-bold text-white sm:text-base">
                  {isEdit ? 'Edit Blog Post' : 'Create New Post'}
                </h1>
                <p className="hidden text-[11px] text-gray-500 sm:block">
                  {isEdit
                    ? `Editing "${post.title}"`
                    : 'Fill in the details below — preview updates live'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Progress */}
              <div className="hidden items-center gap-2 rounded-xl border border-white/6 bg-white/3 px-3 py-2 md:flex">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10 lg:w-24">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-400 tabular-nums">
                  {progress}%
                </span>
              </div>

              {/* Preview toggle */}
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className={`hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all lg:flex ${
                  showPreview
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/15 hover:text-white'
                }`}
              >
                {showPreview ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                <span className="hidden xl:inline">Preview</span>
              </button>

              <div className="hidden h-6 w-px bg-white/8 sm:block" />

              {/* Save Draft */}
              <button
                type="button"
                onClick={() => {
                  submitStatusRef.current = 'draft';
                  document.getElementById('blog-panel-form')?.requestSubmit();
                }}
                disabled={isPending || success || !title.trim()}
                className="hidden rounded-xl border border-white/8 bg-white/3 px-4 py-2 text-xs font-semibold text-gray-300 transition-all hover:border-white/15 hover:bg-white/6 hover:text-white disabled:opacity-50 sm:flex"
              >
                Save Draft
              </button>

              {/* Primary submit */}
              <button
                type="submit"
                form="blog-panel-form"
                onClick={() => {
                  if (status === 'draft') submitStatusRef.current = 'published';
                }}
                disabled={isPending || success}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-70 sm:px-5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Saved!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {isEdit ? 'Save Changes' : 'Create Post'}
                    </span>
                  </>
                )}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/3 text-gray-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Body: Form + Preview ────────────────────────────────────────── */}
        <div ref={bodyRef} className="relative flex min-h-0 flex-1">
          {/* ─── Scrollable form ──────────────────────────────────────── */}
          <div
            ref={panelRef}
            className={`flex-1 overflow-y-auto transition-all duration-300 ${
              showPreview ? 'lg:w-[55%] lg:flex-none xl:w-[60%]' : 'w-full'
            }`}
          >
            <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              <div className="flex gap-8">
                {/* ─── Sidebar nav (desktop) ───────────────────────── */}
                <aside className="hidden w-44 shrink-0 xl:block">
                  <nav className="sticky top-0 space-y-1">
                    <p className="mb-3 px-3.5 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                      Sections
                    </p>
                    {SECTIONS.map(({ id, icon, label }) => (
                      <NavItem
                        key={id}
                        icon={icon}
                        label={label}
                        sectionId={id}
                        active={activeSection === id}
                      />
                    ))}
                  </nav>
                </aside>

                {/* ─── Form column ─────────────────────────────────── */}
                <div className="min-w-0 flex-1">
                  <form
                    id="blog-panel-form"
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-6"
                  >
                    {/* Hidden inputs to avoid closure staleness */}
                    <input
                      type="hidden"
                      name="status"
                      value={status}
                      readOnly
                    />
                    <input
                      type="hidden"
                      name="thumbnail"
                      value={thumbnail}
                      readOnly
                    />

                    {/* Error banner */}
                    {error && (
                      <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-4">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                        <div>
                          <p className="text-sm font-semibold text-red-300">
                            Something went wrong
                          </p>
                          <p className="mt-0.5 text-xs text-red-400/80">
                            {error}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Success banner */}
                    {success && (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <p className="text-sm font-semibold text-emerald-300">
                          Post {isEdit ? 'updated' : 'created'} successfully!
                        </p>
                      </div>
                    )}

                    {/* ══════════ Section 1: Basic Info ══════════ */}
                    <FormSection
                      id="basic"
                      icon={FileText}
                      title="Basic Information"
                      description="Post title, excerpt, and full content"
                    >
                      {/* Title */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className={labelCls}>
                            Title <span className="text-red-400">*</span>
                          </label>
                          <AiWriteButton
                            mode="title"
                            onGenerated={(text) => setTitle(text)}
                            context={excerpt || category || ''}
                          />
                        </div>
                        <input
                          required
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. A Complete Guide to Dynamic Programming"
                          className={inputCls}
                        />
                        <p className={hintCls}>
                          Choose a clear, compelling title for your post
                        </p>
                      </div>

                      {/* Excerpt */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className={labelCls}>Excerpt</label>
                          <AiWriteButton
                            mode="excerpt"
                            onGenerated={(text) => setExcerpt(text)}
                            context={title || ''}
                          />
                        </div>
                        <textarea
                          value={excerpt}
                          onChange={(e) => setExcerpt(e.target.value)}
                          placeholder="Short summary shown on blog cards…"
                          rows={2}
                          className={`${inputCls} resize-none`}
                          maxLength={400}
                        />
                        <p className={hintCls}>
                          Appears on blog cards. Keep it under 200 characters.
                        </p>
                      </div>

                      {/* Content */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <label className={labelCls}>
                            Content <span className="text-red-400">*</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <AiWriteButton
                              mode="content"
                              onGenerated={(html) => setContent(html)}
                              context={`${title || ''} — ${excerpt || ''}`}
                            />
                            {content && (
                              <AiWriteButton
                                mode="improve"
                                onGenerated={(html) => setContent(html)}
                                existingContent={content}
                              />
                            )}
                          </div>
                        </div>
                        <RichTextEditor
                          value={content}
                          onChange={setContent}
                          placeholder="Write your blog content here…"
                          uploadImageAction={uploadBlogImageAction}
                          onDeleteImage={(url) => {
                            deleteBlogImageAction(url).catch(() => {});
                          }}
                          uploadedUrlsRef={contentUploadedUrlsRef}
                          containedFullscreen
                          fullscreenContainerRef={bodyRef}
                        />
                        <p className={hintCls}>
                          Visible on the blog detail page. Use the toolbar to
                          format text, add headings, lists, code blocks, images,
                          and more.
                        </p>
                      </div>
                    </FormSection>

                    {/* ══════════ Section 2: Cover Image ══════════ */}
                    <FormSection
                      id="media"
                      icon={ImageIcon}
                      title="Cover Image"
                      description="Upload or generate a thumbnail for the post"
                    >
                      <div className="space-y-3">
                        {/* Preview / upload area */}
                        {thumbnail ? (
                          <div className="relative overflow-hidden rounded-xl border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={driveImageUrl(thumbnail)}
                              alt="Cover preview"
                              className="h-48 w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                            <button
                              type="button"
                              onClick={() => {
                                if (thumbnail) {
                                  deleteBlogImageAction(thumbnail).catch(
                                    () => {}
                                  );
                                }
                                setThumbnail('');
                              }}
                              className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 backdrop-blur-sm transition-all hover:border-red-500/50 hover:bg-red-500/30"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/2 px-6 py-12 text-center transition-all hover:border-blue-500/30 hover:bg-blue-500/5 ${
                              uploading ? 'pointer-events-none opacity-60' : ''
                            }`}
                          >
                            {uploading ? (
                              <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-400" />
                            ) : (
                              <Upload className="mb-3 h-8 w-8 text-gray-600" />
                            )}
                            <p className="text-sm font-medium text-gray-300">
                              {uploading
                                ? 'Uploading…'
                                : 'Click to upload or drag & drop'}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              JPEG, PNG, WebP, or GIF · max 5 MB
                            </p>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              disabled={uploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadError(null);
                                setUploading(true);
                                try {
                                  const fd = new FormData();
                                  fd.set('file', file);
                                  const result =
                                    await uploadBlogImageAction(fd);
                                  if (result?.error) {
                                    setUploadError(result.error);
                                  } else if (result?.url) {
                                    if (thumbnail) {
                                      deleteBlogImageAction(thumbnail).catch(
                                        () => {}
                                      );
                                    }
                                    setThumbnail(result.url);
                                  }
                                } catch {
                                  setUploadError(
                                    'Upload failed. Please try again.'
                                  );
                                } finally {
                                  setUploading(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                        )}

                        {uploadError && (
                          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {uploadError}
                          </div>
                        )}

                        {/* AI Image Generator */}
                        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-purple-300">
                              AI Image Generator
                            </span>
                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                              FREE
                            </span>
                          </div>

                          <div className="mb-3 flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-400">
                              Model:
                            </label>
                            <div className="flex gap-1.5">
                              {IMAGE_MODELS.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  disabled={generating}
                                  onClick={() => setAiModel(m.id)}
                                  title={m.description}
                                  className={`rounded-lg border px-3 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
                                    aiModel === m.id
                                      ? 'border-purple-500/50 bg-purple-500/25 text-purple-300'
                                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                                  }`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              placeholder="Describe the image, e.g. 'A blog header about dynamic programming with code and algorithms'"
                              disabled={generating}
                              className={`${inputCls} flex-1`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (
                                    aiPrompt.trim().length >= 3 &&
                                    !generating
                                  ) {
                                    handleGenerateImage();
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              disabled={
                                generating || aiPrompt.trim().length < 3
                              }
                              onClick={handleGenerateImage}
                              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/20 px-4 py-2.5 text-sm font-medium text-purple-300 transition-all hover:border-purple-500/50 hover:bg-purple-500/30 disabled:pointer-events-none disabled:opacity-50"
                            >
                              {generating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Wand2 className="h-4 w-4" />
                              )}
                              {generating ? 'Generating…' : 'Generate'}
                            </button>
                          </div>

                          {generateError && (
                            <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {generateError}
                            </div>
                          )}
                          <p className="mt-2 text-[11px] text-gray-600">
                            {aiModel === 'gemini'
                              ? 'Nano Banana (Gemini 2.5 Flash) · 1,500 free/day · Auto-uploaded to Drive (blog-images)'
                              : 'Flux (Fast) · Free · Auto-uploaded to Drive (blog-images)'}
                          </p>
                        </div>

                        {/* URL fallback */}
                        <div>
                          <label className={labelCls}>Or paste image URL</label>
                          <input
                            type="text"
                            value={thumbnail}
                            onChange={(e) => setThumbnail(e.target.value)}
                            placeholder="https://example.com/blog-cover.jpg"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </FormSection>

                    {/* ══════════ Section 3: Category & Status ══════════ */}
                    <FormSection
                      id="category"
                      icon={Tag}
                      title="Category & Status"
                      description="Classify the post and set its publication status"
                    >
                      <div>
                        <label className={labelCls}>Category</label>
                        <PillSelect
                          options={CATEGORIES}
                          value={category}
                          onChange={setCategory}
                          getExtra={(c) => getCategoryConfig(c).emoji}
                        />
                        <p className={hintCls}>
                          Helps readers find posts in the same topic area
                        </p>
                      </div>

                      <div>
                        <label className={labelCls}>Publication Status</label>
                        <PillSelect
                          options={STATUSES}
                          value={status}
                          onChange={setStatus}
                          getLabel={(s) => getStatusConfig(s).label}
                        />
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2">
                          <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-600" />
                          <p className="text-[11px] text-gray-500">
                            <strong className="text-gray-400">Draft</strong>{' '}
                            posts are only visible to admins.{' '}
                            <strong className="text-gray-400">Published</strong>{' '}
                            posts are live and visible to all visitors.
                          </p>
                        </div>
                      </div>

                      <Toggle
                        value={isFeatured}
                        onChange={setIsFeatured}
                        label="Featured post"
                        description="Featured posts are highlighted on the homepage and blog listing."
                      />
                    </FormSection>

                    {/* ══════════ Section 4: Details & Extras ══════════ */}
                    <FormSection
                      id="extras"
                      icon={Settings}
                      title="Details & Extras"
                      description="Slug, tags, and read time settings"
                    >
                      {/* Slug */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className={labelCls}>
                            <Hash className="mr-1 inline h-3 w-3" />
                            URL Slug
                          </label>
                          {slugManual && (
                            <button
                              type="button"
                              onClick={() => {
                                setSlugManual(false);
                                setSlug(generateSlug(title));
                              }}
                              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Auto
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => {
                            setSlug(e.target.value);
                            setSlugManual(true);
                          }}
                          placeholder="auto-generated-from-title"
                          className={inputCls}
                        />
                        <p className={hintCls}>
                          /blogs/
                          <span className="text-gray-400">
                            {slug || 'your-post-slug'}
                          </span>
                        </p>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className={labelCls}>
                          <Tag className="mr-1 inline h-3 w-3" />
                          Tags
                        </label>
                        <input
                          type="text"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="dp, graph, algorithm, tips"
                          className={inputCls}
                        />
                        <p className={hintCls}>
                          Comma-separated tags. Helps with discovery and search.
                        </p>
                      </div>

                      {/* Read time */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className={labelCls}>
                            <Clock className="mr-1 inline h-3 w-3" />
                            Read Time (minutes)
                          </label>
                          {readTimeManual && (
                            <button
                              type="button"
                              onClick={() => {
                                setReadTimeManual(false);
                              }}
                              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Auto
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={readTime}
                          onChange={(e) => {
                            setReadTime(e.target.value);
                            setReadTimeManual(true);
                          }}
                          placeholder="auto"
                          className={inputCls}
                        />
                        <p className={hintCls}>
                          Auto-estimated from word count (~200 wpm). Override if
                          needed.
                        </p>
                      </div>
                    </FormSection>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right: Live preview ──────────────────────────────────────── */}
          {showPreview && (
            <div className="hidden overflow-hidden border-l border-white/8 lg:flex lg:w-[45%] lg:flex-none xl:w-[40%]">
              <div className="flex w-full flex-col">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <Eye className="h-3.5 w-3.5" />
                    Live Preview
                  </span>
                  <span className="text-[10px] text-gray-600">
                    Updates as you type
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <LivePreview
                    title={title}
                    excerpt={excerpt}
                    content={content}
                    category={category}
                    status={status}
                    thumbnail={thumbnail}
                    tags={tags}
                    isFeatured={isFeatured}
                    readTime={readTime}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
