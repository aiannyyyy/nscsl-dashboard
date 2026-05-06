import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  getAllLogbookEndorsements,
  getLogbookEndorsementsRecalledSection,
  getLogbookCategoryStats,
  getLogbookMnemonicStats,
  doneRecallLogbookEndorsement,
  FOLLOWUP_LOGBOOK_ENDORSEMENT_QUERY_ROOT,
  type LogbookEndorsementListResponse,
  type LogbookStatsResponse,
} from '../../services/FollowupServices/funLogbookEndorsementService';

export const followupLogbookEndorsementKeys = {
  all: FOLLOWUP_LOGBOOK_ENDORSEMENT_QUERY_ROOT,
  list: () => [...followupLogbookEndorsementKeys.all, 'list'] as const,
  /** Full archive ( `/recalled` ) — invalidated with `all` prefix. */
  listRecalled: () => [...followupLogbookEndorsementKeys.all, 'listRecalled'] as const,
  stats: () => [...followupLogbookEndorsementKeys.all, 'stats'] as const,
  categoryStats: () => [...followupLogbookEndorsementKeys.stats(), 'category'] as const,
  mnemonicStats: () => [...followupLogbookEndorsementKeys.stats(), 'mnemonic'] as const,
};

/** Rows on FUN recall queue: TC approved, LM+QAO merged in `qao`, FUN not yet recorded (server enforced). */
export const useLogbookEndorsementList = (): UseQueryResult<LogbookEndorsementListResponse, Error> => {
  return useQuery<LogbookEndorsementListResponse, Error>({
    queryKey: followupLogbookEndorsementKeys.list(),
    queryFn: getAllLogbookEndorsements,
    staleTime: 60 * 1000,
  });
};

export const useLogbookEndorsementRecalledSectionList = (): UseQueryResult<LogbookEndorsementListResponse, Error> => {
  return useQuery<LogbookEndorsementListResponse, Error>({
    queryKey: followupLogbookEndorsementKeys.listRecalled(),
    queryFn: getLogbookEndorsementsRecalledSection,
    staleTime: 60 * 1000,
  });
};

export const useLogbookCategoryStats = (): UseQueryResult<LogbookStatsResponse, Error> => {
  return useQuery<LogbookStatsResponse, Error>({
    queryKey: followupLogbookEndorsementKeys.categoryStats(),
    queryFn: getLogbookCategoryStats,
    staleTime: 60 * 1000,
  });
};

export const useLogbookMnemonicStats = (): UseQueryResult<LogbookStatsResponse, Error> => {
  return useQuery<LogbookStatsResponse, Error>({
    queryKey: followupLogbookEndorsementKeys.mnemonicStats(),
    queryFn: getLogbookMnemonicStats,
    staleTime: 60 * 1000,
  });
};

export const useDoneRecallLogbookEndorsement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fun,
      modified_by,
    }: {
      id: number;
      fun: string;
      modified_by?: string;
    }) => doneRecallLogbookEndorsement(id, { fun, modified_by }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followupLogbookEndorsementKeys.all });
    },
  });
};

export default {
  followupLogbookEndorsementKeys,
  useLogbookEndorsementList,
  useLogbookEndorsementRecalledSectionList,
  useLogbookCategoryStats,
  useLogbookMnemonicStats,
  useDoneRecallLogbookEndorsement,
};
