import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import type { ChangePasswordPayload } from './components/ChangePasswordModal';
import { useChangePassword } from '../../hooks/AdminHooks/useUsers';
import { useAuth } from '../../hooks/useAuth';

type Modal = 'change-password' | null;

export const ChangePassword: React.FC = () => {
  const [modal, setModal] = useState<Modal>(null);
  const { user }          = useAuth();
  const { mutateAsync }   = useChangePassword();

  const openModal  = () => setModal('change-password');
  const closeModal = () => setModal(null);

  const handleSubmit = async (payload: ChangePasswordPayload): Promise<void> => {
    if (!user?.id) throw new Error('User session not found. Please log in again.');

    try {
      await mutateAsync({
        userId:          Number(user.id),
        currentPassword: payload.currentPassword,
        newPassword:     payload.newPassword,
      });
    } catch (err: unknown) {
      // Surface the backend error message to the modal
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Failed to update password. Please try again.');
      throw new Error(message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password & Security</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your account password and security settings.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
        >
          <KeyRound size={16} />
          Change Password
        </button>
      </div>

      {/* Security info card */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Account</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {user?.name} · @{user?.email}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
            {user?.role}
          </span>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Password</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Use a strong password with letters, numbers, and symbols.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            ••••••••
          </span>
        </div>
      </div>

      {/* Modal */}
      {modal === 'change-password' && (
        <ChangePasswordModal
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};