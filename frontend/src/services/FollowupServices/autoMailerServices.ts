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