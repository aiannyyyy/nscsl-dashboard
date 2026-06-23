import type { QueryClient } from '@tanstack/react-query';
import { fileKeys } from '../../hooks/IntranetHooks/useFiles';
import { categoryKeys } from '../../hooks/IntranetHooks/useCategories';
import { shareKeys } from '../../hooks/IntranetHooks/useShare';

/** Refresh intranet dashboard data after create/update/delete/star/upload/move. */
export function invalidateIntranetDashboard(queryClient: QueryClient, userId?: number) {
  queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
  queryClient.invalidateQueries({ queryKey: fileKeys.activityLogs() });
  queryClient.invalidateQueries({ queryKey: shareKeys.sharedWithMe() });

  if (userId) {
    queryClient.invalidateQueries({ queryKey: fileKeys.starred(userId) });
    queryClient.invalidateQueries({ queryKey: categoryKeys.starredFiles(userId) });
  }
}
