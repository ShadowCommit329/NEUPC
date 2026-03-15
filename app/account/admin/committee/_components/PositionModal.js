import { useState } from 'react';
import { X, Loader } from 'lucide-react';

export default function PositionModal({
  type,
  position,
  onClose,
  onCreate,
  onUpdate,
  isLoading,
}) {
  const [formData, setFormData] = useState({
    title: position?.title || '',
    category: position?.category || 'executive',
    rank: position?.rank || '',
    display_order: position?.display_order || '0',
    responsibilities: position?.responsibilities || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData();

    if (type === 'edit' && position?.id) {
      form.append('id', position.id);
      Object.entries(formData).forEach(([key, value]) => {
        form.append(key, value);
      });
      onUpdate(form);
    } else {
      Object.entries(formData).forEach(([key, value]) => {
        form.append(key, value);
      });
      onCreate(form);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 bg-[#161b22] px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-white">
              {type === 'create' ? 'Create Position' : 'Edit Position'}
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-600 font-mono">
              {type === 'create'
                ? '// define a new committee role'
                : `// editing: ${position?.title}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
              Position Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., President, Vice President"
              className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white placeholder-gray-700 outline-none transition-all focus:border-blue-500/40 focus:bg-white/6 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white outline-none transition-all focus:border-blue-500/40 focus:bg-white/6"
                style={{ colorScheme: 'dark' }}
              >
                <option value="executive">Executive</option>
                <option value="mentor">Mentor</option>
                <option value="advisor">Advisor</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                Rank
              </label>
              <input
                type="number"
                name="rank"
                value={formData.rank}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white placeholder-gray-700 outline-none transition-all focus:border-blue-500/40 focus:bg-white/6 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
              Display Order
            </label>
            <input
              type="number"
              name="display_order"
              value={formData.display_order}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white outline-none transition-all focus:border-blue-500/40 focus:bg-white/6 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
              Responsibilities
            </label>
            <textarea
              name="responsibilities"
              value={formData.responsibilities}
              onChange={handleChange}
              rows={3}
              placeholder="Describe role responsibilities..."
              className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white placeholder-gray-700 outline-none transition-all focus:border-blue-500/40 focus:bg-white/6 focus:ring-1 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 border-t border-white/8 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-white/6 py-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading && <Loader className="h-3.5 w-3.5 animate-spin" />}
              {type === 'create' ? 'Create' : 'Update'} Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
