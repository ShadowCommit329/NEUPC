import { Edit3, Trash2 } from 'lucide-react';

function CategoryBadge({ category }) {
  const styles = {
    executive: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    mentor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
    advisor: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        styles[category] ||
        'bg-gray-500/15 text-gray-300 border-gray-500/20'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          {
            executive: 'bg-purple-400',
            mentor: 'bg-cyan-400',
            advisor: 'bg-amber-400',
          }[category] || 'bg-gray-400'
        }`}
      />
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}

export default function PositionsTable({ positions, onEdit, onDelete }) {
  if (positions.length === 0) {
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
              <th className="px-4 py-3 font-medium text-gray-500">title</th>
              <th className="px-4 py-3 font-medium text-gray-500">category</th>
              <th className="px-4 py-3 font-medium text-gray-500">rank</th>
              <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">
                order
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">
                actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {positions.map((position, index) => (
              <tr
                key={position.id}
                className="group transition-colors hover:bg-[#161b22]"
              >
                <td className="px-3 py-3 text-center font-mono text-[10px] text-gray-700 select-none">
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-gray-200">
                      {position.title}
                    </p>
                    {position.responsibilities && (
                      <p className="mt-0.5 truncate font-mono text-[10px] text-gray-600 max-w-xs">
                        {position.responsibilities}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={position.category} />
                </td>
                <td className="px-4 py-3 font-mono text-gray-500 tabular-nums">
                  {position.rank ?? '—'}
                </td>
                <td className="hidden px-4 py-3 font-mono text-gray-500 tabular-nums lg:table-cell">
                  {position.display_order ?? '0'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(position)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-blue-400"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(position.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="divide-y divide-white/5 md:hidden">
        {positions.map((position, index) => (
          <div
            key={position.id}
            className="p-4 transition-colors hover:bg-[#161b22]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-gray-700">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="font-mono text-xs font-semibold text-gray-200 truncate">
                    {position.title}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <CategoryBadge category={position.category} />
                  <span className="font-mono text-[10px] text-gray-600">
                    rank: {position.rank ?? '—'}
                  </span>
                </div>
                {position.responsibilities && (
                  <p className="mt-1.5 font-mono text-[10px] text-gray-600 line-clamp-2">
                    {position.responsibilities}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => onEdit(position)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-blue-400"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(position.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
