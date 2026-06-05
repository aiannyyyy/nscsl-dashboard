import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserAccess, putUserAccess } from '../../services/AdminServices/accessService';
import type { AccessState } from '../../services/AdminServices/accessService';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const accessKeys = {
  all:    ['access'] as const,
  byUser: (userId: number) => ['access', userId] as const,
};

// ─── useUserAccess ────────────────────────────────────────────────────────────
// Fetches saved access state for a specific user.
// Only runs when a userId is provided (i.e. when the modal is open).
export const useUserAccess = (userId: number | null) =>
  useQuery({
    queryKey: accessKeys.byUser(userId!),
    queryFn:  () => fetchUserAccess(userId!),
    enabled:  userId !== null,
  });

// ─── useSaveUserAccess ────────────────────────────────────────────────────────
// Saves (upserts) the full access state for a user.
// Invalidates that user's access cache on success.
export const useSaveUserAccess = (userId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (state: AccessState) => putUserAccess(userId, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessKeys.byUser(userId) });
    },
  });
};