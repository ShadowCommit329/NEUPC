import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Loader, Search } from 'lucide-react';

function formatDateForInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toISOString().split('T')[0];
}

export default function MemberModal({
  type,
  member,
  positions,
  users,
  onClose,
  onCreate,
  onUpdate,
  isLoading,
}) {
  const isCreate = type === 'create';

  const [formData, setFormData] = useState({
    user_id: member?.user_id || '',
    position_id: member?.position_id || '',
    term_start: formatDateForInput(member?.term_start),
    term_end: formatDateForInput(member?.term_end),
    is_current: member?.is_current ? 'true' : 'false',
    bio: member?.bio || '',
  });

  const [searchUser, setSearchUser] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userPickerRef = useRef(null);

  const filteredUsers = useMemo(() => {
    if (!searchUser.trim()) return users || [];
    const query = searchUser.toLowerCase();
    return (users || []).filter(
      (u) =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [searchUser, users]);

  const selectedUser = useMemo(
    () => users?.find((u) => u.id === formData.user_id),
    [formData.user_id, users]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectUser = (userId) => {
    setFormData((prev) => ({ ...prev, user_id: userId }));
    setSearchUser('');
    setShowUserDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userPickerRef.current &&
        !userPickerRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData();

    if (isCreate) {
      form.append(
        'id',
        `cm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );
      form.append('user_id', formData.user_id);
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'user_id') {
          form.append(key, value);
        }
      });
      onCreate?.(form);
    } else {
      form.append('id', member.id);
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'user_id') {
          form.append(key, value);
        }
      });
      onUpdate(form);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-white/8 bg-[#161b22] px-6 py-4 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-sm font-bold text-white">
              {isCreate ? 'Assign Member' : 'Edit Member'}
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-600 font-mono">
              {isCreate
                ? '// assign a user to a position'
                : `// editing: ${member?.users?.full_name}`}
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
          {/* User Selection */}
          {isCreate ? (
            <div ref={userPickerRef} className="relative">
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                Select User <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={
                    selectedUser && !showUserDropdown
                      ? `${selectedUser.full_name} (${selectedUser.email})`
                      : searchUser
                  }
                  onChange={(e) => {
                    setSearchUser(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  required={!formData.user_id}
                  className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 pl-9 text-sm text-white placeholder-gray-700 outline-none transition-all focus:border-blue-500/40 focus:bg-white/6 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>

              {selectedUser && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Selected: {selectedUser.full_name}
                </p>
              )}

              {/* Dropdown Results */}
              {showUserDropdown && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg border border-white/10 bg-[#161b22] shadow-2xl max-h-48 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user.id)}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/6 transition-colors border-b border-white/4 last:border-0 flex flex-col"
                    >
                      <span className="font-mono text-xs font-medium text-white">
                        {user.full_name}
                      </span>
                      <span className="font-mono text-[10px] text-gray-600">
                        {user.email}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showUserDropdown &&
                filteredUsers.length === 0 &&
                searchUser && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg border border-white/10 bg-[#161b22] p-3 text-xs text-gray-500 font-mono">
                    No users found
                  </div>
                )}
            </div>
          ) : (
            <div className="rounded-lg border border-white/8 bg-[#161b22] p-3">
              <p className="text-[10px] text-gray-600 font-mono mb-1">
                member
              </p>
              <p className="text-sm font-medium text-white font-mono">
                {member?.users?.full_name}
              </p>
              <p className="text-[11px] text-gray-500 font-mono">
                {member?.users?.email}
              </p>
            </div>
          )}

          {/* Position */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
              Position <span className="text-red-400">*</span>
            </label>
            <select
              name="position_id"
              value={formData.position_id}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white outline-none transition-all focus:border-blue-500/40 focus:bg-white/6"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" disabled>
                Select position
              </option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.title} ({pos.category})
                </option>
              ))}
            </select>
          </div>

          {/* Term Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                Term Start <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="term_start"
                value={formData.term_start}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white outline-none transition-all focus:border-blue-500/40 focus:bg-white/6 focus:ring-1 focus:ring-blue-500/20"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                Term End
              </label>
              <input
                type="date"
                name="term_end"
                value={formData.term_end}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white outline-none transition-all focus:border-blue-500/40 focus:bg-white/6 focus:ring-1 focus:ring-blue-500/20"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
              Status
            </label>
            <select
              name="is_current"
              value={formData.is_current}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-white outline-none transition-all focus:border-blue-500/40 focus:bg-white/6"
              style={{ colorScheme: 'dark' }}
            >
              <option value="true">Current Term</option>
              <option value="false">Past Term</option>
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
              Biography
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              placeholder="Add member biography..."
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
              disabled={isLoading || (isCreate && !formData.user_id)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading && <Loader className="h-3.5 w-3.5 animate-spin" />}
              {isCreate ? 'Assign Member' : 'Update Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
