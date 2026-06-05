import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, postUser, removeUser } from '../../services/AdminServices/userService';
import type { CreateUserPayload } from '../../services/AdminServices/userService';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const userKeys = {
  all: ['users'] as const,
};

// ─── useUsers ─────────────────────────────────────────────────────────────────
// Fetches all users. Use in UserTable.
export const useUsers = () =>
  useQuery({
    queryKey: userKeys.all,
    queryFn:  fetchUsers,
  });

// ─── useCreateUser ────────────────────────────────────────────────────────────
// Creates a user then refreshes the list. Use in CreateUser modal.
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
// Deletes a user then refreshes the list. Use in UserTable.
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => removeUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};