/**
 * @file Roadmap content model and parsing utilities.
 * Provides canonical shape for roadmap content (JSON stages/items)
 * and tolerant parsing across public + member UIs.
 *
 * @module roadmap-content
 */

/**
 * Canonical roadmap content shape.
 * @typedef {Object} RoadmapContent
 * @property {Array<RoadmapStage>} stages - Ordered stages
 */

/**
 * @typedef {Object} RoadmapStage
 * @property {string} title - Stage title (required)
 * @property {string} [goal] - Optional stage goal / description
 * @property {Array<RoadmapItem>} [items] - Learning items (recommended; replaces legacy topics array)
 * @property {Array<string>} [topics] - LEGACY: fallback for old content; prefer items[]
 * @property {Array<RoadmapResource>} [resources] - Optional resources/links for this stage
 */

/**
 * @typedef {Object} RoadmapItem
 * @property {string} [id] - Optional unique ID for tracking progress
 * @property {string} title - Item title (required)
 * @property {string} [description] - Optional details
 * @property {string} [type] - Item type: article, video, problem, project, resource, quiz (optional; for styling/icons)
 * @property {string} [estimated_time] - e.g., "2 hours", "30 min"
 * @property {string} [link] - Optional external URL
 */

/**
 * @typedef {Object} RoadmapResource
 * @property {string} title - Resource title
 * @property {string} url - External URL (required)
 * @property {string} [type] - Resource type: article, video, course, book, tool, documentation, other
 */

/**
 * Safely parse roadmap content from any shape (object, JSON string, or null).
 * Returns a normalized RoadmapContent object with stages array.
 *
 * @param {any} content - Raw content from DB (jsonb -> object, or string, or null)
 * @returns {Object} Normalized { stages: Array<stage> }; stages may be empty
 */
export function parseRoadmapContent(content) {
  if (!content) return { stages: [] };

  let parsed;

  // If content is already an object, use it directly
  if (typeof content === 'object' && content !== null) {
    parsed = content;
  }
  // If content is a string, try to parse it as JSON
  else if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: if parsing fails, return empty stages
      // (Client can render "no structured content" message)
      console.warn('Failed to parse roadmap content as JSON');
      return { stages: [] };
    }
  } else {
    return { stages: [] };
  }

  // Validate and normalize stages
  if (!parsed.stages || !Array.isArray(parsed.stages)) {
    return { stages: [] };
  }

  const stages = parsed.stages
    .map((s) => normalizeStage(s))
    .filter(Boolean); // Remove nulls

  return { stages };
}

/**
 * Normalize a single stage object.
 * Ensures title exists and items/topics are valid arrays.
 *
 * @param {Object} raw - Raw stage from content.stages[]
 * @returns {Object | null} Normalized stage or null if invalid
 */
function normalizeStage(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const title = (raw.title || '').trim();
  if (!title) return null; // Stage must have a title

  const goal = (raw.goal || '').trim() || undefined;
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeItem).filter(Boolean)
    : [];
  const topics = Array.isArray(raw.topics) ? raw.topics.filter((t) => t) : [];
  const resources = Array.isArray(raw.resources)
    ? raw.resources.map(normalizeResource).filter(Boolean)
    : [];

  return {
    title,
    ...(goal && { goal }),
    ...(items.length > 0 && { items }),
    ...(topics.length > 0 && { topics }), // Kept for backward compat display
    ...(resources.length > 0 && { resources }),
  };
}

/**
 * Normalize a single item object.
 * @param {Object} raw - Raw item from stage.items[]
 * @returns {Object | null} Normalized item or null if invalid
 */
function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const title = (raw.title || '').trim();
  if (!title) return null; // Item must have a title

  return {
    ...(raw.id && { id: raw.id }),
    title,
    ...(raw.description && { description: (raw.description || '').trim() }),
    ...(raw.type && { type: raw.type }),
    ...(raw.estimated_time && {
      estimated_time: (raw.estimated_time || '').trim(),
    }),
    ...(raw.link && { link: (raw.link || '').trim() }),
  };
}

/**
 * Normalize a single resource object.
 * @param {Object} raw - Raw resource from stage.resources[]
 * @returns {Object | null} Normalized resource or null if invalid
 */
function normalizeResource(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const title = (raw.title || '').trim();
  const url = (raw.url || '').trim();

  if (!title || !url) return null; // Both required

  return {
    title,
    url,
    ...(raw.type && { type: raw.type }),
  };
}

/**
 * Extract all topics/items from parsed content for card previews.
 * Returns a flat list of titles; useful for showing "topic chips" on cards.
 *
 * @param {Object} parsed - Result from parseRoadmapContent()
 * @returns {Array<string>} Flat list of topic/item titles (first 2 stages, max 6 topics)
 */
export function extractTopicPreview(parsed) {
  const { stages = [] } = parsed;
  const topics = [];

  for (let i = 0; i < Math.min(stages.length, 2); i++) {
    const stage = stages[i];
    if (stage.items) {
      for (let j = 0; j < Math.min(stage.items.length, 3); j++) {
        if (topics.length < 6) {
          topics.push(stage.items[j].title);
        }
      }
    } else if (stage.topics) {
      for (let j = 0; j < Math.min(stage.topics.length, 3); j++) {
        if (topics.length < 6) {
          topics.push(stage.topics[j]);
        }
      }
    }
  }

  return topics;
}

/**
 * Serialize roadmap content back to JSON string for storage or FormData.
 * @param {Object} content - Normalized content object with stages
 * @returns {string} JSON string
 */
export function serializeRoadmapContent(content) {
  return JSON.stringify(content || { stages: [] });
}
