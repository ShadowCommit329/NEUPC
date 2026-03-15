/**
 * @file Multi-model AI image generation service.
 * @module image-gen
 *
 * Supports two free models:
 *   1. "flux" — api.airforce (Flux-based z-image). No API key. Rate-limited ~1 req/s.
 *   2. "gemini" — Google Gemini 2.5 Flash Image (Nano Banana). Needs GEMINI_API_KEY.
 *              Free tier: up to 1,500 image gen requests/day via Google AI Studio.
 */

// ─── Available models ────────────────────────────────────────────────────────
export const IMAGE_MODELS = [
  {
    id: 'flux',
    label: 'Flux (Fast)',
    description: 'Fast generation, no API key needed',
  },
  {
    id: 'gemini',
    label: 'Nano Banana',
    description: 'Gemini 2.5 Flash Image · 1,500 free/day · Needs GEMINI_API_KEY',
  },
];

export const DEFAULT_MODEL = 'flux';

// ─── Flux via api.airforce ───────────────────────────────────────────────────
const AIRFORCE_URL = 'https://api.airforce/v1/images/generations';

async function generateWithFlux(prompt) {
  const res = await fetch(AIRFORCE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'z-image',
      prompt,
      size: '1024x576', // ~16:9 for event banners
      response_format: 'b64_json',
      n: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 429) {
      throw new Error(
        'Image service is busy. Please wait a few seconds and try again.'
      );
    }
    console.error('Flux API error:', res.status, text);
    throw new Error(
      `Image generation failed (${res.status}). Try again in a moment.`
    );
  }

  const data = await res.json();
  const item = data?.data?.[0];

  if (!item?.b64_json) {
    throw new Error('No image was generated. Try a different prompt.');
  }

  return {
    buffer: Buffer.from(item.b64_json, 'base64'),
    mimeType: 'image/png',
  };
}

// ─── Gemini 2.5 Flash Image (Nano Banana) via Google AI REST API ─────────────
const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

async function generateWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to your .env.local file.'
    );
  }

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Generate a wide banner image (16:9 aspect ratio): ${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 429) {
      throw new Error(
        'Gemini quota exceeded. Try the Flux model or wait and retry.'
      );
    }
    if (res.status === 403) {
      throw new Error(
        'Gemini API key invalid or restricted. Check your GEMINI_API_KEY.'
      );
    }
    console.error('Gemini API error:', res.status, text);
    throw new Error(
      `Gemini image generation failed (${res.status}). Try again.`
    );
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];

  // Find the inline image data in the response parts
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart) {
    throw new Error(
      'Gemini did not return an image. Try a more descriptive prompt.'
    );
  }

  const { data: b64, mimeType } = imagePart.inlineData;

  return {
    buffer: Buffer.from(b64, 'base64'),
    mimeType: mimeType || 'image/png',
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an image from a text prompt using the specified model.
 *
 * @param {string} prompt - Text description of the desired image
 * @param {'flux'|'gemini'} [model='flux'] - Which model to use
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
export async function generateImage(prompt, model = DEFAULT_MODEL) {
  switch (model) {
    case 'gemini':
      return generateWithGemini(prompt);
    case 'flux':
    default:
      return generateWithFlux(prompt);
  }
}
