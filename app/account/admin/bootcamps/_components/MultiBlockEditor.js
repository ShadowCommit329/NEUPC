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
  AlertCircle
} from 'lucide-react';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { VIDEO_SOURCES, getVideoSourceConfig, formatDurationSeconds } from './bootcampConfig';
import { validateDriveVideo } from '@/app/_lib/bootcamp-actions';

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
  { id: 'lessonPlan', label: 'Lesson Plan', icon: BookOpen, description: 'Structured nested layout' },
];

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
  useEffect(() => {
    const parsed = parseContentBlocks(value);
    // Basic deep compare to avoid infinite loops if it's just a ref update
    if (JSON.stringify(parsed) !== JSON.stringify(blocks)) {
      setBlocks(parsed);
    }
  }, [value]);

  const updateBlocks = useCallback((newBlocks) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks));
  }, [onChange]);

  const addBlock = (type) => {
    const newBlock = { id: crypto.randomUUID(), type, content: '' };
    updateBlocks([...blocks, newBlock]);
    setShowAddMenu(false);
  };

  const updateBlockContent = (id, content) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, content } : b);
    updateBlocks(newBlocks);
  };

  const updateBlockData = (id, data) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, data: { ...(b.data || {}), ...data } } : b);
    updateBlocks(newBlocks);
  };

  // validateDrive has been moved to the video block render logic

  const removeBlock = (id) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    updateBlocks(newBlocks);
  };

  const moveBlock = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === blocks.length - 1)) return;
    
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + direction];
    newBlocks[index + direction] = temp;
    updateBlocks(newBlocks);
  };

  const renderEditor = (block) => {
    if (block.type === 'richText') {
      return (
        <div className="bg-[#051424]">
          <RichTextEditor
            value={block.content}
            onChange={(val) => updateBlockContent(block.id, val)}
            placeholder="Write your content here..."
            minHeight="200px"
          />
        </div>
      );
    }
    
    if (block.type === 'markdown') {
      return (
        <CodeMirror
          value={block.content}
          height="auto"
          minHeight="200px"
          theme={oneDark}
          extensions={[markdown({ base: markdownLanguage })]}
          onChange={(val) => updateBlockContent(block.id, val)}
          className="text-sm overflow-hidden"
        />
      );
    }
    
    if (block.type === 'html') {
      return (
        <CodeMirror
          value={block.content}
          height="auto"
          minHeight="200px"
          theme={oneDark}
          extensions={[html()]}
          onChange={(val) => updateBlockContent(block.id, val)}
          className="text-sm overflow-hidden"
        />
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
        const newVideos = videos.map(v => v.id === vidId ? { ...v, ...updates } : v);
        updateBlockData(block.id, { videos: newVideos });
      };

      const addVideo = () => {
        updateBlockData(block.id, { videos: [...videos, { id: crypto.randomUUID(), video_source: 'drive', video_id: '' }] });
      };

      const removeVideo = (vidId) => {
        updateBlockData(block.id, { videos: videos.filter(v => v.id !== vidId) });
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
