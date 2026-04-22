import api from '../api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Valid spec type codes */
export type SpecType = '20' | '2' | '3' | '4' | '5' | '87';

/** Human-readable labels for each spec type */
export const SPECTYPE_LABELS: Record<SpecType, string> = {
    '20': 'Initial',
    '2':  'Repeat Unsat',
    '3':  'Repeat Abnormal',
    '4':  'Repeat Normal',
    '5':  'Monitoring',
    '87': 'Unfit',
};

/** Breakdown counts by spec type category */
export interface BreakdownData {
    initial:        number;
    repeatUnsat:    number;
    repeatAbnormal: number;
    repeatNormal:   number;
    monitoring:     number;
    unfit:          number;
}

/** Main summary counts */
export interface CardSummaryData {
    received:  number;
    screened:  number;
    unsat:     number;
    breakdown: BreakdownData;
}

/** API response shape */
export interface CardSummaryResponse {
    success: boolean;
    data: CardSummaryData;
    filters: {
        dateFrom?:      string;
        dateTo?:        string;
        spectype?:      SpecType;
        spectypeLabel?: string;
        type:           'custom' | 'current_month';
    };
    executionTime: string;
    timestamp:     string;
}

/** Request parameters */
export interface CardSummaryParams {
    dateFrom?: string;   // YYYY-MM-DD
    dateTo?:   string;   // YYYY-MM-DD
    spectype?: SpecType; // filter to a single spec type
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

const cardSummaryService = {
    /**
     * Get laboratory card summary data.
     * Supports optional date range and spectype filters.
     */
    getCardSummary: async (params: CardSummaryParams = {}): Promise<CardSummaryResponse> => {
        try {
            const response = await api.get<CardSummaryResponse>(
                '/laboratory/card-summary',
                { params }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching laboratory card summary:', error);
            throw error;
        }
    },

    /**
     * Get summary for the current month (no filters).
     */
    getCurrentMonthSummary: async (): Promise<CardSummaryResponse> => {
        try {
            const response = await api.get<CardSummaryResponse>('/laboratory/card-summary');
            return response.data;
        } catch (error) {
            console.error('Error fetching current month summary:', error);
            throw error;
        }
    },

    /**
     * Get summary for a custom date range.
     */
    getCustomRangeSummary: async (
        dateFrom: string,
        dateTo:   string,
        spectype?: SpecType
    ): Promise<CardSummaryResponse> => {
        try {
            const response = await api.get<CardSummaryResponse>('/laboratory/card-summary', {
                params: { dateFrom, dateTo, ...(spectype ? { spectype } : {}) },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching custom range summary:', error);
            throw error;
        }
    },
};

export default cardSummaryService;