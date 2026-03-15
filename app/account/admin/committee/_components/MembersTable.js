import { Edit3, Trash2, User } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function StatusBadge({ isCurrent }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        isCurrent
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
          : 'bg-gray-500/15 text-gray-400 border-gray-500/20'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isCurrent ? 'bg-emerald-400' : 'bg-gray-500'}`}
      />
      {isCurrent ? 'Active' : 'Past'}
    </span>
  );
}

export default function MembersTable({ members, positions, onEdit, onDelete }) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-[#0d1117]">
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/6 bg-[#161b22]">
              <th className="w-8 px-3 py-3 text-center font-medium text-gray-700">
                #
              </th>
              <th className="px-4 py-3 font-medium text-gray-500">member</th>
              <th className="px-4 py-3 font-medium text-gray-500">position</th>
              <th className="px-4 py-3 font-medium text-gray-500">status</th>
              <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">
                term
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">
                actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {members.map((member, index) => {
              const position = positions.find(
                (p) => p.id === member.position_id
              );
              return (
                <tr
                  key={member.id}
                  className="group transition-colors hover:bg-[#161b22]"
                >
                  <td className="px-3 py-3 text-center font-mono text-[10px] text-gray-700 select-none">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1c2128] ring-1 ring-white/8">
                        <User className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-gray-200 truncate">
                          {member.users?.full_name || 'Unknown'}
                        </p>
                        <p className="truncate font-mono text-[10px] text-gray-600">
                          {member.users?.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-300">
                        {position?.title || '—'}
                      </p>
                      {position && (
                        <p className="font-mono text-[10px] text-gray-600">
                          {position.category.charAt(0).toUpperCase() +
                            position.category.slice(1)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge isCurrent={member.is_current} />
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="font-mono text-[11px] text-gray-500">
                      {formatDate(member.term_start)}
                      {member.term_end && ` → ${formatDate(member.term_end)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(member)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-blue-400"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(member.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-red-400"
                        title="Remove"
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

      {/* Mobile Card View */}
      <div className="divide-y divide-white/5 md:hidden">
        {members.map((member, index) => {
          const position = positions.find((p) => p.id === member.position_id);
          return (
            <div
              key={member.id}
              className="p-4 transition-colors hover:bg-[#161b22]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] text-gray-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1c2128] ring-1 ring-white/8">
                      <User className="h-3 w-3 text-gray-600" />
                    </div>
                    <p className="font-mono text-xs font-semibold text-gray-200 truncate">
                      {member.users?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <p className="mt-1 ml-[3.75rem] font-mono text-[10px] text-gray-600 truncate">
                    {member.users?.email}
                  </p>

                  <div className="mt-2 ml-[3.75rem] flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-gray-400">
                      {position?.title || '—'}
                    </span>
                    <StatusBadge isCurrent={member.is_current} />
                  </div>

                  <div className="mt-1.5 ml-[3.75rem] font-mono text-[10px] text-gray-600">
                    {formatDate(member.term_start)}
                    {member.term_end && ` → ${formatDate(member.term_end)}`}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onEdit(member)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-blue-400"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(member.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
