// src/hooks/LaboratoryHooks/useCumulativeAnnualCensus.ts
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  getAnnualCensusReceived,
  getAnnualCensusScreened,
  getAnnualCensusInitial,
} from '../../services/LaboratoryServices/cumulativeAnnualCencusService';
import type { AnnualCensusResponse } from '../../services/LaboratoryServices/cumulativeAnnualCencusService';

const SHARED_OPTIONS = {
  staleTime:           5 * 60 * 1000,  // 5 minutes
  gcTime:             10 * 60 * 1000,  // 10 minutes
  retry:               2,
  refetchOnWindowFocus: false,
};

/** Live 2026+ received samples — SPECTYPEs: 20, 2, 3, 4, 5, 87 */
export const useAnnualCensusReceived = (
  enabled = true
): UseQueryResult<AnnualCensusResponse, Error> =>
  useQuery<AnnualCensusResponse, Error>({
    queryKey: ['annual-census-received'],
    queryFn:  getAnnualCensusReceived,
    enabled,
    ...SHARED_OPTIONS,
  });

/** Live 2026+ screened samples — SPECTYPEs: 20, 2, 3, 4, 87 */
export const useAnnualCensusScreened = (
  enabled = true
): UseQueryResult<AnnualCensusResponse, Error> =>
  useQuery<AnnualCensusResponse, Error>({
    queryKey: ['annual-census-screened'],
    queryFn:  getAnnualCensusScreened,
    enabled,
    ...SHARED_OPTIONS,
  });

/** Live 2026+ initial samples — SPECTYPE: 20 */
export const useAnnualCensusInitial = (
  enabled = true
): UseQueryResult<AnnualCensusResponse, Error> =>
  useQuery<AnnualCensusResponse, Error>({
    queryKey: ['annual-census-initial'],
    queryFn:  getAnnualCensusInitial,
    enabled,
    ...SHARED_OPTIONS,
  });