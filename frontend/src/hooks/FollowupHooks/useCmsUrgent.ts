import { useQuery } from '@tanstack/react-query';
import { getPatientResultTable } from '../../services/FollowupServices/cmsUrgentServices';
import type { PatientResultResponse } from '../../services/FollowupServices/cmsUrgentServices';

const CMS_URGENT_KEYS = {
    all: ['cmsUrgent'] as const,
    patientResults: (date: string) => [...CMS_URGENT_KEYS.all, 'patientResults', date] as const,
};

export const useGetPatientResultTable = (date: string) => {
    return useQuery<PatientResultResponse>({
        queryKey: CMS_URGENT_KEYS.patientResults(date),
        queryFn: () => getPatientResultTable(date),
        enabled: !!date,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchInterval: 1000 * 60 * 5,          // auto-refetch every 5 minutes
        refetchIntervalInBackground: false,        // pauses when tab is not active
    });
};