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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto w-full pt-8 px-8 pb-16">
      {/* Breadcrumb + title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link
              href="/account/admin/bootcamps"
              className="hover:text-indigo-600 transition-colors"
            >
              Learning Paths
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-700">{bootcampData.title || 'New Track'}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              {bootcampData.title || 'New Track'}
            </h1>
            <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded border border-gray-200 uppercase tracking-wider">
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {bootcampData.status === 'published' && (
            <a
              href={`/bootcamps/${bootcampData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium px-5 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-semibold px-5 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
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
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">
                Basic Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Track Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-base text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Subtitle / Short Description
                  </label>
                  <input
                    type="text"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-base text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">
                About this Track
              </h2>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={10}
                placeholder="Write a detailed description of this bootcamp..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                Status
              </h3>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-indigo-400"
              >
                {BOOTCAMP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {getStatusConfig(s)?.label ?? s}
                  </option>
                ))}
              </select>
            </div>

            {/* Thumbnail */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
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
              <p className="text-xs text-gray-400 mt-3 text-center">
                Recommended size: 1200×630px. Max 5MB.
              </p>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">
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
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400 pr-8"
                    >
                      <option value="Web Development">Web Development</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Mobile App Dev">Mobile App Dev</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400 pr-8"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">
                    Slug
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">/bootcamps/</span>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
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
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Enrollment Settings
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Manage how club members can join this learning path.
              </p>
              <div className="space-y-3">
                <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="enrollment_type"
                    value="open"
                    defaultChecked
                    className="mt-1 text-indigo-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Open Enrollment
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Anyone can join instantly.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="enrollment_type"
                    value="application"
                    className="mt-1 text-indigo-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Invite Only
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Members must be manually approved.
                    </div>
                  </div>
                </label>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Schedule
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Max Students
                </label>
                <input
                  type="number"
                  name="max_students"
                  value={formData.max_students}
                  onChange={handleChange}
                  min="1"
                  placeholder="Leave empty for unlimited"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 placeholder:text-gray-400"
                />
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Batch Info
                </label>
                <input
                  type="text"
                  name="batch_info"
                  value={formData.batch_info}
                  onChange={handleChange}
                  placeholder="e.g., Batch 5 - Spring 2026"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 placeholder:text-gray-400"
                />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-red-50 rounded-xl border border-red-200 p-6">
              <h2 className="text-base font-semibold text-red-600 mb-2">
                Danger Zone
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Irreversible actions for this learning path.
              </p>
              <button className="w-full bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-between">
                Delete Permanently
                <span className="text-base">🗑</span>
              </button>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                Featured
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">Show on homepage</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-amber-400 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
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
    </div>
  );
}
