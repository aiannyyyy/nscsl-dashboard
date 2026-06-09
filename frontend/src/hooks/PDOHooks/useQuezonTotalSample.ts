import { useQuery } from '@tanstack/react-query';
import {
  getQuezonTotalSamples,
  getNearbyLopezTotalSamples,
  type SampleParams,
  type QuezonSampleApiResponse,
  type NearbyLopezSampleApiResponse,
} from '../../services/PDOServices/quezonTotalSampleService';
import type { UseQueryOptions } from '@tanstack/react-query';

export const quezonSampleQueryKeys = {
  all: ['quezonSamples'] as const,
  quezon: (params: SampleParams) => ['quezonSamples', 'quezon', params] as const,
  nearbyLopez: (params: SampleParams) => ['quezonSamples', 'nearby-lopez', params] as const,
};

export const useQuezonTotalSamples = (
  params: SampleParams,
  options?: Omit<UseQueryOptions<QuezonSampleApiResponse>, 'queryKey' | 'queryFn'>
) => {
  const { date_from, date_to } = params;

  return useQuery<QuezonSampleApiResponse>({
    queryKey: quezonSampleQueryKeys.quezon({ date_from, date_to }),
    queryFn: () => getQuezonTotalSamples({ date_from, date_to }),
    enabled: Boolean(date_from && date_to),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    ...options,
  });
};

export const useNearbyLopezTotalSamples = (
  params: SampleParams,
  options?: Omit<UseQueryOptions<NearbyLopezSampleApiResponse>, 'queryKey' | 'queryFn'>
) => {
  const { date_from, date_to } = params;

  return useQuery<NearbyLopezSampleApiResponse>({
    queryKey: quezonSampleQueryKeys.nearbyLopez({ date_from, date_to }),
    queryFn: () => getNearbyLopezTotalSamples({ date_from, date_to }),
    enabled: Boolean(date_from && date_to),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    ...options,
  });
};