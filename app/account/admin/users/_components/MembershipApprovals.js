/**
 * @file Membership approvals — section listing pending membership
 *   applications with approve / reject controls.
 * @module AdminMembershipApprovals
 */

'use client';

import {
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Avatar from './Avatar';

export default function MembershipApprovals({
  membershipUsers,
  onApprove,
  onReject,
  isPending,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // Update items per page based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(3); // Mobile: 3 items
      } else {
        setItemsPerPage(9); // Desktop: 9 items
      }
      setCurrentPage(1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPages = Math.ceil(membershipUsers.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentUsers = membershipUsers.slice(startIdx, endIdx);
  const hasPagination = membershipUsers.length > itemsPerPage;

  if (!membershipUsers || membershipUsers.length === 0) {
    return null;
  }

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">
          Membership Approvals ({membershipUsers.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {currentUsers.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                  {user.studentId && (
                    <p className="text-xs text-gray-600">{user.studentId}</p>
                  )}
                  {user.session && (
                    <p className="text-xs text-gray-600">Session {user.session}</p>
                  )}
                  {user.appliedAt && (
                    <p className="mt-1 text-xs text-gray-600">
                      Applied{' '}
                      {new Date(user.appliedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => onApprove(user)}
                disabled={isPending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                onClick={() => onReject(user)}
                disabled={isPending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasPagination && (
        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || isPending}
            className="order-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:order-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="order-3 flex flex-wrap items-center justify-center gap-2 sm:order-0">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                disabled={isPending}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'border border-blue-500/50 bg-blue-500/20 text-blue-400'
                    : 'border border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <div className="order-2 flex items-center justify-center text-xs text-gray-400 sm:order-0">
            Page {currentPage} of {totalPages}
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isPending}
            className="order-1 mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:order-0 sm:mt-0"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
