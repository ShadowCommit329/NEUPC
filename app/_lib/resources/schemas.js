import { z } from 'zod';
import {
  RESOURCE_TYPES,
  RESOURCE_VISIBILITY,
  RESOURCE_STATUS,
} from './constants';
import { normalizeEmbed } from './embed-utils';

const ABSOLUTE_URL_SCHEMA = z.string().trim().url();

const URL_OR_IMAGE_PROXY_SCHEMA = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!value) return false;
      if (value.startsWith('/api/image/')) return true;
      return ABSOLUTE_URL_SCHEMA.safeParse(value).success;
    },
    { message: 'Invalid URL format.' }
  );

export const resourceSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(1000).nullable().optional(),
    resource_type: z.enum(RESOURCE_TYPES),
    content: z.any().optional(),
    embed_url: z.string().trim().url().nullable().optional(),
    file_url: URL_OR_IMAGE_PROXY_SCHEMA.nullable().optional(),
    thumbnail: URL_OR_IMAGE_PROXY_SCHEMA.nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    visibility: z.enum(RESOURCE_VISIBILITY).default('members'),
    status: z.enum(RESOURCE_STATUS).default('published'),
    is_pinned: z.boolean().default(false),
    scheduled_for: z.string().datetime().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const needsEmbed = [
      'youtube',
      'facebook_post',
      'linkedin_post',
      'external_link',
    ];
    if (needsEmbed.includes(val.resource_type)) {
      if (!val.embed_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['embed_url'],
          message: 'Embed URL is required for this type.',
        });
      } else {
        const normalized = normalizeEmbed(val.resource_type, val.embed_url);
        if (!normalized.ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['embed_url'],
            message: normalized.error || 'Invalid embed URL.',
          });
        }
      }
    }

    if (val.resource_type === 'rich_text') {
      const html = typeof val.content === 'string' ? val.content.trim() : '';
      if (!html) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['content'],
          message: 'Rich text content is required.',
        });
      }
    }
  });

export function parseTags(rawTags) {
  if (!rawTags) return [];
  if (Array.isArray(rawTags)) {
    return rawTags.map((t) => String(t).trim()).filter(Boolean);
  }
  return String(rawTags)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseResourceFormData(formData) {
  const payload = {
    title: String(formData.get('title') || ''),
    description: String(formData.get('description') || '') || null,
    resource_type: String(formData.get('resource_type') || ''),
    content: String(formData.get('content') || ''),
    embed_url: String(formData.get('embed_url') || '') || null,
    file_url: String(formData.get('file_url') || '') || null,
    thumbnail: String(formData.get('thumbnail') || '') || null,
    category_id: String(formData.get('category_id') || '') || null,
    tags: parseTags(formData.get('tags')),
    visibility: String(formData.get('visibility') || 'members'),
    status: String(formData.get('status') || 'published'),
    is_pinned: String(formData.get('is_pinned') || 'false') === 'true',
    scheduled_for: String(formData.get('scheduled_for') || '') || null,
  };

  return resourceSchema.safeParse(payload);
}
