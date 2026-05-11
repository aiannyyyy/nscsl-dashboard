import { useQuery } from '@tanstack/react-query';
import { getPatientResultTable, getPatientDisorderResultTable } from '../../services/FollowupServices/cmsUrgentServices';
import type { PatientResultResponse, PatientDisorderResultResponse } from '../../services/FollowupServices/cmsUrgentServices';

const CMS_URGENT_KEYS = {
    all: ['cmsUrgent'] as const,
    patientResults: (date: string) => [...CMS_URGENT_KEYS.all, 'patientResults', date] as const,
    patientDisorderResults: (labno: string) => [...CMS_URGENT_KEYS.all, 'patientDisorderResults', labno] as const,
};

export const useGetPatientResultTable = (date: string) => {
    return useQuery<PatientResultResponse>({
        queryKey: CMS_URGENT_KEYS.patientResults(date),
        queryFn: () => getPatientResultTable(date),
        enabled: !!date,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchInterval: 1000 * 60 * 5,
        refetchIntervalInBackground: false,
    });
};

export const useGetPatientDisorderResultTable = (labno: string) => {
    return useQuery<PatientDisorderResultResponse>({
        queryKey: CMS_URGENT_KEYS.patientDisorderResults(labno),
        queryFn: () => getPatientDisorderResultTable(labno),
        enabled: !!labno,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchInterval: 1000 * 60 * 5,
        refetchIntervalInBackground: false,
    });
};