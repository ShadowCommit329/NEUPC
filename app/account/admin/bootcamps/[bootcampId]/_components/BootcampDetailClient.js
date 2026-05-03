'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  Save,
  Loader2,
  Users,
  Settings,
  LayoutList,
  Eye,
  CloudUpload,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import CurriculumBuilder from '../../_components/CurriculumBuilder';
import EnrollmentsTab from './EnrollmentsTab';
import ThumbnailUploader from '../../_components/ThumbnailUploader';
import { getStatusConfig, BOOTCAMP_STATUSES } from '../../_components/bootcampConfig';
import { updateBootcamp } from '@/app/_lib/bootcamp-actions';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'details', label: 'General Details' },
  { key: 'curriculum', label: 'Curriculum', icon: LayoutList },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'enrollments', label: 'Enrollments', icon: Users },
];

export default function BootcampDetailClient({ bootcamp }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [bootcampData, setBootcampData] = useState(bootcamp);

  const [formData, setFormData] = useState({
    title: bootcamp.title || '',
    slug: bootcamp.slug || '',
    description: bootcamp.description || '',
    thumbnail: bootcamp.thumbnail || '',
    price: bootcamp.price || 0,
    status: bootcamp.status || 'draft',
    batch_info: bootcamp.batch_info || '',
    start_date: bootcamp.start_date || '',
    end_date: bootcamp.end_date || '',
    max_students: bootcamp.max_students || '',
    is_featured: bootcamp.is_featured || false,
    category: bootcamp.category || 'Web Development',
    difficulty: bootcamp.difficulty || 'Beginner',
    subtitle: bootcamp.subtitle || '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          fd.append(key, String(value));
        }
      });
      const updated = await updateBootcamp(bootcamp.id, fd);
      setBootcampData((prev) => ({ ...prev, ...updated }));
      toast.success('Saved successfully.');
      router.refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCoursesChange = useCallback((courses) => {
    setBootcampData((prev) => ({ ...prev, courses }));
  }, []);

  const statusLabel = getStatusConfig(bootcampData.status)?.label ?? bootcampData.status;

  return (
    <div className="p-6 md:p-8 pt-10 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb + title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>

          <div className="flex items-center gap-3">
            <h1 className="kinetic-headline text-3xl font-bold text-white">
              {bootcampData.title || 'New Track'}
            </h1>
            <span className="bg-violet-500/10 text-violet-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-violet-500/20 uppercase tracking-wider">
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {bootcampData.status === 'published' && (
            <a
              href={`/account/member/bootcamps/preview/${bootcampData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(124,92,255,0.4)] transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex gap-8 -mb-px overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* GENERAL DETAILS TAB */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="glass-panel holographic-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-5">
                Basic Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Track Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Subtitle / Short Description
                  </label>
                  <input
                    type="text"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass-panel holographic-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-5">
                About this Track
              </h2>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={10}
                placeholder="Write a detailed description of this bootcamp..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-y focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="glass-panel holographic-card rounded-2xl p-6">
              <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Status
              </h3>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                style={{ colorScheme: 'dark' }}
              >
                {BOOTCAMP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {getStatusConfig(s)?.label ?? s}
                  </option>
                ))}
              </select>
            </div>

            {/* Thumbnail */}
            <div className="glass-panel holographic-card rounded-2xl p-6">
              <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Track Thumbnail
              </h3>
              <ThumbnailUploader
                bootcampId={bootcamp.id}
                currentThumbnail={formData.thumbnail}
                onUploadSuccess={(data) => {
                  if (data?.url) {
                    setFormData((prev) => ({ ...prev, thumbnail: data.url }));
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Recommended size: 1200×630px. Max 5MB.
              </p>
            </div>

            {/* Metadata */}
            <div className="glass-panel holographic-card rounded-2xl p-6">
              <h3 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                Metadata
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all pr-8"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="Web Development">Web Development</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Mobile App Dev">Mobile App Dev</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">
                    Difficulty Level
                  </label>
                  <div className="relative">
                    <select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all pr-8"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">
                    Slug
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">/preview/</span>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">
                    Price (BDT)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CURRICULUM TAB */}
      {activeTab === 'curriculum' && (
        <CurriculumBuilder
          bootcampId={bootcamp.id}
          initialCourses={bootcampData.courses || []}
          onCoursesChange={handleCoursesChange}
        />
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="glass-panel holographic-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-1">
                Enrollment Settings
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Manage how club members can join this learning path.
              </p>
              <div className="space-y-4">
                <label className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="enrollment_type"
                    value="open"
                    defaultChecked
                    className="mt-1 text-violet-500 focus:ring-violet-500 bg-white/10 border-transparent"
                  />
                  <div>
                    <div className="text-sm font-bold text-white">
                      Open Enrollment
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Anyone can join instantly.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="enrollment_type"
                    value="application"
                    className="mt-1 text-violet-500 focus:ring-violet-500 bg-white/10 border-transparent"
                  />
                  <div>
                    <div className="text-sm font-bold text-white">
                      Invite Only
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Members must be manually approved.
                    </div>
                  </div>
                </label>
              </div>
            </section>

            <section className="glass-panel holographic-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-5">
                Schedule
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div className="mt-5">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Max Students
                </label>
                <input
                  type="number"
                  name="max_students"
                  value={formData.max_students}
                  onChange={handleChange}
                  min="1"
                  placeholder="Leave empty for unlimited"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-gray-600"
                />
              </div>
              <div className="mt-5">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Batch Info
                </label>
                <input
                  type="text"
                  name="batch_info"
                  value={formData.batch_info}
                  onChange={handleChange}
                  placeholder="e.g., Batch 5 - Spring 2026"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-gray-600"
                />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Settings className="w-24 h-24 text-red-500" />
              </div>
              <h2 className="text-base font-bold text-red-400 mb-2 relative z-10">
                Danger Zone
              </h2>
              <p className="text-sm text-red-300/70 mb-6 relative z-10">
                Irreversible actions for this learning path.
              </p>
              <button className="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 transition-all flex items-center justify-between relative z-10">
                Delete Permanently
                <Trash2 className="h-4 w-4" />
              </button>
            </section>

            <section className="glass-panel holographic-card rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-4">
                Featured
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Show on homepage</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-white/10 peer-checked:bg-amber-500/30 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-gray-400 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-amber-400 border border-white/5" />
                </label>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ENROLLMENTS TAB */}
      {activeTab === 'enrollments' && (
        <EnrollmentsTab bootcampId={bootcamp.id} />
      )}
    </div>
  );
}
