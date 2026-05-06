import api from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatientDetail {
    LABNO: string;
    LINK: string | null;
    MNEMONIC: string;
    VALUE: string | null;
    TESTCODE: string;
    LASTMOD: string | null;
    DTRECV: string;
    CURRENT_DTCOLL: string | null;
    LINKED_DTCOLL: string | null;
    BIRTHTM: string | null;
    CURRENT_TMCOLL: string | null;
    LINKED_TMCOLL: string | null;
    LNAME: string;
    FNAME: string;
    PHYSID: string | null;
    BIRTHDT: string | null;
    BIRTHWT: string | null;
    SUBMID: string | null;
    SEX: string | null;
    GESTAGE: string | null;
    CLINSTAT: string | null;
    COUNTY: string | null;
    TMRECV: string | null;
}

export interface PatientDetailsFilters {
    dateFrom: string;   // YYYY-MM-DD
    dateTo: string;     // YYYY-MM-DD
    testCode?: string;  // default: 'ALL'
}

export interface PatientDetailsMeta {
    totalRecords: number;
    filters: {
        dateFrom: string;
        dateTo: string;
        testCode: string;
    };
}

export interface PatientDetailsResponse {
    success: boolean;
    data: PatientDetail[];
    meta: PatientDetailsMeta;
    executionTime: string;
    timestamp: string;
}

export interface TestCodesResponse {
    success: boolean;
    data: string[];
    total: number;
    timestamp: string;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Fetch patient details filtered by date range and optional test code
 */
export const fetchPatientDetails = async (
    filters: PatientDetailsFilters
): Promise<PatientDetailsResponse> => {
    const { dateFrom, dateTo, testCode = 'ALL' } = filters;

    const response = await api.get<PatientDetailsResponse>(
        '/followup/patient-details',
        {
            params: {
                dateFrom,
                dateTo,
                testCode,
            },
        }
    );

    return response.data;
};

/**
 * Fetch the list of all valid test code options
 */
export const fetchTestCodes = async (): Promise<TestCodesResponse> => {
    const response = await api.get<TestCodesResponse>(
        '/followup/patient-details/test-codes'
    );

    return response.data;
};