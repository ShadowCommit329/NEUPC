'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { remark } from 'remark';
import html from 'remark-html';
import VideoPlayer from './VideoPlayer';
import { BookOpen, Play, ListVideo } from 'lucide-react';
import { driveImageUrl } from '@/app/_lib/utils';

function parseContentBlocks(content) {
  if (!content) return [];
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
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

  // Auto-inject copy buttons on <pre> code blocks
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preBlocks = container.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
      // Skip if already has a copy button (from HTML prompt or previous run)
      if (pre.parentElement?.querySelector('[data-copy-btn]')) return;
      if (pre.closest('[data-has-copy]')) return;

      const code = pre.querySelector('code') || pre;
      const lang = code.className?.match(/language-(\w+)/)?.[1] || '';

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-has-copy', 'true');
      wrapper.style.cssText = 'position:relative; margin:24px 0; border-radius:10px; overflow:hidden; border:1px solid #273647;';

      // Create header bar
      const header = document.createElement('div');
      header.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:#0d1117; padding:10px 16px; border-bottom:1px solid #273647;';

      const langLabel = document.createElement('span');
      langLabel.style.cssText = 'font-size:12px; color:#908fa0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;';
      langLabel.textContent = lang || 'Code';

      const copyBtn = document.createElement('button');
      copyBtn.setAttribute('data-copy-btn', 'true');
      copyBtn.textContent = 'Copy';
      copyBtn.style.cssText = 'font-size:11px; color:#8083ff; background:rgba(128,131,255,0.08); border:1px solid rgba(128,131,255,0.2); border-radius:6px; padding:4px 14px; cursor:pointer; font-weight:600; transition:all 0.2s;';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(code.textContent).then(() => {
          copyBtn.textContent = '✓ Copied!';
          copyBtn.style.color = '#34d399';
          copyBtn.style.borderColor = 'rgba(52,211,153,0.3)';
          copyBtn.style.background = 'rgba(52,211,153,0.08)';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.style.color = '#8083ff';
            copyBtn.style.borderColor = 'rgba(128,131,255,0.2)';
            copyBtn.style.background = 'rgba(128,131,255,0.08)';
          }, 2000);
        });
      });

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      // Style the pre block
      pre.style.cssText = 'margin:0; background:#010f1f; padding:20px; overflow-x:auto; font-size:13px; line-height:1.7;';
      if (code !== pre) {
        code.style.cssText = "font-family:'JetBrains Mono','Fira Code',monospace; color:#d4e4fa; white-space:pre;";
      }

      // Wrap: insert wrapper before pre, move pre into wrapper
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
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
            <div
              key={block.id}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
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

          return (
            <div key={block.id} className="flex flex-col gap-8">
              {images.map((img) => {
                if (!img.url) return null;
                return (
                  <div
                    key={img.id}
                    className="rounded-2xl border border-white/8 overflow-hidden bg-black/20 flex justify-center p-2 shadow-lg group/img relative"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={driveImageUrl(img.url)}
                      alt={img.alt || 'Lesson image'}
                      className="max-w-full h-auto rounded-xl transition-transform duration-500 group-hover/img:scale-[1.01]"
                      loading="lazy"
                    />
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
