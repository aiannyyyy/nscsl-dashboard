import { Loader, Share2, Trash2, X } from 'lucide-react';
import type { FileItem, FileShare } from './types';

interface ManageSharesModalProps {
  file: FileItem;
  shares: FileShare[];
  loading: boolean;
  onClose: () => void;
  onRemoveShare: (shareId: number) => void;
  onShareWithMore: () => void;
}

export default function ManageSharesModal({
  file,
  shares,
  loading,
  onClose,
  onRemoveShare,
  onShareWithMore,
}: ManageSharesModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage Access: {file.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading…</span>
            </div>
          ) : shares.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm mb-3 text-gray-600 dark:text-gray-400">
                {shares.length} user(s) have access to this file
              </p>
              {shares.map(share => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 border rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {share.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{share.username}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{share.email}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Shared on {new Date(share.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveShare(share.id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Share2 className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>This file is not shared with anyone yet</p>
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onShareWithMore}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Share2 className="w-4 h-4" /> Share with More Users
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
