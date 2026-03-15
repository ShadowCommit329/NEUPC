import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as prettier from 'prettier';
import { format as sqlFormat } from 'sql-formatter';
import javaPlugin from 'prettier-plugin-java';
import * as phpPlugin from '@prettier/plugin-php';

// ── Extended PATH for spawned formatters ─────────────────────────────────────
// The Next.js server may inherit a restricted PATH (e.g., no conda/cargo/go).
// Append every well-known location so tools installed by any package manager
// are discoverable without restarting the server.
const HOME = process.env.HOME ?? process.env.USERPROFILE ?? '';
const EXTRA_PATHS = [
  `${HOME}/anaconda3/bin`,
  `${HOME}/miniconda3/bin`,
  `${HOME}/miniconda/bin`,
  `${HOME}/.conda/bin`,
  `${HOME}/.cargo/bin`, // rustfmt, rustup
  `${HOME}/go/bin`, // gofmt installed via go install
  '/usr/local/go/bin', // gofmt default install
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
];
const SPAWN_PATH = [
  ...new Set([process.env.PATH, ...EXTRA_PATHS].filter(Boolean)),
].join(':');

/**
 * A clean environment for spawning non-Node.js formatters (Python, Go, Rust…).
 * Console Ninja (and similar dev tools) inject LD_PRELOAD / NODE_OPTIONS with
 * Node.js native addons, which crash non-Node runtimes with "undefined symbol".
 * We strip those vars so Python/Go/Rust processes start cleanly.
 */
const {
  LD_PRELOAD: _ldPreload,
  LD_LIBRARY_PATH: _ldLibPath,
  NODE_OPTIONS: _nodeOpts,
  ...cleanEnv
} = process.env;
const SPAWN_ENV = { ...cleanEnv, PATH: SPAWN_PATH };

// ── Subprocess helper ────────────────────────────────────────────────────────
/**
 * Run a system formatter, piping `code` to stdin and capturing stdout.
 * Returns the formatted string, or `null` if the command is not found,
 * exits with a non-zero code, or times out (so the caller can fall back).
 */
function trySpawn(cmd, args, code, timeoutMs = 10_000) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(cmd, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: SPAWN_ENV,
      });
    } catch {
      return resolve(null);
    }

    const out = [];
    const err = [];
    let settled = false;

    const settle = (value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }
    };

    const timer = setTimeout(() => {
      proc.kill();
      settle(null);
    }, timeoutMs);

    proc.stdout.on('data', (d) => out.push(d));
    proc.stderr.on('data', (d) => err.push(d));
    proc.on('close', (exitCode) =>
      settle(exitCode === 0 ? Buffer.concat(out).toString('utf8') : null)
    );
    proc.on('error', () => settle(null));
    proc.stdin.on('error', () => {}); // ignore EPIPE if formatter exits early
    proc.stdin.write(code, 'utf8');
    proc.stdin.end();
  });
}

// ── Prettier built-in parsers ────────────────────────────────────────────────
const PRETTIER_PARSERS = {
  javascript: 'babel',
  js: 'babel',
  jsx: 'babel',
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'typescript',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  markdown: 'markdown',
  md: 'markdown',
};

// ── Prettier parsers that need an external plugin ────────────────────────────
const PLUGIN_PARSERS = {
  java: { parser: 'java', plugin: javaPlugin, tabWidth: 4 },
  php: { parser: 'php', plugin: phpPlugin, tabWidth: 4 },
};

// ── sql-formatter dialect map ────────────────────────────────────────────────
const SQL_DIALECTS = {
  sql: 'sql',
  mysql: 'mysql',
  postgresql: 'postgresql',
  postgres: 'postgresql',
};

// ── Pure-JS brace-based formatter (AStyle-like) ─────────────────────────────
// Works for C, C++, Go, Rust and any brace-delimited language.
// Handles string/char literals, single-line & multi-line comments,
// preprocessor directives, indentation, operator spacing, and brace placement.

const INDENT = '    '; // 4 spaces

/**
 * Tokenise source into meaningful chunks so we never touch the insides of
 * strings, chars, or comments.  Each token is { type, value }.
 */
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const len = src.length;

  while (i < len) {
    // Multi-line comment
    if (src[i] === '/' && src[i + 1] === '*') {
      let j = i + 2;
      while (j < len && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j += 2;
      tokens.push({ type: 'comment_ml', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // Single-line comment
    if (src[i] === '/' && src[i + 1] === '/') {
      let j = i + 2;
      while (j < len && src[j] !== '\n') j++;
      tokens.push({ type: 'comment_sl', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // String literal (double-quoted)
    if (src[i] === '"') {
      let j = i + 1;
      while (j < len && src[j] !== '"') {
        if (src[j] === '\\') j++;
        j++;
      }
      j++;
      tokens.push({ type: 'string', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // Char literal (single-quoted)
    if (src[i] === "'") {
      let j = i + 1;
      while (j < len && src[j] !== "'") {
        if (src[j] === '\\') j++;
        j++;
      }
      j++;
      tokens.push({ type: 'char', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // Raw / template string (Rust r#"..."#, Go backtick)
    if (src[i] === '`') {
      let j = i + 1;
      while (j < len && src[j] !== '`') j++;
      j++;
      tokens.push({ type: 'string', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // Newline
    if (src[i] === '\n') {
      tokens.push({ type: 'newline', value: '\n' });
      i++;
      continue;
    }
    // Whitespace (non-newline)
    if (/[ \t\r]/.test(src[i])) {
      let j = i + 1;
      while (j < len && /[ \t\r]/.test(src[j])) j++;
      tokens.push({ type: 'ws', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // Braces / parens / brackets / semicolons / commas
    if ('{};,()[]'.includes(src[i])) {
      tokens.push({ type: 'punct', value: src[i] });
      i++;
      continue;
    }
    // Preprocessor directive (# at start of logical line)
    if (src[i] === '#') {
      let j = i + 1;
      while (j < len && src[j] !== '\n') {
        if (src[j] === '\\' && src[j + 1] === '\n')
          j += 2; // line continuation
        else j++;
      }
      tokens.push({ type: 'preprocessor', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // Operators (multi-char first)
    const op2 = src.slice(i, i + 2);
    const op3 = src.slice(i, i + 3);
    if (['<<=', '>>=', '...'].includes(op3)) {
      tokens.push({ type: 'op', value: op3 });
      i += 3;
      continue;
    }
    if (
      [
        '==',
        '!=',
        '<=',
        '>=',
        '&&',
        '||',
        '+=',
        '-=',
        '*=',
        '/=',
        '%=',
        '&=',
        '|=',
        '^=',
        '<<',
        '>>',
        '->',
        '::',
      ].includes(op2)
    ) {
      tokens.push({ type: 'op', value: op2 });
      i += 2;
      continue;
    }
    if ('+-*/%=<>&|^!~?:'.includes(src[i])) {
      tokens.push({ type: 'op', value: src[i] });
      i++;
      continue;
    }
    // Identifier / keyword / number
    {
      let j = i + 1;
      while (j < len && /[a-zA-Z0-9_.]/.test(src[j])) j++;
      tokens.push({ type: 'word', value: src.slice(i, j) });
      i = j;
    }
  }
  return tokens;
}

/**
 * Format brace-based code: re-indent, split statements, normalise braces.
 * Works like AStyle — splits on `;`, `{`, `}` to put each statement on its
 * own line, then re-indents.
 */
function formatBraceCode(src, opts = {}) {
  const tabStr = opts.indent ?? INDENT;
  const tokens = tokenize(src);

  // Rebuild a single flat line from tokens (collapse whitespace to single space)
  let flat = '';
  for (const t of tokens) {
    flat += t.type === 'ws' ? ' ' : t.value;
  }

  // ── Split into logical lines ──────────────────────────────────────────────
  // We split the flat string at `\n`, then further split at `;`, `{`, `}`.
  // This produces one statement per line.
  const rawLines = flat.split('\n').map((l) => l.trim());
  const statements = [];

  for (const rawLine of rawLines) {
    if (!rawLine) {
      statements.push('');
      continue;
    }

    // Don't break up preprocessor lines or comments
    if (
      rawLine.startsWith('#') ||
      rawLine.startsWith('//') ||
      rawLine.startsWith('/*')
    ) {
      statements.push(rawLine);
      continue;
    }

    // Walk through the line, splitting at `;`, `{`, `}` outside strings/comments
    splitStatements(rawLine, statements);
  }

  // ── Re-indent based on brace depth ────────────────────────────────────────
  let depth = 0;
  const result = [];

  for (const raw of statements) {
    const line = raw.trim();
    if (!line) {
      // Keep at most 1 blank line
      if (result.length && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    // Preprocessor: column 0
    if (line.startsWith('#')) {
      result.push(line);
      continue;
    }

    // Decrease before lines starting with `}`
    if (line.startsWith('}')) depth = Math.max(0, depth - 1);

    // case/default labels: one level less than body
    const isLabel = /^(case\s+.+|default\s*):/.test(line);
    const level = isLabel ? Math.max(0, depth - 1) : depth;

    result.push(tabStr.repeat(level) + line);

    // Increase after lines ending with `{`
    if (line.endsWith('{')) depth++;
  }

  // Trim leading/trailing blanks
  while (result.length && !result[0].trim()) result.shift();
  while (result.length && !result[result.length - 1].trim()) result.pop();

  return result.join('\n') + '\n';
}

/**
 * Split a single line into individual statements at `;`, `{`, `}`,
 * respecting string/char literals and parenthesised expressions (like `for(;;)`).
 */
function splitStatements(line, out) {
  let parenDepth = 0;
  let inStr = false,
    inChar = false,
    escape = false;
  let cur = '';

  const flush = () => {
    const t = cur.trim();
    if (t) out.push(t);
    cur = '';
  };

  for (let i = 0; i < line.length; i++) {
    const c = line[i];

    if (escape) {
      cur += c;
      escape = false;
      continue;
    }
    if (c === '\\') {
      cur += c;
      escape = true;
      continue;
    }
    if (c === '"' && !inChar) {
      inStr = !inStr;
      cur += c;
      continue;
    }
    if (c === "'" && !inStr) {
      inChar = !inChar;
      cur += c;
      continue;
    }
    if (inStr || inChar) {
      cur += c;
      continue;
    }

    // Track parentheses so we don't split inside `for(int i=0; i<n; i++)`
    if (c === '(') {
      parenDepth++;
      cur += c;
      continue;
    }
    if (c === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      cur += c;
      continue;
    }

    if (parenDepth > 0) {
      cur += c;
      continue;
    }

    // Split points (outside strings and parens):
    if (c === ';') {
      cur += ';';
      flush();
      continue;
    }
    if (c === '{') {
      // Attach `{` to the current statement (K&R style)
      cur = cur.trimEnd();
      if (cur && !cur.endsWith(' ')) cur += ' ';
      cur += '{';
      flush();
      continue;
    }
    if (c === '}') {
      flush(); // anything before `}` goes out first
      // Check for `} else`, `} catch`, `} finally`
      const after = line.slice(i + 1).trim();
      if (/^(else|catch|finally)\b/.test(after)) {
        // Consume through next `{` to keep `} else {` together
        const match = after.match(
          /^(else\s+if\s*\([^)]*\)\s*\{|else\s*\{|catch\s*\([^)]*\)\s*\{|finally\s*\{)/
        );
        if (match) {
          out.push('} ' + match[1].replace(/\{$/, '').trimEnd() + ' {');
          i += 1 + line.slice(i + 1).indexOf('{');
          continue;
        }
        // `} else` without immediate `{` — just put on one line
        const wordMatch = after.match(/^(else|catch|finally)\b/);
        if (wordMatch) {
          cur = '} ' + wordMatch[1];
          i +=
            1 +
            line.slice(i + 1).indexOf(wordMatch[1]) +
            wordMatch[1].length -
            1;
          continue;
        }
      }
      // Lone `}`
      const nextChar = line[i + 1];
      out.push(nextChar === ';' ? (i++, '};') : '}');
      continue;
    }

    cur += c;
  }
  const t = cur.trim();
  if (t) out.push(t);
}

/**
 * Add spaces around operators on a single line (outside strings/comments).
 * This does a second pass over already-indented code.
 */
function spaceOperators(code) {
  return code
    .split('\n')
    .map((line) => {
      // Skip comments and preprocessor
      const trimmed = line.trimStart();
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('#')
      )
        return line;

      const indent = line.slice(0, line.length - line.trimStart().length);
      let result = '';
      let inStr = false,
        inChar = false,
        escape = false;

      for (let i = 0; i < trimmed.length; i++) {
        const c = trimmed[i];
        if (escape) {
          result += c;
          escape = false;
          continue;
        }
        if (c === '\\') {
          result += c;
          escape = true;
          continue;
        }
        if (c === '"' && !inChar) {
          inStr = !inStr;
          result += c;
          continue;
        }
        if (c === "'" && !inStr) {
          inChar = !inChar;
          result += c;
          continue;
        }

        if (inStr || inChar) {
          result += c;
          continue;
        }

        // Space after comma
        if (c === ',') {
          result += ',';
          if (i + 1 < trimmed.length && trimmed[i + 1] !== ' ') {
            result += ' ';
          }
          continue;
        }

        // Space after keyword before (
        if (c === '(') {
          if (/\b(if|for|while|switch|catch)$/.test(result)) {
            result += ' ';
          }
          result += c;
          continue;
        }

        // Spacing around binary operators (loose matching)
        const rest = trimmed.slice(i);
        const m2 = rest.slice(0, 2);
        const m3 = rest.slice(0, 3);

        // Skip `->`, `::`, `++`, `--` — no spaces
        if (m2 === '->' || m2 === '::' || m2 === '++' || m2 === '--') {
          result += m2;
          i += 1;
          continue;
        }
        // Compound assigns, comparisons, shifts — space around
        if (['<<=', '>>='].includes(m3)) {
          result = result.replace(/ $/, '') + ' ' + m3 + ' ';
          i += 2;
          continue;
        }
        if (
          [
            '==',
            '!=',
            '<=',
            '>=',
            '&&',
            '||',
            '+=',
            '-=',
            '*=',
            '/=',
            '%=',
            '&=',
            '|=',
            '^=',
            ':=',
            '<<',
            '>>',
          ].includes(m2)
        ) {
          result = result.replace(/ $/, '') + ' ' + m2 + ' ';
          i += 1;
          continue;
        }
        // Single `=` (but not in `==`) — space around
        if (c === '=' && trimmed[i + 1] !== '=') {
          result = result.replace(/ $/, '') + ' = ';
          continue;
        }
        result += c;
      }

      // Normalise multiple spaces to single (outside strings)
      let cleaned = '';
      inStr = false;
      inChar = false;
      escape = false;
      for (let i = 0; i < result.length; i++) {
        const c = result[i];
        if (escape) {
          cleaned += c;
          escape = false;
          continue;
        }
        if (c === '\\') {
          cleaned += c;
          escape = true;
          continue;
        }
        if (c === '"' && !inChar) {
          inStr = !inStr;
          cleaned += c;
          continue;
        }
        if (c === "'" && !inStr) {
          inChar = !inChar;
          cleaned += c;
          continue;
        }
        if (!inStr && !inChar && c === ' ' && result[i + 1] === ' ') continue;
        cleaned += c;
      }

      return indent + cleaned.trim();
    })
    .join('\n');
}

// ── Formatting dispatch for brace-based languages ────────────────────────────
const BRACE_LANGUAGES = new Set(['c', 'cpp', 'c++', 'go', 'rust']);

function formatBraceLanguage(code) {
  const formatted = formatBraceCode(code);
  return spaceOperators(formatted);
}

// ── Python: try native `black` first, fall back to indentation normaliser ────
const PYTHON_STRATEGIES = [
  ['python3', ['-m', 'black', '-', '--quiet', '--line-length', '100']],
  ['python', ['-m', 'black', '-', '--quiet', '--line-length', '100']],
  ['black', ['-', '--quiet', '--line-length', '100']],
  ['python3', ['-m', 'autopep8', '--max-line-length=100', '-']],
  ['autopep8', ['--max-line-length=100', '-']],
];

/**
 * Normalise Python code without a system formatter:
 * fix indentation (tabs → 4 spaces), trim trailing whitespace, collapse blank lines,
 * ensure consistent indent depth. This is NOT an AST formatter but produces
 * reasonable results for most code.
 */
function normalizePython(code) {
  const TAB = 4;
  const lines = code.split('\n');
  const result = [];
  let blanks = 0;

  for (const raw of lines) {
    // Convert tabs to spaces
    let expanded = '';
    let col = 0;
    for (const ch of raw) {
      if (ch === '\t') {
        const spaces = TAB - (col % TAB);
        expanded += ' '.repeat(spaces);
        col += spaces;
      } else {
        expanded += ch;
        col++;
      }
    }
    const trimmed = expanded.trimEnd();

    if (!trimmed) {
      if (++blanks <= 2) result.push('');
      continue;
    }
    blanks = 0;
    result.push(trimmed);
  }

  while (result.length && !result[0]) result.shift();
  while (result.length && !result[result.length - 1]) result.pop();
  return result.join('\n') + '\n';
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, language } = body ?? {};

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'No code provided.' }, { status: 400 });
    }

    const lang = language?.toLowerCase?.() ?? '';

    // SQL — pure-JS, always available
    const sqlDialect = SQL_DIALECTS[lang];
    if (sqlDialect) {
      const formatted = sqlFormat(code, {
        language: sqlDialect,
        tabWidth: 2,
        keywordCase: 'upper',
        linesBetweenQueries: 2,
      });
      return NextResponse.json({ formatted });
    }

    // Brace-based languages (C, C++, Go, Rust) — pure-JS AStyle-like formatter
    if (BRACE_LANGUAGES.has(lang)) {
      return NextResponse.json({ formatted: formatBraceLanguage(code) });
    }

    // Python — try system `black` / `autopep8`, fall back to normaliser
    if (lang === 'python') {
      let formatted = null;
      for (const [cmd, args] of PYTHON_STRATEGIES) {
        formatted = await trySpawn(cmd, args, code);
        if (formatted !== null) break;
      }
      return NextResponse.json({
        formatted: formatted ?? normalizePython(code),
      });
    }

    // Prettier + external plugin (Java, PHP)
    const pluginEntry = PLUGIN_PARSERS[lang];
    if (pluginEntry) {
      const formatted = await prettier.format(code, {
        parser: pluginEntry.parser,
        plugins: [pluginEntry.plugin],
        printWidth: 100,
        tabWidth: pluginEntry.tabWidth ?? 4,
      });
      return NextResponse.json({ formatted });
    }

    // Prettier built-in parsers (JS/TS/CSS/HTML/JSON/YAML/Markdown)
    const parser = PRETTIER_PARSERS[lang];
    if (parser) {
      const formatted = await prettier.format(code, {
        parser,
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
      });
      return NextResponse.json({ formatted });
    }

    return NextResponse.json(
      {
        error: `Formatting is not supported for ${language || 'this language'}.`,
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to format code.' },
      { status: 500 }
    );
  }
}
