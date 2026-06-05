import api from '../api';
import type { User } from '../../pages/settings/User';

export interface CreateUserPayload {
  username: string;
  password: string;
  name: string;
  dept: string;
  position: string;
  role: 'admin' | 'user';
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
export const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/admin/users');
  return data;
};

// ─── POST /api/admin/users ────────────────────────────────────────────────────
export const postUser = async (payload: CreateUserPayload): Promise<User> => {
  const { data } = await api.post('/admin/users', payload);
  return data;
};

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
export const removeUser = async (userId: number): Promise<void> => {
  await api.delete(`/admin/users/${userId}`);
};