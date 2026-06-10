import React, { useState, useEffect } from 'react';
import { Search, X, ArrowLeft, Loader2 } from 'lucide-react';
import { useChatUsers } from '../../../hooks/ChatHooks/useChat';
import { isUserOnline } from '../utils/conversationDisplay';

interface UserSearchProps {
  currentUserId: number;
  onSelectUser: (userId: number) => void;
  onBack: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ currentUserId, onSelectUser, onBack }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [], isLoading } = useChatUsers(debouncedSearch);
  const filtered = users.filter((u) => u.id !== currentUserId);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-slate-800">New Message</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
          <Search size={13} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400 w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-24 gap-2 text-slate-400">
            <Loader2 size={15} className="animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
              <Search size={15} className="text-slate-400" />
            </div>
            <p className="text-xs text-slate-400">
              {search ? `No results for "${search}"` : 'No users available'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs font-semibold">
                    {(user.position || user.name).charAt(0).toUpperCase()}
                  </div>
                  {isUserOnline(user.isOnline) && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {user.position || user.name}
                  </p>
                  {user.department && (
                    <p className="text-xs text-slate-400 truncate">{user.department}</p>
                  )}
                </div>
                {isUserOnline(user.isOnline) && (
                  <span className="text-xs text-emerald-500 font-medium flex-shrink-0">Online</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;