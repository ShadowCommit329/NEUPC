'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Users,
  Briefcase,
  UserCheck,
  BookUser,
  ChevronRight,
} from 'lucide-react';
import {
  createCommitteePositionAction,
  updateCommitteePositionAction,
  deleteCommitteePositionAction,
  updateCommitteeMemberAction,
  deleteCommitteeMemberAction,
} from '@/app/_lib/committee-actions';
import PositionsTable from './PositionsTable';
import MembersTable from './MembersTable';
import PositionModal from './PositionModal';
import MemberModal from './MemberModal';
import Toast from './Toast';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, colorClass, sub, accentGradient }) {
  return (
    <div className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/6 bg-[#161b22] px-4 py-3.5 transition-all hover:border-white/10 hover:bg-[#1c2128]">
      {accentGradient && (
        <div
          className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 ${accentGradient}`}
        />
      )}
      <div
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="relative min-w-0">
        <p className="font-mono text-lg leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate font-mono text-[10px] text-gray-600">
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 truncate font-mono text-[9px] text-amber-500/70">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-white/12 text-white shadow-sm'
          : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-white/15 text-white' : 'bg-white/6 text-gray-600'}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab, onCreateClick }) {
  const msgs = {
    positions: {
      icon: Briefcase,
      title: 'No positions yet',
      sub: 'Create your first committee position to get started.',
      action: 'Add Position',
    },
    members: {
      icon: Users,
      title: 'No members assigned',
      sub: 'Assign a user to a position to build your committee.',
      action: 'Add Member',
    },
  };
  const { icon: Icon, title, sub, action } = msgs[tab] ?? msgs.positions;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
      <Icon className="mb-4 h-12 w-12 text-gray-700" />
      <p className="text-sm font-semibold text-gray-400">{title}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
      <button
        onClick={onCreateClick}
        className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
      >
        <Plus className="h-3.5 w-3.5" /> {action}
      </button>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function CommitteeManagementClient({
  initialMembers,
  initialPositions,
  initialUsers,
}) {
  const [positions, setPositions] = useState(initialPositions);
  const [members, setMembers] = useState(initialMembers);
  const [activeTab, setActiveTab] = useState('positions');
  const [search, setSearch] = useState('');
  const [positionModal, setPositionModal] = useState(null);
  const [memberModal, setMemberModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [isPending, startTransition] = useTransition();

  // ── derived stats ─────────────────────────────────────────────────────────
  const live = useMemo(() => {
    const currentMembers = members.filter((m) => m.is_current);
    const executivePositions = positions.filter(
      (p) => p.category === 'executive'
    );
    return {
      totalMembers: members.length,
      currentMembers: currentMembers.length,
      totalPositions: positions.length,
      executiveCount: executivePositions.length,
      totalUsers: initialUsers?.length || 0,
    };
  }, [members, positions, initialUsers]);

  // ── filtered data ─────────────────────────────────────────────────────────
  const filteredPositions = useMemo(() => {
    if (!search) return positions;
    const q = search.toLowerCase();
    return positions.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [positions, search]);

  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.users?.full_name?.toLowerCase().includes(q) ||
        m.users?.email?.toLowerCase().includes(q) ||
        m.committee_positions?.title?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // ── Position actions ──────────────────────────────────────────────────────
  const handleCreatePosition = (formData) => {
    startTransition(async () => {
      try {
        const result = await createCommitteePositionAction(formData);
        if (result?.position) {
          setPositions((prev) => [...prev, result.position]);
          setPositionModal(null);
          showToast('Position created successfully', 'success');
        } else {
          showToast('Failed to create position', 'error');
        }
      } catch {
        showToast('Error creating position', 'error');
      }
    });
  };

  const handleUpdatePosition = (formData) => {
    startTransition(async () => {
      try {
        const id = formData.get('id');
        const result = await updateCommitteePositionAction(formData);
        if (result?.success) {
          setPositions((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, ...Object.fromEntries(formData) } : p
            )
          );
          setPositionModal(null);
          showToast('Position updated successfully', 'success');
        } else {
          showToast('Failed to update position', 'error');
        }
      } catch {
        showToast('Error updating position', 'error');
      }
    });
  };

  const handleDeletePosition = (id) => {
    if (!confirm('Delete this position? This action cannot be undone.')) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('id', id);
        const result = await deleteCommitteePositionAction(formData);
        if (result?.success) {
          setPositions((prev) => prev.filter((p) => p.id !== id));
          showToast('Position deleted successfully', 'success');
        } else {
          showToast('Failed to delete position', 'error');
        }
      } catch {
        showToast('Error deleting position', 'error');
      }
    });
  };

  // ── Member actions ────────────────────────────────────────────────────────
  const handleUpdateMember = (formData) => {
    startTransition(async () => {
      try {
        const id = formData.get('id');
        const result = await updateCommitteeMemberAction(formData);
        if (result?.success) {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, ...Object.fromEntries(formData) } : m
            )
          );
          setMemberModal(null);
          showToast('Member updated successfully', 'success');
        } else {
          showToast('Failed to update member', 'error');
        }
      } catch {
        showToast('Error updating member', 'error');
      }
    });
  };

  const handleCreateMember = (formData) => {
    startTransition(async () => {
      try {
        const result = await updateCommitteeMemberAction(formData);
        if (result?.success) {
          const newMember = {
            id: formData.get('id'),
            user_id: formData.get('user_id'),
            position_id: formData.get('position_id'),
            term_start: formData.get('term_start'),
            term_end: formData.get('term_end'),
            is_current: formData.get('is_current') === 'true',
            bio: formData.get('bio'),
          };
          setMembers((prev) => [...prev, newMember]);
          setMemberModal(null);
          showToast('Member assigned successfully', 'success');
        } else {
          showToast('Failed to assign member', 'error');
        }
      } catch {
        showToast('Error assigning member', 'error');
      }
    });
  };

  const handleDeleteMember = (id) => {
    if (!confirm('Remove this member? This action cannot be undone.')) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('id', id);
        const result = await deleteCommitteeMemberAction(formData);
        if (result?.success) {
          setMembers((prev) => prev.filter((m) => m.id !== id));
          showToast('Member removed successfully', 'success');
        } else {
          showToast('Failed to remove member', 'error');
        }
      } catch {
        showToast('Error removing member', 'error');
      }
    });
  };

  // ── current filtered list for active tab ──────────────────────────────────
  const currentItems =
    activeTab === 'positions' ? filteredPositions : filteredMembers;
  const totalItems =
    activeTab === 'positions' ? positions.length : members.length;

  return (
    <>
      <div className="space-y-6">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
          {/* decorative orbs */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/6 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-violet-500/5 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <nav className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
                <Link
                  href="/account/admin"
                  className="transition-colors hover:text-gray-300"
                >
                  Dashboard
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-gray-400">Committee</span>
              </nav>
              <h1 className="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                Committee Management
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                {live.totalMembers} member{live.totalMembers !== 1 ? 's' : ''} ·{' '}
                {live.currentMembers} active · {live.totalPositions} position
                {live.totalPositions !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/account/admin"
                className="rounded-xl bg-white/6 px-4 py-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                ← Dashboard
              </Link>
              <button
                onClick={() =>
                  activeTab === 'positions'
                    ? setPositionModal({ type: 'create', isOpen: true })
                    : setMemberModal({ type: 'create', isOpen: true })
                }
                className="group flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                {activeTab === 'positions' ? 'Add Position' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Members"
            value={live.totalMembers}
            colorClass="bg-blue-500/15 text-blue-400"
            accentGradient="bg-linear-to-br from-blue-500/8 to-transparent"
          />
          <StatCard
            icon={UserCheck}
            label="Currently Active"
            value={live.currentMembers}
            colorClass="bg-emerald-500/15 text-emerald-400"
            accentGradient="bg-linear-to-br from-emerald-500/8 to-transparent"
            sub={
              live.totalMembers - live.currentMembers > 0
                ? `${live.totalMembers - live.currentMembers} past`
                : undefined
            }
          />
          <StatCard
            icon={Briefcase}
            label="Positions"
            value={live.totalPositions}
            colorClass="bg-purple-500/15 text-purple-400"
            accentGradient="bg-linear-to-br from-purple-500/8 to-transparent"
            sub={
              live.executiveCount > 0
                ? `${live.executiveCount} executive`
                : undefined
            }
          />
          <StatCard
            icon={BookUser}
            label="User Directory"
            value={live.totalUsers}
            colorClass="bg-gray-600/20 text-gray-400"
            accentGradient="bg-linear-to-br from-gray-500/6 to-transparent"
          />
        </div>

        {/* ── Tabs + Search ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1">
              <TabButton
                active={activeTab === 'positions'}
                onClick={() => {
                  setActiveTab('positions');
                  setSearch('');
                }}
                count={positions.length}
              >
                <Briefcase className="h-3 w-3" /> Positions
              </TabButton>
              <TabButton
                active={activeTab === 'members'}
                onClick={() => {
                  setActiveTab('members');
                  setSearch('');
                }}
                count={members.length}
              >
                <Users className="h-3 w-3" /> Members
              </TabButton>
            </div>

            {/* Secondary action on the right */}
            <button
              onClick={() =>
                activeTab === 'positions'
                  ? setPositionModal({ type: 'create', isOpen: true })
                  : setMemberModal({ type: 'create', isOpen: true })
              }
              className="hidden items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-white/15 hover:text-white sm:flex"
            >
              <Plus className="h-3.5 w-3.5" />
              {activeTab === 'positions' ? 'New Position' : 'Assign Member'}
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'positions'
                  ? 'Search positions by title or category…'
                  : 'Search members by name, email, or position…'
              }
              className="w-full rounded-xl border border-white/8 bg-white/4 py-2 pr-3 pl-8 text-xs text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] text-gray-500 transition-colors hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results count */}
          {search && (
            <p className="text-[11px] text-gray-600">
              Showing {currentItems.length} of {totalItems}{' '}
              {activeTab === 'positions' ? 'position' : 'member'}
              {totalItems !== 1 ? 's' : ''} matching &quot;
              <span className="text-gray-400">{search}</span>&quot;
            </p>
          )}
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {activeTab === 'positions' ? (
          filteredPositions.length === 0 ? (
            <EmptyState
              tab="positions"
              onCreateClick={() =>
                setPositionModal({ type: 'create', isOpen: true })
              }
            />
          ) : (
            <PositionsTable
              positions={filteredPositions}
              onEdit={(position) =>
                setPositionModal({ type: 'edit', position, isOpen: true })
              }
              onDelete={handleDeletePosition}
            />
          )
        ) : filteredMembers.length === 0 ? (
          <EmptyState
            tab="members"
            onCreateClick={() =>
              setMemberModal({ type: 'create', isOpen: true })
            }
          />
        ) : (
          <MembersTable
            members={filteredMembers}
            positions={positions}
            onEdit={(member) =>
              setMemberModal({ type: 'edit', member, isOpen: true })
            }
            onDelete={handleDeleteMember}
          />
        )}

        {/* ── Footer legend ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-white/5 bg-[#161b22] px-4 py-2.5 font-mono text-[10px] text-gray-700">
          <span className="text-gray-600">// category guide</span>
          {[
            { dot: 'bg-purple-400', label: 'Executive – leadership roles' },
            { dot: 'bg-cyan-400', label: 'Mentor – training & guidance' },
            { dot: 'bg-amber-400', label: 'Advisor – strategic support' },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {positionModal?.isOpen && (
        <PositionModal
          type={positionModal.type}
          position={positionModal.position}
          onClose={() => setPositionModal(null)}
          onCreate={handleCreatePosition}
          onUpdate={handleUpdatePosition}
          isLoading={isPending}
        />
      )}

      {memberModal?.isOpen && (
        <MemberModal
          type={memberModal.type}
          member={memberModal.member}
          positions={positions}
          users={initialUsers}
          onClose={() => setMemberModal(null)}
          onCreate={handleCreateMember}
          onUpdate={handleUpdateMember}
          isLoading={isPending}
        />
      )}
    </>
  );
}
