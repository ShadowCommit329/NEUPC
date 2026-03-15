/**
 * @file Advisor approvals client — full-page approval management
 *   interface for reviewing, approving, or rejecting pending items.
 * @module AdvisorApprovalsClient
 */

'use client';

import { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  DollarSign,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  Mail,
  Phone,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  approveJoinRequestAction,
  rejectJoinRequestAction,
  approveMemberProfileAction,
  approveBudgetEntryAction,
} from '@/app/_lib/advisor-actions';

export default function AdvisorApprovalsClient({
  joinRequests,
  memberProfiles,
  budgetEntries,
  advisorId,
}) {
  const [activeTab, setActiveTab] = useState('join-requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleApprove = async (item, type) => {
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();

    try {
      let result;
      if (type === 'join-request') {
        formData.append('requestId', item.id);
        result = await approveJoinRequestAction(formData);
      } else if (type === 'member-profile') {
        formData.append('userId', item.user_id);
        result = await approveMemberProfileAction(formData);
      } else if (type === 'budget') {
        formData.append('entryId', item.id);
        result = await approveBudgetEntryAction(formData);
      }

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.success });
        setShowReviewModal(false);
        setSelectedItem(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (item) => {
    if (!rejectionReason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a rejection reason.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('requestId', item.id);
    formData.append('reason', rejectionReason);

    try {
      const result = await rejectJoinRequestAction(formData);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.success });
        setShowReviewModal(false);
        setSelectedItem(null);
        setRejectionReason('');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (item, type) => {
    setSelectedItem({ ...item, type });
    setShowReviewModal(true);
    setMessage(null);
    setRejectionReason('');
  };

  const tabs = [
    {
      id: 'join-requests',
      label: 'Join Requests',
      count: joinRequests?.length || 0,
      icon: UserPlus,
    },
    {
      id: 'member-profiles',
      label: 'Member Profiles',
      count: memberProfiles?.length || 0,
      icon: UserCheck,
    },
    {
      id: 'budget-entries',
      label: 'Budget Approvals',
      count: budgetEntries?.length || 0,
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Approvals</h1>
          <p className="mt-1 text-gray-400">
            Review and manage pending requests
          </p>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl"
          >
            <tab.icon className="h-4 w-4 text-blue-400" />
            <span className="font-medium text-white">{tab.count}</span>
            <span className="text-sm text-gray-400">{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`rounded-xl border p-4 ${
            message.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {/* Tab Headers */}
        <div className="flex overflow-x-auto border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-37.5 flex-1 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10'
                  }`}
                >
                  {tab.count}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-4 pl-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            />
          </div>

          {/* Join Requests Tab */}
          {activeTab === 'join-requests' && (
            <JoinRequestsList
              requests={joinRequests}
              searchQuery={searchQuery}
              onReview={openReviewModal}
            />
          )}

          {/* Member Profiles Tab */}
          {activeTab === 'member-profiles' && (
            <MemberProfilesList
              profiles={memberProfiles}
              searchQuery={searchQuery}
              onReview={openReviewModal}
            />
          )}

          {/* Budget Entries Tab */}
          {activeTab === 'budget-entries' && (
            <BudgetEntriesList
              entries={budgetEntries}
              searchQuery={searchQuery}
              onReview={openReviewModal}
            />
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedItem && (
        <ReviewModal
          item={selectedItem}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedItem(null);
            setRejectionReason('');
            setMessage(null);
          }}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          isSubmitting={isSubmitting}
          message={message}
        />
      )}
    </div>
  );
}

function JoinRequestsList({ requests, searchQuery, onReview }) {
  const filtered = requests?.filter(
    (req) =>
      !searchQuery ||
      req.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!filtered || filtered.length === 0) {
    return (
      <div className="py-12 text-center">
        <UserPlus className="mx-auto mb-4 h-16 w-16 text-gray-500" />
        <p className="text-gray-400">No pending join requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((request) => (
        <div
          key={request.id}
          className="rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-white">{request.name}</h3>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{request.email}</span>
                </div>
                {request.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{request.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onReview(request, 'join-request')}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Review
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberProfilesList({ profiles, searchQuery, onReview }) {
  const filtered = profiles?.filter(
    (prof) =>
      !searchQuery ||
      prof.users?.full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      prof.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prof.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!filtered || filtered.length === 0) {
    return (
      <div className="py-12 text-center">
        <UserCheck className="mx-auto mb-4 h-16 w-16 text-gray-500" />
        <p className="text-gray-400">No pending member profiles</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((profile) => (
        <div
          key={profile.user_id}
          className="rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 font-semibold text-white">
                {profile.users?.full_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white">
                  {profile.users?.full_name}
                </h3>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-400">
                  <span>{profile.student_id}</span>
                  <span>•</span>
                  <span>{profile.session}</span>
                  <span>•</span>
                  <span>{profile.department}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onReview(profile, 'member-profile')}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Review
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetEntriesList({ entries, searchQuery, onReview }) {
  const filtered = entries?.filter(
    (entry) =>
      !searchQuery ||
      entry.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.events?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!filtered || filtered.length === 0) {
    return (
      <div className="py-12 text-center">
        <DollarSign className="mx-auto mb-4 h-16 w-16 text-gray-500" />
        <p className="text-gray-400">No pending budget entries</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((entry) => (
        <div
          key={entry.id}
          className="rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    entry.entry_type === 'income'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {entry.entry_type}
                </span>
                <span className="text-lg font-semibold text-white">
                  ৳{entry.amount}
                </span>
              </div>
              <p className="text-white">{entry.description}</p>
              {entry.events && (
                <p className="mt-1 text-sm text-gray-400">
                  Event: {entry.events.title}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-400">
                Date: {new Date(entry.transaction_date).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => onReview(entry, 'budget')}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Review
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewModal({
  item,
  onApprove,
  onReject,
  onClose,
  rejectionReason,
  setRejectionReason,
  isSubmitting,
  message,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-start justify-between border-b border-white/10 bg-gray-900/95 p-6 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white">Review Request</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Message */}
          {message && (
            <div
              className={`rounded-xl border p-4 ${
                message.type === 'success'
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <p>{message.text}</p>
              </div>
            </div>
          )}

          {/* Item Details */}
          {item.type === 'join-request' && (
            <div className="space-y-4">
              <DetailRow label="Name" value={item.name} />
              <DetailRow label="Email" value={item.email} />
              {item.phone && <DetailRow label="Phone" value={item.phone} />}
              <DetailRow
                label="Requested On"
                value={new Date(item.created_at).toLocaleDateString()}
              />
            </div>
          )}

          {item.type === 'member-profile' && (
            <div className="space-y-4">
              <DetailRow label="Name" value={item.users?.full_name} />
              <DetailRow label="Email" value={item.users?.email} />
              <DetailRow label="Student ID" value={item.student_id} />
              <DetailRow label="Session" value={item.session} />
              <DetailRow label="Department" value={item.department} />
            </div>
          )}

          {item.type === 'budget' && (
            <div className="space-y-4">
              <DetailRow label="Type" value={item.entry_type} />
              <DetailRow label="Amount" value={`৳${item.amount}`} />
              <DetailRow label="Description" value={item.description} />
              {item.events && (
                <DetailRow label="Event" value={item.events.title} />
              )}
              <DetailRow
                label="Transaction Date"
                value={new Date(item.transaction_date).toLocaleDateString()}
              />
            </div>
          )}

          {/* Rejection Reason (only for join requests) */}
          {item.type === 'join-request' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">
                Rejection Reason (optional for approval, required for rejection)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason if rejecting..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => onApprove(item, item.type)}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3 font-medium text-white transition-colors hover:bg-green-600 disabled:bg-gray-600"
            >
              <CheckCircle className="h-5 w-5" />
              {isSubmitting ? 'Processing...' : 'Approve'}
            </button>
            {item.type === 'join-request' && (
              <button
                onClick={() => onReject(item)}
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-medium text-white transition-colors hover:bg-red-600 disabled:bg-gray-600"
              >
                <XCircle className="h-5 w-5" />
                {isSubmitting ? 'Processing...' : 'Reject'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/10 py-2">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
