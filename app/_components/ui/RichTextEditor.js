/**
 * @file Professional WYSIWYG rich text editor for blog writing.
 * Built on TipTap with drag-and-drop image upload, text formatting,
 * syntax-highlighted code blocks, and a polished toolbar.
 *
 * @module RichTextEditor
 */

'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
} from "@floating-ui/react";
import {
  EditorContent,
  useEditor,
  ReactNodeViewRenderer,
  NodeViewWrapper,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Underline from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code2,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Unlink,
  ImagePlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Minus,
  Maximize2,
  Minimize2,
  Palette,
  Eye,
  EyeOff,
  Code,
  X,
  Check,
  ExternalLink,
  Trash2,
  Eraser,
  Type,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  TableProperties,
  Rows3,
  Columns3,
  TableCellsMerge,
  TableCellsSplit,
} from 'lucide-react';
import { useScrollLock } from '@/app/_lib/hooks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lowlight = createLowlight(common);

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/** Adds `id` attributes to h2/h3 elements for TOC compatibility. */
function ensureHeadingIds(html) {
  if (typeof window === 'undefined') return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const used = new Set();
    for (const el of doc.querySelectorAll('h1, h2, h3, h4')) {
      let id = el.getAttribute('id') || slugify(el.textContent || '');
      if (!id) id = `section-${used.size + 1}`;
      let base = id;
      let i = 2;
      while (used.has(id)) id = `${base}-${i++}`;
      used.add(id);
      el.setAttribute('id', id);
    }
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f4f4f5',
  '#a1a1aa',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const ToolbarButton = forwardRef(function ToolbarButton(
  { onClick, disabled, active, title, children, className = '' },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm transition-all duration-150 ${
        disabled
          ? 'cursor-not-allowed text-gray-600'
          : active
            ? 'bg-blue-500/20 text-blue-300'
            : 'text-gray-400 hover:bg-white/8 hover:text-gray-100'
      } ${className}`}
    >
      {children}
    </button>
  );
});

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-white/10" />;
}

function ToolbarGroup({ children }) {
  return <div className="flex shrink-0 items-center gap-0.5">{children}</div>;
}

/** Inline link editing popover for the BubbleMenu */
function LinkPopover({ editor, onClose }) {
  const [url, setUrl] = useState(editor.getAttributes('link').href || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSave = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: trimmed })
        .run();
    }
    onClose();
  };

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-gray-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
      <input
        ref={inputRef}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
          if (e.key === 'Escape') onClose();
        }}
        placeholder="https://…"
        className="w-56 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500/50"
      />
      <button
        type="button"
        onClick={handleSave}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500"
        title="Save"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      {editor.isActive('link') && (
        <a
          href={editor.getAttributes('link').href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-blue-400"
          title="Open link"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <button
        type="button"
        onClick={() => {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          onClose();
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
        title="Remove link"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Color picker popover */
function ColorPicker({ editor, onClose }) {
  const current = editor.getAttributes('textStyle').color || '';

  return (
    <div className="rounded-xl border border-white/15 bg-gray-900/95 p-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
        Text Color
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              editor.chain().focus().setColor(color).run();
              onClose();
            }}
            className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
              current === color
                ? 'border-transparent ring-2 ring-white/60 ring-offset-1 ring-offset-gray-900'
                : 'border-white/10'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          editor.chain().focus().unsetColor().run();
          onClose();
        }}
        className="mt-2 w-full rounded-lg px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        Reset color
      </button>
    </div>
  );
}

/** Labeled button used inside the table context bar */
function TableContextBtn({ onClick, title, children, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded px-2 text-[10px] font-medium transition-all duration-150 ${
        danger
          ? 'text-red-400/80 hover:bg-red-400/10 hover:text-red-300'
          : 'text-gray-400 hover:bg-white/8 hover:text-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

/** Contextual toolbar that slides in below the main toolbar when inside a table */
function TableContextBar({ editor }) {
  return (
    <div className="scrollbar-none flex items-center gap-0.5 overflow-x-auto border-t border-teal-500/20 bg-teal-950/25 px-2.5 py-1">
      <span className="mr-1.5 shrink-0 text-[9px] font-bold tracking-widest text-teal-500/70 uppercase">
        Table
      </span>
      <div className="mx-0.5 h-3.5 w-px shrink-0 bg-teal-600/25" />

      <TableContextBtn
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="Insert column before"
      >
        <Columns3 className="h-3 w-3" />
        <span>← Col</span>
      </TableContextBtn>
      <TableContextBtn
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Insert column after"
      >
        <Columns3 className="h-3 w-3" />
        <span>Col →</span>
      </TableContextBtn>
      <TableContextBtn
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Delete current column"
        danger
      >
        <span>−Col</span>
      </TableContextBtn>

      <div className="mx-1.5 h-3.5 w-px shrink-0 bg-white/10" />

      <TableContextBtn
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="Insert row above"
      >
        <Rows3 className="h-3 w-3" />
        <span>↑ Row</span>
      </TableContextBtn>
      <TableContextBtn
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Insert row below"
      >
        <Rows3 className="h-3 w-3" />
        <span>Row ↓</span>
      </TableContextBtn>
      <TableContextBtn
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Delete current row"
        danger
      >
        <span>−Row</span>
      </TableContextBtn>

      <div className="mx-1.5 h-3.5 w-px shrink-0 bg-white/10" />

      <TableContextBtn
        onClick={() => editor.chain().focus().mergeCells().run()}
        title="Merge selected cells"
      >
        <TableCellsMerge className="h-3 w-3" />
        <span>Merge</span>
      </TableContextBtn>
      <TableContextBtn
        onClick={() => editor.chain().focus().splitCell().run()}
        title="Split merged cell"
      >
        <TableCellsSplit className="h-3 w-3" />
        <span>Split</span>
      </TableContextBtn>

      <div className="mx-1.5 h-3.5 w-px shrink-0 bg-white/10" />

      <TableContextBtn
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        title="Toggle header row"
      >
        <TableProperties className="h-3 w-3" />
        <span>Header Row</span>
      </TableContextBtn>
      <TableContextBtn
        onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
        title="Toggle header column"
      >
        <TableProperties className="h-3 w-3" />
        <span>Header Col</span>
      </TableContextBtn>

      <div className="mx-1.5 h-3.5 w-px shrink-0 bg-white/10" />

      <TableContextBtn
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete entire table"
        danger
      >
        <Trash2 className="h-3 w-3" />
        <span>Delete Table</span>
      </TableContextBtn>
    </div>
  );
}

/** Image insertion dialog */
function ImageDialog({ onInsert, onUpload, uploading, onClose }) {
  useScrollLock();
  const [tab, setTab] = useState('upload');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const fileRef = useRef(null);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white">Insert Image</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8">
          {[
            { id: 'upload', label: 'Upload' },
            { id: 'url', label: 'From URL' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-5">
          {tab === 'upload' ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/3 py-10 transition-colors hover:border-blue-500/40 hover:bg-blue-500/5"
            >
              <ImagePlus className="mb-2 h-8 w-8 text-gray-500" />
              <p className="text-sm text-gray-400">
                {uploading ? 'Uploading…' : 'Click to select or drag & drop'}
              </p>
              <p className="mt-1 text-[10px] text-gray-600">
                JPG, PNG, WebP, GIF — max 5 MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) onUpload(f, alt);
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-400">
                  Image URL
                </label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50"
                />
              </div>
              {url && (
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <img
                    src={url}
                    alt="Preview"
                    className="max-h-40 w-full bg-black/30 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-400">
              Alt Text (accessibility)
            </label>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-1.5 text-xs text-gray-400 hover:bg-white/5"
          >
            Cancel
          </button>
          {tab === 'url' && (
            <button
              type="button"
              disabled={!url.trim()}
              onClick={() => {
                onInsert(url.trim(), alt.trim());
                onClose();
              }}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
            >
              Insert
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Async image uploader ─────────────────────────────────────────────────────

async function uploadImage(
  uploadImageAction,
  file,
  setUploadError,
  setIsUploading
) {
  setUploadError('');
  setIsUploading(true);
  try {
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadImageAction(fd);
    if (res?.error) {
      setUploadError(res.error);
      return null;
    }
    if (!res?.url) {
      setUploadError('Upload failed.');
      return null;
    }
    return res.url;
  } catch {
    setUploadError('Upload failed.');
    return null;
  } finally {
    setIsUploading(false);
  }
}

// ─── Custom Image Node View ──────────────────────────────────────────────────

function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  extension,
}) {
  const { src, alt, title, width, alignment } = node.attrs;
  const onDeleteImage = extension?.storage?.onDeleteImageRef?.current;
  const [editingAlt, setEditingAlt] = useState(false);
  const [altValue, setAltValue] = useState(alt || '');
  const [isDragging, setIsDragging] = useState(false);
  const wrapRef = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    setAltValue(alt || '');
  }, [alt]);

  // Close alt editor on outside click
  useEffect(() => {
    if (!editingAlt) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        updateAttributes({ alt: altValue });
        setEditingAlt(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingAlt, altValue, updateAttributes]);

  // Drag-to-resize
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const delta = e.clientX - startX.current;
      const parentWidth = wrapRef.current?.parentElement?.offsetWidth || 1;
      const newWidth = Math.max(
        60,
        Math.min(parentWidth, startWidth.current + delta)
      );
      const pct = Math.round((newWidth / parentWidth) * 100);
      updateAttributes({ width: `${pct}%` });
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateAttributes]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startX.current = e.clientX;
    startWidth.current = wrapRef.current?.offsetWidth || 0;
  };

  const sizes = [
    { label: '25%', value: '25%' },
    { label: '50%', value: '50%' },
    { label: '75%', value: '75%' },
    { label: 'Full', value: '100%' },
  ];

  return (
    <NodeViewWrapper
      className={`my-4 ${
        alignment === 'left'
          ? 'flex justify-start'
          : alignment === 'right'
            ? 'flex justify-end'
            : 'flex justify-center'
      }`}
    >
      <div
        ref={wrapRef}
        className="group relative inline-block"
        style={{ width: width || '100%', maxWidth: '100%' }}
      >
        <img
          src={src}
          alt={alt || ''}
          title={title}
          draggable={false}
          className={`h-auto w-full rounded-xl transition-all duration-200 ${
            selected
              ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-950'
              : 'ring-0 group-hover:ring-1 group-hover:ring-white/20'
          }`}
        />

        {/* Floating toolbar on selection */}
        {selected && (
          <div className="absolute -top-11 left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-white/15 bg-gray-900/95 px-1.5 py-1 whitespace-nowrap shadow-2xl backdrop-blur-xl">
            {/* Size presets */}
            {sizes.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => updateAttributes({ width: s.value })}
                className={`rounded px-2 py-1 text-[10px] font-semibold transition-all ${
                  width === s.value
                    ? 'bg-blue-500/25 text-blue-400'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
            <div className="mx-0.5 h-4 w-px bg-white/10" />
            {/* Alignment */}
            {[
              { key: 'left', Icon: AlignLeft },
              { key: 'center', Icon: AlignCenter },
              { key: 'right', Icon: AlignRight },
            ].map(({ key, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => updateAttributes({ alignment: key })}
                className={`rounded p-1.5 transition-all ${
                  alignment === key
                    ? 'bg-blue-500/25 text-blue-400'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
            <div className="mx-0.5 h-4 w-px bg-white/10" />
            {/* Alt text */}
            <button
              type="button"
              onClick={() => setEditingAlt(!editingAlt)}
              title="Edit alt text"
              className={`rounded p-1.5 transition-all ${
                editingAlt
                  ? 'bg-blue-500/25 text-blue-400'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
            </button>
            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                if (onDeleteImage && src) {
                  onDeleteImage(src);
                }
                deleteNode();
              }}
              title="Delete image"
              className="rounded p-1.5 text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Alt text editor */}
        {editingAlt && selected && (
          <div className="absolute -bottom-12 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-gray-900/95 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
              <input
                value={altValue}
                onChange={(e) => setAltValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateAttributes({ alt: altValue });
                    setEditingAlt(false);
                  }
                }}
                placeholder="Alt text…"
                className="w-48 border-0 bg-transparent text-xs text-gray-200 outline-none placeholder:text-gray-600"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  updateAttributes({ alt: altValue });
                  setEditingAlt(false);
                }}
                className="rounded p-1 text-green-400 hover:bg-green-500/10"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Drag-to-resize handle */}
        {selected && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute right-0 bottom-0 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-tl-lg bg-blue-500/80 opacity-0 transition-opacity group-hover:opacity-100"
            title="Drag to resize"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-white">
              <path
                d="M7 1v6H1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}

        {/* Size badge */}
        {selected && width && width !== '100%' && (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/60 backdrop-blur-sm">
            {width}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ─── Custom Image Extension with resize & alignment ─────────────────────────

const ResizableImage = ImageExtension.extend({
  addOptions() {
    return {
      ...this.parent?.(),
    };
  },
  addStorage() {
    return {
      onDeleteImageRef: { current: null },
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (el) => el.style.width || el.getAttribute('width') || '100%',
        renderHTML: (attributes) => {
          const w = attributes.width || '100%';
          const align = attributes.alignment || 'center';
          if (align === 'left') {
            return {
              style: `width: ${w}; float: left; margin: 0.75rem 1.5rem 1rem 0;`,
            };
          }
          if (align === 'right') {
            return {
              style: `width: ${w}; float: right; margin: 0.75rem 0 1rem 1.5rem;`,
            };
          }
          return {
            style: `width: ${w}; display: block; margin-left: auto; margin-right: auto;`,
          };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-alignment') || 'center',
        renderHTML: (attributes) => ({
          'data-alignment': attributes.alignment,
        }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing your blog post…',
  uploadImageAction,
  onDeleteImage,
  uploadedUrlsRef,
  containedFullscreen = false,
  fullscreenContainerRef,
}) {
  const lastEmittedRef = useRef(value || '');
  const onDeleteImageRef = useRef(onDeleteImage);
  onDeleteImageRef.current = onDeleteImage;
  const internalUploadedUrlsRef = useRef([]);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [showCodeLang, setShowCodeLang] = useState(false);
  const savedCodeLangPos = useRef(null);

  // Floating UI for Code Language
  const { refs: langRefs, floatingStyles: langStyles } = useFloating({
    open: showCodeLang,
    onOpenChange: setShowCodeLang,
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Floating UI for Color Picker
  const { refs: colorRefs, floatingStyles: colorStyles } = useFloating({
    open: showColorPicker,
    onOpenChange: setShowColorPicker,
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Floating UI for Link Popover
  const { refs: linkRefs, floatingStyles: linkStyles } = useFloating({
    open: showLinkPopover,
    onOpenChange: setShowLinkPopover,
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e) => {
      if (
        colorRefs.reference.current &&
        !colorRefs.reference.current.contains(e.target) &&
        colorRefs.floating.current &&
        !colorRefs.floating.current.contains(e.target)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker, colorRefs.reference, colorRefs.floating]);

  // Close code language dropdown on outside click
  useEffect(() => {
    if (!showCodeLang) return;
    const handler = (e) => {
      if (
        langRefs.reference.current &&
        !langRefs.reference.current.contains(e.target) &&
        langRefs.floating.current &&
        !langRefs.floating.current.contains(e.target)
      ) {
        setShowCodeLang(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCodeLang, langRefs.reference, langRefs.floating]);

  // Close link popover on outside click
  useEffect(() => {
    if (!showLinkPopover) return;
    const handler = (e) => {
      if (
        linkRefs.reference.current &&
        !linkRefs.reference.current.contains(e.target) &&
        linkRefs.floating.current &&
        !linkRefs.floating.current.contains(e.target)
      ) {
        setShowLinkPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLinkPopover, linkRefs.reference, linkRefs.floating]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        horizontalRule: true,
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-blue-400 underline underline-offset-2 cursor-pointer',
          rel: 'noopener noreferrer',
        },
      }),
      ResizableImage.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-xl max-w-full h-auto',
          loading: 'lazy',
        },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
      CharacterCount,
      Typography,
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'tiptap-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'tiptap-editor-content prose prose-invert max-w-none focus:outline-none',
      },
      handleDrop: (view, event) => {
        const dt = event.dataTransfer;
        if (!dt?.files?.length) return false;
        const file = Array.from(dt.files).find((f) =>
          (f.type || '').startsWith('image/')
        );
        if (!file) return false;

        event.preventDefault();
        const coords = { left: event.clientX, top: event.clientY };
        const pos = view.posAtCoords(coords)?.pos;

        void (async () => {
          if (!uploadImageAction) return;
          const url = await uploadImage(
            uploadImageAction,
            file,
            setUploadError,
            setIsUploading
          );
          if (!url) return;
          internalUploadedUrlsRef.current.push(url);
          editor
            ?.chain()
            .focus()
            .insertContentAt(pos ?? editor.state.selection.from, {
              type: 'image',
              attrs: { src: url, alt: file.name || 'image' },
            })
            .run();
        })();
        return true;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items?.length) return false;
        const imageItem = Array.from(items).find((i) =>
          i.type?.startsWith('image/')
        );
        if (!imageItem) return false;

        const file = imageItem.getAsFile();
        if (!file) return false;
        event.preventDefault();

        void (async () => {
          if (!uploadImageAction) return;
          const url = await uploadImage(
            uploadImageAction,
            file,
            setUploadError,
            setIsUploading
          );
          if (!url) return;
          internalUploadedUrlsRef.current.push(url);
          editor
            ?.chain()
            .focus()
            .setImage({ src: url, alt: file.name || 'image' })
            .run();
        })();
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ensureHeadingIds(ed.getHTML());
      lastEmittedRef.current = html;
      onChange?.(html);
    },
  });

  // Sync when external value changes (e.g. opening edit modal)
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    const current = lastEmittedRef.current || '';
    if (incoming !== current && incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, false);
      lastEmittedRef.current = incoming;
    }
  }, [editor, value]);

  // Expose uploaded URLs to parent via ref
  useEffect(() => {
    if (uploadedUrlsRef) {
      uploadedUrlsRef.current = internalUploadedUrlsRef.current;
    }
  });

  // Keep the onDeleteImage ref in extension storage in sync
  useEffect(() => {
    if (!editor) return;
    const ext = editor.extensionManager.extensions.find(
      (e) => e.name === 'image'
    );
    if (ext?.storage) {
      ext.storage.onDeleteImageRef = onDeleteImageRef;
    }
  }, [editor]);

  // Handle image upload from dialog
  const handleDialogUpload = useCallback(
    async (file, altText) => {
      if (!editor || !uploadImageAction) return;
      const url = await uploadImage(
        uploadImageAction,
        file,
        setUploadError,
        setIsUploading
      );
      if (!url) return;
      internalUploadedUrlsRef.current.push(url);
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: altText || file.name || 'image' })
        .run();
      setShowImageDialog(false);
    },
    [editor, uploadImageAction]
  );

  // Handle image insert from URL
  const handleInsertImageUrl = useCallback(
    (url, altText) => {
      if (!editor || !url) return;
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: altText || 'image' })
        .run();
    },
    [editor]
  );

  // Toggle link
  const handleLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      setShowLinkPopover(true);
    } else {
      const { from, to } = editor.state.selection;
      if (from === to) {
        const url = window.prompt('Enter URL', 'https://');
        if (!url?.trim()) return;
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url.trim()}">${url.trim()}</a>`)
          .run();
      } else {
        setShowLinkPopover(true);
      }
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex min-h-75 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
          Loading editor…
        </div>
      </div>
    );
  }

  const words = editor.storage.characterCount.words();
  const chars = editor.storage.characterCount.characters();

  const usePortal =
    isFullscreen && containedFullscreen && fullscreenContainerRef?.current;

  const editorBlock = (
    <div
      className={`rich-text-editor min-w-0 w-full rounded-xl border border-white/10 bg-gray-950 transition-all ${
        isFullscreen
          ? containedFullscreen
            ? 'absolute inset-0 z-40 flex flex-col rounded-none border-0'
            : 'fixed inset-0 z-100 rounded-none border-0'
          : ''
      }`}
    >
      {/* ── Toolbar ─── */}
      <div className="border-b border-white/8">
        <div className="flex items-center bg-gray-950/90 backdrop-blur-xl">
          {/* Scrollable editing tools */}
          <div className="scrollbar-thin scrollbar-track-gray-900/50 scrollbar-thumb-gray-700/60 hover:scrollbar-thumb-gray-600/80 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-2 py-1.5">
            {/* History */}
            <ToolbarGroup>
              <ToolbarButton
                title="Undo (Ctrl+Z)"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
              >
                <Undo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Redo (Ctrl+Shift+Z)"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
              >
                <Redo2 className="h-4 w-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Text formatting */}
            <ToolbarGroup>
              <ToolbarButton
                title="Bold (Ctrl+B)"
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
              >
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Italic (Ctrl+I)"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
              >
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Underline (Ctrl+U)"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive('underline')}
              >
                <UnderlineIcon className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Strikethrough"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive('strike')}
              >
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Subscript"
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                active={editor.isActive('subscript')}
              >
                <SubscriptIcon className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Superscript"
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                active={editor.isActive('superscript')}
              >
                <SuperscriptIcon className="h-4 w-4" />
              </ToolbarButton>

              {/* Code Block */}
              <div className="relative">
                <ToolbarButton
                  ref={langRefs.setReference}
                  title="Code block"
                  onClick={() => {
                    if (editor.isActive('codeBlock')) {
                      editor.chain().focus().toggleCodeBlock().run();
                    } else {
                      savedCodeLangPos.current = editor.state.selection.from;
                      setShowCodeLang((v) => !v);
                    }
                  }}
                  active={editor.isActive('codeBlock')}
                >
                  <Code2 className="h-4 w-4" />
                </ToolbarButton>
                {showCodeLang && createPortal(
                  <div
                    ref={langRefs.setFloating}
                    style={langStyles}
                    className="z-100 max-h-60 w-44 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1117] py-1 shadow-xl"
                  >
                    {[
                      ['plaintext', 'Plain Text'],
                      ['javascript', 'JavaScript'],
                      ['typescript', 'TypeScript'],
                      ['python', 'Python'],
                      ['cpp', 'C++'],
                      ['c', 'C'],
                      ['java', 'Java'],
                      ['html', 'HTML'],
                      ['css', 'CSS'],
                      ['json', 'JSON'],
                      ['bash', 'Bash'],
                      ['sql', 'SQL'],
                      ['go', 'Go'],
                      ['rust', 'Rust'],
                      ['php', 'PHP'],
                      ['ruby', 'Ruby'],
                      ['swift', 'Swift'],
                      ['kotlin', 'Kotlin'],
                      ['yaml', 'YAML'],
                      ['markdown', 'Markdown'],
                      ['jsx', 'JSX'],
                      ['tsx', 'TSX'],
                      ['scss', 'SCSS'],
                      ['dockerfile', 'Dockerfile'],
                      ['csharp', 'C#'],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className="block w-full px-3 py-1.5 text-left text-xs text-gray-300 transition-colors hover:bg-white/8 hover:text-white"
                        onClick={() => {
                          const lang = val === 'plaintext' ? '' : val;
                          const pos = savedCodeLangPos.current;
                          editor
                            .chain()
                            .focus(pos !== null ? pos : undefined)
                            .setCodeBlock({ language: lang })
                            .run();
                          savedCodeLangPos.current = null;
                          setShowCodeLang(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Color & Highlight */}
            <ToolbarGroup>
              <div className="relative">
                <button
                  ref={colorRefs.setReference}
                  type="button"
                  title="Text color"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className={`inline-flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-0.75 rounded text-sm transition-all duration-150 ${
                    showColorPicker
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-gray-400 hover:bg-white/8 hover:text-gray-100'
                  }`}
                >
                  <Palette className="h-3.5 w-3.5" />
                  <div
                    className="h-[2.5px] w-3.5 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        editor.getAttributes('textStyle').color ||
                        'rgba(255,255,255,0.18)',
                    }}
                  />
                </button>
                {showColorPicker && createPortal(
                  <div
                    ref={colorRefs.setFloating}
                    style={colorStyles}
                    className="z-100 mt-1"
                  >
                    <ColorPicker
                      editor={editor}
                      onClose={() => setShowColorPicker(false)}
                    />
                  </div>,
                  document.body
                )}
              </div>
              <ToolbarButton
                title="Highlight text"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                active={editor.isActive('highlight')}
              >
                <Highlighter className="h-4 w-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarGroup>
              <ToolbarButton
                title="Heading 1"
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                active={editor.isActive('heading', { level: 1 })}
              >
                <Heading1 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Heading 2"
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                active={editor.isActive('heading', { level: 2 })}
              >
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Heading 3"
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                active={editor.isActive('heading', { level: 3 })}
              >
                <Heading3 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Heading 4"
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 4 }).run()
                }
                active={editor.isActive('heading', { level: 4 })}
              >
                <Heading4 className="h-4 w-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Alignment */}
            <ToolbarGroup>
              <ToolbarButton
                title="Align left"
                onClick={() =>
                  editor.chain().focus().setTextAlign('left').run()
                }
                active={editor.isActive({ textAlign: 'left' })}
              >
                <AlignLeft className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Align center"
                onClick={() =>
                  editor.chain().focus().setTextAlign('center').run()
                }
                active={editor.isActive({ textAlign: 'center' })}
              >
                <AlignCenter className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Align right"
                onClick={() =>
                  editor.chain().focus().setTextAlign('right').run()
                }
                active={editor.isActive({ textAlign: 'right' })}
              >
                <AlignRight className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Justify"
                onClick={() =>
                  editor.chain().focus().setTextAlign('justify').run()
                }
                active={editor.isActive({ textAlign: 'justify' })}
              >
                <AlignJustify className="h-4 w-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarGroup>
              <ToolbarButton
                title="Bullet list"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
              >
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Ordered list"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Task list"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                active={editor.isActive('taskList')}
              >
                <ListTodo className="h-4 w-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Blocks */}
            <ToolbarGroup>
              <ToolbarButton
                title="Blockquote"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive('blockquote')}
              >
                <Quote className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                title="Horizontal rule"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
              >
                <Minus className="h-4 w-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Table & Media */}
            <ToolbarGroup>
              <ToolbarButton
                title={
                  editor.isActive('table')
                    ? 'Cursor is inside a table'
                    : 'Insert table (3×3)'
                }
                onClick={() => {
                  if (!editor.isActive('table')) {
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run();
                  }
                }}
                active={editor.isActive('table')}
              >
                <TableIcon className="h-4 w-4" />
              </ToolbarButton>
              <div className="relative">
                <button
                  ref={linkRefs.setReference}
                  type="button"
                  title="Insert / edit link"
                  onClick={handleLink}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm transition-all duration-150 ${
                    editor.isActive('link')
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-gray-400 hover:bg-white/8 hover:text-gray-100'
                  }`}
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
                {showLinkPopover && createPortal(
                  <div
                    ref={linkRefs.setFloating}
                    style={linkStyles}
                    className="z-100 mt-1"
                  >
                    <LinkPopover
                      editor={editor}
                      onClose={() => setShowLinkPopover(false)}
                    />
                  </div>,
                  document.body
                )}
              </div>
              {editor.isActive('link') && (
                <ToolbarButton
                  title="Remove link"
                  onClick={() => editor.chain().focus().unsetLink().run()}
                >
                  <Unlink className="h-4 w-4" />
                </ToolbarButton>
              )}
              <ToolbarButton
                title="Insert image"
                onClick={() => setShowImageDialog(true)}
                disabled={!uploadImageAction}
              >
                <ImagePlus className="h-4 w-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Utility */}
            <ToolbarGroup>
              <ToolbarButton
                title="Clear all formatting"
                onClick={() =>
                  editor.chain().focus().clearNodes().unsetAllMarks().run()
                }
              >
                <Eraser className="h-4 w-4" />
              </ToolbarButton>
            </ToolbarGroup>
          </div>

          {/* Fixed right: view controls */}
          <div className="flex shrink-0 items-center gap-0.5 border-l border-white/8 px-2 py-1.5">
            <ToolbarButton
              title={showPreview ? 'Back to editing' : 'Preview content'}
              onClick={() => {
                setShowPreview(!showPreview);
                if (!showPreview) setShowRawHtml(false);
              }}
              active={showPreview}
            >
              {showPreview ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </ToolbarButton>
            <ToolbarButton
              title={showRawHtml ? 'Visual editor' : 'Raw HTML'}
              onClick={() => {
                setShowRawHtml(!showRawHtml);
                if (!showRawHtml) setShowPreview(false);
              }}
              active={showRawHtml}
            >
              <Code className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
              onClick={() => setIsFullscreen(!isFullscreen)}
              active={isFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </ToolbarButton>
          </div>
        </div>

        {/* Table context bar — slides in when cursor is inside a table */}
        {editor.isActive('table') && <TableContextBar editor={editor} />}
      </div>

      {/* ── Editor / Preview Area ──────────────────────────────────────────── */}
      <div
        className={`relative overflow-y-auto ${
          isFullscreen
            ? containedFullscreen
              ? 'min-h-0 flex-1'
              : 'h-[calc(100vh-88px)]'
            : 'min-h-87.5 max-h-[800px]'
        }`}
      >
        {showPreview ? (
          <div className="prose prose-invert max-w-none p-6">
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
            />
          </div>
        ) : showRawHtml ? (
          <textarea
            value={editor.getHTML()}
            onChange={(e) => {
              const html = e.target.value;
              editor.commands.setContent(html, false);
              const processed = ensureHeadingIds(html);
              lastEmittedRef.current = processed;
              onChange?.(processed);
            }}
            spellCheck={false}
            className={`w-full resize-none border-0 bg-transparent p-4 font-mono text-xs leading-relaxed text-emerald-300 outline-none placeholder:text-gray-600 ${
              isFullscreen ? 'h-full' : 'min-h-87.5'
            }`}
            placeholder="<p>Enter raw HTML here…</p>"
          />
        ) : (
          <EditorContent editor={editor} />
        )}

        {/* Upload overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900/90 px-5 py-3 shadow-2xl">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm font-medium text-gray-300">
                Uploading image…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/8 bg-gray-950/60 px-3 py-1.5 text-[11px] text-gray-500">
        <div className="flex items-center gap-3">
          <span>
            {words} {words === 1 ? 'word' : 'words'}
          </span>
          <span className="text-gray-700">·</span>
          <span>{chars} characters</span>
          <span className="text-gray-700">·</span>
          <span>~{Math.max(1, Math.round(words / 200))} min read</span>
        </div>
        <div className="flex items-center gap-2">
          {uploadError && <span className="text-red-400">{uploadError}</span>}
          {!showPreview && (
            <span className="hidden text-gray-600 sm:inline">
              Drag & drop images · Paste from clipboard
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const imageDialog = showImageDialog ? (
    <ImageDialog
      uploading={isUploading}
      onInsert={handleInsertImageUrl}
      onUpload={handleDialogUpload}
      onClose={() => setShowImageDialog(false)}
    />
  ) : null;

  if (usePortal) {
    return (
      <>
        {createPortal(editorBlock, fullscreenContainerRef.current)}
        {imageDialog}
      </>
    );
  }

  return (
    <>
      {editorBlock}
      {imageDialog}
    </>
  );
}
