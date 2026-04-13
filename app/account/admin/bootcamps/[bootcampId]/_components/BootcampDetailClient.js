/**
 * @file Bootcamp detail page client component.
 * @module BootcampDetailClient
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  ChevronRight,
  Save,
  Loader2,
  ArrowLeft,
  Eye,
  Users,
  BookOpen,
  Clock,
  DollarSign,
  Calendar,
  Star,
  ExternalLink,
  Settings,
  LayoutList,
} from 'lucide-react';
import CurriculumBuilder from '../../_components/CurriculumBuilder';
import EnrollmentsTab from './EnrollmentsTab';
import {
  getStatusConfig,
  BOOTCAMP_STATUSES,
  formatDuration,
  formatPrice,
  formatDate,
} from '../../_components/bootcampConfig';
import { updateBootcamp } from '@/app/_lib/bootcamp-actions';
import toast from 'react-hot-toast';

// Tab configuration
const TABS = [
  { key: 'curriculum', label: 'Curriculum', icon: LayoutList },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'enrollments', label: 'Enrollments', icon: Users },
];

export default function BootcampDetailClient({ bootcamp }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('curriculum');
  const [saving, setSaving] = useState(false);
  const [bootcampData, setBootcampData] = useState(bootcamp);

  // Form state for settings
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
  });

  const sc = getStatusConfig(bootcampData.status);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveSettings = async () => {
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
      toast.success('Settings saved');
      router.refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCoursesChange = useCallback((courses) => {
    setBootcampData((prev) => ({ ...prev, courses }));
  }, []);

  return (
    <div className="mx-4 my-6 space-y-6 sm:mx-6 lg:mx-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-white/6 via-white/3 to-white/5 p-6">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-500/6 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            {/* Breadcrumb */}
            <nav className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link
                href="/account/admin/bootcamps"
                className="transition-colors hover:text-gray-300"
              >
                Bootcamps
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-gray-400">{bootcampData.title}</span>
            </nav>

            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30">
                <GraduationCap className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white">
                    {bootcampData.title}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                  {bootcampData.is_featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Featured
                    </span>
                  )}
                </div>
                {bootcampData.batch_info && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {bootcampData.batch_info}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {bootcampData.total_lessons || 0} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(bootcampData.total_duration || 0)}
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                {formatPrice(bootcampData.price)}
              </span>
              {bootcampData.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(bootcampData.start_date)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/account/admin/bootcamps"
              className="flex items-center gap-1.5 rounded-xl bg-white/6 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
            {bootcampData.status === 'published' && (
              <a
                href={`/bootcamps/${bootcampData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-white/6 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Eye className="h-3.5 w-3.5" />
                View Live
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'curriculum' && (
          <CurriculumBuilder
            bootcampId={bootcamp.id}
            initialCourses={bootcampData.courses || []}
            onCoursesChange={handleCoursesChange}
          />
        )}

        {activeTab === 'settings' && (
          <div className="rounded-2xl border border-white/8 bg-[#0d1117] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Bootcamp Settings
                </h3>
                <p className="text-xs text-gray-600">
                  Update bootcamp details and configuration
                </p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">/bootcamps/</span>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      className="flex-1 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Thumbnail URL
                  </label>
                  <input
                    type="text"
                    name="thumbnail"
                    value={formData.thumbnail}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full appearance-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
                      style={{ colorScheme: 'dark' }}
                    >
                      {BOOTCAMP_STATUSES.map((status) => {
                        const config = getStatusConfig(status);
                        return (
                          <option key={status} value={status}>
                            {config.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">
                      Price (BDT)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Batch Info
                  </label>
                  <input
                    type="text"
                    name="batch_info"
                    value={formData.batch_info}
                    onChange={handleChange}
                    placeholder="e.g., Batch 5 - Spring 2026"
                    className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Max Students
                  </label>
                  <input
                    type="number"
                    name="max_students"
                    value={formData.max_students}
                    onChange={handleChange}
                    min="1"
                    placeholder="Leave empty for unlimited"
                    className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/2 p-3">
                  <div>
                    <span className="text-sm text-white">Featured</span>
                    <p className="text-[10px] text-gray-600">
                      Show on homepage
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={formData.is_featured}
                      onChange={handleChange}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-white/10 peer-checked:bg-amber-500/30 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-gray-400 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-amber-400" />
                  </label>
                </div>

                {/* Thumbnail Preview */}
                {formData.thumbnail && (
                  <div className="overflow-hidden rounded-xl border border-white/8">
                    <img
                      src={formData.thumbnail}
                      alt="Thumbnail preview"
                      className="aspect-video w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'enrollments' && (
          <EnrollmentsTab bootcampId={bootcamp.id} />
        )}
      </div>
    </div>
  );
}
