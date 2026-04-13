export const RESOURCE_TYPES = [
  'image',
  'video',
  'rich_text',
  'youtube',
  'facebook_post',
  'linkedin_post',
  'external_link',
  'file',
];

export const RESOURCE_VISIBILITY = ['public', 'members'];
export const RESOURCE_STATUS = ['draft', 'scheduled', 'published', 'archived'];

export const RESOURCE_TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  rich_text: 'Rich Text',
  youtube: 'YouTube',
  facebook_post: 'Facebook',
  linkedin_post: 'LinkedIn',
  external_link: 'External Link',
  file: 'File',
};

export const MEDIA_ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'application/pdf',
  'application/x-pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export function slugify(input = '') {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
