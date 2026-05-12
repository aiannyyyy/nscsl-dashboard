import api from '../api';

export interface PatientResultTable {
    LABNO: string;
    LNAME: string;
    FNAME: string;
    DTRECV: string;
    SUBMID: string;
    TWIN: string;
    MNEMONICS: string;
}

export interface PatientResultResponse {
    success: boolean;
    date: string;
    total: number;
    data: PatientResultTable[];
}

export const getPatientResultTable = async (date: string): Promise<PatientResultResponse> => {
    const response = await api.get('/followup/cms-urgent/patient-results', {
        params: { date }
    });
    return response.data;
};

export interface DisorderEntry {
    NAME: string;
    RFLAG: string;
    DESCR1: string;
}

export interface PatientDisorderResultTable {
    MAILERNAME: string;
    LABNO: string;
    LNAME: string;
    FNAME: string;
    disorders: DisorderEntry[];
}

export interface PatientDisorderResultResponse {
    success: boolean;
    labno: string;
    total: number;
    data: PatientDisorderResultTable[];
}

export const getPatientDisorderResultTable = async (labno: string): Promise<PatientDisorderResultResponse> => {
    const response = await api.get('/followup/cms-urgent/patient-disorder-results', {
        params: { labno }
    });
    return response.data;
};

// ============================================================================
// CMS REPORT GENERATION
// ============================================================================

export interface CMSGenerateReportRequest {
    labNo: string;
    disorderNames: string[];
    urgent: boolean;
}

/**
 * Single-file response.
 * - source: which .rpt was used ("master" | "archive" | null if no data)
 * - hasData: false means no records matched in either source
 * - fileName: the deterministic PDF filename, null when hasData is false
 *   Filename format: cms_<labNo>_<DISORDER1>_<DISORDER2>.pdf
 *   Same labNo + same disorders → same filename → previous file is overwritten
 *   Same labNo + different disorders → different filename → separate file
 */
export interface CMSGenerateReportResponse {
    success: boolean;
    labNo: string;
    urgent: boolean;
    source: 'master' | 'archive' | null;
    hasData: boolean;
    fileName: string | null;
}

export const generateCMSReport = async (
    payload: CMSGenerateReportRequest
): Promise<CMSGenerateReportResponse> => {
    const response = await api.post('/followup/cms-urgent/generate-report', payload);
    return response.data;
};

/**
 * Returns the API path (not full URL) for serving a PDF report.
 * PDFViewer passes this directly to the axios instance which prepends baseURL.
 * fileName comes from CMSGenerateReportResponse.fileName.
 */
export const getCMSReportURL = (fileName: string): string => {
    return `/followup/cms-urgent/serve-report/${encodeURIComponent(fileName)}`;
};