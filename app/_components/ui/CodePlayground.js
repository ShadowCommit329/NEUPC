/**
 * @file CodePlayground
 * @description Full-screen IDE-style code playground overlay.
 *   Renders a CodeMirror 6 editor with a professional split-pane layout,
 *   tabbed I/O panel, status bar, and animated transitions.
 */

'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@uiw/react-codemirror';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { go } from '@codemirror/lang-go';
import { rust } from '@codemirror/lang-rust';
import { php } from '@codemirror/lang-php';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import {
  X,
  Play,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  Terminal,
  FileInput,
  AlertCircle,
  Loader2,
  Code2,
  Maximize2,
  Minimize2,
  Bot,
  Send,
  ChevronLeft,
  Zap,
  Download,
  HelpCircle,
  WrapText,
  Minus,
  Plus,
  ChevronDown,
  Lightbulb,
  BookOpen,
  GraduationCap,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/app/_lib/utils';

// ── Language → CodeMirror extension ──────────────────────────────────────────

function getLangExtension(language) {
  const map = {
    c: () => [cpp()],
    cpp: () => [cpp()],
    python: () => [python()],
    javascript: () => [javascript({ jsx: true })],
    jsx: () => [javascript({ jsx: true })],
    typescript: () => [javascript({ typescript: true, jsx: true })],
    tsx: () => [javascript({ typescript: true, jsx: true })],
    java: () => [java()],
    go: () => [go()],
    rust: () => [rust()],
    php: () => [php()],
    css: () => [css()],
    html: () => [html()],
    json: () => [json()],
    yaml: () => [yaml()],
    markdown: () => [markdown()],
    sql: () => [sql()],
  };
  return map[language]?.() ?? [];
}

const FORMATTABLE = new Set([
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

// ── Executable languages + starter templates ─────────────────────────────────

const PLAYGROUND_LANGUAGES = [
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'csharp', label: 'C#' },
  { value: 'ruby', label: 'Ruby' },
];

const LANGUAGE_EXTENSIONS = {
  c: '.c',
  cpp: '.cpp',
  python: '.py',
  javascript: '.js',
  typescript: '.ts',
  java: '.java',
  go: '.go',
  rust: '.rs',
  php: '.php',
  csharp: '.cs',
  ruby: '.rb',
};

const STARTER_TEMPLATES = {
  c: `#include <stdio.h>\n\nint main() {\n    // Your first C program — try changing the message!\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your first C++ program — try changing the message!\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
  python: `# Your first Python program — try changing the message!\nprint("Hello, World!")\n`,
  javascript: `// Your first JavaScript program — try changing the message!\nconsole.log("Hello, World!");\n`,
  typescript: `// Your first TypeScript program — try changing the message!\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Your first Java program — try changing the message!\n        System.out.println("Hello, World!");\n    }\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Your first Go program — try changing the message!\n    fmt.Println("Hello, World!")\n}\n`,
  rust: `fn main() {\n    // Your first Rust program — try changing the message!\n    println!("Hello, World!");\n}\n`,
  php: `<?php\n// Your first PHP program — try changing the message!\necho "Hello, World!\\n";\n?>\n`,
  csharp: `using System;\n\nclass Program {\n    static void Main() {\n        // Your first C# program — try changing the message!\n        Console.WriteLine("Hello, World!");\n    }\n}\n`,
  ruby: `# Your first Ruby program — try changing the message!\nputs "Hello, World!"\n`,
};

// ── Inline SVG spinner ──────────────────────────────────────────────────────

function Spinner({ className }) {
  return <Loader2 className={cn('animate-spin', className)} />;
}

// ── Copy button with feedback ───────────────────────────────────────────────

function CopyButton({ text, label = 'Copy', className, iconOnly = false }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [text]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (iconOnly) {
    return (
      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center justify-center rounded-md p-1.5 text-gray-500 transition-all hover:bg-white/6 hover:text-gray-300',
          copied && 'text-emerald-400 hover:text-emerald-400',
          className
        )}
        title={copied ? 'Copied!' : label}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'playground-btn',
        copied && 'border-emerald-500/30! text-emerald-400!',
        className
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

// ── I/O Tab ─────────────────────────────────────────────────────────────────

function IOTab({ active, icon: Icon, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold tracking-wide uppercase transition-colors',
        active ? 'text-gray-200' : 'text-gray-600 hover:text-gray-400'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {typeof count === 'number' && count > 0 && (
        <span className="bg-primary-500/20 text-primary-400 ml-1 rounded-full px-1.5 py-0 text-[9px] font-bold">
          {count}
        </span>
      )}
      {active && (
        <span className="bg-primary-500 absolute right-0 bottom-0 left-0 h-0.5 rounded-full" />
      )}
    </button>
  );
}

// ── Inline markdown renderer for AI messages ─────────────────────────────────

function InlineFormat({ text }) {
  const parts = [];
  const regex = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push({ type: 'code', val: m[1] });
    else parts.push({ type: 'bold', val: m[2] });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : p.type === 'code' ? (
          <code
            key={i}
            className="rounded bg-white/8 px-1 py-0.5 font-mono text-[11px] text-amber-300"
          >
            {p.val}
          </code>
        ) : (
          <strong key={i} className="font-semibold text-white">
            {p.val}
          </strong>
        )
      )}
    </>
  );
}

function MiniMarkdown({ text }) {
  const blocks = text.trim().split(/\n\n+/);
  return (
    <div className="space-y-2 text-[12px] leading-5">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim());
        if (!lines.length) return null;
        if (/^\d+[.)\s]/.test(lines[0])) {
          return (
            <ol key={i} className="list-none space-y-1.5">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="min-w-5 shrink-0 font-mono font-semibold text-violet-400">
                    {line.match(/^(\d+)/)?.[1]}.
                  </span>
                  <span className="text-gray-300">
                    <InlineFormat text={line.replace(/^\d+[.)\s]+/, '')} />
                  </span>
                </li>
              ))}
            </ol>
          );
        }
        if (/^[-*•]\s/.test(lines[0])) {
          return (
            <ul key={i} className="list-none space-y-1.5">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-1.5 shrink-0 text-violet-400">•</span>
                  <span className="text-gray-300">
                    <InlineFormat text={line.replace(/^[-*•]\s*/, '')} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-gray-300">
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <InlineFormat text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ── AI Tutor panel ───────────────────────────────────────────────────────────

const AI_QUICK = [
  'Explain how my code works step by step',
  'What concepts should I learn here?',
  'What can I improve?',
  'Give me a similar practice problem',
  'Explain the output',
];

function AiChatPanel({
  aiMessages,
  aiInput,
  setAiInput,
  isAnalyzing,
  onSend,
  onAnalyzeErrors,
  onBack,
  hasErrors,
  messagesEndRef,
}) {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const q = aiInput.trim();
    if (q && !isAnalyzing) onSend(q);
  };

  const noUserMsgs = !aiMessages.some((m) => m.role === 'user');

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/6 bg-[#0d1117]/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20">
            <Bot className="h-3 w-3 text-violet-400" />
          </div>
          <span className="text-[11px] font-semibold text-gray-300">
            AI Tutor
          </span>
          <span className="rounded bg-white/4 px-1.5 py-0.5 text-[9px] font-medium tracking-wider text-gray-600 uppercase">
            Gemini
          </span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[10px] text-gray-600 transition-colors hover:text-gray-400"
        >
          <ChevronLeft className="h-3 w-3" />
          I/O
        </button>
      </div>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
        {/* Analyze errors quick-action */}
        {hasErrors && noUserMsgs && (
          <button
            onClick={onAnalyzeErrors}
            disabled={isAnalyzing}
            className="mb-3 flex w-full items-center gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/8 px-3 py-2.5 text-left transition-all hover:border-rose-500/40 hover:bg-rose-500/12 disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            <div>
              <p className="text-[11px] font-semibold text-rose-300">
                Analyze my errors
              </p>
              <p className="mt-0.5 text-[10px] text-gray-600">
                Step-by-step explanation of what went wrong
              </p>
            </div>
          </button>
        )}

        {/* Empty state hint */}
        {noUserMsgs && !isAnalyzing && !hasErrors && (
          <div className="mb-3 rounded-xl border border-white/6 bg-white/3 px-3 py-4 text-center">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10">
              <GraduationCap className="h-4 w-4 text-violet-400/60" />
            </div>
            <p className="text-[12px] font-medium text-gray-400">
              Your personal coding tutor
            </p>
            <p className="mt-1 text-[10px] text-gray-600">
              I&apos;ll guide you to understand &mdash; not give you answers.
            </p>
            <p className="mt-0.5 text-[10px] text-gray-700">
              Run your code first, then ask me anything!
            </p>
          </div>
        )}

        {/* Chat messages */}
        <div className="flex flex-col gap-3">
          {aiMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'ai' && (
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                  <Bot className="h-2.5 w-2.5 text-violet-400" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[88%] rounded-2xl px-3 py-2.5',
                  msg.role === 'user'
                    ? 'border-primary-500/20 bg-primary-500/10 border text-[12px] leading-5 text-gray-200'
                    : 'border border-white/6 bg-white/4'
                )}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <>
                    <MiniMarkdown text={msg.content} />
                    {msg.model && (
                      <p className="mt-2 border-t border-white/6 pt-1.5 text-[9px] font-medium tracking-wide text-gray-700 uppercase">
                        via {msg.model}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isAnalyzing && (
            <div className="flex gap-2">
              <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                <Bot className="h-2.5 w-2.5 text-violet-400" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/6 bg-white/4 px-3 py-3">
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                  style={{ animationDelay: '120ms' }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                  style={{ animationDelay: '240ms' }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick suggestions */}
      {noUserMsgs && !isAnalyzing && (
        <div className="flex shrink-0 flex-wrap gap-1.5 px-3 pb-2">
          {AI_QUICK.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="rounded-full border border-white/8 bg-white/3 px-2.5 py-1 text-[10px] text-gray-500 transition-all hover:border-white/15 hover:text-gray-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={submit}
        className="flex shrink-0 items-center gap-2 border-t border-white/6 px-3 py-2.5"
      >
        <input
          ref={inputRef}
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder="Ask about your code…"
          disabled={isAnalyzing}
          className="flex-1 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[12px] text-gray-300 transition-all outline-none placeholder:text-gray-600 focus:border-violet-500/40 focus:bg-white/6 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!aiInput.trim() || isAnalyzing}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400 transition-all hover:bg-violet-500/25 disabled:opacity-40"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CodePlayground({
  state,
  result,
  error,
  formatError,
  isRunning,
  isFormatting,
  onClose,
  onRun,
  onFormat,
  onDraftChange,
  onStdinChange,
  onReset,
  onLanguageChange,
  getLanguageLabel,
}) {
  const [ioTab, setIoTab] = useState('output');
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [inputRatio, setInputRatio] = useState(0.32);
  const [ioWidth, setIoWidth] = useState(null); // null = CSS default
  const [isDesktop, setIsDesktop] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // AI Tutor state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const ioPaneRef = useRef(null);
  const mainPanelRef = useRef(null);
  const aiMessagesEndRef = useRef(null);
  const dragState = useRef({ active: false, startY: 0, startRatio: 0.32 });
  const hDragState = useRef({ active: false, startX: 0, startWidth: 384 });
  const [mobileEditorRatio, setMobileEditorRatio] = useState(0.55);
  const vMobileDragState = useRef({
    active: false,
    startY: 0,
    startRatio: 0.55,
  });
  // Stable ref so the keymap doesn't stale-close over onFormat
  const onFormatRef = useRef(onFormat);
  useEffect(() => {
    onFormatRef.current = onFormat;
  }, [onFormat]);

  const langLabel = getLanguageLabel(state?.language);
  const canFormat = FORMATTABLE.has(state?.language ?? '');
  const lineCount = (state?.draftCode ?? '').split('\n').length;

  // ── Enter animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (state?.isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [state?.isOpen]);

  // ── Auto-switch to output tab on result / error ────────────────────────────
  useEffect(() => {
    if (result || error) setIoTab('output');
  }, [result, error]);

  // ── Scroll lock ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state?.isOpen) return;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [state?.isOpen]);

  // ── Detect desktop (lg = 1024 px) ─────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Reset AI state when playground closes ─────────────────────────────────
  useEffect(() => {
    if (!state?.isOpen) {
      setAiOpen(false);
      setAiMessages([]);
      setAiInput('');
    }
  }, [state?.isOpen]);

  // ── Auto-scroll AI messages ────────────────────────────────────────────────
  useEffect(() => {
    if (aiOpen)
      aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiOpen]);

  // ── Send message to AI tutor ───────────────────────────────────────────────
  const sendToAi = useCallback(
    async (question) => {
      setAiMessages((prev) => [...prev, { role: 'user', content: question }]);
      setAiInput('');
      setAiOpen(true);
      setIsAnalyzing(true);
      const stderr =
        (result?.compile?.stderr || '') +
        (result?.run?.stderr ? '\n' + result.run.stderr : '');
      try {
        const res = await fetch('/api/code/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: state?.draftCode ?? '',
            language: state?.language ?? '',
            error: error || stderr.trim() || '',
            output: result?.output || '',
            question,
            history: aiMessages.slice(-4), // last 2 exchanges for context
          }),
        });
        const data = await res.json();
        const content =
          data.explanation ||
          data.error ||
          'I could not generate a response. Please try again.';
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', content, model: data.model || null },
        ]);
      } catch {
        setAiMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content:
              'Failed to reach the AI tutor. Please check your connection and try again.',
          },
        ]);
      } finally {
        setIsAnalyzing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.draftCode, state?.language, error, result, aiMessages]
  );

  const handleOpenAi = useCallback(() => setAiOpen(true), []);

  const handleAnalyzeErrors = useCallback(() => {
    const q =
      error ||
      result?.compile?.stderr ||
      (result?.run?.code !== 0 && result?.run?.code != null)
        ? "Please analyze my code errors step-by-step. Explain WHY each error occurs and guide me to understand and fix it myself — don't give me the corrected code."
        : 'Please review my code and explain how it works. What concepts should I understand better?';
    sendToAi(q);
  }, [error, result, sendToAi]);

  // ── Download code ──────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const ext = LANGUAGE_EXTENSIONS[state?.language] || '.txt';
    const blob = new Blob([state?.draftCode ?? ''], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `code${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [state?.draftCode, state?.language]);

  // ── Switch language ────────────────────────────────────────────────────────
  const handleLanguageSwitch = useCallback(
    (newLang) => {
      onLanguageChange?.(newLang);
      // Offer starter template if editor is empty or unchanged
      const current = (state?.draftCode ?? '').trim();
      const original = (state?.originalCode ?? '').trim();
      if (!current || current === original) {
        const tpl = STARTER_TEMPLATES[newLang];
        if (tpl) onDraftChange?.(tpl);
      }
    },
    [onLanguageChange, onDraftChange, state?.draftCode, state?.originalCode]
  );

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state?.isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, state?.isOpen, showShortcuts]);

  // ── I/O pane drag (vertical resize) ───────────────────────────────────────
  const startPaneDrag = useCallback(
    (clientY) => {
      dragState.current = {
        active: true,
        startY: clientY,
        startRatio: inputRatio,
      };
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [inputRatio]
  );

  useEffect(() => {
    const handleMove = (clientY) => {
      if (!dragState.current.active || !ioPaneRef.current) return;
      const paneH = ioPaneRef.current.getBoundingClientRect().height;
      if (!paneH) return;
      const delta = (clientY - dragState.current.startY) / paneH;
      setInputRatio(
        Math.min(0.8, Math.max(0.1, dragState.current.startRatio + delta))
      );
    };
    const onMouseMove = (e) => handleMove(e.clientY);
    const onTouchMove = (e) => handleMove(e.touches[0].clientY);
    const onEnd = () => {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  // ── Horizontal resize (editor ↔ I/O pane) ────────────────────────────────
  useEffect(() => {
    const handleMove = (clientX) => {
      if (!hDragState.current.active || !mainPanelRef.current) return;
      const panelW = mainPanelRef.current.getBoundingClientRect().width;
      if (!panelW) return;
      // Dragging left → I/O gets wider; dragging right → editor gets wider
      const delta = hDragState.current.startX - clientX;
      const newW = Math.min(
        panelW * 0.7,
        Math.max(240, hDragState.current.startWidth + delta)
      );
      setIoWidth(Math.round(newW));
    };
    const onMouseMove = (e) => handleMove(e.clientX);
    const onTouchMove = (e) => handleMove(e.touches[0].clientX);
    const onEnd = () => {
      if (!hDragState.current.active) return;
      hDragState.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  // ── Mobile vertical resize (editor ↔ I/O pane) ───────────────────────────
  useEffect(() => {
    const handleMove = (clientY) => {
      if (!vMobileDragState.current.active || !mainPanelRef.current) return;
      const panelH = mainPanelRef.current.getBoundingClientRect().height;
      if (!panelH) return;
      const delta = (clientY - vMobileDragState.current.startY) / panelH;
      setMobileEditorRatio(
        Math.min(
          0.8,
          Math.max(0.2, vMobileDragState.current.startRatio + delta)
        )
      );
    };
    const onMouseMove = (e) => handleMove(e.clientY);
    const onTouchMove = (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };
    const onEnd = () => {
      if (!vMobileDragState.current.active) return;
      vMobileDragState.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  // ── CodeMirror extensions ──────────────────────────────────────────────────
  const extensions = useMemo(
    () => [
      ...getLangExtension(state?.language),
      ...(wordWrap ? [EditorView.lineWrapping] : []),
      EditorView.theme({
        '&': { fontSize: `${fontSize}px` },
        '.cm-scroller': { fontFamily: 'inherit' },
      }),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            onRun();
            return true;
          },
        },
        {
          // Shift+Alt+F — Format Document (VS Code standard)
          key: 'Shift-Alt-f',
          run: () => {
            if (FORMATTABLE.has(state?.language ?? '')) {
              onFormatRef.current?.();
            }
            return true;
          },
        },
        indentWithTab,
      ]),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.language, wordWrap, fontSize]
  );

  if (!state?.isOpen) return null;

  const hasOutput = !!(result || error);
  const exitCode = result?.run?.code;
  const isSuccess = exitCode === 0;
  const hasErrors = !!(
    error ||
    result?.compile?.stderr ||
    (exitCode !== 0 && exitCode != null)
  );

  return (
    <div
      className={cn(
        'fixed inset-0 z-100 flex flex-col bg-[#0a0e17] transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* ── Title bar ────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/6 bg-[#0d1117] px-3 sm:px-4">
        {/* Left — language selector + branding */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="text-primary-400 h-4 w-4" />
            <span className="text-primary-400 hidden text-[11px] font-bold tracking-wide uppercase sm:inline">
              Code Playground
            </span>
          </div>
          <div className="h-4 w-px bg-white/8" />
          {/* Language selector */}
          <div className="relative">
            <select
              value={state?.language || ''}
              onChange={(e) => handleLanguageSwitch(e.target.value)}
              className="border-primary-500/20 bg-primary-500/8 text-primary-400 hover:border-primary-500/40 hover:bg-primary-500/15 focus:border-primary-500/50 appearance-none rounded-md border py-0.5 pr-6 pl-2 font-mono text-[10px] font-bold tracking-wider uppercase transition-all outline-none"
            >
              {PLAYGROUND_LANGUAGES.map((l) => (
                <option
                  key={l.value}
                  value={l.value}
                  className="bg-[#0d1117] text-gray-300"
                >
                  {l.label}
                </option>
              ))}
            </select>
            <ChevronDown className="text-primary-400/60 pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2" />
          </div>
        </div>

        {/* Right — help + close */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowShortcuts((p) => !p)}
            className="group flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/8"
            title="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5 text-gray-500 transition-colors group-hover:text-gray-200" />
          </button>
          <button
            onClick={onClose}
            className="group flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/8"
            aria-label="Close playground"
          >
            <X className="h-3.5 w-3.5 text-gray-500 transition-colors group-hover:text-gray-200" />
          </button>
        </div>
      </header>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/6 bg-[#0d1117]/80 px-3 py-1.5 backdrop-blur-sm sm:px-4">
        {/* Left — utility buttons */}
        <div className="flex items-center gap-1.5">
          {canFormat && (
            <button
              onClick={onFormat}
              disabled={isFormatting}
              title="Format Document (Shift+Alt+F)"
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
                isFormatting
                  ? 'border-primary-500/20 bg-primary-500/8 text-primary-400/50 cursor-wait'
                  : 'border-primary-500/25 bg-primary-500/10 text-primary-400 hover:border-primary-500/50 hover:bg-primary-500/20 hover:text-primary-300'
              )}
            >
              {isFormatting ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="xs:inline hidden">
                {isFormatting ? 'Formatting…' : 'Format'}
              </span>
              <span className="border-primary-500/20 text-primary-500/60 hidden rounded border px-1 font-mono text-[9px] leading-4 sm:inline">
                ⇧⌥F
              </span>
            </button>
          )}
          <button
            onClick={onReset}
            className="playground-btn"
            title="Reset code"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <CopyButton text={state.draftCode} label="Copy" />
          <button
            onClick={handleDownload}
            className="playground-btn"
            title="Download code"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <div className="hidden h-4 w-px bg-white/6 sm:block" />

          {/* Font size controls */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <button
              onClick={() => setFontSize((s) => Math.max(10, s - 1))}
              className="playground-btn px-1.5!"
              title="Decrease font size"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-6 text-center font-mono text-[10px] text-gray-500">
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="playground-btn px-1.5!"
              title="Increase font size"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Word wrap toggle */}
          <button
            onClick={() => setWordWrap((p) => !p)}
            className={cn(
              'playground-btn',
              wordWrap && 'border-primary-500/30! text-primary-400!'
            )}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <WrapText className="h-3.5 w-3.5" />
          </button>

          <div className="hidden h-4 w-px bg-white/6 sm:block" />
          <button
            onClick={handleOpenAi}
            title="AI Tutor — learn from your errors"
            className={cn(
              'relative flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
              aiOpen
                ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                : 'border-violet-500/20 bg-violet-500/8 text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/15 hover:text-violet-300'
            )}
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Tutor</span>
            {hasErrors && !aiOpen && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
              </span>
            )}
          </button>
          <div className="hidden h-4 w-px bg-white/6 sm:block" />
          <button
            onClick={() => setEditorExpanded((p) => !p)}
            className="playground-btn"
            title={editorExpanded ? 'Show I/O panel' : 'Expand editor'}
          >
            {editorExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Right — run */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-1.5 text-[12px] font-semibold text-white transition-all',
            isRunning
              ? 'bg-primary-500/40 cursor-wait'
              : 'bg-primary-500 shadow-primary-500/20 hover:bg-primary-600 hover:shadow-primary-500/30 shadow-lg active:scale-[0.97]'
          )}
        >
          {isRunning ? (
            <>
              <Spinner className="h-3.5 w-3.5" />
              Running…
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Run
              <span className="hidden rounded border border-white/15 px-1 font-mono text-[9px] leading-4 font-normal text-white/50 sm:inline">
                ⌘↵
              </span>
            </>
          )}
        </button>
      </div>

      {/* ── Main split ───────────────────────────────────────────────────── */}
      <div
        ref={mainPanelRef}
        className="flex min-h-0 flex-1 flex-col lg:flex-row"
      >
        {/* ── Editor pane ─────────────────────────────────────────────────── */}
        <div
          className="flex min-h-0 min-w-0 flex-col"
          style={
            !isDesktop && !editorExpanded
              ? { height: `${mobileEditorRatio * 100}%` }
              : { flex: '1 1 0', minWidth: 0 }
          }
        >
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <CodeMirror
              value={state.draftCode}
              height="100%"
              theme={oneDark}
              extensions={extensions}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                closeBrackets: true,
                autocompletion: true,
                searchKeymap: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                highlightSelectionMatches: true,
                indentOnInput: true,
                tabSize: 2,
                bracketMatching: true,
                crosshairCursor: false,
                rectangularSelection: true,
                drawSelection: true,
                dropCursor: true,
              }}
              onChange={onDraftChange}
              className="code-playground-editor"
              style={{ height: '100%' }}
            />
          </div>

          {/* Format error toast */}
          {formatError && (
            <div className="flex shrink-0 items-center gap-2 border-t border-amber-500/15 bg-amber-500/5 px-4 py-2 text-[12px] text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {formatError}
            </div>
          )}
        </div>

        {/* ── Horizontal drag handle (desktop) ────────────────────────── */}
        {!editorExpanded && (
          <div
            role="separator"
            aria-label="Resize editor"
            onMouseDown={(e) => {
              e.preventDefault();
              const curW =
                ioWidth ??
                (mainPanelRef.current?.getBoundingClientRect().width ?? 1024) *
                  0.38;
              hDragState.current = {
                active: true,
                startX: e.clientX,
                startWidth: curW,
              };
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
            className="group hover:bg-primary-500/6 hidden w-1 cursor-col-resize flex-col items-center justify-center bg-white/6 transition-colors lg:flex"
          >
            <span className="group-hover:bg-primary-500/50 h-8 w-0.5 rounded-full bg-white/10 transition-all group-hover:h-12" />
          </div>
        )}

        {/* ── Vertical drag handle (mobile) ───────────────────────────── */}
        {!editorExpanded && (
          <div
            role="separator"
            aria-label="Resize editor"
            onMouseDown={(e) => {
              e.preventDefault();
              vMobileDragState.current = {
                active: true,
                startY: e.clientY,
                startRatio: mobileEditorRatio,
              };
              document.body.style.cursor = 'row-resize';
              document.body.style.userSelect = 'none';
            }}
            onTouchStart={(e) => {
              vMobileDragState.current = {
                active: true,
                startY: e.touches[0].clientY,
                startRatio: mobileEditorRatio,
              };
            }}
            className="group hover:bg-primary-500/6 flex h-1 w-full shrink-0 cursor-row-resize items-center justify-center bg-white/6 transition-colors lg:hidden"
          >
            <span className="group-hover:bg-primary-500/50 h-0.5 w-8 rounded-full bg-white/10 transition-all group-hover:w-12" />
          </div>
        )}

        {/* ── I/O pane ────────────────────────────────────────────────────── */}
        {!editorExpanded && (
          <div
            className="flex w-full shrink-0 flex-col lg:w-96 xl:w-110"
            style={
              isDesktop && ioWidth !== null
                ? { width: `${ioWidth}px` }
                : !isDesktop
                  ? { flex: '1 1 0', minHeight: 0 }
                  : undefined
            }
          >
            {/* ── AI Tutor panel (replaces I/O when open) ─────────────────── */}
            {aiOpen && (
              <AiChatPanel
                aiMessages={aiMessages}
                aiInput={aiInput}
                setAiInput={setAiInput}
                isAnalyzing={isAnalyzing}
                onSend={sendToAi}
                onAnalyzeErrors={handleAnalyzeErrors}
                onBack={() => setAiOpen(false)}
                hasErrors={hasErrors}
                messagesEndRef={aiMessagesEndRef}
              />
            )}

            {/* ── Desktop: stacked + resizable (lg+) ─────────────────────── */}
            <div
              ref={ioPaneRef}
              className={cn(
                'flex-1 flex-col overflow-hidden lg:flex',
                aiOpen ? 'hidden' : 'hidden lg:flex'
              )}
            >
              {/* Input panel */}
              <div
                className="flex flex-col overflow-hidden"
                style={{ flex: `0 0 ${inputRatio * 100}%` }}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-white/4 px-3 py-1.5">
                  <div className="flex items-center">
                    <FileInput className="mr-1.5 h-3 w-3 text-gray-600" />
                    <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
                      Input
                    </span>
                    <span className="ml-1.5 text-[10px] text-gray-700">
                      (stdin)
                    </span>
                  </div>
                  {canFormat && (
                    <button
                      onClick={onFormat}
                      disabled={isFormatting}
                      title="Format Document (Shift+Alt+F)"
                      className={cn(
                        'flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-all',
                        isFormatting
                          ? 'border-primary-500/20 bg-primary-500/8 text-primary-400/50 cursor-wait'
                          : 'border-primary-500/25 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 hover:text-primary-300'
                      )}
                    >
                      {isFormatting ? (
                        <Spinner className="h-2.5 w-2.5" />
                      ) : (
                        <Sparkles className="h-2.5 w-2.5" />
                      )}
                      {isFormatting ? 'Formatting…' : 'Format'}
                    </button>
                  )}
                </div>
                <textarea
                  value={state.stdin}
                  onChange={(e) => onStdinChange(e.target.value)}
                  spellCheck={false}
                  placeholder="Enter program input…"
                  className="caret-primary-400 flex-1 resize-none bg-transparent px-4 py-2.5 font-mono text-[12px] leading-6 text-gray-300 outline-none placeholder:text-gray-700"
                />
              </div>

              {/* Drag handle */}
              <div
                role="separator"
                aria-label="Resize panels"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startPaneDrag(e.clientY);
                }}
                onTouchStart={(e) => startPaneDrag(e.touches[0].clientY)}
                className="group hover:bg-primary-500/6 flex shrink-0 cursor-row-resize items-center justify-center border-y border-white/4 bg-[#0d1117] py-1.5 transition-colors"
              >
                <span className="group-hover:bg-primary-500/50 h-0.5 w-8 rounded-full bg-white/10 transition-all group-hover:w-12" />
              </div>

              {/* Output panel */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-white/4 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="h-3 w-3 text-gray-600" />
                    <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
                      Output
                    </span>
                    {hasOutput && (
                      <span className="bg-primary-500/70 h-1.5 w-1.5 rounded-full" />
                    )}
                  </div>
                  {result && (
                    <div className="flex items-center gap-1.5">
                      {typeof exitCode === 'number' && (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0 text-[9px] leading-5 font-bold tracking-wide uppercase',
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          )}
                        >
                          exit {exitCode}
                        </span>
                      )}
                      <CopyButton text={result.output || ''} iconOnly />
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {!result && !error && !isRunning && (
                    <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/8">
                        <Lightbulb className="h-4.5 w-4.5 text-emerald-400/70" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-gray-400">
                          Ready to learn!
                        </p>
                        <p className="mt-1 text-[10px] text-gray-600">
                          Write your code, then press{' '}
                          <kbd className="rounded border border-white/8 bg-white/4 px-1 py-0.5 font-mono text-[10px] text-gray-500">
                            ⌘↵
                          </kbd>{' '}
                          to run it
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-700">
                          Stuck? Click{' '}
                          <strong className="text-violet-400/80">
                            AI Tutor
                          </strong>{' '}
                          for help
                        </p>
                      </div>
                    </div>
                  )}
                  {isRunning && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 py-8">
                      <div className="relative flex h-8 w-8 items-center justify-center">
                        <span className="bg-primary-500/15 absolute inset-0 animate-ping rounded-full" />
                        <Spinner className="text-primary-400 h-4 w-4" />
                      </div>
                      <p className="text-[11px] text-gray-600">Executing…</p>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-500/15 bg-rose-500/5 px-3 py-2.5 text-[12px] leading-5 text-rose-300">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                      <span>{error}</span>
                    </div>
                  )}
                  {result && (
                    <div className="space-y-3">
                      {result.compile?.stderr && (
                        <div className="rounded-lg border border-rose-500/10 bg-rose-500/3 p-3">
                          <p className="mb-1.5 text-[10px] font-bold tracking-widest text-rose-400/80 uppercase">
                            Compile Errors
                          </p>
                          <pre className="font-mono text-[12px] leading-5 whitespace-pre-wrap text-rose-200/80">
                            {result.compile.stderr}
                          </pre>
                        </div>
                      )}
                      <pre className="font-mono text-[13px] leading-6 whitespace-pre-wrap text-gray-200">
                        {result.output || (
                          <span className="text-gray-600 italic">
                            No output produced.
                          </span>
                        )}
                      </pre>
                      <p className="text-[10px] tracking-wide text-gray-700">
                        {result.language} {result.version}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Mobile: tabbed (<lg) ───────────────────────────────────── */}
            <div
              className={cn(
                'flex flex-1 flex-col overflow-hidden lg:hidden',
                aiOpen && 'hidden'
              )}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/6 bg-[#0d1117]/50 px-2">
                <div className="flex">
                  <IOTab
                    active={ioTab === 'input'}
                    icon={FileInput}
                    label="Input"
                    onClick={() => setIoTab('input')}
                  />
                  <IOTab
                    active={ioTab === 'output'}
                    icon={Terminal}
                    label="Output"
                    count={hasOutput ? 1 : undefined}
                    onClick={() => setIoTab('output')}
                  />
                </div>
                {ioTab === 'input' && canFormat && (
                  <button
                    onClick={onFormat}
                    disabled={isFormatting}
                    className={cn(
                      'mr-1.5 flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-all',
                      isFormatting
                        ? 'border-primary-500/20 bg-primary-500/8 text-primary-400/50 cursor-wait'
                        : 'border-primary-500/25 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 hover:text-primary-300'
                    )}
                  >
                    {isFormatting ? (
                      <Spinner className="h-3 w-3" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Format
                  </button>
                )}
                {ioTab === 'output' && result && (
                  <CopyButton
                    text={result.output || ''}
                    iconOnly
                    className="mr-1"
                  />
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {ioTab === 'input' && (
                  <textarea
                    value={state.stdin}
                    onChange={(e) => onStdinChange(e.target.value)}
                    spellCheck={false}
                    placeholder="Enter program input (stdin)…"
                    className="caret-primary-400 min-h-32 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-gray-300 outline-none placeholder:text-gray-700"
                  />
                )}
                {ioTab === 'output' && (
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    {!result && !error && !isRunning && (
                      <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/8">
                          <Lightbulb className="h-5 w-5 text-emerald-400/70" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-400">
                            Ready to learn!
                          </p>
                          <p className="mt-1 text-[11px] text-gray-600">
                            Tap{' '}
                            <strong className="text-primary-400">Run</strong> to
                            execute your code
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-700">
                            Need help? Try the{' '}
                            <strong className="text-violet-400/80">
                              AI Tutor
                            </strong>
                          </p>
                        </div>
                      </div>
                    )}
                    {isRunning && (
                      <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
                        <div className="relative flex h-10 w-10 items-center justify-center">
                          <span className="bg-primary-500/20 absolute inset-0 animate-ping rounded-full" />
                          <Spinner className="text-primary-400 h-5 w-5" />
                        </div>
                        <p className="text-[13px] text-gray-500">Executing…</p>
                      </div>
                    )}
                    {error && (
                      <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/15 bg-rose-500/5 px-3.5 py-3 text-[12px] leading-5 text-rose-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        <span>{error}</span>
                      </div>
                    )}
                    {result && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {typeof exitCode === 'number' && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                                isSuccess
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              )}
                            >
                              {isSuccess ? (
                                <Check className="h-2.5 w-2.5" />
                              ) : (
                                <AlertCircle className="h-2.5 w-2.5" />
                              )}
                              exit {exitCode}
                            </span>
                          )}
                          {result.run?.signal && (
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-400 uppercase">
                              {result.run.signal}
                            </span>
                          )}
                        </div>
                        {result.compile?.stderr && (
                          <div className="rounded-lg border border-rose-500/10 bg-rose-500/3 p-3">
                            <p className="mb-1.5 text-[10px] font-bold tracking-widest text-rose-400/80 uppercase">
                              Compile Errors
                            </p>
                            <pre className="font-mono text-[12px] leading-5 whitespace-pre-wrap text-rose-200/80">
                              {result.compile.stderr}
                            </pre>
                          </div>
                        )}
                        <pre className="font-mono text-[13px] leading-6 whitespace-pre-wrap text-gray-200">
                          {result.output || (
                            <span className="text-gray-600 italic">
                              No output produced.
                            </span>
                          )}
                        </pre>
                        <p className="text-[10px] tracking-wide text-gray-700">
                          {result.language} {result.version}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-white/6 bg-[#0d1117] px-3 text-[10px] text-gray-600">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-500">{langLabel}</span>
          <span className="h-2.5 w-px bg-white/8" />
          <span>
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
          <span className="h-2.5 w-px bg-white/8" />
          <span>Font {fontSize}px</span>
          <span className="h-2.5 w-px bg-white/8" />
          <span>UTF-8</span>
          {wordWrap && (
            <>
              <span className="h-2.5 w-px bg-white/8" />
              <span>Wrap</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">
            <kbd className="font-mono">⌘⏎</kbd> Run
          </span>
          {canFormat && (
            <span className="hidden sm:inline">
              <kbd className="font-mono">⇧⌥F</kbd> Format
            </span>
          )}
          <span className="hidden sm:inline">
            <kbd className="font-mono">Esc</kbd> Close
          </span>
          {isRunning && (
            <span className="text-primary-400 flex items-center gap-1">
              <Spinner className="h-2.5 w-2.5" />
              Running
            </span>
          )}
          {result && typeof exitCode === 'number' && (
            <span
              className={cn(
                'flex items-center gap-1 font-medium',
                isSuccess ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isSuccess ? (
                <Check className="h-2.5 w-2.5" />
              ) : (
                <AlertCircle className="h-2.5 w-2.5" />
              )}
              exit {exitCode}
            </span>
          )}
        </div>
      </div>

      {/* ── Keyboard shortcuts overlay ───────────────────────────────────── */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-2xl border border-white/8 bg-[#0d1117] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="text-primary-400 h-4 w-4" />
                <h3 className="text-sm font-semibold text-gray-200">
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white/8 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                ['⌘ Enter', 'Run code'],
                ['⇧ ⌥ F', 'Format document'],
                ['⌘ S', 'Save / Download code'],
                ['Tab', 'Indent line'],
                ['⇧ Tab', 'Outdent line'],
                ['⌘ D', 'Select next occurrence'],
                ['⌘ /', 'Toggle line comment'],
                ['⌘ Z', 'Undo'],
                ['⌘ ⇧ Z', 'Redo'],
                ['⌘ F', 'Find in editor'],
                ['Esc', 'Close playground'],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-1.5"
                >
                  <span className="text-[11px] text-gray-400">{desc}</span>
                  <kbd className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-gray-500">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[10px] text-gray-700">
              Click anywhere outside or press{' '}
              <kbd className="font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
