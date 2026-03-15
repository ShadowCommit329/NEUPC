import { NextResponse } from 'next/server';

/**
 * Teaching-only system prompt.
 * The AI must never rewrite or provide corrected code — it guides the student
 * to understand and fix issues themselves.
 */
const SYSTEM_PROMPT = `You are a patient, encouraging coding tutor designed for beginners learning to code. Your role is to help students understand and debug their code — NOT to write or fix it for them.

STRICT RULES:
1. NEVER provide fixed, corrected, or rewritten code
2. NEVER give the complete solution
3. DO explain what is wrong and WHY it happens — assume the student is a beginner
4. DO guide with numbered hint steps — each step is a question or hint, NOT an answer
5. DO point to the specific line or construct causing the issue (e.g. "Look at line 3 — what type is \`x\` there?")
6. DO use simple analogies and real-world comparisons for complex concepts
7. DO explain programming jargon when you first use it (e.g. "a **variable** — like a labeled box that stores a value")
8. Keep responses focused and concise — one concept at a time
9. Format inline code with backticks, bold key terms with **double asterisks**
10. End with a short encouraging note and optionally suggest what to try next
11. If asked for a practice problem, give a beginner-appropriate challenge related to the concepts in their code

Response format:
- 1–2 sentence diagnosis (beginner-friendly language)
- Numbered hint steps (hints / guiding questions, NOT answers)
- Encouraging closing line with optional "Try next" suggestion`;

// ── Model cascade — best quality first, free fallbacks last ─────────────────
// Tried in order; first successful non-empty response wins.
// Gemini entries need GEMINI_API_KEY; Pollinations entries are always free.
const MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Lite', provider: 'gemini' },
  { id: 'openai-fast', label: 'GPT (Free)', provider: 'pollinations' },
  { id: 'mistral', label: 'Mistral (Free)', provider: 'pollinations' },
];

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const POLLINATIONS_BASE = 'https://text.pollinations.ai';

// ── Provider: Gemini ─────────────────────────────────────────────────────────
async function tryGemini(modelId, contents, apiKey, timeoutMs = 15_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 900, temperature: 0.3 },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) return null; // 429, 503, etc. — skip to next model
    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join('') || null
    );
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Provider: Pollinations (always free, no key needed) ──────────────────────
async function tryPollinations(modelId, messages, timeoutMs = 40_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(POLLINATIONS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages, seed: 42 }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const raw = await res.text();
    // Pollinations may return plain text or an OpenAI-style JSON envelope
    try {
      const json = JSON.parse(raw);
      return (
        json?.choices?.[0]?.message?.content ||
        json?.content ||
        json?.text ||
        raw.trim() ||
        null
      );
    } catch {
      return raw.trim() || null;
    }
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      code,
      language,
      error,
      output,
      question,
      history = [],
    } = body ?? {};

    if (!code || !question) {
      return NextResponse.json(
        { error: 'Missing code or question.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY ?? '';

    // ── Build context injected into every turn ────────────────────────────
    const contextText = [
      `Language: ${language || 'unknown'}`,
      `\`\`\`${language || ''}\n${code}\n\`\`\``,
      error ? `Errors / stderr:\n${error}` : '',
      output ? `Program output:\n${output}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const userTurn = `${contextText}\n\nStudent: ${question}`;

    // ── Build provider-specific message formats from shared history ───────
    const cleanHistory = history.filter((m) => m.content?.trim());

    // Gemini multi-turn format
    const geminiRawHistory = cleanHistory.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const geminiContents = [
      // Gemini requires history to start with 'user'
      ...(geminiRawHistory[0]?.role === 'model'
        ? geminiRawHistory.slice(1)
        : geminiRawHistory),
      { role: 'user', parts: [{ text: userTurn }] },
    ];

    // OpenAI / Pollinations format
    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...cleanHistory.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userTurn },
    ];

    // ── Try each model in cascade order ──────────────────────────────────
    for (const model of MODELS) {
      if (model.provider === 'gemini' && !apiKey) continue;

      const explanation =
        model.provider === 'gemini'
          ? await tryGemini(model.id, geminiContents, apiKey)
          : await tryPollinations(model.id, openaiMessages);

      if (explanation?.trim()) {
        return NextResponse.json({
          explanation: explanation.trim(),
          model: model.label,
        });
      }
    }

    return NextResponse.json(
      {
        error:
          'All AI models are currently busy. Please try again in a moment.',
      },
      { status: 503 }
    );
  } catch (err) {
    console.error('AI explain error:', err);
    return NextResponse.json(
      { error: err?.message || 'AI service error.' },
      { status: 500 }
    );
  }
}
