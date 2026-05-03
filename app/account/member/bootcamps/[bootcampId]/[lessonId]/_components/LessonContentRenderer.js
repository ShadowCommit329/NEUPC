'use client';

import { useMemo } from 'react';
import { remark } from 'remark';
import html from 'remark-html';

function parseContentBlocks(content) {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Legacy HTML/string content
  }
  return [{ id: 'legacy', type: 'richText', content }];
}

function processMarkdown(markdown) {
  if (!markdown) return '';
  try {
    return remark().use(html).processSync(markdown).toString();
  } catch (e) {
    console.error('Failed to parse markdown', e);
    return `<p>Failed to parse markdown content.</p>`;
  }
}

export default function LessonContentRenderer({ content }) {
  const blocks = useMemo(() => parseContentBlocks(content), [content]);

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        if (!block.content?.trim()) return null;

        if (block.type === 'richText' || block.type === 'html') {
          return (
            <div
              key={block.id}
              className="blog-content rounded-xl border border-white/8 bg-white/3 p-6"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          );
        }

        if (block.type === 'markdown') {
          const htmlContent = processMarkdown(block.content);
          return (
            <div
              key={block.id}
              className="blog-content rounded-xl border border-white/8 bg-white/3 p-6"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
