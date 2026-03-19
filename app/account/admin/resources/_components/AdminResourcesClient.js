'use client';

import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  useCallback,
} from 'react';
import {
  BookOpen,
  PlusCircle,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Layers,
  Eye,
  Clock,
  CheckCircle2,
  Archive,
  FileEdit,
  LayoutGrid,
  LayoutList,
  Edit3,
  Trash2,
  Loader2,
  Pin,
  Globe,
  Lock,
  Tag,
  FolderPlus,
  ChevronDown,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import ResourceGrid from '@/app/_components/resources/ResourceGrid';
import ResourcesPageHeader from '@/app/_components/resources/ResourcesPageHeader';
import { RESOURCE_TYPE_LABELS } from '@/app/_lib/resources/constants';
import ResourceFormPanel from './ResourceFormPanel';
import {
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
  createResourceCategoryAction,
} from '@/app/_lib/resource-actions';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    icon: FileEdit,
    color: 'text-gray-400',
    bg: 'bg-gray-500/15',
    dot: 'bg-gray-400',
    badge: 'border-gray-500/20 bg-gray-500/10 text-gray-300',
    ring: 'ring-gray-500/20',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    dot: 'bg-amber-400',
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    ring: 'ring-amber-500/20',
  },
  published: {
    label: 'Published',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    dot: 'bg-emerald-400',
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    ring: 'ring-emerald-500/20',
  },
  archived: {
    label: 'Archived',
    icon: Archive,
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    dot: 'bg-slate-400',
    badge: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
    ring: 'ring-slate-500/20',
  },
};

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'title', label: 'Title A–Z' },
  { key: 'pinned', label: 'Pinned First' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ status, onCreate }) {
  const messages = {
    all: {
      icon: Sparkles,
      title: 'No resources yet',
      sub: 'Create your first resource to start sharing knowledge with your community.',
      gradient: 'from-blue-500/20 to-cyan-500/20',
    },
    draft: {
      icon: FileEdit,
      title: 'No draft resources',
      sub: 'Resources saved without publishing will appear here.',
      gradient: 'from-gray-500/20 to-slate-500/20',
    },
    scheduled: {
      icon: Clock,
      title: 'No scheduled resources',
      sub: 'Resources scheduled for future publication will appear here.',
      gradient: 'from-amber-500/20 to-orange-500/20',
    },
    published: {
      icon: CheckCircle2,
      title: 'No published resources',
      sub: 'Published resources visible to users will appear here.',
      gradient: 'from-emerald-500/20 to-teal-500/20',
    },
    archived: {
      icon: Archive,
      title: 'No archived resources',
      sub: 'Archived resources that are no longer active will appear here.',
      gradient: 'from-slate-500/20 to-zinc-500/20',
    },
  };
  const { icon: Icon, title, sub, gradient } = messages[status] ?? messages.all;

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center sm:py-24">
      <div
        className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-20 blur-3xl`}
      />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
          <Icon className="h-8 w-8 text-gray-600" strokeWidth={1.5} />
        </div>
        <p className="text-base font-semibold text-gray-200">{title}</p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
          {sub}
        </p>
        {status === 'all' && (
          <button
            onClick={onCreate}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-900/35"
          >
            <PlusCircle className="h-4 w-4" />
            Create Your First Resource
          </button>
        )}
      </div>
    </div>
  );
}

function DeleteConfirmDialog({ resource, onConfirm, onCancel, isPending }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0f1219] shadow-2xl">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-center text-base font-semibold text-white">
            Delete Resource
          </h3>
          <p className="mt-2 text-center text-sm text-gray-400">
            Are you sure you want to delete{' '}
            <span className="font-medium text-gray-200">
              &quot;{resource?.title}&quot;
            </span>
            ? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 border-t border-white/8 bg-white/[0.02] px-6 py-4">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/8 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500 disabled:opacity-70"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onDismiss }) {
  if (!message) return null;
  const isError = message.type === 'error';

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in fixed right-4 bottom-4 z-50">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm ${
          isError
            ? 'border-red-500/25 bg-red-950/90 text-red-200'
            : 'border-emerald-500/25 bg-emerald-950/90 text-emerald-200'
        }`}
      >
        {isError ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        )}
        <p className="text-sm font-medium">{message.text}</p>
        <button
          onClick={onDismiss}
          className="ml-2 rounded-lg p-1 transition-colors hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Category Manager (collapsible) ──────────────────────────────────────────

function CategoryManager({
  categories,
  onAdd,
  pending,
  categoryName,
  setCategoryName,
  categoryDescription,
  setCategoryDescription,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          <FolderPlus className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-400">
            Manage Categories
          </span>
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-gray-500 tabular-nums">
            {categories.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
          {/* Existing categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-gray-400"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {c.name}
                </span>
              ))}
            </div>
          )}

          {/* Add form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Category name"
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/15"
              />
              <button
                onClick={onAdd}
                disabled={pending || !categoryName.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-white/12 disabled:opacity-40"
              >
                {pending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <PlusCircle className="h-3 w-3" />
                )}
                Add
              </button>
            </div>
            <textarea
              value={categoryDescription}
              onChange={(e) => setCategoryDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/15"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminResourcesClient({ initialResources, categories }) {
  const router = useRouter();
  const [resources, setResources] = useState(initialResources || []);
  const [formState, setFormState] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('grid');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [localCategories, setLocalCategories] = useState(categories || []);
  const [pending, start] = useTransition();

  // Auto-clear feedback messages
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // Sync with server data
  const [prevInitial, setPrevInitial] = useState(initialResources);
  if (initialResources !== prevInitial) {
    setPrevInitial(initialResources);
    setResources(initialResources || []);
    setLocalCategories(categories || []);
  }

  // ── Live stats ────────────────────────────────────────────────────────────
  const liveStats = useMemo(
    () => ({
      total: resources.length,
      draft: resources.filter((r) => r.status === 'draft').length,
      scheduled: resources.filter((r) => r.status === 'scheduled').length,
      published: resources.filter((r) => r.status === 'published').length,
      archived: resources.filter((r) => r.status === 'archived').length,
      pinned: resources.filter((r) => r.is_pinned).length,
      public: resources.filter((r) => r.visibility === 'public').length,
      members: resources.filter((r) => r.visibility === 'members').length,
    }),
    [resources]
  );

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = resources;

    if (activeStatus !== 'all') {
      list = list.filter((r) => r.status === activeStatus);
    }

    if (search) {
      const term = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term) ||
          (r.category?.name || '').toLowerCase().includes(term) ||
          (r.tags || []).some((t) =>
            (t.name || '').toLowerCase().includes(term)
          )
      );
    }

    if (categoryFilter) {
      list = list.filter((r) => r.category_id === categoryFilter);
    }

    if (visibilityFilter) {
      list = list.filter((r) => r.visibility === visibilityFilter);
    }

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'title':
          return (a.title ?? '').localeCompare(b.title ?? '');
        case 'pinned':
          return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
    return list;
  }, [
    resources,
    activeStatus,
    search,
    categoryFilter,
    visibilityFilter,
    sortBy,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback((resource) => {
    setDeleteTarget(resource);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    start(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const result = await deleteResourceAction(fd);
      if (result?.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setResources((prev) => prev.filter((r) => r.id !== id));
        setMessage({ type: 'success', text: 'Resource deleted successfully.' });
      }
      setDeleteTarget(null);
    });
  }, [deleteTarget]);

  const onAddCategory = useCallback(() => {
    const name = categoryName.trim();
    if (!name) return;
    start(async () => {
      const fd = new FormData();
      fd.set('name', name);
      fd.set('description', categoryDescription.trim());
      const result = await createResourceCategoryAction(fd);
      if (result?.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      if (result?.category) {
        setLocalCategories((prev) => [...prev, result.category]);
      }
      setCategoryName('');
      setCategoryDescription('');
      setMessage({ type: 'success', text: 'Category created successfully.' });
    });
  }, [categoryName, categoryDescription]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setCategoryFilter('');
    setVisibilityFilter('');
    setActiveStatus('all');
    setSortBy('newest');
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const statusTabs = [
    { key: 'all', label: 'All', count: liveStats.total, icon: Layers },
    { key: 'draft', label: 'Drafts', count: liveStats.draft, icon: FileEdit },
    {
      key: 'scheduled',
      label: 'Scheduled',
      count: liveStats.scheduled,
      icon: Clock,
    },
    {
      key: 'published',
      label: 'Published',
      count: liveStats.published,
      icon: CheckCircle2,
    },
    {
      key: 'archived',
      label: 'Archived',
      count: liveStats.archived,
      icon: Archive,
    },
  ];

  const hasActiveFilters =
    search || categoryFilter || visibilityFilter || activeStatus !== 'all';

  const activeFilterCount = [
    search,
    categoryFilter,
    visibilityFilter,
    activeStatus !== 'all' ? activeStatus : '',
  ].filter(Boolean).length;

  return (
    <>
      {/* ── Shared Page Header + Stats ────────────────────────── */}
      <ResourcesPageHeader
        role="admin"
        total={liveStats.total}
        categoryCount={localCategories.length}
        pinnedCount={liveStats.pinned}
        publicCount={liveStats.public}
        membersCount={liveStats.members}
        draftCount={liveStats.draft}
        scheduledCount={liveStats.scheduled}
        publishedCount={liveStats.published}
        archivedCount={liveStats.archived}
        onCreateNew={() => setFormState({ mode: 'create', resource: null })}
      />

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
        {/* Row 1: Status Tabs + View Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="scrollbar-none -mx-1 flex items-center gap-0.5 overflow-x-auto px-1">
            {statusTabs.map(({ key, label, count, icon: Icon }) => {
              const active = activeStatus === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveStatus(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
                    active
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span
                    className={`min-w-[18px] rounded-md px-1 py-0.5 text-center text-[10px] tabular-nums ${
                      active ? 'bg-white/10 text-gray-200' : 'text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                view === 'grid'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                view === 'table'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Table view"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search + Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, category, or tags…"
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500/30 focus:bg-white/[0.05] focus:ring-1 focus:ring-blue-500/15"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 text-gray-500 transition-colors hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 shrink-0 text-gray-600" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 pr-8 text-sm text-gray-400 scheme-dark transition-all outline-none focus:border-white/15 focus:text-white"
              >
                <option value="">All Categories</option>
                {localCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 shrink-0 text-gray-600" />
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 pr-8 text-sm text-gray-400 scheme-dark transition-all outline-none focus:border-white/15 focus:text-white"
              >
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="members">Members</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-gray-600" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 pr-8 text-sm text-gray-400 scheme-dark transition-all outline-none focus:border-white/15 focus:text-white"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active filters bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3.5 py-2.5">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-300">
                {filtered.length}
              </span>{' '}
              of <span className="tabular-nums">{resources.length}</span>{' '}
              resources
              {activeFilterCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/15 text-[9px] font-bold text-blue-400">
                  {activeFilterCount}
                </span>
              )}
            </p>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          </div>
        )}

        {/* Category management (collapsible) */}
        <CategoryManager
          categories={localCategories}
          onAdd={onAddCategory}
          pending={pending}
          categoryName={categoryName}
          setCategoryName={setCategoryName}
          categoryDescription={categoryDescription}
          setCategoryDescription={setCategoryDescription}
        />
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          status={activeStatus}
          onCreate={() => setFormState({ mode: 'create', resource: null })}
        />
      ) : view === 'grid' ? (
        <ResourceGrid
          resources={filtered}
          showAdminActions
          onEdit={(resource) => setFormState({ mode: 'edit', resource })}
          onDelete={handleDelete}
        />
      ) : (
        /* ── Table View ──────────────────────────────────── */
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                    Resource
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-500 uppercase md:table-cell">
                    Category & Type
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-500 uppercase sm:table-cell">
                    Visibility
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-500 uppercase lg:table-cell">
                    Date
                  </th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((resource) => {
                  const sc =
                    STATUS_CONFIG[resource.status] || STATUS_CONFIG.draft;

                  return (
                    <tr
                      key={resource.id}
                      className="group transition-colors duration-150 hover:bg-white/[0.03]"
                    >
                      {/* Resource info */}
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {/* Mini thumbnail */}
                          <div className="hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/8 bg-white/[0.04] sm:flex">
                            {resource.thumbnail ? (
                              <img
                                src={resource.thumbnail}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <BookOpen className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">
                                {resource.title}
                              </p>
                              {resource.is_pinned && (
                                <Pin className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                              )}
                            </div>
                            {resource.description && (
                              <p className="mt-0.5 max-w-sm truncate text-xs text-gray-600">
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category & Type */}
                      <td className="hidden px-5 py-4 md:table-cell">
                        <div className="flex flex-col items-start gap-1.5">
                          {resource.category && (
                            <span className="inline-flex items-center rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-gray-300">
                              {resource.category.name}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500">
                            {RESOURCE_TYPE_LABELS[resource.resource_type] ||
                              resource.resource_type}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${sc.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${sc.dot}`}
                          />
                          {sc.label}
                        </span>
                      </td>

                      {/* Visibility */}
                      <td className="hidden px-5 py-4 sm:table-cell">
                        {resource.visibility === 'public' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <Globe className="h-3 w-3" />
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-400">
                            <Lock className="h-3 w-3" />
                            Members
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="hidden px-5 py-4 text-xs text-gray-500 lg:table-cell">
                        {new Date(resource.created_at).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              setFormState({ mode: 'edit', resource })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all duration-150 hover:bg-blue-500/15 hover:text-blue-400"
                            title="Edit resource"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(resource)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all duration-150 hover:bg-red-500/15 hover:text-red-400"
                            title="Delete resource"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Status Legend ─────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="mr-1 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
            Status
          </p>
          <div className="h-3 w-px bg-white/8" />
          {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
            <div
              key={key}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${sc.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              <span className="text-[10px] font-medium">{sc.label}</span>
            </div>
          ))}
          <span className="ml-auto text-[10px] text-gray-600">
            Edit a resource to change its status
          </span>
        </div>
      </div>

      {/* ── Delete Confirmation ──────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirmDialog
          resource={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isPending={pending}
        />
      )}

      {/* ── Toast Messages ───────────────────────────────── */}
      <Toast message={message} onDismiss={() => setMessage(null)} />

      {/* ── Form Modal ──────────────────────────────────────── */}
      {formState && (
        <ResourceFormPanel
          mode={formState.mode}
          resource={formState.resource}
          categories={localCategories}
          onClose={() => setFormState(null)}
          onSaved={() => {
            setFormState(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
