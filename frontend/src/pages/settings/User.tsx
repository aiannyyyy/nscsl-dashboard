import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { UserTable } from './components/UserTable';
import { CreateUser } from './components/CreateUser';
import { EditUserAccess } from './components/EditUserAccess';

export interface User {
  user_id: number;
  username: string;
  name: string;
  dept: string;
  position: string;
  role: 'admin' | 'user' | 'super-user';
}

type Modal = 'create' | 'edit-access' | null;

export const User: React.FC = () => {
  const [modal, setModal]               = useState<Modal>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const openCreate = () => {
    setSelectedUser(null);
    setModal('create');
  };

  const openEditAccess = (user: User) => {
    setSelectedUser(user);
    setModal('edit-access');
  };

  // Called by CreateUser on success — immediately opens access modal
  const handleCreated = (newUser: User) => {
    setSelectedUser(newUser);
    setModal('edit-access');   // ← skip closing, go straight to access
  };

  const closeModal = () => {
    setModal(null);
    setSelectedUser(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage system users and their access permissions.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Table */}
      <UserTable onEditAccess={openEditAccess} onCreateUser={openCreate} />

      {/* Modals */}
      {modal === 'create' && (
        <CreateUser onClose={closeModal} onCreated={handleCreated} />
      )}
      {modal === 'edit-access' && selectedUser && (
        <EditUserAccess user={selectedUser} onClose={closeModal} />
      )}
    </div>
  );
};