'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Save,
  Loader2,
  Users,
  Settings,
  LayoutList,
  Eye,
  Star,
  ChevronDown,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  GraduationCap,
  Globe,
  Lock,
  CheckCircle2,
  Info,
  ArrowRight,
} from 'lucide-react';
import CurriculumBuilder from '../../_components/CurriculumBuilder';
import EnrollmentsTab from './EnrollmentsTab';
import ThumbnailUploader from '../../_components/ThumbnailUploader';
import { getStatusConfig, BOOTCAMP_STATUSES } from '../../_components/bootcampConfig';
import { updateBootcamp } from '@/app/_lib/bootcamp-actions';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'details', label: 'General Details', icon: Info },
  { key: 'curriculum', label: 'Curriculum', icon: LayoutList },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'enrollments', label: 'Enrollments', icon: Users },
];

const FIELD = ({ label, children, hint }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-gray-600">{hint}</p>}
  </div>
);

const INPUT_CLASS =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all placeholder:text-gray-600';

const SELECT_CLASS =
  'w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all';

export default function BootcampDetailClient({ bootcamp }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [bootcampData, setBootcampData] = useState(bootcamp);
  const [hasChanges, setHasChanges] = useState(false);

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
    setHasChanges(true);
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
      setHasChanges(false);
      toast.success('Changes saved successfully');
      router.refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCoursesChange = useCallback((courses) => {
    setBootcampData((prev) => ({ ...prev, courses }));
  }, []);

  const sc = getStatusConfig(formData.status);

  return (
    <div className="min-h-screen p-6 md:p-8 pt-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/account/admin/bootcamps"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium"
            >
              <ChevronLeft className="h-3 w-3" />
              All Tracks
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-xs text-gray-600 truncate max-w-[200px]">{bootcampData.title}</span>
          </div>

          {/* Title + Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="kinetic-headline text-2xl md:text-3xl font-bold text-white truncate max-w-[500px]">
              {bootcampData.title || 'Untitled Track'}
            </h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sc.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${formData.status === 'published' ? 'animate-pulse' : ''}`} />
              {sc.label}
            </span>
            {bootcampData.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/25">
                <Star className="h-2.5 w-2.5 fill-current" />
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 shrink-0">
          {hasChanges && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400/80 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(124,92,255,0.4)] transition-all disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10">
        <nav className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-3 pt-1 px-4 border-b-2 text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/10'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── GENERAL DETAILS TAB ─────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic Info */}
            <section className="glass-panel holographic-card no-lift rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="h-4 w-4 text-violet-400" />
                <h2 className="text-base font-bold text-white">Basic Information</h2>
              </div>

              <FIELD label="Track Title">
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Full Stack Web Development Bootcamp"
                  className={INPUT_CLASS}
                />
              </FIELD>

              <FIELD label="Subtitle" hint="A short tagline shown below the title.">
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  placeholder="e.g., Master modern web development in 12 weeks"
                  className={INPUT_CLASS}
                />
              </FIELD>

              <FIELD label="Description" hint="Detailed overview shown on the bootcamp page.">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={8}
                  placeholder="Write a detailed description of this bootcamp..."
                  className={`${INPUT_CLASS} resize-y`}
                />
              </FIELD>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Publish Status */}
            <section className="glass-panel holographic-card no-lift rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Visibility
              </h3>
              <div className="space-y-2">
                {BOOTCAMP_STATUSES.map((s) => {
                  const cfg = getStatusConfig(s);
                  const icons = { published: Globe, draft: Lock, archived: CheckCircle2 };
                  const StatusIcon = icons[s] || Globe;
                  return (
                    <label
                      key={s}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                        formData.status === s
                          ? 'bg-white/8 border-white/15'
                          : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={formData.status === s}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.badge}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{cfg.label}</div>
                        <div className="text-[11px] text-gray-500">{cfg.description}</div>
                      </div>
                      {formData.status === s && (
                        <CheckCircle2 className="h-4 w-4 text-violet-400 ml-auto" />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Thumbnail */}
            <section className="glass-panel holographic-card no-lift rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Track Thumbnail
              </h3>
              <ThumbnailUploader
                bootcampId={bootcamp.id}
                currentThumbnail={formData.thumbnail}
                onUploadSuccess={(data) => {
                  if (data?.url) {
                    setFormData((prev) => ({ ...prev, thumbnail: data.url }));
                    setHasChanges(true);
                  }
                }}
              />
              <p className="text-[11px] text-gray-600 mt-2.5 text-center">
                Recommended: 1200×630px · Max 5MB
              </p>
            </section>

            {/* Metadata */}
            <section className="glass-panel holographic-card no-lift rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Metadata
              </h3>

              <FIELD label="URL Slug" hint="/bootcamps/{slug}">
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="my-bootcamp-slug"
                  className={INPUT_CLASS}
                />
              </FIELD>

              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className={SELECT_CLASS} style={{ colorScheme: 'dark' }}>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Mobile App Dev">Mobile App Dev</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                </select>
                <ChevronDown className="absolute right-3 bottom-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Difficulty</label>
                <select name="difficulty" value={formData.difficulty} onChange={handleChange} className={SELECT_CLASS} style={{ colorScheme: 'dark' }}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <ChevronDown className="absolute right-3 bottom-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>

              <FIELD label="Price (BDT)">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    min="0"
                    placeholder="0 for free"
                    className={`${INPUT_CLASS} pl-9`}
                  />
                </div>
              </FIELD>
            </section>
          </div>
        </div>
      )}

      {/* ── CURRICULUM TAB ─────────────────────────────────────────────── */}
      {activeTab === 'curriculum' && (
        <CurriculumBuilder
          bootcampId={bootcamp.id}
          initialCourses={bootcampData.courses || []}
          onCoursesChange={handleCoursesChange}
        />
      )}

      {/* ── SETTINGS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* Schedule */}
            <section className="glass-panel holographic-card no-lift rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="h-4 w-4 text-violet-400" />
                <h2 className="text-base font-bold text-white">Schedule</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FIELD label="Start Date">
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className={INPUT_CLASS}
                    style={{ colorScheme: 'dark' }}
                  />
                </FIELD>
                <FIELD label="End Date">
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className={INPUT_CLASS}
                    style={{ colorScheme: 'dark' }}
                  />
                </FIELD>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <FIELD label="Batch Info">
                  <input
                    type="text"
                    name="batch_info"
                    value={formData.batch_info}
                    onChange={handleChange}
                    placeholder="e.g., Batch 5 · Spring 2026"
                    className={INPUT_CLASS}
                  />
                </FIELD>
                <FIELD label="Max Students" hint="Leave blank for unlimited.">
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                    <input
                      type="number"
                      name="max_students"
                      value={formData.max_students}
                      onChange={handleChange}
                      min="1"
                      placeholder="Unlimited"
                      className={`${INPUT_CLASS} pl-9`}
                    />
                  </div>
                </FIELD>
              </div>
            </section>

            {/* Enrollment Settings */}
            <section className="glass-panel holographic-card no-lift rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-violet-400" />
                <h2 className="text-base font-bold text-white">Enrollment Settings</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Control how club members can join this learning path.
              </p>
              <div className="space-y-3">
                {[
                  { value: 'open', label: 'Open Enrollment', desc: 'Anyone can join instantly without approval.', icon: Globe },
                  { value: 'application', label: 'Invite Only', desc: 'Members must be manually approved by an admin.', icon: Lock },
                ].map(({ value, label, desc, icon: Icon }) => (
                  <label
                    key={value}
                    className="flex items-start gap-4 p-4 bg-white/4 border border-white/8 rounded-xl cursor-pointer hover:bg-white/8 hover:border-white/15 transition-all"
                  >
                    <input
                      type="radio"
                      name="enrollment_type"
                      value={value}
                      defaultChecked={value === 'open'}
                      className="mt-0.5 text-violet-500 focus:ring-violet-500 bg-white/10 border-white/20 accent-violet-500"
                    />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <Icon className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Featured toggle */}
            <section className="glass-panel holographic-card no-lift rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-400" />
                    Featured Track
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Show this track on the homepage.</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-white/10 border border-white/5 peer-checked:bg-amber-500/30 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-gray-400 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-amber-400" />
                </label>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                <Trash2 className="w-28 h-28 text-red-500" />
              </div>
              <h2 className="text-sm font-bold text-red-400 mb-1 relative z-10">Danger Zone</h2>
              <p className="text-xs text-red-300/60 mb-4 relative z-10">
                Irreversible and destructive actions.
              </p>
              <button className="relative z-10 w-full flex items-center justify-between bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold py-2.5 px-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 transition-all">
                Delete Permanently
                <Trash2 className="h-4 w-4" />
              </button>
            </section>
          </div>
        </div>
      )}

      {/* ── ENROLLMENTS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'enrollments' && (
        <EnrollmentsTab bootcampId={bootcamp.id} />
      )}
    </div>
  );
}
