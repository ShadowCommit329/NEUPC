'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  GripVertical,
  Type,
  Code,
  FileCode2,
  FileText,
  Play,
  BookOpen,
  Youtube,
  HardDrive,
  Upload,
  CheckCircle,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Copy
} from 'lucide-react';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { VIDEO_SOURCES, getVideoSourceConfig, formatDurationSeconds } from './bootcampConfig';
import { validateDriveVideo, uploadLessonImageAction } from '@/app/_lib/bootcamp-actions';
import { extractDriveFileId, driveImageUrl } from '@/app/_lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseContentBlocks(content) {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      // Ensure all blocks have an ID
      return parsed.map(block => ({
        ...block,
        id: block.id || crypto.randomUUID()
      }));
    }
  } catch (e) {
    // If parsing fails, it's likely legacy HTML/string content
  }
  return [{ id: crypto.randomUUID(), type: 'richText', content }];
}

const BLOCK_TYPES = [
  { id: 'richText', label: 'Rich Text', icon: Type, description: 'WYSIWYG editor for standard content' },
  { id: 'markdown', label: 'Markdown', icon: FileText, description: 'Write content using Markdown syntax' },
  { id: 'html', label: 'HTML', icon: FileCode2, description: 'Raw HTML and inline styling' },
  { id: 'video', label: 'Video', icon: Play, description: 'Embed a video from Google Drive or YouTube' },
  { id: 'image', label: 'Image', icon: ImageIcon, description: 'Embed an image using a URL' },
  { id: 'lessonPlan', label: 'Lesson Plan', icon: BookOpen, description: 'Structured nested layout' },
];

const AI_PROMPTS = {
  richText: `You are a senior technical content designer for a premium coding bootcamp platform.
Your task is to transform raw lesson data into polished Rich Text (HTML) that will be rendered inside a WYSIWYG editor output.

## Rendering Context
- Dark background (#080b11), light text (#d4e4fa)
- Content area max-width: ~1024px (standard) up to ~1152px (large screens)
- NO external CSS classes are applied — your content must be self-contained
- The output is injected via dangerouslySetInnerHTML

## Spacing & Layout (use these exact values)
- Sections: margin-bottom 32px between major sections
- Headings:
  - <h2>: margin-top 40px, margin-bottom 16px, padding-bottom 8px
  - <h3>: margin-top 28px, margin-bottom 12px
  - <h4>: margin-top 20px, margin-bottom 8px
- Paragraphs: margin-bottom 16px, line-height 1.75
- Lists: margin 16px 0, padding-left 24px, li margin-bottom 10px
- Tables: margin 24px 0
- Blockquotes/Callouts: margin 24px 0, padding 16px 20px
- Between heading and first paragraph: margin 0 (heading margin-bottom handles it)

## Code Block Styling
- For code blocks, use this exact structure:
  <div data-has-copy="true" style="position:relative; margin:24px 0;">
    <div style="display:flex; align-items:center; justify-content:space-between; background:#0d1117; border:1px solid #273647; border-bottom:none; border-radius:8px 8px 0 0; padding:8px 12px;">
      <span style="font-size:12px; color:#908fa0; font-weight:600;">LANGUAGE_NAME</span>
      <button data-copy-btn="true" onclick="navigator.clipboard.writeText(this.closest('[data-has-copy=&quot;true&quot;]').querySelector('code').textContent).then(()=>{this.textContent='✓ Copied!';setTimeout(()=>this.textContent='Copy',2000)})" style="font-size:11px; color:#8083ff; background:#8083ff15; border:1px solid #8083ff30; border-radius:6px; padding:4px 12px; cursor:pointer;">Copy</button>
    </div>
    <pre style="margin:0; background:#010f1f; border:1px solid #273647; border-top:none; border-radius:0 0 8px 8px; padding:16px 20px; overflow-x:auto; font-size:13px; line-height:1.6;"><code style="font-family:'JetBrains Mono','Fira Code',monospace; color:#d4e4fa;">YOUR CODE HERE</code></pre>
  </div>
- For inline code: <code style="background:#122131; padding:2px 8px; border-radius:4px; font-size:13px; color:#c0c1ff; font-family:'JetBrains Mono','Fira Code',monospace;">code</code>

## Other Formatting Rules
1. **Headings**: Use <h2> for main sections, <h3> for sub-topics, <h4> for details. Keep headings short (under 60 chars).
2. **Paragraphs**: Use <p> tags. Keep paragraphs to 3-4 sentences max for readability.
3. **Lists**: Use <ul> or <ol> with clear, scannable bullet points. Each item should be a single idea.
4. **Tables**: Use <table> with clear headers. Limit to 5-6 columns max so it fits the wider viewport.
5. **Callouts**: Use <blockquote> for tips, warnings, and important notes. Prefix with emoji: 💡 Pro Tip, ⚠️ Warning, 📌 Important.
6. **Images**: If needed, use placeholder text like [IMAGE: description] — do not use broken URLs.

## Content Structure
- Start with a brief overview (2-3 sentences) of what the learner will gain
- Break content into logical sections with clear headings
- End each section with a key takeaway or action item
- Use bold for key terms on first mention
- Aim for scannable content — a learner should be able to skim headings and get the gist

## Tone
Professional, encouraging, and concise. Write for developers who value clarity over fluff.

---
Raw Data:
[PASTE YOUR DATA HERE]`,

  html: `You are a senior UI engineer and content designer for a premium coding bootcamp.
Your task is to transform raw lesson data into beautifully styled, self-contained HTML that will be rendered directly inside a dark-themed lesson viewer.

## Rendering Context
- Background: #080b11 (near-black), container max-width: ~1024px to ~1152px
- NO external CSS classes or stylesheets are available
- ALL styling must be inline using the style="" attribute
- The output is injected via dangerouslySetInnerHTML — it must be valid HTML

## Design System (use these exact values)
- Text primary: #d4e4fa | Secondary: #908fa0 | Muted: #464554
- Accent: #8083ff (violet) | Success: #34d399 | Warning: #fbbf24 | Error: #f87171
- Surface: #010f1f (cards) | Border: #273647 | Hover-surface: #122131
- Font: system-ui, -apple-system, sans-serif | Code font: 'JetBrains Mono', 'Fira Code', monospace

## Spacing & Layout (STRICT — use these exact pixel values)
- Page wrapper: padding 0 (already handled by container)
- Sections: margin-bottom 32px
- <h2>: font-size 22px, font-weight 800, color #d4e4fa, margin-top 40px, margin-bottom 16px, padding-bottom 8px, border-bottom 1px solid #273647
- <h3>: font-size 18px, font-weight 700, color #c0c1ff, margin-top 28px, margin-bottom 12px
- <h4>: font-size 15px, font-weight 600, color #d4e4fa, margin-top 20px, margin-bottom 8px
- <p>: font-size 15px, line-height 1.75, color #908fa0, margin-bottom 16px
- <ul>/<ol>: margin 16px 0, padding-left 24px
- <li>: margin-bottom 10px, line-height 1.6, color #908fa0, font-size 15px
- <table>: margin 24px 0, width 100%
- <th>: padding 12px 16px, text-align left
- <td>: padding 10px 16px
- <blockquote>: margin 24px 0, padding 16px 20px

## Code Blocks (IMPORTANT — use this exact HTML pattern)
For EVERY code block, use this structure with a copy button:

<div data-has-copy="true" style="position:relative; margin:24px 0; border-radius:10px; overflow:hidden; border:1px solid #273647;">
  <div style="display:flex; align-items:center; justify-content:space-between; background:#0d1117; padding:10px 16px; border-bottom:1px solid #273647;">
    <span style="font-size:12px; color:#908fa0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">LANGUAGE_NAME</span>
    <button data-copy-btn="true" onclick="navigator.clipboard.writeText(this.closest('[data-has-copy=&quot;true&quot;]').querySelector('code').textContent).then(()=>{this.textContent='✓ Copied!';setTimeout(()=>this.textContent='Copy',2000)})" style="font-size:11px; color:#8083ff; background:rgba(128,131,255,0.08); border:1px solid rgba(128,131,255,0.2); border-radius:6px; padding:4px 14px; cursor:pointer; font-weight:600; transition:all 0.2s;">Copy</button>
  </div>
  <pre style="margin:0; background:#010f1f; padding:20px; overflow-x:auto; font-size:13px; line-height:1.7;"><code style="font-family:'JetBrains Mono','Fira Code',monospace; color:#d4e4fa; white-space:pre;">YOUR CODE HERE</code></pre>
</div>

For inline code:
<code style="background:#122131; padding:2px 8px; border-radius:5px; font-size:13px; color:#c0c1ff; font-family:'JetBrains Mono','Fira Code',monospace; border:1px solid #27364750;">code</code>

## Callout Boxes (use this pattern)
<div style="border-left:4px solid ACCENT_COLOR; background:#010f1f; padding:16px 20px; border-radius:0 12px 12px 0; margin:24px 0; display:flex; gap:12px; align-items:flex-start;">
  <span style="font-size:20px; line-height:1;">EMOJI</span>
  <div>
    <strong style="color:#d4e4fa; font-size:14px; display:block; margin-bottom:4px;">TITLE</strong>
    <p style="color:#908fa0; font-size:14px; line-height:1.6; margin:0;">CONTENT</p>
  </div>
</div>
Use: 💡 Tip (#34d399) | ⚠️ Warning (#fbbf24) | 📌 Important (#8083ff) | 🚨 Caution (#f87171)

## Table Styling
<table style="width:100%; border-collapse:collapse; margin:24px 0; border-radius:10px; overflow:hidden; border:1px solid #273647;">
  <thead>
    <tr style="background:#122131;">
      <th style="padding:12px 16px; text-align:left; font-size:13px; font-weight:700; color:#d4e4fa; border-bottom:2px solid #273647;">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 16px; font-size:14px; color:#908fa0; border-bottom:1px solid #1a2535;">Data</td>
    </tr>
  </tbody>
</table>

## Responsive Rules
- All content must fit within ~1024px - ~1152px width
- Tables: max 6-8 columns (utilize the wider display)
- Code blocks: overflow-x auto, max ~100 chars per line preferred
- No fixed widths — use max-width and percentages
- Design for premium, spacious feel. Avoid crowded layouts.

## Content Structure
- Brief overview paragraph at the top
- Logical sections with clear headings and visual separation
- Key concepts highlighted in callout boxes
- Practical code examples with language labels
- Summary or key takeaways at the bottom

## Tone
Professional, encouraging, and clear. Write for developers who appreciate clean design and clarity.

---
Raw Data:
[PASTE YOUR DATA HERE]`,

  markdown: `You are a senior technical writer for a premium coding bootcamp platform.
Your task is to transform raw lesson data into clean, well-structured Markdown that will be converted to HTML and rendered in a dark-themed viewer.

## Rendering Context
- The Markdown is processed by remark/remark-html and rendered in a dark UI (#080b11 background)
- Container max-width: ~1024px to ~1152px
- No custom CSS classes are applied to the output
- Code blocks will automatically get a copy button via client-side JavaScript

## Spacing Rules (Markdown naturally creates these, but be intentional)
- Always leave a blank line between paragraphs
- Always leave a blank line before and after headings
- Always leave a blank line before and after code blocks
- Always leave a blank line before and after lists
- Always leave a blank line before and after blockquotes
- Always leave a blank line before and after tables
- Use --- (horizontal rule) between major sections for extra visual separation

## Formatting Rules
1. **Headings**: Use ## for main sections, ### for sub-topics, #### for minor details. Keep them short and descriptive.
2. **Paragraphs**: Write concise paragraphs (3-4 sentences max). Leave a blank line between paragraphs.
3. **Code**:
   - Inline: Use single backticks for \`variable names\`, \`functions()\`, \`commands\`
   - Blocks: Use triple backticks with language identifier (e.g. \`\`\`python). Keep under 20 lines.
   - ALWAYS specify the language after opening backticks for syntax context
   - Keep code lines under 100 characters to avoid horizontal scrolling
4. **Lists**: 
   - Use bullet lists (-) for unordered items
   - Use numbered lists (1.) for sequential steps
   - Keep items to 1-2 lines each
   - Indent sub-items with 2 spaces
5. **Tables**: Use standard Markdown tables with alignment. Max 6-7 columns.
6. **Emphasis**: Use **bold** for key terms, *italic* for emphasis.
7. **Callouts**: Use blockquotes with emoji prefixes:
   - > 💡 **Pro Tip:** helpful advice here
   - > ⚠️ **Warning:** things to watch out for
   - > 📌 **Important:** critical information
   - > 🚨 **Caution:** dangerous operations
8. **Horizontal rules**: Use --- to separate major sections with extra breathing room.

## Content Structure
- Start with a brief overview of the lesson topic (2-3 sentences)
- Organize into clear sections with descriptive headings
- Include practical code examples with language labels
- Add callout boxes for tips, warnings, and key concepts
- End with a summary section: "## Key Takeaways" with bullet points
- Keep the total content readable in 5-10 minutes

## Width & Readability
- Keep lines under 100 characters where possible
- Tables should have max 6-7 columns to fit the wider viewport
- Code blocks should not require horizontal scrolling (max ~100 chars per line)
- Use short, scannable headings
- Leverage the expanded width for clearer comparisons and better-spaced code.

## Tone
Professional, encouraging, and developer-friendly. No filler — every sentence should add value.

---
Raw Data:
[PASTE YOUR DATA HERE]`,
};

const AI_PROMPT_IDEA = (type) => AI_PROMPTS[type] || AI_PROMPTS.richText;

function PromptButton({ type }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(AI_PROMPT_IDEA(type));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#8083ff]/10 hover:bg-[#8083ff]/20 text-[#c0c1ff] text-[10px] font-medium transition-colors border border-[#8083ff]/20"
      title="Copy AI Prompt Idea"
    >
      {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Sparkles className="w-3 h-3" />}
      {copied ? 'Copied Idea!' : 'AI Prompt Idea'}
    </button>
  );
}

// Video Source Icons mapping
const VIDEO_ICONS = {
  none: FileText,
  drive: HardDrive,
  youtube: Youtube,
  upload: Upload,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MultiBlockEditor({ value, onChange }) {
  const [blocks, setBlocks] = useState(() => parseContentBlocks(value));
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragHandleActive, setDragHandleActive] = useState(null);

  // Sync value changes from outside (e.g. when changing selected lesson)
  // Use derived state pattern instead of useEffect to prevent infinite flip-flop loops
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = parseContentBlocks(value);
    if (JSON.stringify(parsed) !== JSON.stringify(blocks)) {
      setBlocks(parsed);
    }
  }

  // Sync local blocks back to the parent (onChange)
  useEffect(() => {
    const serialized = JSON.stringify(blocks);
    // Only notify parent if the content actually changed and is different from current value
    if (serialized !== value) {
      onChange(serialized);
    }
  }, [blocks, onChange, value]);

  const updateBlocks = useCallback((newBlocks) => {
    setBlocks(newBlocks);
  }, []);

  const updateBlock = useCallback((id, updates) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      const resolvedUpdates = typeof updates === 'function' ? updates(b) : updates;
      const nb = { ...b, ...resolvedUpdates };
      // Deep merge data if provided
      if (resolvedUpdates.data) {
        nb.data = { ...(b.data || {}), ...resolvedUpdates.data };
      }
      return nb;
    }));
  }, []);

  const addBlock = (type) => {
    const newBlock = { id: crypto.randomUUID(), type, content: '' };
    setBlocks(prev => [...prev, newBlock]);
    setShowAddMenu(false);
  };

  const updateBlockContent = (id, content) => {
    updateBlock(id, { content });
  };

  const updateBlockData = (id, data) => {
    updateBlock(id, { data });
  };

  // validateDrive has been moved to the video block render logic

  const removeBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const moveBlock = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === blocks.length - 1)) return;
    
    setBlocks(prev => {
      const newBlocks = [...prev];
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[index + direction];
      newBlocks[index + direction] = temp;
      return newBlocks;
    });
  };

  const renderEditor = (block) => {
    if (block.type === 'richText') {
      return (
        <div className="bg-[#051424]">
          <RichTextEditor
            value={block.content}
            onChange={(val) => updateBlockContent(block.id, val)}
            uploadImageAction={uploadLessonImageAction}
            placeholder="Write your content here..."
            minHeight="200px"
          />
        </div>
      );
    }
    
    if (block.type === 'markdown') {
      return (
        <div className="relative group/editor">
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/editor:opacity-100 transition-opacity">
            <PromptButton type="markdown" />
          </div>
          <CodeMirror
            value={block.content}
            height="auto"
            minHeight="200px"
            theme={oneDark}
            extensions={[markdown({ base: markdownLanguage })]}
            onChange={(val) => updateBlockContent(block.id, val)}
            className="text-sm overflow-hidden"
          />
        </div>
      );
    }
    
    if (block.type === 'html') {
      return (
        <div className="relative group/editor">
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/editor:opacity-100 transition-opacity">
            <PromptButton type="html" />
          </div>
          <CodeMirror
            value={block.content}
            height="auto"
            minHeight="200px"
            theme={oneDark}
            extensions={[html()]}
            onChange={(val) => updateBlockContent(block.id, val)}
            className="text-sm overflow-hidden"
          />
        </div>
      );
    }
    
    if (block.type === 'video') {
      const data = block.data || {};
      let videos = data.videos;
      
      if (!videos || !Array.isArray(videos)) {
        if (data.video_id) {
          videos = [{
            id: crypto.randomUUID(),
            video_source: data.video_source || 'drive',
            video_id: data.video_id,
            validationResult: data.validationResult,
            duration: data.duration,
            validating: data.validating,
          }];
        } else {
          videos = [{ id: crypto.randomUUID(), video_source: 'drive', video_id: '' }];
        }
      }

      const updateVideo = (vidId, updates) => {
        updateBlock(block.id, (b) => {
          const bData = b.data || {};
          let bVideos = bData.videos || [];
          const newVideos = bVideos.map(vid => vid.id === vidId ? { ...vid, ...updates } : vid);
          return { data: { videos: newVideos } };
        });
      };

      const addVideo = () => {
        updateBlock(block.id, (b) => {
          const bData = b.data || {};
          const bVideos = bData.videos || [];
          return { data: { videos: [...bVideos, { id: crypto.randomUUID(), video_source: 'drive', video_id: '' }] } };
        });
      };

      const removeVideo = (vidId) => {
        updateBlock(block.id, (b) => {
          const bData = b.data || {};
          const bVideos = bData.videos || [];
          return { data: { videos: bVideos.filter(v => v.id !== vidId) } };
        });
      };

      const validateDriveMulti = async (vid) => {
        const videoId = vid.video_id;
        if (!videoId) return;
        
        updateVideo(vid.id, { validating: true, validationResult: null });
        try {
          const result = await validateDriveVideo(videoId);
          updateVideo(vid.id, { 
            validationResult: result,
            video_id: result.valid && result.fileId ? result.fileId : videoId,
            duration: result.valid && result.duration ? result.duration : (vid.duration || 0)
          });
        } catch (err) {
          updateVideo(vid.id, { validationResult: { valid: false, error: err.message } });
        } finally {
          updateVideo(vid.id, { validating: false });
        }
      };

      return (
        <div className="p-4 bg-[#051424] flex flex-col gap-6">
          {videos.map((vid, vIndex) => {
            const source = vid.video_source || 'drive';
            const videoId = vid.video_id || '';
            const validation = vid.validationResult;

            return (
              <div key={vid.id} className="flex flex-col gap-4 relative border border-[#464554] rounded-xl p-4 bg-[#010f1f]">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-semibold text-[#d4e4fa]">Video {vIndex + 1}</h5>
                  {videos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVideo(vid.id)}
                      className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Remove video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Video Title */}
                <div>
                  <label className="text-xs font-medium text-[#908fa0] block mb-1">
                    Video Title <span className="text-[#464554]">(shown in playlist)</span>
                  </label>
                  <input
                    type="text"
                    value={vid.label || ''}
                    onChange={(e) => updateVideo(vid.id, { label: e.target.value })}
                    placeholder={`e.g. Introduction, Part ${vIndex + 1}…`}
                    className="w-full rounded-lg border border-[#464554] bg-[#051424] px-3 py-2 text-sm text-[#d4e4fa] outline-none focus:border-[#c0c1ff] placeholder:text-[#464554]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {VIDEO_SOURCES.filter(s => s !== 'none').map((src) => {
                    const config = getVideoSourceConfig(src);
                    const Icon = VIDEO_ICONS[src] || FileText;
                    const active = source === src;
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => updateVideo(vid.id, { video_source: src })}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-xs font-medium ${
                          active
                            ? 'border-[#c0c1ff]/50 bg-[#c0c1ff]/10 text-[#c0c1ff]'
                            : 'border-[#464554] bg-[#051424] text-[#908fa0] hover:border-[#908fa0]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>

                {source === 'drive' && (
                  <div className="space-y-3 rounded-xl border border-[#464554] bg-[#051424] p-3">
                    <label className="text-xs font-medium text-[#908fa0] block">
                      Google Drive File ID or URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={videoId}
                        onChange={(e) => updateVideo(vid.id, { video_id: e.target.value, validationResult: null })}
                        placeholder="File ID or share URL"
                        className="flex-1 rounded-lg border border-[#464554] bg-[#010f1f] px-3 py-2 text-sm text-[#d4e4fa] outline-none focus:border-[#c0c1ff]"
                      />
                      <button
                        type="button"
                        onClick={() => validateDriveMulti(vid)}
                        disabled={vid.validating || !videoId}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {vid.validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        Validate
                      </button>
                    </div>
                    {validation && (
                      <div className={`flex items-start gap-2 rounded-lg p-2 text-xs ${validation.valid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {validation.valid ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium">Video accessible</p>
                              {validation.name && <p className="opacity-70">{validation.name}</p>}
                              {validation.duration && <p className="opacity-70">Duration: {formatDurationSeconds(validation.duration)}</p>}
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium">Cannot access video</p>
                              <p className="opacity-70">{validation.error}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {source === 'youtube' && (
                  <div className="rounded-xl border border-[#464554] bg-[#051424] p-3 space-y-2">
                    <label className="text-xs font-medium text-[#908fa0] block">
                      YouTube Video URL or ID
                    </label>
                    <input
                      type="text"
                      value={videoId}
                      onChange={(e) => updateVideo(vid.id, { video_id: e.target.value })}
                      placeholder="e.g., dQw4w9WgXcQ or full URL"
                      className="w-full rounded-lg border border-[#464554] bg-[#010f1f] px-3 py-2 text-sm text-[#d4e4fa] outline-none focus:border-[#c0c1ff]"
                    />
                  </div>
                )}

                {source === 'upload' && (
                  <div className="rounded-xl border-2 border-dashed border-[#464554] bg-[#051424] p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-[#464554]" />
                    <p className="mt-2 text-sm text-[#908fa0]">Upload coming soon — use Drive or YouTube</p>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addVideo}
            className="flex items-center gap-2 justify-center py-3 rounded-xl border border-dashed border-[#464554] text-[#908fa0] hover:border-[#c0c1ff] hover:text-[#c0c1ff] transition-all bg-[#010f1f]"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-semibold">Add Another Video</span>
          </button>
        </div>
      );
    }
    
    if (block.type === 'lessonPlan') {
      return (
        <div className="p-4 bg-[#051424] border-l-4 border-[#8083ff]">
          <h4 className="text-sm font-semibold text-[#c0c1ff] mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Lesson Plan Structure
          </h4>
          <MultiBlockEditor 
            value={block.content} 
            onChange={(val) => updateBlockContent(block.id, val)}
          />
        </div>
      );
    }
    
    if (block.type === 'image') {
      const data = block.data || {};
      let images = data.images;
      
      // Professional: If images array is missing or empty, ensure at least one slot
      if (!images || !Array.isArray(images) || images.length === 0) {
        if (block.content) {
          images = [{ id: crypto.randomUUID(), url: block.content, alt: data.alt || '' }];
        } else {
          images = [{ id: crypto.randomUUID(), url: '', alt: '' }];
        }
      }

      const updateImage = (imgId, updates) => {
        // Professional: If user pastes a Google Drive link, automatically convert to proxy
        let finalUrl = updates.url;
        if (finalUrl && finalUrl.includes('drive.google.com')) {
          const fileId = extractDriveFileId(finalUrl);
          if (fileId) {
            finalUrl = `/api/image/${fileId}`;
          }
        }
        
        const resolvedUpdates = { ...updates, ...(finalUrl !== undefined && { url: finalUrl }) };

        updateBlock(block.id, (b) => {
          const bData = b.data || {};
          let bImages = bData.images;
          if (!bImages || !Array.isArray(bImages) || bImages.length === 0) {
            bImages = b.content 
              ? [{ id: crypto.randomUUID(), url: b.content, alt: bData.alt || '' }]
              : [{ id: crypto.randomUUID(), url: '', alt: '' }];
          }
          const newImages = bImages.map(img => img.id === imgId ? { ...img, ...resolvedUpdates } : img);
          return { 
            data: { images: newImages },
            content: ''
          };
        });
      };

      const addImage = () => {
        updateBlockData(block.id, { images: [...images, { id: crypto.randomUUID(), url: '', alt: '' }] });
      };

      const removeImage = (imgId) => {
        updateBlockData(block.id, { images: images.filter(img => img.id !== imgId) });
      };

      const handleImageUpload = async (imgId, file) => {
        if (!file) return;
        updateImage(imgId, { uploading: true, uploadError: null });
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const result = await uploadLessonImageAction(formData);
          if (result.error) {
            updateImage(imgId, { uploadError: result.error, uploading: false });
          } else {
            updateImage(imgId, { url: result.url, uploading: false, uploadError: null });
          }
        } catch (err) {
          updateImage(imgId, { uploadError: err.message, uploading: false });
        }
      };

      return (
        <div className="p-4 bg-[#051424] flex flex-col gap-6">
          {images.map((img, imgIndex) => (
            <div key={img.id} className="flex flex-col gap-4 relative border border-[#464554] rounded-xl p-4 bg-[#010f1f]">
              <div className="flex justify-between items-center">
                <h5 className="text-sm font-semibold text-[#d4e4fa]">Image {imgIndex + 1}</h5>
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#908fa0] block mb-1">
                    Image URL or Direct Upload
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={img.url || ''}
                      onChange={(e) => updateImage(img.id, { url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 rounded-lg border border-[#464554] bg-[#051424] px-3 py-2 text-sm text-[#d4e4fa] outline-none focus:border-[#c0c1ff]"
                    />
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleImageUpload(img.id, e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        disabled={img.uploading}
                      />
                      <button 
                        type="button" 
                        disabled={img.uploading}
                        className="flex items-center gap-1.5 rounded-lg bg-[#273647] px-3 py-2 text-xs font-medium text-[#d4e4fa] hover:bg-[#34465c] disabled:opacity-50 transition-colors shrink-0 h-full"
                      >
                        {img.uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Upload
                      </button>
                    </div>
                  </div>
                  {img.uploadError && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="h-3 w-3" /> {img.uploadError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-[#908fa0] block mb-1">
                    Alt Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={img.alt || ''}
                    onChange={(e) => updateImage(img.id, { alt: e.target.value })}
                    placeholder="Description of the image"
                    className="w-full rounded-lg border border-[#464554] bg-[#051424] px-3 py-2 text-sm text-[#d4e4fa] outline-none focus:border-[#c0c1ff]"
                  />
                </div>
              </div>

              {img.url && (
                <div className="rounded-xl border border-[#464554] bg-[#010f1f] p-2 overflow-hidden flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={driveImageUrl(img.url)} 
                    alt={img.alt || 'Image preview'} 
                    className="max-h-[300px] rounded-lg object-contain"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                    onLoad={(e) => { e.target.style.display = 'block'; e.target.nextSibling.style.display = 'none'; }}
                  />
                  <div className="text-[#908fa0] text-sm py-8 hidden">Invalid image URL</div>
                </div>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addImage}
            className="flex items-center gap-2 justify-center py-3 rounded-xl border border-dashed border-[#464554] text-[#908fa0] hover:border-[#c0c1ff] hover:text-[#c0c1ff] transition-all bg-[#010f1f]"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-semibold">Add Another Image</span>
          </button>
        </div>
      );
    }
    
    return <p className="text-red-400 p-4">Unknown block type</p>;
  };

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="text-center py-8 bg-[#051424] rounded-xl border border-[#464554] border-dashed">
          <p className="text-[#908fa0] text-sm mb-4">No content blocks yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map((block, index) => {
            const BlockIcon = BLOCK_TYPES.find(t => t.id === block.type)?.icon || Code;
            const blockLabel = BLOCK_TYPES.find(t => t.id === block.type)?.label || 'Block';
            
            return (
              <div 
                key={block.id} 
                draggable={dragHandleActive === block.id}
                onDragStart={(e) => {
                  setDraggedIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', index);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedIndex === null || draggedIndex === index) return;
                  
                  const newBlocks = [...blocks];
                  const draggedItem = newBlocks[draggedIndex];
                  newBlocks.splice(draggedIndex, 1);
                  newBlocks.splice(index, 0, draggedItem);
                  
                  updateBlocks(newBlocks);
                  setDraggedIndex(null);
                  setDragHandleActive(null);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragHandleActive(null);
                }}
                className={`group relative bg-[#010f1f] rounded-xl border border-[#464554] overflow-hidden focus-within:border-[#c0c1ff] transition-all ${draggedIndex === index ? 'opacity-50 scale-[0.98]' : ''}`}
              >
                
                {/* Block Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#464554] bg-[#051424]">
                  <div 
                    className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
                    onMouseEnter={() => setDragHandleActive(block.id)}
                    onMouseLeave={() => setDragHandleActive(null)}
                  >
                    <GripVertical className="w-4 h-4 text-[#464554] group-hover:text-[#908fa0] transition-colors pointer-events-none" />
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-[#122131] rounded-md text-xs font-semibold text-[#d4e4fa] pointer-events-none">
                      <BlockIcon className="w-3.5 h-3.5" />
                      {blockLabel}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                      className="p-1.5 rounded-md text-[#908fa0] hover:text-[#d4e4fa] hover:bg-[#122131] disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                      className="p-1.5 rounded-md text-[#908fa0] hover:text-[#d4e4fa] hover:bg-[#122131] disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-[#464554] mx-1" />
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Remove block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Block Editor */}
                <div>
                  {renderEditor(block)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Block Menu */}
      <div className="relative">
        {!showAddMenu ? (
          <button
            type="button"
            onClick={() => setShowAddMenu(true)}
            className="w-full border-2 border-dashed border-[#464554] hover:border-[#c0c1ff] bg-[#051424]/50 hover:bg-[#c0c1ff]/5 rounded-xl py-6 flex flex-col items-center justify-center gap-3 text-[#908fa0] hover:text-[#c0c1ff] transition-all group"
          >
            <div className="bg-[#122131] rounded-full p-3 group-hover:bg-[#8083ff]/20 transition-colors">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">Add Content Block</span>
          </button>
        ) : (
          <div className="bg-[#051424] rounded-xl border border-[#464554] p-4">
            <h4 className="text-xs font-semibold text-[#908fa0] uppercase tracking-wider mb-3">Select Block Type</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => addBlock(type.id)}
                  className="flex flex-col items-start p-3 rounded-lg border border-[#464554] bg-[#010f1f] hover:border-[#c0c1ff] hover:bg-[#122131] transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2 text-[#d4e4fa]">
                    <type.icon className="w-4 h-4 text-[#8083ff]" />
                    <span className="text-sm font-semibold">{type.label}</span>
                  </div>
                  <p className="text-[10px] text-[#908fa0] leading-relaxed">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAddMenu(false)}
              className="mt-4 w-full py-2 text-xs font-medium text-[#908fa0] hover:text-[#d4e4fa] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
