'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { createLowlight, common } from 'lowlight';
import VideoPlayer from './VideoPlayer';
import { BookOpen, Play, ListVideo } from 'lucide-react';
import { driveImageUrl } from '@/app/_lib/utils';

const lowlight = createLowlight(common);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseContentBlocks(content) {
  if (!content) return [];
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return [{ id: 'legacy', type: 'richText', content }];
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hastToString(node) {
  if (!node) return '';
  if (node.type === 'text') return escapeHtml(node.value);
  if (node.type === 'element') {
    const cls = node.properties?.className;
    const ca = cls ? ` class="${Array.isArray(cls) ? cls.join(' ') : cls}"` : '';
    return `<${node.tagName}${ca}>${(node.children || []).map(hastToString).join('')}</${node.tagName}>`;
  }
  if (node.type === 'root') return (node.children || []).map(hastToString).join('');
  return '';
}

function highlightCode(code, lang) {
  try {
    const l = (lang || '').trim().toLowerCase();
    if (l && lowlight.registered(l)) return hastToString(lowlight.highlight(l, code));
  } catch {}
  return escapeHtml(code);
}

// ─── Custom marked renderer (Claude-style output) — marked v18 compatible ─────
//
// In marked v18, renderer methods receive the full token object.
// Inline text (paragraph, heading, strong, em, link, blockquote) is NOT
// pre-rendered into a `text` string — instead use this.parser.parseInline(tokens)
// for inline content and this.parser.parse(tokens) for block content.
// List/table now receive full token objects with items/rows arrays.

function buildRenderer() {
  const r = new marked.Renderer();

  // --- Block-level ---

  r.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const sz = { 1: '1.375rem', 2: '1.125rem', 3: '1rem', 4: '0.9rem', 5: '0.85rem', 6: '0.8rem' };
    return `<h${depth} class="md-h md-h${depth}" style="font-size:${sz[depth] || '1rem'}">${text}</h${depth}>\n`;
  };

  r.paragraph = function ({ tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<p class="md-p">${text}</p>\n`;
  };

  r.blockquote = function ({ tokens }) {
    const body = this.parser.parse(tokens);
    return `<blockquote class="md-bq">${body}</blockquote>\n`;
  };

  r.hr = () => `<hr class="md-hr">\n`;

  r.list = function (token) {
    const { ordered, start, items } = token;
    let body = '';
    for (const item of items) body += this.listitem(item);
    const tag = ordered ? 'ol' : 'ul';
    const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
    return `<${tag} class="md-${tag}"${startAttr}>${body}</${tag}>\n`;
  };

  r.listitem = function (item) {
    const body = this.parser.parse(item.tokens);
    if (item.task) {
      return `<li class="md-li md-task"><input type="checkbox" ${item.checked ? 'checked' : ''} disabled> ${body.replace(/^\s*<p[^>]*>(.*)<\/p>\s*$/s, '$1')}</li>\n`;
    }
    // Strip wrapping <p> tags for tight lists (single-paragraph items)
    const inner = item.loose ? body : body.replace(/^\s*<p[^>]*>(.*)<\/p>\s*$/s, '$1');
    return `<li class="md-li">${inner}</li>\n`;
  };

  r.table = function (token) {
    // Render header cells
    let headerHtml = '';
    for (const cell of token.header) {
      const text = this.parser.parseInline(cell.tokens);
      const al = cell.align ? ` style="text-align:${cell.align}"` : '';
      headerHtml += `<th class="md-th"${al}>${text}</th>`;
    }
    // Render body rows
    let bodyHtml = '';
    for (const row of token.rows) {
      let rowHtml = '';
      for (const cell of row) {
        const text = this.parser.parseInline(cell.tokens);
        const al = cell.align ? ` style="text-align:${cell.align}"` : '';
        rowHtml += `<td class="md-td"${al}>${text}</td>`;
      }
      bodyHtml += `<tr class="md-tr">${rowHtml}</tr>`;
    }
    return `<div class="md-table-wrap"><table class="md-table"><thead><tr class="md-tr">${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>\n`;
  };

  r.code = ({ text, lang }) => {
    const language = (lang || '').trim().toLowerCase();
    const highlighted = highlightCode(text, language);
    return [
      `<div class="md-code-block" data-has-copy="true">`,
      `  <div class="md-code-header">`,
      `    <span class="md-code-lang">${language || 'code'}</span>`,
      `    <button class="md-copy-btn" data-copy-btn="true">Copy</button>`,
      `  </div>`,
      `  <div class="md-code-scroll">`,
      `    <pre class="md-pre"><code class="language-${language} hljs">${highlighted}</code></pre>`,
      `  </div>`,
      `</div>\n`,
    ].join('');
  };

  // --- Inline-level ---

  r.strong = function ({ tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<strong class="md-strong">${text}</strong>`;
  };

  r.em = function ({ tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<em class="md-em">${text}</em>`;
  };

  r.codespan = ({ text }) => `<code class="md-inline-code">${text}</code>`;

  r.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<a href="${href}" class="md-a"${title ? ` title="${escapeHtml(title)}"` : ''} target="_blank" rel="noopener">${text}</a>`;
  };

  r.image = ({ href, text, title }) =>
    `<img src="${href}" alt="${escapeHtml(text || '')}"${title ? ` title="${escapeHtml(title)}"` : ''} class="md-img" loading="lazy">`;

  return r;
}

const MD_RENDERER = buildRenderer();

function processMarkdown(markdown) {
  if (!markdown) return '';
  try {
    return marked.parse(markdown, { gfm: true, breaks: true, renderer: MD_RENDERER });
  } catch (e) {
    return `<p>Failed to parse markdown.</p>`;
  }
}

// ─── Scoped styles for markdown viewer ────────────────────────────────────────

const MD_STYLES = `
.md-viewer{display:grid;grid-template-columns:1fr;gap:.75rem;line-height:1.65rem;color:#908fa0;}
.md-h{font-weight:700;color:#d4e4fa;margin-top:.75rem;margin-bottom:-.25rem;min-width:0;}
.md-h1{font-size:1.375rem}.md-h2{font-size:1.125rem}.md-h3{font-size:1rem}.md-h4{font-size:.9rem}
.md-p{line-height:1.7;word-break:break-word;white-space:normal;min-width:0;}
.md-strong{color:#d4e4fa;font-weight:600;}
.md-em{font-style:italic;}
.md-a{color:#8083ff;text-decoration:none;}.md-a:hover{text-decoration:underline;}
.md-img{max-width:100%;height:auto;border-radius:.75rem;border:1px solid rgba(255,255,255,.08);display:block;margin:.5rem 0;}
.md-bq{margin-left:.5rem;border-left:4px solid rgba(255,255,255,.12);padding:.5rem 1rem;border-radius:0 .5rem .5rem 0;background:rgba(255,255,255,.02);}
.md-hr{border:none;border-top:.5px solid #273647;margin:.75rem .375rem;}
.md-ul,.md-ol{padding-left:1.5rem;line-height:1.7;display:flex;flex-direction:column;gap:.2rem;}
.md-ul .md-li{list-style-type:disc;}.md-ol .md-li{list-style-type:decimal;}
.md-li{padding-left:.25rem;min-width:0;}
.md-task input{margin-right:.4rem;accent-color:#8083ff;}
.md-inline-code{background:rgba(128,131,255,.1);color:#8083ff;padding:.1em .4em;border-radius:.35rem;font-size:.875em;font-family:monospace;}
.md-table-wrap{overflow-x:auto;width:100%;margin:.5rem 0;}
.md-table{min-width:100%;border-collapse:collapse;font-size:.875rem;line-height:1.7;text-align:left;}
.md-th{color:#d4e4fa;border-bottom:.5px solid rgba(68,69,84,.8);padding:.5rem 1rem .5rem 0;vertical-align:top;font-weight:700;}
.md-td{border-bottom:.5px solid rgba(39,54,71,.5);padding:.5rem 1rem .5rem 0;vertical-align:top;color:#908fa0;}
.md-code-block{border-radius:.625rem;overflow:hidden;border:.5px solid #273647;margin:.25rem 0;}
.md-code-header{display:flex;align-items:center;justify-content:space-between;background:#0d1117;padding:.625rem 1rem;border-bottom:.5px solid #273647;}
.md-code-lang{font-size:.75rem;color:#464554;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.md-copy-btn{font-size:.6875rem;color:#8083ff;background:rgba(128,131,255,.08);border:1px solid rgba(128,131,255,.2);border-radius:.375rem;padding:.25rem .875rem;cursor:pointer;font-weight:600;transition:all .2s;}
.md-copy-btn:hover{background:rgba(128,131,255,.15);}
.md-copy-btn.copied{color:#34d399;border-color:rgba(52,211,153,.3);background:rgba(52,211,153,.08);}
.md-code-scroll{overflow-x:auto;}
.md-pre{margin:0;padding:1.125rem 1.25rem;background:#010f1f;overflow-x:auto;}
.md-pre code{font-family:'JetBrains Mono','Fira Code',monospace;font-size:.8125rem;line-height:1.7;white-space:pre;color:#d4e4fa;background:transparent;}
/* highlight.js token colors */
.hljs-comment,.hljs-quote{color:#818898;font-style:italic;}
.hljs-keyword,.hljs-selector-tag,.hljs-subst{color:#f47b85;font-weight:600;}
.hljs-number,.hljs-literal,.hljs-variable,.hljs-template-variable,.hljs-tag .hljs-attr{color:#5eedec;}
.hljs-string,.hljs-doctag{color:#9be963;}
.hljs-title,.hljs-section,.hljs-selector-id{color:#70b8ff;font-weight:600;}
.hljs-type,.hljs-class .hljs-title{color:#5eedec;}
.hljs-tag,.hljs-name,.hljs-attribute{color:#f47b85;}
.hljs-regexp,.hljs-link{color:#9be963;}
.hljs-symbol,.hljs-bullet{color:#cc7bf4;}
.hljs-built_in,.hljs-builtin-name{color:#70b8ff;}
.hljs-meta{color:#818898;}
.hljs-deletion{color:#f47b85;}
.hljs-addition{color:#9be963;}
.hljs-emphasis{font-style:italic;}
.hljs-strong{font-weight:700;}
.hljs-params{color:#d4e4fa;}
.hljs-variable,.hljs-template-variable{color:#fbad60;}
.hljs-operator,.hljs-punctuation{color:#d3d7de;}
`;

// ─── Multi-video playlist ─────────────────────────────────────────────────────

function MultiVideoPlaylist({ videos, lessonId }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeVid = videos[activeIdx];

  return (
    <div className="rounded-2xl overflow-hidden border border-[#273647] bg-[#051424] shadow-2xl flex flex-col lg:flex-row">
      {/* Featured player area */}
      <div className="flex-1 min-w-0 bg-black flex flex-col relative">
        <VideoPlayer
          lesson={{
            id: lessonId,
            video_source: activeVid.video_source || 'drive',
            video_id: activeVid.video_id,
            video_url: activeVid.video_url,
          }}
        />
        {/* Title bar for active video overlaying the top */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 pb-12 pointer-events-none z-10 flex justify-between items-start">
           <h3 className="text-white font-bold text-lg tracking-wide drop-shadow-lg">
             {activeVid.label || `Video ${activeIdx + 1}`}
           </h3>
        </div>
      </div>

      {/* Playlist sidebar */}
      <div className="lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-[#273647] bg-[#010f1f] flex flex-col max-h-[420px] lg:max-h-[500px]">
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#273647] bg-[#051424] shrink-0">
          <div className="flex items-center gap-2">
            <ListVideo className="h-4 w-4 text-[#8083ff]" />
            <span className="text-sm font-bold text-[#d4e4fa] tracking-wide">
              Course Playlist
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#c0c1ff] bg-[#8083ff]/10 px-2 py-0.5 rounded-md tabular-nums border border-[#8083ff]/20">
            {activeIdx + 1} / {videos.length}
          </span>
        </div>

        {/* Sidebar Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {videos.map((vid, idx) => {
            const isActive = idx === activeIdx;
            const hasVideo = vid.video_id || vid.video_url;
            return (
              <button
                key={vid.id ?? idx}
                onClick={() => hasVideo && setActiveIdx(idx)}
                disabled={!hasVideo}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all relative overflow-hidden group ${
                  isActive
                    ? 'bg-[#122131] border border-[#464554] shadow-md shadow-[#8083ff]/5'
                    : 'border border-transparent hover:bg-[#051424] hover:border-[#273647]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8083ff] shadow-[0_0_8px_#8083ff]" />
                )}

                {/* Number / play icon */}
                <div
                  className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-[#8083ff] text-white shadow-lg shadow-[#8083ff]/20 scale-105'
                      : 'bg-[#273647] text-[#908fa0] group-hover:bg-[#34465c] group-hover:text-[#d4e4fa]'
                  }`}
                >
                  {isActive ? (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0 pr-2">
                  <p className={`text-sm font-semibold leading-snug truncate transition-colors ${isActive ? 'text-white' : 'text-[#908fa0] group-hover:text-[#d4e4fa]'}`}>
                    {vid.label || `Video ${idx + 1}`}
                  </p>
                  <p className={`text-[10px] font-medium mt-0.5 uppercase tracking-wider transition-colors ${isActive ? 'text-[#c0c1ff]' : 'text-[#464554] group-hover:text-[#908fa0]'}`}>
                    {isActive ? 'Now Playing' : 'Up Next'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export default function LessonContentRenderer({ content, lessonId }) {
  const blocks = useMemo(() => parseContentBlocks(content), [content]);
  const containerRef = useRef(null);

  // Wire copy-button click handlers for all block types
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const btns = container.querySelectorAll('[data-copy-btn]');
    btns.forEach((btn) => {
      // Remove inline onclick handlers from old generated content to prevent crashes
      if (btn.hasAttribute('onclick')) {
        btn.removeAttribute('onclick');
      }

      if (btn._wired) return;
      btn._wired = true;
      btn.addEventListener('click', () => {
        // Find code tag in various structures: Markdown, HTML prompt, RichText prompt
        let code = btn.closest('[data-has-copy="true"]')?.querySelector('code') 
                   || btn.closest('.md-code-block')?.querySelector('code')
                   || btn.closest('div')?.nextElementSibling?.querySelector('code');
                   
        if (!code) return;
        navigator.clipboard.writeText(code.textContent).then(() => {
          const originalText = btn.textContent;
          btn.textContent = '✓ Copied!';
          btn.classList.add('copied');
          setTimeout(() => { 
            btn.textContent = originalText === '✓ Copied!' ? 'Copy' : originalText; 
            btn.classList.remove('copied'); 
          }, 2000);
        });
      });
    });
  }, [blocks]);

  if (!blocks || blocks.length === 0) return null;

  return (
    <div ref={containerRef} className="space-y-8">
      {blocks.map((block) => {
        // Skip blocks with no content AND no data (except for layout blocks like lessonPlan)
        const hasContent = block.content?.trim();
        const hasData = block.data && Object.keys(block.data).length > 0;

        if (!hasContent && !hasData && block.type !== 'lessonPlan') return null;

        if (block.type === 'richText' || block.type === 'html') {
          return (
            <div
              key={block.id}
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          );
        }

        if (block.type === 'markdown') {
          const htmlContent = processMarkdown(block.content);
          return (
            <div key={block.id}>
              <style dangerouslySetInnerHTML={{ __html: MD_STYLES }} />
              <div
                className="md-viewer"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          );
        }

        if (block.type === 'image') {
          let images = block.data?.images;

          // Professional: Robust multi-tier fallback for image data
          if (!images || !Array.isArray(images) || images.length === 0) {
            if (block.content) {
              // Legacy/single URL mode
              images = [{ id: 'legacy', url: block.content, alt: block.data?.alt }];
            } else {
              // Truly empty block
              return null;
            }
          }

          const validImages = images.filter(img => img.url);
          if (validImages.length === 0) return null;

          let gridClass = "grid gap-4 sm:gap-6 ";
          if (validImages.length === 1) {
            gridClass += "grid-cols-1 max-w-5xl mx-auto";
          } else if (validImages.length === 2) {
            gridClass += "grid-cols-1 sm:grid-cols-2";
          } else if (validImages.length === 3) {
            gridClass += "grid-cols-1 sm:grid-cols-2";
          } else if (validImages.length === 4) {
            gridClass += "grid-cols-1 sm:grid-cols-2";
          } else {
            gridClass += "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
          }

          return (
            <div key={block.id} className={gridClass}>
              {validImages.map((img, idx) => {
                const isFeatured = validImages.length === 3 && idx === 0;
                return (
                  <div
                    key={img.id}
                    className={`rounded-2xl border border-white/10 overflow-hidden bg-[#020810] flex justify-center items-center shadow-xl group/img relative ${
                      isFeatured ? "sm:col-span-2" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={driveImageUrl(img.url)}
                      alt={img.alt || 'Lesson image'}
                      className="w-full h-auto max-h-[600px] object-contain transition-transform duration-700 ease-out group-hover/img:scale-[1.02]"
                      loading="lazy"
                    />
                    
                    {img.alt && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none pt-12 pb-4 px-6 flex items-end">
                        <p className="text-white/90 text-sm font-medium drop-shadow-md translate-y-2 group-hover/img:translate-y-0 transition-transform duration-300">
                          {img.alt}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        if (block.type === 'video') {
          const data = block.data || {};
          let videos = data.videos;

          if (!videos || !Array.isArray(videos)) {
            if (data.video_id) {
              videos = [{
                id: 'legacy',
                video_source: data.video_source || 'drive',
                video_id: data.video_id,
              }];
            } else {
              videos = [];
            }
          }

          if (videos.length === 0) return null;

          // Single video — simple layout
          if (videos.length === 1) {
            const vid = videos[0];
            if (!vid.video_id && !vid.video_url) return null;
            return (
              <div
                key={block.id}
                className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black"
              >
                <VideoPlayer
                  lesson={{
                    id: lessonId,
                    video_source: vid.video_source || 'drive',
                    video_id: vid.video_id,
                    video_url: vid.video_url,
                  }}
                />
                {vid.label && (
                  <div className="px-4 py-3 border-t border-white/8 bg-[#0a0d14]">
                    <p className="text-sm font-medium text-white/75 truncate">{vid.label}</p>
                  </div>
                )}
              </div>
            );
          }

          // Multiple videos — playlist layout
          return (
            <MultiVideoPlaylist
              key={block.id}
              videos={videos}
              lessonId={lessonId}
            />
          );
        }

        if (block.type === 'lessonPlan') {
          return (
            <div
              key={block.id}
              className="rounded-2xl border border-[#8083ff]/30 bg-[#8083ff]/5 p-6 sm:p-8"
            >
              <h4 className="text-lg font-bold text-[#c0c1ff] mb-6 flex items-center gap-3">
                <BookOpen className="h-5 w-5" /> Lesson Plan
              </h4>
              <LessonContentRenderer content={block.content} lessonId={lessonId} />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
