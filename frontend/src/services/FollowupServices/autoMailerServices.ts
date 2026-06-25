import api from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface G6PDRecord {
    MAILERNAME:    string | null;
    LABNO:         string | null;
    REPTCODE:      string | null;
    MNEMONIC:      string | null;
    AVG_REPTCODE:  string | null;
    VALUE:         string | null;
    TESTCODE:      string | null;
    DESCR1:        string | null;
    DEMOG_LABNO:   string | null;
    LNAME:         string | null;
    FNAME:         string | null;
    PHYSID:        string | null;
    BIRTHDT:       string | null;
    BIRTHWT:       string | null;
    DTCOLL:        string | null;
    DTRPTD:        string | null;
    SUBMID:        string | null;
    TWIN:          string | null;
    SEX:           string | null;
    ADRS_TYPE:     string | null;
    STREET1:       string | null;
    STREET2:       string | null;
    CITY:          string | null;
    PROVIDER_NAME: string | null;
    DESCR4:        string | null;
    DESCR5:        string | null;
    DESCR6:        string | null;
}

export interface G6PDIndividualParams {
    labno: string;
}

export interface G6PDSummaryParams {
    dateFrom: string;  // YYYY-MM-DD
    dateTo:   string;  // YYYY-MM-DD
}

export interface G6PDResponse {
    success:       boolean;
    data:          G6PDRecord[];
    filters:       Record<string, string>;
    total:         number;
    executionTime: string;
    timestamp:     string;
}

export interface G6PDGenerateIndividualParams {
    labNo: string;
}

export interface G6PDGenerateSummaryParams {
    dateFrom: string; // YYYY-MM-DD
    dateTo:   string; // YYYY-MM-DD
}

export interface G6PDGenerateResponse {
    success:   boolean;
    labNo?:    string;
    dateFrom?: string;
    dateTo?:   string;
    hasData:   boolean;
    fileName:  string | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetch G6PD report for a single specimen by lab number.
 */
export const fetchG6PDIndividual = async (
    params: G6PDIndividualParams,
): Promise<G6PDResponse> => {
    const { data } = await api.get<G6PDResponse>(
        '/followup/auto-mailer/individual',
        { params },
    );
    return data;
};

/**
 * Fetch G6PD report for all specimens received within a date range.
 */
export const fetchG6PDSummary = async (
    params: G6PDSummaryParams,
): Promise<G6PDResponse> => {
    const { data } = await api.get<G6PDResponse>(
        '/followup/auto-mailer/summary',
        { params },
    );
    return data;
};

/**
 * Trigger generation of the G6PD individual PDF via the CrystalReports exe.
 * Returns hasData: false (no error) when no records matched.
 */
export const generateG6PDIndividualReport = async (
    params: G6PDGenerateIndividualParams,
): Promise<G6PDGenerateResponse> => {
    const { data } = await api.post<G6PDGenerateResponse>(
        '/followup/auto-mailer/individual/generate',
        params,
    );
    return data;
};

/**
 * Trigger generation of the G6PD summary PDF via the CrystalReports exe.
 * Returns hasData: false (no error) when no records matched.
 */
export const generateG6PDSummaryReport = async (
    params: G6PDGenerateSummaryParams,
): Promise<G6PDGenerateResponse> => {
    const { data } = await api.post<G6PDGenerateResponse>(
        '/followup/auto-mailer/summary/generate',
        params,
    );
    return data;
};

/**
 * Relative path to a generated PDF — pass this into the shared `api`
 * axios instance (e.g. `api.get(path, { responseType: 'blob' })`).
 * Axios applies `baseURL` (e.g. "/api") to it exactly once.
 * Do NOT use this directly in an <a href> — browsers resolve relative
 * paths against the current page URL, not your API base.
 */
export const getG6PDReportPath = (fileName: string): string => {
    return `/followup/auto-mailer/serve-report/${encodeURIComponent(fileName)}`;
};

/**
 * Full path to a generated PDF, safe for direct use in <a href>,
 * window.open(), or an <iframe src> — includes baseURL (e.g. "/api")
 * exactly once. Do NOT pass this into `api.get()`; that would double
 * up baseURL (axios re-applies it to any non-absolute-URL path).
 */
export const getG6PDReportUrl = (fileName: string): string => {
    return `${api.defaults.baseURL ?? ''}${getG6PDReportPath(fileName)}`;
};