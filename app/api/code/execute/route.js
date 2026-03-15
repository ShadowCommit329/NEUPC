import { NextResponse } from 'next/server';
import { requireApiSession, isAuthError } from '@/app/_lib/api-guard';

export const dynamic = 'force-dynamic';

const WANDBOX_API = 'https://wandbox.org/api/compile.json';

/**
 * Map each canonical language to its preferred Wandbox compiler and aliases.
 */
const LANGUAGE_CONFIG = {
  c: { compiler: 'gcc-13.2.0-c', aliases: ['c'] },
  cpp: { compiler: 'gcc-13.2.0', aliases: ['cpp', 'c++', 'cplusplus'] },
  csharp: { compiler: 'mono-6.12.0.199', aliases: ['csharp', 'cs', 'c#'] },
  go: { compiler: 'go-1.23.2', aliases: ['go', 'golang'] },
  java: { compiler: 'openjdk-jdk-22+36', aliases: ['java'] },
  javascript: {
    compiler: 'nodejs-20.17.0',
    aliases: ['javascript', 'js', 'node'],
  },
  php: { compiler: 'php-8.3.12', aliases: ['php'] },
  python: { compiler: 'cpython-3.12.7', aliases: ['python', 'py'] },
  ruby: { compiler: 'ruby-3.4.1', aliases: ['ruby', 'rb'] },
  rust: { compiler: 'rust-1.82.0', aliases: ['rust', 'rs'] },
  typescript: { compiler: 'typescript-5.6.2', aliases: ['typescript', 'ts'] },
};

function normalizeLanguage(language) {
  const normalized = String(language || '')
    .trim()
    .toLowerCase();

  for (const [canonical, config] of Object.entries(LANGUAGE_CONFIG)) {
    if (canonical === normalized || config.aliases.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

export async function POST(request) {
  try {
    const authResult = await requireApiSession();
    if (isAuthError(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const language = normalizeLanguage(body?.language);
    const code = String(body?.code || '');
    const stdin = String(body?.stdin || '');

    const config = LANGUAGE_CONFIG[language];
    if (!config) {
      return NextResponse.json(
        { error: 'This language is not supported by the online compiler.' },
        { status: 400 }
      );
    }

    if (!code.trim()) {
      return NextResponse.json(
        { error: 'Code is required to run the program.' },
        { status: 400 }
      );
    }

    if (code.length > 20000) {
      return NextResponse.json(
        { error: 'Code is too large for the online runner.' },
        { status: 400 }
      );
    }

    if (stdin.length > 5000) {
      return NextResponse.json(
        { error: 'Program input is too large for the online runner.' },
        { status: 400 }
      );
    }

    const executionResponse = await fetch(WANDBOX_API, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NEUPC-Blog/1.0',
      },
      body: JSON.stringify({
        code,
        compiler: config.compiler,
        stdin,
        'compiler-option-raw': '',
        'runtime-option-raw': '',
        save: false,
      }),
    });

    if (!executionResponse.ok) {
      return NextResponse.json(
        { error: 'The online compiler service failed to execute this code.' },
        { status: 502 }
      );
    }

    const result = await executionResponse.json();

    const compilerOutput = result.compiler_output || '';
    const compilerError = result.compiler_error || '';
    const programOutput = result.program_output || '';
    const programError = result.program_error || '';
    const exitStatus = result.status || '0';

    const output = [compilerOutput, programOutput]
      .filter(Boolean)
      .join('\n')
      .trim();

    return NextResponse.json({
      result: {
        language,
        version: config.compiler,
        output: output || programError || '',
        compile: compilerError
          ? { stderr: compilerError, stdout: compilerOutput }
          : null,
        run: {
          stdout: programOutput,
          stderr: programError,
          code: parseInt(exitStatus, 10),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'The online compiler is temporarily unavailable. Please try again.',
      },
      { status: 500 }
    );
  }
}
