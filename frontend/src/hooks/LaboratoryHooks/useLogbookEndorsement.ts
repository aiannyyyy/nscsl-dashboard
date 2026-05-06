import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  approveLogbookLabQa,
  approveLogbookTeamCaptain,
  createLogbookEndorsement,
  getAllLogbookEndorsements,
  getLogbookCategoryStats,
  getLogbookMnemonicStats,
  getLogbookEndorsementPatientDetails,
  updateLogbookEndorsement,
  type CreateLogbookEndorsementPayload,
  type LogbookEndorsementListResponse,
  type LogbookLookupResponse,
  type LogbookStatsResponse,
  type UpdateLogbookEndorsementPayload,
  type LabQaApproveRole,
} from '../../services/LaboratoryServices/logbookEndorsementServices';
import { FOLLOWUP_LOGBOOK_ENDORSEMENT_QUERY_ROOT } from '../../services/FollowupServices/funLogbookEndorsementService';
import { notificationKeys } from '../useNotifications';

export const logbookEndorsementKeys = {
  all: ['logbookEndorsement'] as const,
  details: () => [...logbookEndorsementKeys.all, 'detail'] as const,
  detail: (labno: string) => [...logbookEndorsementKeys.details(), labno] as const,
  list: () => [...logbookEndorsementKeys.all, 'list'] as const,
  stats: () => [...logbookEndorsementKeys.all, 'stats'] as const,
  categoryStats: () => [...logbookEndorsementKeys.stats(), 'category'] as const,
  mnemonicStats: () => [...logbookEndorsementKeys.stats(), 'mnemonic'] as const,
};

export const useLogbookEndorsementLookup = (
  labno: string,
  enabled = true
): UseQueryResult<LogbookLookupResponse, Error> => {
  const trimmedLabno = labno.trim();

  return useQuery<LogbookLookupResponse, Error>({
    queryKey: logbookEndorsementKeys.detail(trimmedLabno),
    queryFn: () => getLogbookEndorsementPatientDetails(trimmedLabno),
    enabled: enabled && !!trimmedLabno,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useLogbookEndorsement = useLogbookEndorsementLookup;

export const useLogbookEndorsementList = (): UseQueryResult<LogbookEndorsementListResponse, Error> => {
  return useQuery<LogbookEndorsementListResponse, Error>({
    queryKey: logbookEndorsementKeys.list(),
    queryFn: getAllLogbookEndorsements,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
};

export const useLogbookCategoryStats = (): UseQueryResult<LogbookStatsResponse, Error> => {
  return useQuery<LogbookStatsResponse, Error>({
    queryKey: logbookEndorsementKeys.categoryStats(),
    queryFn: getLogbookCategoryStats,
    staleTime: 60 * 1000,
  });
};

export const useLogbookMnemonicStats = (): UseQueryResult<LogbookStatsResponse, Error> => {
  return useQuery<LogbookStatsResponse, Error>({
    queryKey: logbookEndorsementKeys.mnemonicStats(),
    queryFn: getLogbookMnemonicStats,
    staleTime: 60 * 1000,
  });
};

export const useCreateLogbookEndorsement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLogbookEndorsementPayload) => createLogbookEndorsement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookEndorsementKeys.all });
      queryClient.invalidateQueries({ queryKey: FOLLOWUP_LOGBOOK_ENDORSEMENT_QUERY_ROOT });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useUpdateLogbookEndorsement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLogbookEndorsementPayload) => updateLogbookEndorsement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookEndorsementKeys.all });
    },
  });
};

export const useApproveLogbookTeamCaptain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveLogbookTeamCaptain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookEndorsementKeys.all });
      queryClient.invalidateQueries({ queryKey: FOLLOWUP_LOGBOOK_ENDORSEMENT_QUERY_ROOT });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useApproveLogbookLabQa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: LabQaApproveRole }) =>
      approveLogbookLabQa(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookEndorsementKeys.all });
      queryClient.invalidateQueries({ queryKey: FOLLOWUP_LOGBOOK_ENDORSEMENT_QUERY_ROOT });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export default {
  useLogbookEndorsementLookup,
  useLogbookEndorsement,
  useLogbookEndorsementList,
  useLogbookCategoryStats,
  useLogbookMnemonicStats,
  useCreateLogbookEndorsement,
  useUpdateLogbookEndorsement,
  useApproveLogbookTeamCaptain,
  useApproveLogbookLabQa,
};
