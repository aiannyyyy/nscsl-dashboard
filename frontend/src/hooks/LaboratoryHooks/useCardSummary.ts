import { useQuery } from '@tanstack/react-query';
import cardSummaryService from '../../services/LaboratoryServices/cardSummary';
import type {
    CardSummaryResponse,
    CardSummaryParams,
} from '../../services/LaboratoryServices/cardSummary';

/**
 * General hook — supports all filters (dateFrom, dateTo, spectype).
 */
export const useCardSummary = (params?: CardSummaryParams) => {
    return useQuery<CardSummaryResponse>({
        queryKey: ['labCardSummary', params?.dateFrom, params?.dateTo, params?.spectype],
        queryFn:  () => cardSummaryService.getCardSummary(params ?? {}),
        staleTime:           5 * 60 * 1000,
        gcTime:             10 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: 2,
    });
};

/**
 * Current month summary (no filters).
 * Auto-refreshes every 2 minutes — suited for dashboard cards.
 */
export const useCurrentMonthSummary = () => {
    return useQuery<CardSummaryResponse>({
        queryKey: ['labCardSummary', 'current-month'],
        queryFn:  () => cardSummaryService.getCurrentMonthSummary(),
        staleTime:            5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval:      2 * 60 * 1000,
    });
};

/**
 * Custom date range hook.
 * Pass enabled=false to defer fetching (e.g. waiting for user input).
 */
export const useCustomRangeSummary = (
    dateFrom: string,
    dateTo:   string,
    enabled:  boolean = true
) => {
    return useQuery<CardSummaryResponse>({
        queryKey: ['labCardSummary', 'custom', dateFrom, dateTo],
        queryFn:  () => cardSummaryService.getCustomRangeSummary(dateFrom, dateTo),
        enabled:  enabled && !!dateFrom && !!dateTo,
        staleTime:            5 * 60 * 1000,
        refetchOnWindowFocus: true,
    });
};