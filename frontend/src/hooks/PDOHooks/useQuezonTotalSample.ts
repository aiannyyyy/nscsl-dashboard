import { useQuery } from '@tanstack/react-query';
import {
  getQuezonTotalSamples,
  getNearbyLopezTotalSamples,
  type SampleParams,
  type NearbyLopezParams,
  type QuezonSampleApiResponse,
  type NearbyLopezSampleApiResponse,
} from '../../services/PDOServices/quezonTotalSampleService';
import type { UseQueryOptions } from '@tanstack/react-query';

export const quezonSampleQueryKeys = {
  all:        ['quezonSamples'] as const,
  province:   (params: SampleParams)       => ['quezonSamples', 'province',     params] as const,
  nearbyLopez:(params: NearbyLopezParams)  => ['quezonSamples', 'nearby-lopez', params] as const,
};

export const useProvinceTotalSamples = (
  params: SampleParams,
  options?: Omit<UseQueryOptions<QuezonSampleApiResponse>, 'queryKey' | 'queryFn'>
) => {
  const { date_from, date_to, county } = params;

  return useQuery<QuezonSampleApiResponse>({
    queryKey:  quezonSampleQueryKeys.province({ date_from, date_to, county }),
    queryFn:   () => getQuezonTotalSamples({ date_from, date_to, county }),
    enabled:   Boolean(date_from && date_to && county),  // base enabled
    staleTime: 1000 * 60 * 5,
    retry:     2,
    ...options,  // lazy: caller can override enabled to false
  });
};

export const useNearbyLopezTotalSamples = (
  params: NearbyLopezParams,
  options?: Omit<UseQueryOptions<NearbyLopezSampleApiResponse>, 'queryKey' | 'queryFn'>
) => {
  const { date_from, date_to } = params;

  return useQuery<NearbyLopezSampleApiResponse>({
    queryKey:  quezonSampleQueryKeys.nearbyLopez({ date_from, date_to }),
    queryFn:   () => getNearbyLopezTotalSamples({ date_from, date_to }),
    enabled:   Boolean(date_from && date_to),
    staleTime: 1000 * 60 * 5,
    retry:     2,
    ...options,
  });
};