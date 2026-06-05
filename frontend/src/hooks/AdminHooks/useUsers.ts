import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, postUser, removeUser, putChangePassword } from '../../services/AdminServices/userService';
import type { CreateUserPayload, ChangePasswordPayload } from '../../services/AdminServices/userService';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const userKeys = {
  all: ['users'] as const,
};

// ─── useUsers ─────────────────────────────────────────────────────────────────
export const useUsers = () =>
  useQuery({
    queryKey: userKeys.all,
    queryFn:  fetchUsers,
  });

// ─── useCreateUser ────────────────────────────────────────────────────────────
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => postUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

// ─── useDeleteUser ────────────────────────────────────────────────────────────
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => removeUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

// ─── useChangePassword ────────────────────────────────────────────────────────
// Sends current + new password to the backend for verification and update.
// Throws with a user-friendly message on failure so the modal can display it.
export const useChangePassword = () =>
  useMutation({
    mutationFn: (payload: ChangePasswordPayload) => putChangePassword(payload),
    onError: (error: unknown) => {
      // Re-throw so the modal's catch block receives the message
      throw error;
    },
  });