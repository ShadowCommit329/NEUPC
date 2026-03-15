/**
 * @file Stage & Item Builder for roadmap content authoring.
 * Generates structured JSON roadmap content: { stages: [ { title, goal?, items: [...] } ] }
 * Supports both visual builder and raw JSON editor modes.
 *
 * @module StageBuilder
 */

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Code2,
} from 'lucide-react';

/**
 * StageBuilder Component
 * Allows admins to create structured roadmap content (stages + items).
 * Supports visual builder mode and raw JSON editor mode.
 *
 * @param {{ value: string, onChange: Function }} props
 */
export default function StageBuilder({ value, onChange }) {
  const [mode, setMode] = useState('visual'); // 'visual' or 'json'
  let stages = [];

  // Parse existing value if it's a JSON string
  if (value && typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      stages = parsed.stages || [];
    } catch {
      // If it's not valid JSON, start fresh
      stages = [];
    }
  }

  const [editingStages, setEditingStages] = useState(stages);
  const [expandedIdx, setExpandedIdx] = useState(new Set([0]));
  const [jsonText, setJsonText] = useState(value || '{"stages":[]}');

  // Sync JSON when switching modes
  const switchToJson = () => {
    const content = { stages: editingStages.filter((s) => s.title?.trim()) };
    setJsonText(JSON.stringify(content, null, 2));
    setMode('json');
  };

  const switchToVisual = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const validStages = (parsed.stages || []).filter((s) => s.title?.trim());
      setEditingStages(validStages);
      setMode('visual');
    } catch (err) {
      alert('Invalid JSON. Please fix the syntax before switching views.');
    }
  };

  const loadDemo = () => {
    const demoContent = {
      stages: [
        {
          title: 'Fundamentals',
          goal: 'Master the core concepts',
          items: [
            {
              title: 'Variables & Data Types',
              description:
                'Learn about variable declaration and primitive data types',
              type: 'article',
              link: 'https://example.com/intro',
            },
            {
              title: 'Introduction Video',
              description: 'Watch a quick intro to get started',
              type: 'video',
              link: 'https://youtube.com/example',
            },
            {
              title: 'Setup Guide',
              description: 'Install tools and configure your environment',
              type: 'documentation',
              link: 'https://docs.example.com/setup',
            },
          ],
          resources: [
            {
              title: 'MDN Docs',
              url: 'https://mdn.org',
              type: 'documentation',
            },
            {
              title: 'Tutorial',
              url: 'https://tutorials.example.com',
              type: 'course',
            },
          ],
        },
        {
          title: 'Intermediate Concepts',
          goal: 'Build practical projects',
          items: [
            {
              title: 'Functions & Closures',
              description: 'Understand function scope and closures',
              type: 'article',
              link: 'https://example.com/functions',
            },
            {
              title: 'Project: Calculator',
              description: 'Build a simple calculator app',
              type: 'project',
              link: 'https://projects.example.com/calculator',
            },
          ],
          resources: [
            {
              title: 'Code Examples',
              url: 'https://github.com/example',
              type: 'tool',
            },
            {
              title: 'Video Series',
              url: 'https://youtube.com/playlist',
              type: 'video',
            },
          ],
        },
        {
          title: 'Advanced Topics',
          goal: 'Master optimization and patterns',
          items: [
            {
              title: 'Design Patterns',
              description: 'Learn common design patterns and best practices',
              type: 'article',
            },
            {
              title: 'Performance Optimization',
              description:
                'Techniques to optimize code and improve performance',
              type: 'course',
              link: 'https://courses.example.com/perf',
            },
          ],
        },
      ],
    };
    setJsonText(JSON.stringify(demoContent, null, 2));
    setMode('json');
  };

  const syncJsonToValue = (jsonStr) => {
    setJsonText(jsonStr);
    onChange(jsonStr);
  };

  const saveFromVisual = () => {
    const content = { stages: editingStages.filter((s) => s.title?.trim()) };
    onChange(JSON.stringify(content));
  };

  const addStage = () => {
    const newStage = {
      title: `Stage ${editingStages.length + 1}`,
      goal: '',
      items: [],
    };
    const updated = [...editingStages, newStage];
    setEditingStages(updated);
    saveToValue(updated);
  };

  const removeStage = (idx) => {
    const updated = editingStages.filter((_, i) => i !== idx);
    setEditingStages(updated);
    saveToValue(updated);
  };

  const updateStage = (idx, field, val) => {
    const updated = editingStages.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    setEditingStages(updated);
    saveToValue(updated);
  };

  const addItem = (stageIdx) => {
    const updated = editingStages.map((s, i) =>
      i === stageIdx
        ? {
            ...s,
            items: [
              ...(s.items || []),
              { title: 'New Topic', type: 'article' },
            ],
          }
        : s
    );
    setEditingStages(updated);
    saveToValue(updated);
  };

  const removeItem = (stageIdx, itemIdx) => {
    const updated = editingStages.map((s, i) =>
      i === stageIdx
        ? { ...s, items: s.items?.filter((_, j) => j !== itemIdx) || [] }
        : s
    );
    setEditingStages(updated);
    saveToValue(updated);
  };

  const updateItem = (stageIdx, itemIdx, field, val) => {
    const updated = editingStages.map((s, i) =>
      i === stageIdx
        ? {
            ...s,
            items: (s.items || []).map((itm, j) =>
              j === itemIdx ? { ...itm, [field]: val } : itm
            ),
          }
        : s
    );
    setEditingStages(updated);
    saveToValue(updated);
  };

  const saveToValue = (stages) => {
    const content = { stages: stages.filter((s) => s.title?.trim()) };
    onChange(JSON.stringify(content));
  };

  const toggleExpanded = (idx) => {
    setExpandedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            mode === 'visual' ? switchToJson() : switchToVisual()
          }
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
            mode === 'visual'
              ? 'border border-blue-500/40 bg-blue-500/15 text-blue-300'
              : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          {mode === 'visual' ? '📋 Visual Builder' : '📋 Visual Builder'}
        </button>
        <button
          type="button"
          onClick={() => (mode === 'json' ? switchToVisual() : switchToJson())}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
            mode === 'json'
              ? 'border border-purple-500/40 bg-purple-500/15 text-purple-300'
              : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Code2 className="h-3.5 w-3.5" /> JSON Editor
        </button>
      </div>

      {/* Visual Builder Mode */}
      {mode === 'visual' && (
        <div className="space-y-3">
          {/* Stages */}
          {editingStages.map((stage, stageIdx) => {
            const isExpanded = expandedIdx.has(stageIdx);
            const items = stage.items || [];
            return (
              <div
                key={stageIdx}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
              >
                {/* Stage Header */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(stageIdx)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/8"
                >
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={stage.title}
                      onChange={(e) =>
                        updateStage(stageIdx, 'title', e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Stage title"
                      className="mb-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white placeholder-gray-600 outline-none focus:border-blue-500/40"
                    />
                    <input
                      type="text"
                      value={stage.goal || ''}
                      onChange={(e) =>
                        updateStage(stageIdx, 'goal', e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Optional: stage goal"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400 placeholder-gray-600 outline-none focus:border-blue-500/40"
                    />
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Stage Items */}
                {isExpanded && (
                  <div className="space-y-2 border-t border-white/10 bg-white/3 px-4 py-3">
                    {items.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-600">
                        No items yet. Add one to get started.
                      </p>
                    ) : (
                      items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/2 p-2.5"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) =>
                                updateItem(
                                  stageIdx,
                                  itemIdx,
                                  'title',
                                  e.target.value
                                )
                              }
                              placeholder="Item title"
                              className="w-full rounded-lg border border-white/8 bg-white/4 px-2.5 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/40"
                            />
                            <textarea
                              value={item.description || ''}
                              onChange={(e) =>
                                updateItem(
                                  stageIdx,
                                  itemIdx,
                                  'description',
                                  e.target.value
                                )
                              }
                              placeholder="Optional description"
                              className="w-full resize-none rounded-lg border border-white/8 bg-white/4 px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/40"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={item.type || 'article'}
                                onChange={(e) =>
                                  updateItem(
                                    stageIdx,
                                    itemIdx,
                                    'type',
                                    e.target.value
                                  )
                                }
                                placeholder="Type (article, video, etc.)"
                                className="flex-1 rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-xs text-gray-400 placeholder-gray-600 outline-none focus:border-blue-500/40"
                              />
                              <input
                                type="text"
                                value={item.link || ''}
                                onChange={(e) =>
                                  updateItem(
                                    stageIdx,
                                    itemIdx,
                                    'link',
                                    e.target.value
                                  )
                                }
                                placeholder="URL (optional)"
                                className="flex-1 rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-xs text-gray-400 placeholder-gray-600 outline-none focus:border-blue-500/40"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(stageIdx, itemIdx)}
                            className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}

                    {/* Add Item Button */}
                    <button
                      type="button"
                      onClick={() => addItem(stageIdx)}
                      className="w-full rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-blue-500/40 hover:text-blue-300"
                    >
                      <Plus className="mr-1 inline h-3.5 w-3.5" /> Add Item
                    </button>
                  </div>
                )}

                {/* Remove Stage Button */}
                <div className="flex justify-end border-t border-white/10 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => removeStage(stageIdx)}
                    className="text-xs text-gray-600 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Remove Stage
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Stage Button */}
          <button
            type="button"
            onClick={addStage}
            className="w-full rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-blue-500/40 hover:text-blue-300"
          >
            <Plus className="mr-2 inline h-4 w-4" /> Add Stage
          </button>

          <p className="mt-2 text-xs text-gray-600">
            💡 Visual mode: Build stages step-by-step. Switch to JSON editor to
            paste or write code.
          </p>
        </div>
      )}

      {/* JSON Editor Mode */}
      {mode === 'json' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadDemo}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              📋 Load Demo Example
            </button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => syncJsonToValue(e.target.value)}
            placeholder={`{"stages": [{"title": "Fundamentals", "goal": "Learn the basics", "items": [{"title": "Variables", "type": "article", "link": "https://..."}], "resources": [{"title": "Docs", "url": "https://...", "type": "documentation"}]}]}`}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-gray-300 placeholder-gray-700 outline-none focus:border-blue-500/40"
            rows={12}
          />
          <p className="text-xs text-gray-600">
            📝 JSON format:{' '}
            <code className="rounded bg-white/5 px-1.5 py-0.5">
              {
                '{ stages: [{ title, goal?, items: [{ title, description?, type?, link? }], resources?: [{title, url, type?}] }] }'
              }
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
