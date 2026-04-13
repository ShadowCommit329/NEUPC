/**
 * @file LLM Utility for Problem Analysis
 * @module llm
 *
 * Provides unified interface for multiple LLM providers.
 * Automatically falls back to next provider on failure.
 * Priority: GitHub Models > Groq > Together > Cerebras > OpenRouter > Gemini > OpenAI
 */

// Provider configurations - all with free tiers
const PROVIDERS = {
  github: {
    name: 'GitHub Models',
    baseUrl: 'https://models.inference.ai.azure.com/chat/completions',
    model: 'gpt-4o-mini', // Free tier model, can also use: gpt-4o, Meta-Llama-3.1-405B-Instruct, etc.
    envKey: 'GITHUB_TOKEN',
    type: 'openai',
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    envKey: 'OPENAI_API_KEY',
    type: 'openai',
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-flash',
    envKey: 'GEMINI_API_KEY',
    type: 'gemini',
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    envKey: 'GROQ_API_KEY',
    type: 'openai',
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    envKey: 'OPENROUTER_API_KEY',
    type: 'openai',
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    envKey: 'TOGETHER_API_KEY',
    type: 'openai',
  },
  cerebras: {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama-3.3-70b',
    envKey: 'CEREBRAS_API_KEY',
    type: 'openai',
  },
};

// Priority order for trying providers
const PROVIDER_PRIORITY = [
  'groq', // Fast and generous free tier (FIRST PRIORITY - WORKING)
  'gemini', // Google's free tier (FAST & RELIABLE)
  'together', // Good free tier
  'cerebras', // Fast inference
  'openrouter', // Free models available
  'github', // GitHub Models - requires 'models' permission (currently failing with 401)
  'openai', // Paid but reliable
];

/**
 * Get all available LLM providers based on configured API keys
 */
function getAvailableProviders() {
  const available = [];

  for (const providerId of PROVIDER_PRIORITY) {
    const provider = PROVIDERS[providerId];
    const apiKey = process.env[provider.envKey];
    if (apiKey && apiKey !== '' && !apiKey.includes('your-')) {
      available.push({ id: providerId, ...provider, apiKey });
    }
  }

  return available;
}

/**
 * Get the first available provider
 */
function getAvailableProvider() {
  const providers = getAvailableProviders();
  return providers.length > 0 ? providers[0] : null;
}

/**
 * Call OpenAI-compatible API
 */
async function callOpenAICompatible(provider, messages, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${provider.apiKey}`,
  };

  // OpenRouter requires additional headers
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] =
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    headers['X-Title'] = 'NeuPC Problem Analyzer';
  }

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: options.model || provider.model,
      messages,
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `${provider.name} API error: ${response.status} - ${error}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Call Google Gemini API
 */
async function callGemini(provider, messages, options = {}) {
  // Convert messages to Gemini format
  const contents = messages
    .filter((msg) => msg.role !== 'system')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

  const systemMessage = messages.find((msg) => msg.role === 'system');
  const model = options.model || provider.model;
  const url = `${provider.baseUrl}/${model}:generateContent?key=${provider.apiKey}`;

  const requestBody = {
    contents,
    generationConfig: {
      temperature: options.temperature || 0.3,
      maxOutputTokens: options.maxTokens || 2000,
    },
  };

  if (systemMessage) {
    requestBody.systemInstruction = {
      parts: [{ text: systemMessage.content }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Call a provider based on its type
 */
async function callProvider(provider, messages, options = {}) {
  if (provider.type === 'gemini') {
    return await callGemini(provider, messages, options);
  } else {
    return await callOpenAICompatible(provider, messages, options);
  }
}

/**
 * Generate completion using available LLM providers with automatic fallback
 * @param {Array} messages - Array of {role, content} messages
 * @param {Object} options - Optional settings (temperature, maxTokens, model)
 * @returns {Promise<{content: string, provider: string}>}
 */
export async function generateCompletion(messages, options = {}) {
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    throw new Error(
      'No LLM provider configured. Set one of: GITHUB_TOKEN, GROQ_API_KEY, TOGETHER_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY'
    );
  }

  const errors = [];

  // Try each provider in order until one succeeds
  for (const provider of providers) {
    try {
      console.log(`[LLM] Trying provider: ${provider.name}`);
      const content = await callProvider(provider, messages, options);
      console.log(`[LLM] Success with provider: ${provider.name}`);
      return { content, provider: provider.name };
    } catch (error) {
      console.warn(`[LLM] ${provider.name} failed:`, error.message);
      errors.push({ provider: provider.name, error: error.message });

      // Check if it's a rate limit error - if so, continue to next provider
      if (
        error.message.includes('429') ||
        error.message.includes('rate') ||
        error.message.includes('quota')
      ) {
        console.log(`[LLM] Rate limited on ${provider.name}, trying next...`);
        continue;
      }

      // For other errors, also try next provider
      continue;
    }
  }

  // All providers failed
  throw new Error(
    `All LLM providers failed:\n${errors.map((e) => `- ${e.provider}: ${e.error}`).join('\n')}`
  );
}

/**
 * Analyze a competitive programming problem and solution
 * @param {Object} params - Analysis parameters
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeProblem({
  problemDescription,
  sourceCode,
  language,
  problemName,
  existingTopics = [],
}) {
  const prompt = `You are an expert competitive programmer and algorithm analyst. Analyze the following problem and solution thoroughly.

## Problem: ${problemName || 'Unknown'}

### Problem Description:
${problemDescription || 'Not provided - infer from the code'}

### Solution Code (${language || 'Unknown language'}):
\`\`\`${language?.toLowerCase()?.split(' ')[0] || ''}
${sourceCode}
\`\`\`

### Existing Tags: ${existingTopics.length > 0 ? existingTopics.join(', ') : 'None'}

Provide a comprehensive analysis in this JSON format:
{
  "problemSummary": "A clear, concise 2-4 sentence summary explaining what the problem is asking. Include the input/output format briefly.",
  "userApproach": {
    "name": "Name of the algorithm/technique used (e.g., 'Greedy with Sorting', 'Binary Search on Answer', 'DP with Bitmask')",
    "explanation": "Detailed 3-5 sentence explanation of how this specific solution works step by step",
    "whyItWorks": "1-2 sentences explaining why this approach correctly solves the problem"
  },
  "alternativeApproaches": [
    {
      "name": "Alternative approach name",
      "explanation": "How this approach would work",
      "timeComplexity": "Time complexity of this approach",
      "spaceComplexity": "Space complexity of this approach",
      "tradeoffs": "When to prefer this over the submitted solution"
    }
  ],
  "timeComplexity": "Big O notation for the submitted solution (e.g., O(n log n))",
  "spaceComplexity": "Big O notation for the submitted solution (e.g., O(n))",
  "topics": ["specific algorithm/data structure topics like: greedy, binary search, dp, graph, tree, math, sorting, two pointers, sliding window, segment tree, etc."],
  "difficulty": "easy|medium|hard|expert",
  "keyInsights": ["Key insight or trick that makes the solution work", "Another important observation"],
  "edgeCases": ["Important edge cases to consider"],
  "commonMistakes": ["Common mistakes when solving this type of problem"],
  "codeQuality": {
    "readability": "good|average|poor",
    "efficiency": "optimal|suboptimal|inefficient",
    "suggestions": ["Optional improvement suggestions for the code"]
  }
}

Important guidelines:
- problemSummary should be understandable without reading the full problem
- userApproach should explain the ACTUAL submitted solution, not a generic approach
- Include 1-3 alternative approaches if they exist (different algorithms that could solve this)
- Topics should be specific (e.g., "binary search on answer" not just "binary search")
- Be accurate with complexity analysis based on the actual code

Return ONLY valid JSON, no markdown code blocks or extra text.`;

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert competitive programmer. Analyze solutions thoroughly and respond only with valid JSON, no markdown formatting.',
    },
    { role: 'user', content: prompt },
  ];

  try {
    const { content, provider } = await generateCompletion(messages, {
      temperature: 0.2,
      maxTokens: 2000,
    });

    // Parse JSON from response
    let analysis;
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '');
      }
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[LLM] Failed to parse analysis JSON:', parseError);
      console.error('[LLM] Raw response:', content.substring(0, 500));
      // Return a minimal analysis
      analysis = {
        problemSummary: 'Analysis could not be parsed',
        userApproach: {
          name: 'Unknown',
          explanation: 'Could not analyze the solution',
          whyItWorks: 'Unknown',
        },
        alternativeApproaches: [],
        timeComplexity: 'Unknown',
        spaceComplexity: 'Unknown',
        topics: existingTopics,
        difficulty: 'medium',
        keyInsights: [],
        edgeCases: [],
        commonMistakes: [],
        codeQuality: {
          readability: 'average',
          efficiency: 'unknown',
          suggestions: [],
        },
      };
    }

    // Ensure all expected fields exist with proper structure
    const result = {
      problemSummary: analysis.problemSummary || analysis.summary || '',
      userApproach: analysis.userApproach || {
        name: analysis.approach || 'Unknown',
        explanation: '',
        whyItWorks: '',
      },
      alternativeApproaches: analysis.alternativeApproaches || [],
      timeComplexity: analysis.timeComplexity || 'Unknown',
      spaceComplexity: analysis.spaceComplexity || 'Unknown',
      topics: analysis.topics || existingTopics,
      difficulty: analysis.difficulty || 'medium',
      keyInsights: analysis.keyInsights || [],
      edgeCases: analysis.edgeCases || [],
      commonMistakes: analysis.commonMistakes || [],
      codeQuality: analysis.codeQuality || {
        readability: 'average',
        efficiency: 'unknown',
        suggestions: [],
      },
      // Keep legacy fields for compatibility
      summary: analysis.problemSummary || analysis.summary || '',
      approach: analysis.userApproach?.name || analysis.approach || 'Unknown',
      similarProblems: analysis.similarProblems || [],
      analyzedBy: provider,
      analyzedAt: new Date().toISOString(),
    };

    return result;
  } catch (error) {
    console.error('[LLM] Analysis failed:', error);
    throw error;
  }
}

/**
 * Summarize a problem description
 */
export async function summarizeProblem(description) {
  if (!description || description.length < 100) {
    return description || '';
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert at summarizing competitive programming problems. Be concise.',
    },
    {
      role: 'user',
      content: `Summarize this problem in 2-3 sentences:\n\n${description}`,
    },
  ];

  try {
    const { content } = await generateCompletion(messages, {
      temperature: 0.2,
      maxTokens: 300,
    });
    return content.trim();
  } catch (error) {
    console.error('[LLM] Summarization failed:', error);
    return description.substring(0, 500) + '...';
  }
}

/**
 * Check if any LLM is available
 */
export function isLLMAvailable() {
  return getAvailableProviders().length > 0;
}

/**
 * Get info about all configured providers
 */
export function getLLMProviderInfo() {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    return { available: false, providers: [] };
  }
  return {
    available: true,
    providers: providers.map((p) => ({ name: p.name, model: p.model })),
    primary: providers[0].name,
  };
}
