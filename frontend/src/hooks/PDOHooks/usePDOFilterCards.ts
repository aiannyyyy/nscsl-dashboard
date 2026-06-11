import { useQuery } from '@tanstack/react-query';
import {
  getNearbyLopezPurchasedFilterCards,
  getCalabarzOnPurchasedFilterCards,
  type FilterCardParams,
  type FilterCardResponse,
  type CalabarzOnFilterCardResponse,
} from '../../services/PDOServices/lopezFilterCardServices';

export const PDO_FILTER_CARD_KEYS = {
  all:         ['pdo', 'filter-cards']                                          as const,
  nearbyLopez: (params: FilterCardParams) => ['pdo', 'filter-cards', 'nearby-lopez', params] as const,
  calabarzon:  (params: FilterCardParams) => ['pdo', 'filter-cards', 'calabarzon',   params] as const,
};

// ── Nearby Lopez (SUBMID-based) ───────────────────────────────
export const useNearbyLopezPurchasedFilterCards = (
  params: FilterCardParams,
  enabled = false
) => {
  return useQuery<FilterCardResponse, Error>({
    queryKey:             PDO_FILTER_CARD_KEYS.nearbyLopez(params),
    queryFn:              () => getNearbyLopezPurchasedFilterCards(params),
    enabled,
    staleTime:            5 * 60 * 1000,
    gcTime:               10 * 60 * 1000,
    retry:                1,
    refetchOnWindowFocus: false,
  });
};

// ── CALABARZON ────────────────────────────────────────────────
export const useCalabarzOnPurchasedFilterCards = (
  params: FilterCardParams,
  enabled = false
) => {
  return useQuery<CalabarzOnFilterCardResponse, Error>({
    queryKey:             PDO_FILTER_CARD_KEYS.calabarzon(params),
    queryFn:              () => getCalabarzOnPurchasedFilterCards(params),
    enabled,
    staleTime:            5 * 60 * 1000,
    gcTime:               10 * 60 * 1000,
    retry:                1,
    refetchOnWindowFocus: false,
  });
};