import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import type { Conversation } from '../../../services/ChatServices/chatService';
import {
  getConversationDisplayName,
  getConversationInitial,
  isUserOnline,
} from '../utils/conversationDisplay';

interface ChatHeaderProps {
  conversation: Conversation | null;
  onBack: () => void;
  onToggleSearch: () => void;
  searchActive: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack,
  onToggleSearch,
  searchActive,
}) => {
  const displayName = getConversationDisplayName(conversation);
  const initial = getConversationInitial(conversation);

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 bg-white flex-shrink-0">
      <button
        onClick={onBack}
        className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        aria-label="Back to conversations"
      >
        <ArrowLeft size={16} />
      </button>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs font-semibold">
          {initial}
        </div>
        {isUserOnline(conversation?.isOnline) && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-slate-800 truncate leading-tight">
          {displayName}
        </p>
        <p className="text-xs leading-tight">
          {isUserOnline(conversation?.isOnline) ? (
            <span className="text-emerald-500">Active now</span>
          ) : (
            <span className="text-slate-400">Offline</span>
          )}
        </p>
      </div>

      {/* Search only — no call button */}
      <button
        onClick={onToggleSearch}
        className={`p-1.5 rounded-lg transition-colors ${
          searchActive
            ? 'text-blue-600 bg-blue-50'
            : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
        }`}
        aria-label="Search messages"
      >
        <Search size={15} />
      </button>
    </div>
  );
};

export default ChatHeader;