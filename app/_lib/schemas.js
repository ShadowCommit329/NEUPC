import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address.');

export const idSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/, 'ID must be a numeric string').transform(Number)
]);

export const uuidSchema = z.string().uuid('Invalid UUID.');

export const urlSchema = z.string().url('Invalid URL.').optional().or(z.literal(''));

export const baseStringSchema = (fieldName, min = 1, max = 500) => 
  z.string()
   .min(min, `${fieldName} must be at least ${min} characters.`)
   .max(max, `${fieldName} must be at most ${max} characters.`);

export const blogSchema = z.object({
  title: baseStringSchema('Title', 3, 200),
  excerpt: baseStringSchema('Excerpt', 0, 500).optional().nullable(),
  content: baseStringSchema('Content', 10, 50000), // Note: rich text needs larger allowance
  thumbnail: urlSchema.nullable(),
  category: z.string().min(1, 'Category is required').max(50).nullable(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  is_featured: z.boolean().default(false),
  read_time: z.number().int().min(1).max(120).nullable().optional()
});

export const commentSchema = z.object({
  content: baseStringSchema('Comment', 2, 2000),
  blogId: z.union([z.string(), z.number()]).transform(String),
  parentId: z.union([z.string(), z.number()]).nullable().optional()
});

// Profile / User updates
export const userProfileSchema = z.object({
  full_name: baseStringSchema('Full Name', 2, 100).optional(),
  bio: baseStringSchema('Bio', 0, 500).optional().nullable(),
  avatar_url: urlSchema.nullable(),
  github_url: urlSchema.nullable(),
  linkedin_url: urlSchema.nullable(),
  twitter_url: urlSchema.nullable(),
  website_url: urlSchema.nullable()
});
