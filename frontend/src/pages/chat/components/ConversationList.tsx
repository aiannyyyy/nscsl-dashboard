import React from 'react';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import type { Conversation } from '../../../services/ChatServices/chatService';
import {
  getConversationDisplayName,
  getConversationInitial,
  isUserOnline,
} from '../utils/conversationDisplay';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: number | null;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  isConnected: boolean;
  isLoading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  searchQuery,
  onSearchChange,
  onSelect,
  onNewChat,
  isConnected,
  isLoading = false,
}) => {
  const formatTime = (ts?: string) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filtered = conversations.filter((c) =>
    getConversationDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search + New */}
      <div className="px-3 pt-2 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400 w-full"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={onNewChat}
            className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="New conversation"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Connection indicator */}
      {!isConnected && (
        <div className="mx-3 mb-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-[10px] text-amber-700">Reconnecting…</span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Search size={16} className="text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">
                {searchQuery ? 'No results' : 'No conversations'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery ? `Nothing matched "${searchQuery}"` : 'Start one by tapping +'}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((conv) => {
              const name = getConversationDisplayName(conv);
              const isActive = conv.id === activeConversationId;
              // Strictly positive — never show 0
              const unread = Number(conv.unreadCount) || 0;
              const hasUnread = unread > 0;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                    isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                      isActive
                        ? 'bg-blue-600'
                        : 'bg-gradient-to-br from-slate-500 to-slate-700'
                    }`}>
                      {getConversationInitial(conv)}
                    </div>
                    {isUserOnline(conv.isOnline) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-xs truncate ${hasUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {name}
                      </span>
                      {conv.lastMessageTime && (
                        <span className={`text-[10px] flex-shrink-0 ${hasUnread ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                          {formatTime(conv.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[11px] truncate ${hasUnread ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                      {/* Only render badge when unread > 0 */}
                      {hasUnread && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;