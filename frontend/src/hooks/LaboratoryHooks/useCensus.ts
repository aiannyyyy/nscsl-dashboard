// src/hooks/LaboratoryHooks/useCensus.ts
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import CensusService from '../../services/LaboratoryServices/censusService';
import type {
    CumulativeCensusParams,
    CumulativeCensusResponse,
    CensusError,
} from '../../services/LaboratoryServices/censusService';

/**
 * Base hook to fetch cumulative monthly census data.
 * Fetches live data only (2026+). Historical 2013–2025 is merged in the component.
 */
export const useCumulativeMonthlyCensus = (
    params: CumulativeCensusParams,
    enabled: boolean = true
): UseQueryResult<CumulativeCensusResponse, CensusError> => {
    return useQuery<CumulativeCensusResponse, CensusError>({
        queryKey: ['cumulative-monthly-census', params.type],
        queryFn: () => CensusService.getCumulativeMonthlyCensus(params),
        enabled: enabled && !!params.type,
        staleTime: 5 * 60 * 1000,   // 5 minutes
        gcTime:    10 * 60 * 1000,  // 10 minutes
        retry: 2,
        refetchOnWindowFocus: false,
    });
};

/**
 * Convenience hook — always fetches "Received" data.
 * This is the only supported type; use this instead of useCumulativeMonthlyCensus directly.
 */
export const useReceivedCensus = (
    enabled: boolean = true
): UseQueryResult<CumulativeCensusResponse, CensusError> => {
    return useCumulativeMonthlyCensus({ type: 'Received' }, enabled);
};