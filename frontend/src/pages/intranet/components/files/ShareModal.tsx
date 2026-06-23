import { Mail, Send, User, X } from 'lucide-react';
import type { ShareUser } from './types';

interface ShareModalProps {
  selectedUsers: ShareUser[];
  userSearchQuery: string;
  filteredUsers: ShareUser[];
  showUserDropdown: boolean;
  shareMessage: string;
  isSharing: boolean;
  onClose: () => void;
  onUserSearchChange: (query: string) => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
  onAddUser: (user: ShareUser) => void;
  onRemoveUser: (userId: string | number) => void;
  onShareMessageChange: (message: string) => void;
  onShare: (useOutlook: boolean) => void;
}

export default function ShareModal({
  selectedUsers,
  userSearchQuery,
  filteredUsers,
  showUserDropdown,
  shareMessage,
  isSharing,
  onClose,
  onUserSearchChange,
  onSearchKeyDown,
  onAddUser,
  onRemoveUser,
  onShareMessageChange,
  onShare,
}: ShareModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Share Files</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Share with</label>
            <div className="relative">
              <div className="min-h-[42px] w-full px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      <User className="w-3 h-3" />
                      <span>{user.name}</span>
                      <button onClick={() => onRemoveUser(user.id!)} className="hover:bg-blue-200 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={e => onUserSearchChange(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder={selectedUsers.length === 0 ? 'Search by name, email, or department...' : ''}
                    className="flex-1 min-w-[200px] outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
              {showUserDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto z-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => onAddUser(user)}
                      className="w-full px-3 py-2 text-left flex items-center gap-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-100 dark:border-gray-600"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        {user.department && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">{user.department}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Message (optional)</label>
            <textarea
              value={shareMessage}
              onChange={e => onShareMessageChange(e.target.value)}
              placeholder="Add a message..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isSharing}
              className="flex-1 px-4 py-2 border rounded-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onShare(true)}
              disabled={selectedUsers.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" /> Open in Outlook
            </button>
            <button
              onClick={() => onShare(false)}
              disabled={selectedUsers.length === 0 || isSharing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSharing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Sharing…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Share via System
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
