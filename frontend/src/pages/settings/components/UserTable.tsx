import React, { useState } from 'react';
import { ShieldCheck, Trash2, Search, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUsers, useDeleteUser } from '../../../hooks/AdminHooks/useUsers';
import type { User } from '../User';

interface UserTableProps {
  onEditAccess: (user: User) => void;
  onCreateUser: () => void;
}

const DEPT_COLORS: Record<string, string> = {
  'ADMIN':         'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'PDO':           'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  'LABORATORY':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'FOLLOWUP':      'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300',
  'IT JOB ORDER':  'bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-300',
  'PROGRAM':       'bg-cyan-100   text-cyan-700   dark:bg-cyan-900/30   dark:text-cyan-300',
};

const PAGE_SIZE = 15;

const getDeptColor = (dept: string) =>
  DEPT_COLORS[dept.toUpperCase()] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';

export const UserTable: React.FC<UserTableProps> = ({ onEditAccess, onCreateUser }) => {
  const [search, setSearch]               = useState('');
  const [deptFilter, setDeptFilter]       = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [page, setPage]                   = useState(1);

  const { data: users = [], isLoading, isError } = useUsers();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  // Unique departments derived from user list
  const departments = Array.from(new Set(users.map((u) => u.dept))).sort();

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase())     ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.dept.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? u.dept === deptFilter : true;
    return matchesSearch && matchesDept;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Reset to page 1 when filters change
  const safePage    = Math.min(page, totalPages);
  const paginated   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (value: string) => { setSearch(value); setPage(1); };
  const handleDept   = (value: string) => { setDeptFilter(value); setPage(1); };

  const handleDelete = (id: number) => {
    if (confirmDelete === id) {
      deleteUser(id, { onSuccess: () => setConfirmDelete(null) });
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Department filter */}
        <select
          value={deptFilter}
          onChange={(e) => handleDept(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

      </div>

      {/* ── States: Loading / Error ───────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading users…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center gap-2 py-16 text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm">Failed to load users. Please try again.</span>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                {['Name', 'Username', 'Department', 'Position', 'Role', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={`text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 ${
                      h === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 dark:text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                paginated.map((user) => (
                  <tr
                    key={user.user_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150"
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-100">{user.name}</span>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </td>

                    {/* Department */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getDeptColor(user.dept)}`}>
                        {user.dept}
                      </span>
                    </td>

                    {/* Position */}
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">
                      {user.position}
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditAccess(user)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition"
                        >
                          <ShieldCheck size={13} />
                          Access
                        </button>
                        <button
                          onClick={() => handleDelete(user.user_id)}
                          disabled={isDeleting}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${
                            confirmDelete === user.user_id
                              ? 'bg-red-600 text-white'
                              : 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40'
                          }`}
                        >
                          {isDeleting && confirmDelete === user.user_id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />
                          }
                          {confirmDelete === user.user_id ? 'Confirm?' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer: count + pagination ────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>
            Showing {paginated.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} users
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition ${
                      safePage === p
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};