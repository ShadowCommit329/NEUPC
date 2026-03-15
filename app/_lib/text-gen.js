/**
 * @file Multi-model AI text generation service for event content.
 * @module text-gen
 *
 * Supports two providers:
 *   A. Google Gemini (free tier, needs GEMINI_API_KEY):
 *      1. "gemini-2.5-flash"       — Best quality, smartest reasoning
 *      2. "gemini-2.5-flash-lite"  — Fast & lightweight
 *      3. "gemini-3-flash-preview" — Latest preview model
 *   B. Pollinations (free, no API key):
 *      4. "openai-fast"            — GPT-OSS 20B via Pollinations
 */

// ─── Available text models ──────────────────────────────────────────────────
export const TEXT_MODELS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Best quality · Smart reasoning',
    provider: 'gemini',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Lite',
    description: 'Fast & lightweight',
    provider: 'gemini',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    description: 'Latest preview · Cutting-edge',
    provider: 'gemini',
  },
  {
    id: 'openai-fast',
    label: 'GPT (Free)',
    description: 'GPT-OSS 20B · No API key needed',
    provider: 'pollinations',
  },
];

export const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';

// ─── Generation modes ───────────────────────────────────────────────────────
export const GENERATION_MODES = {
  title: {
    label: 'Event Title',
    maxTokens: 100,
    systemPrompt: `You are an expert at writing compelling event titles for a university programming club (NEUPC — North East University Programming Club). Generate a clear, professional event title. Return ONLY the title text, no quotes, no extra text, no explanation. Keep it under 80 characters.`,
  },
  description: {
    label: 'Short Description',
    maxTokens: 200,
    systemPrompt: `You are an expert at writing concise event descriptions for a university programming club. Generate a brief, compelling summary that would appear on event cards. Return ONLY the description text, no quotes, no labels. Keep it under 200 characters.`,
  },
  content: {
    label: 'Full Content',
    maxTokens: 4096,
    systemPrompt: `You are an expert at writing detailed, professional event content for a university programming club (NEUPC). Generate well-structured HTML content that includes headings, paragraphs, and lists as appropriate. Use <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em> tags. Do NOT include <html>, <head>, <body> or <style> tags — only the inner content HTML. Make the content informative, engaging, and well-organized. Include sections like Overview, Schedule, Rules, Requirements, etc. as relevant.`,
  },
  improve: {
    label: 'Improve Content',
    maxTokens: 4096,
    systemPrompt: `You are an expert editor for a university programming club's event content. Improve the provided content to be more professional, well-structured, and engaging. Output well-structured HTML content using <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em> tags. Do NOT include <html>, <head>, <body> or <style> tags — only the inner content HTML. Preserve the original meaning and key information while enhancing clarity, structure, and readability.`,
  },
  excerpt: {
    label: 'Blog Excerpt',
    maxTokens: 150,
    systemPrompt: `You are an expert at writing concise, compelling blog post excerpts for a university programming club (NEUPC). Generate a short, engaging summary suitable for a blog post preview. Return ONLY the excerpt text, no quotes, no labels, no extra formatting. Keep it under 200 characters. It should entice readers to read the full post.`,
  },
};

// ─── Provider: Gemini ────────────────────────────────────────────────────────
const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

async function generateWithGemini(userMessage, modeConfig, model, mode) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to your .env.local file.'
    );
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${modeConfig.systemPrompt}\n\nUser request: ${userMessage}`,
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: modeConfig.maxTokens,
      temperature: mode === 'title' ? 0.7 : mode === 'description' ? 0.7 : 0.8,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(
        'AI model is busy — rate limit reached. Wait a moment and try again.'
      );
    }
    console.error('Gemini text API error:', res.status, errData);
    throw new Error(
      `Text generation failed (${res.status}). Try again or pick a different model.`
    );
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('') || ''
  );
}

// ─── Provider: Pollinations (free GPT, no API key) ──────────────────────────
const POLLINATIONS_BASE = 'https://text.pollinations.ai';

async function generateWithPollinations(userMessage, modeConfig) {
  // Pollinations GET endpoint: /{prompt}?model=openai-fast&system={systemPrompt}
  const systemEncoded = encodeURIComponent(modeConfig.systemPrompt);
  const promptEncoded = encodeURIComponent(userMessage);
  const url = `${POLLINATIONS_BASE}/${promptEncoded}?model=openai-fast&system=${systemEncoded}`;

  const res = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(60_000), // 60 s — Pollinations can be slow
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        'GPT model is busy — rate limit reached. Wait a moment and try again.'
      );
    }
    console.error('Pollinations text API error:', res.status);
    throw new Error(
      `Text generation failed (${res.status}). Try again or pick a different model.`
    );
  }

  // Pollinations returns plain text, not JSON
  return (await res.text()) || '';
}

// ─── Main entry point ───────────────────────────────────────────────────────
/**
 * Generate text using an AI model (Gemini or Pollinations GPT).
 * @param {string} prompt - User prompt / context for generation
 * @param {object} options
 * @param {string} options.model - Model ID from TEXT_MODELS
 * @param {string} options.mode  - Generation mode key from GENERATION_MODES
 * @param {string} [options.existingContent] - Existing content (for 'improve' mode)
 * @returns {Promise<string>} Generated text
 */
export async function generateText(prompt, { model, mode, existingContent }) {
  const modeConfig = GENERATION_MODES[mode];
  if (!modeConfig) {
    throw new Error(`Unknown generation mode: ${mode}`);
  }

  // Build user message
  let userMessage = prompt;
  if (mode === 'improve' && existingContent) {
    userMessage = `Here is the existing content to improve:\n\n${existingContent}\n\nAdditional instructions: ${prompt || 'Improve this content to be more professional and well-structured.'}`;
  }

  // Find the model's provider
  const modelEntry = TEXT_MODELS.find((m) => m.id === model);
  const provider = modelEntry?.provider || 'gemini';

  let text = '';
  if (provider === 'pollinations') {
    text = await generateWithPollinations(userMessage, modeConfig);
  } else {
    text = await generateWithGemini(userMessage, modeConfig, model, mode);
  }

  if (!text) {
    throw new Error('No text was generated. Try a different prompt.');
  }

  return text.trim();
}
