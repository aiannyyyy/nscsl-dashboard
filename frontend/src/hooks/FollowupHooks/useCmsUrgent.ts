import { useQuery, useMutation } from '@tanstack/react-query';
import {
    getPatientResultTable,
    getPatientDisorderResultTable,
    generateCMSReport,
} from '../../services/FollowupServices/cmsUrgentServices';
import type {
    PatientResultResponse,
    PatientDisorderResultResponse,
    CMSGenerateReportRequest,
    CMSGenerateReportResponse,
} from '../../services/FollowupServices/cmsUrgentServices';

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

// ============================================================================
// CMS REPORT GENERATION
// ============================================================================

/**
 * useMutation — does not auto-fire, called manually on Print Preview click.
 *
 * Usage in component:
 *   const { mutate: generateReport, isPending } = useGenerateCMSReport();
 *   generateReport({ labNo, disorderNames, urgent });
 *
 * onSuccess receives the flat single-file response:
 *   data.hasData  — false means no records matched in either master or archive
 *   data.fileName — deterministic PDF name to pass into getCMSReportURL()
 *   data.source   — "master" | "archive" | null (useful for debugging)
 *
 * Before (old):
 *   data.master.hasData / data.master.fileName
 *   data.archive.hasData / data.archive.fileName
 *
 * After (new):
 *   data.hasData / data.fileName
 */
export const useGenerateCMSReport = (
    onSuccess?: (data: CMSGenerateReportResponse) => void,
    onError?: (error: Error) => void
) => {
    return useMutation<CMSGenerateReportResponse, Error, CMSGenerateReportRequest>({
        mutationFn: generateCMSReport,
        onSuccess,
        onError,
    });
};