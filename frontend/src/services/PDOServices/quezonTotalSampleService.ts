import api from '../api';

export interface SampleBreakdown {
  submid: string;
  descr1: string;
  total_count: number;
}

export interface SampleCityResult {
  city: string;
  county: string;
  total_count: number;
  breakdown: SampleBreakdown[];
}

export interface SampleNearbyResult {
  city: string;
  total_count: number;
  breakdown: SampleBreakdown[];
}

export interface QuezonSampleApiResponse {
  success: boolean;
  total_records: number;
  data: SampleCityResult[];
}

export interface NearbyLopezSampleApiResponse {
  success: boolean;
  total_records: number;
  data: SampleNearbyResult[];
}

export interface SampleParams {
  date_from: string;
  date_to: string;
}

export const getQuezonTotalSamples = async ({
  date_from,
  date_to,
}: SampleParams): Promise<QuezonSampleApiResponse> => {
  const { data } = await api.get<QuezonSampleApiResponse>('/samples/quezon', {
    params: { date_from, date_to },
  });
  return data;
};

export const getNearbyLopezTotalSamples = async ({
  date_from,
  date_to,
}: SampleParams): Promise<NearbyLopezSampleApiResponse> => {
  const { data } = await api.get<NearbyLopezSampleApiResponse>('/samples/nearby-lopez', {
    params: { date_from, date_to },
  });
  return data;
};