/**
 * @file CodeViewer Component
 * @module CodeViewer
 *
 * Professional code viewer with syntax highlighting using CodeMirror.
 * Includes built-in code formatter for C/C++ style code (like AStyle).
 * Styled like Sublime Text with One Dark theme.
 */

'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { php } from '@codemirror/lang-php';
import { EditorView } from '@codemirror/view';
import {
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Wand2,
  Sparkles,
  Loader2,
  Undo2,
} from 'lucide-react';

/**
 * Simple C/C++/Java style code formatter (AStyle-like)
 * Handles indentation, braces, and basic formatting
 */
function formatCode(code, language) {
  if (!code) return code;

  const lang = language?.toLowerCase() || '';
  const isCStyle =
    lang.includes('c++') ||
    lang.includes('cpp') ||
    lang.includes('c') ||
    lang.includes('java') ||
    lang.includes('javascript') ||
    lang.includes('typescript') ||
    lang.includes('go') ||
    lang.includes('rust');

  if (!isCStyle) {
    // For Python and other languages, just ensure proper line breaks
    // Handle both literal \n and escaped \\n from database
    return code.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').trim();
  }

  // First, normalize the code - handle both literal and escaped newlines
  // Database may store as \\n (escaped) or \n (literal)
  let formatted = code
    .replace(/\\\\n/g, '\n') // Handle \\n from database
    .replace(/\\n/g, '\n') // Handle \n
    .replace(/\\\\t/g, '\t') // Handle \\t from database
    .replace(/\\t/g, '\t'); // Handle \t

  // If code appears to be already formatted (has newlines), return as is
  if (formatted.includes('\n') && formatted.split('\n').length > 3) {
    return formatted.trim();
  }

  // Otherwise, format the code
  const indentStr = '    '; // 4 spaces
  let indentLevel = 0;
  let result = '';
  let inString = false;
  let stringChar = '';
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let lastChar = '';
  let buffer = '';
  let parenDepth = 0; // Track parentheses depth for for/while/if conditions

  // Tokenize and format
  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    const nextChar = formatted[i + 1] || '';

    // Handle string literals
    if (!inSingleLineComment && !inMultiLineComment) {
      if ((char === '"' || char === "'") && lastChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
    }

    // Handle comments
    if (!inString) {
      if (char === '/' && nextChar === '/' && !inMultiLineComment) {
        inSingleLineComment = true;
      }
      if (char === '/' && nextChar === '*' && !inSingleLineComment) {
        inMultiLineComment = true;
      }
      if (char === '*' && nextChar === '/' && inMultiLineComment) {
        buffer += '*/';
        i++;
        inMultiLineComment = false;
        lastChar = '/';
        continue;
      }
      if (char === '\n' && inSingleLineComment) {
        inSingleLineComment = false;
      }
    }

    // Process characters
    if (inString || inSingleLineComment || inMultiLineComment) {
      buffer += char;
    } else {
      switch (char) {
        case '(':
          parenDepth++;
          buffer += char;
          break;

        case ')':
          parenDepth = Math.max(0, parenDepth - 1);
          buffer += char;
          break;

        case '{':
          // Trim trailing spaces from buffer
          buffer = buffer.trimEnd();
          if (buffer.length > 0) {
            result += indentStr.repeat(indentLevel) + buffer.trim() + ' {\n';
            buffer = '';
          } else {
            result += indentStr.repeat(indentLevel) + '{\n';
          }
          indentLevel++;
          break;

        case '}':
          if (buffer.trim().length > 0) {
            result += indentStr.repeat(indentLevel) + buffer.trim() + '\n';
            buffer = '';
          }
          indentLevel = Math.max(0, indentLevel - 1);
          result += indentStr.repeat(indentLevel) + '}\n';
          break;

        case ';':
          buffer += ';';
          // Only add newline if we're not inside parentheses (e.g., for loop)
          if (!inString && parenDepth === 0) {
            result += indentStr.repeat(indentLevel) + buffer.trim() + '\n';
            buffer = '';
          }
          break;

        case '\n':
          if (buffer.trim().length > 0) {
            result += indentStr.repeat(indentLevel) + buffer.trim() + '\n';
            buffer = '';
          }
          break;

        default:
          buffer += char;
          break;
      }
    }

    lastChar = char;
  }

  // Add remaining buffer
  if (buffer.trim().length > 0) {
    result += indentStr.repeat(indentLevel) + buffer.trim() + '\n';
  }

  // Clean up extra blank lines and normalize
  result = result
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result;
}

// Language extension mapping
const getLanguageExtension = (language) => {
  const lang = language?.toLowerCase() || '';

  if (
    lang.includes('c++') ||
    lang.includes('cpp') ||
    lang === 'c' ||
    lang.includes('gnu')
  ) {
    return cpp();
  }
  if (lang.includes('java') && !lang.includes('javascript')) {
    return java();
  }
  if (lang.includes('python') || lang.includes('pypy')) {
    return python();
  }
  if (
    lang.includes('javascript') ||
    lang.includes('js') ||
    lang.includes('node') ||
    lang.includes('typescript')
  ) {
    return javascript();
  }
  if (lang.includes('rust')) {
    return rust();
  }
  if (lang.includes('go') || lang === 'golang') {
    return go();
  }
  if (lang.includes('php')) {
    return php();
  }
  // Default to C++ for competitive programming
  return cpp();
};

// Format language name for display
const formatLanguageName = (language) => {
  const lang = language?.toLowerCase() || 'unknown';

  const nameMap = {
    'gnu c++17': 'C++17',
    'gnu c++20': 'C++20',
    'gnu c++14': 'C++14',
    'gnu c++11': 'C++11',
    cpp: 'C++',
    'c++': 'C++',
    c: 'C',
    java: 'Java',
    python: 'Python',
    python3: 'Python 3',
    pypy3: 'PyPy 3',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    rust: 'Rust',
    go: 'Go',
    golang: 'Go',
    kotlin: 'Kotlin',
    ruby: 'Ruby',
    php: 'PHP',
  };

  // Check for partial matches
  for (const [key, value] of Object.entries(nameMap)) {
    if (lang.includes(key)) {
      return value;
    }
  }

  return language || 'Plain Text';
};

// Custom theme extension for better styling
const customTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    fontFamily:
      '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
  },
  '.cm-content': {
    padding: '16px 0',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: '1px solid rgba(255, 255, 255, 0.06)',
    paddingRight: '8px',
  },
  '.cm-gutter': {
    minWidth: '48px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 16px',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: '12px',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(97, 175, 239, 0.2) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(97, 175, 239, 0.3) !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#528bff',
  },
});

export default function CodeViewer({
  code,
  language,
  submissionId = null, // Optional: pass to save formatted code to database
  showLineNumbers = true,
  maxHeight = '500px',
  title = 'Source Code',
  showHeader = true,
  autoFormat = true,
  className = '',
  onCodeFormatted = null, // Optional callback when code is formatted and saved
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isFormatted, setIsFormatted] = useState(autoFormat);
  const [aiFormattedCode, setAiFormattedCode] = useState(null);
  const [aiFormatting, setAiFormatting] = useState(false);
  const [aiFormatError, setAiFormatError] = useState(null);
  const [aiSaved, setAiSaved] = useState(false);
  const [originalCode, setOriginalCode] = useState(null); // Store original code for revert
  const [reverting, setReverting] = useState(false);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useMemo(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const languageExtension = useMemo(
    () => getLanguageExtension(language),
    [language]
  );
  const displayLanguage = useMemo(
    () => formatLanguageName(language),
    [language]
  );

  // Format code if needed - prefer AI formatted code if available
  const displayCode = useMemo(() => {
    if (!code) return '';

    // If AI formatted code is available, use it
    if (aiFormattedCode) {
      return aiFormattedCode;
    }

    if (isFormatted) {
      return formatCode(code, language);
    }
    // At minimum, handle escaped newlines (both \\n and \n)
    return code
      .replace(/\\\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\\\t/g, '\t')
      .replace(/\\t/g, '\t');
  }, [code, language, isFormatted, aiFormattedCode]);

  // AI Format function - calls API to format code and save to database
  const handleAiFormat = useCallback(async () => {
    if (aiFormatting || !code) return;

    setAiFormatting(true);
    setAiFormatError(null);
    setAiSaved(false);

    try {
      const res = await fetch('/api/problem-solving/ai-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          language: language,
          submissionId: submissionId, // Pass submissionId to save to database
        }),
      });

      if (!isMountedRef.current) return;

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'AI formatting failed');
      }

      const data = await res.json();

      if (!isMountedRef.current) return;

      if (data.success && data.formattedCode) {
        setAiFormattedCode(data.formattedCode);
        setIsFormatted(true);
        setAiSaved(data.saved || false);

        // Store original code for revert functionality
        if (data.originalCode) {
          setOriginalCode(data.originalCode);
        }

        // Show save error if formatting succeeded but save failed
        if (data.saveError) {
          console.warn(
            'AI Format: Code formatted but save failed:',
            data.saveError
          );
          setAiFormatError(`Formatted but not saved: ${data.saveError}`);
        }

        // Call callback if provided (to refresh parent data)
        if (data.saved && onCodeFormatted) {
          onCodeFormatted(data.formattedCode);
        }
      } else {
        throw new Error(data.error || 'AI formatting failed');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('AI Format failed:', error);
      setAiFormatError(error.message);
    } finally {
      if (isMountedRef.current) {
        setAiFormatting(false);
      }
    }
  }, [code, language, submissionId, aiFormatting, onCodeFormatted]);

  // Revert to original code
  const handleRevert = useCallback(async () => {
    if (reverting || !submissionId) return;

    setReverting(true);

    try {
      const res = await fetch('/api/problem-solving/ai-format', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });

      if (!isMountedRef.current) return;

      const data = await res.json();

      if (data.success && data.reverted) {
        // Reset all AI formatting state
        setAiFormattedCode(null);
        setAiFormatError(null);
        setAiSaved(false);
        setOriginalCode(null);
        setIsFormatted(false);

        // Notify parent to refresh
        if (onCodeFormatted) {
          onCodeFormatted(data.originalCode);
        }
      } else {
        console.error('Revert failed:', data.error);
        setAiFormatError(data.error || 'Failed to revert');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Revert failed:', error);
      setAiFormatError(error.message);
    } finally {
      if (isMountedRef.current) {
        setReverting(false);
      }
    }
  }, [submissionId, reverting, onCodeFormatted]);

  // Reset AI formatting
  const resetAiFormat = useCallback(() => {
    setAiFormattedCode(null);
    setAiFormatError(null);
    setAiSaved(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!displayCode) return;
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [displayCode]);

  const handleDownload = useCallback(() => {
    if (!displayCode) return;

    const extension =
      {
        'c++': 'cpp',
        cpp: 'cpp',
        c: 'c',
        java: 'java',
        python: 'py',
        javascript: 'js',
        typescript: 'ts',
        rust: 'rs',
        go: 'go',
        kotlin: 'kt',
        ruby: 'rb',
        php: 'php',
      }[language?.toLowerCase()] || 'txt';

    const blob = new Blob([displayCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solution.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [displayCode, language]);

  const lineCount = displayCode?.split('\n').length || 0;

  if (!code) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-white/[0.06] bg-[#1e1e1e] p-8 ${className}`}
      >
        <p className="text-sm text-gray-500">No source code available</p>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/[0.08] bg-[#1e1e1e] shadow-2xl ${className}`}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#252526] px-4 py-2.5">
          <div className="flex items-center gap-3">
            {/* Traffic lights (decorative) */}
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>

            {/* Title and language */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">{title}</span>
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                {displayLanguage}
              </span>
              <span className="text-xs text-gray-500">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Format toggle */}
            <button
              onClick={() => {
                if (aiFormattedCode) {
                  resetAiFormat();
                }
                setIsFormatted(!isFormatted);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isFormatted && !aiFormattedCode
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
              }`}
              title={isFormatted ? 'Show raw code' : 'Format code'}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isFormatted && !aiFormattedCode ? 'Formatted' : 'Format'}
              </span>
            </button>

            {/* AI Format button */}
            <button
              onClick={handleAiFormat}
              disabled={aiFormatting}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                aiFormattedCode && aiSaved
                  ? 'bg-green-500/20 text-green-400'
                  : aiFormattedCode && aiFormatError
                    ? 'bg-amber-500/20 text-amber-400'
                    : aiFormattedCode
                      ? 'bg-purple-500/20 text-purple-400'
                      : aiFormatError
                        ? 'bg-red-500/20 text-red-400'
                        : aiFormatting
                          ? 'bg-purple-500/10 text-purple-300'
                          : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
              }`}
              title={
                aiFormattedCode && aiSaved
                  ? 'AI Formatted & Saved to database'
                  : aiFormattedCode && aiFormatError
                    ? aiFormatError
                    : aiFormattedCode
                      ? 'AI Formatted (not saved)'
                      : aiFormatError
                        ? aiFormatError
                        : 'Format with AI (whitespace/indentation only, saves to database)'
              }
            >
              {aiFormatting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {aiFormatting
                  ? 'Formatting...'
                  : aiFormattedCode && aiSaved
                    ? 'Saved'
                    : aiFormattedCode && aiFormatError
                      ? 'Not Saved'
                      : aiFormattedCode
                        ? 'AI Formatted'
                        : aiFormatError
                          ? 'Error'
                          : 'AI Format'}
              </span>
            </button>

            {/* Revert to Original button - only show when AI formatted and saved */}
            {aiSaved && originalCode && submissionId && (
              <button
                onClick={handleRevert}
                disabled={reverting}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  reverting
                    ? 'bg-orange-500/10 text-orange-300'
                    : 'text-gray-400 hover:bg-orange-500/20 hover:text-orange-400'
                }`}
                title="Revert to original unformatted code"
              >
                {reverting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {reverting ? 'Reverting...' : 'Revert'}
                </span>
              </button>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-all hover:bg-white/[0.06] hover:text-gray-200"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-all hover:bg-white/[0.06] hover:text-gray-200"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] hover:text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Code Editor (read-only) */}
      <div
        style={{ maxHeight: expanded ? 'none' : maxHeight }}
        className="overflow-auto"
      >
        <CodeMirror
          value={displayCode}
          extensions={[languageExtension, customTheme]}
          theme={oneDark}
          editable={false}
          basicSetup={{
            lineNumbers: showLineNumbers,
            highlightActiveLineGutter: false,
            highlightSpecialChars: true,
            history: false,
            foldGutter: true,
            drawSelection: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: false,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: false,
            autocompletion: false,
            rectangularSelection: false,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: false,
            defaultKeymap: false,
            searchKeymap: false,
            historyKeymap: false,
            foldKeymap: false,
            completionKeymap: false,
            lintKeymap: false,
          }}
        />
      </div>
    </div>
  );
}
