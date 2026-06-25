import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchG6PDIndividual,
    fetchG6PDSummary,
    generateG6PDIndividualReport,
    generateG6PDSummaryReport,
} from '../../services/FollowupServices/autoMailerServices';
import type {
    G6PDIndividualParams,
    G6PDSummaryParams,
    G6PDResponse,
    G6PDGenerateIndividualParams,
    G6PDGenerateSummaryParams,
    G6PDGenerateResponse,
} from '../../services/FollowupServices/autoMailerServices';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const autoMailerKeys = {
    all:        ['autoMailer']                                     as const,
    individual: (labno: string)                                    =>
        [...autoMailerKeys.all, 'individual', labno]               as const,
    summary:    (dateFrom: string, dateTo: string)                 =>
        [...autoMailerKeys.all, 'summary', dateFrom, dateTo]       as const,
};

// ─── Individual report hook ───────────────────────────────────────────────────

/**
 * Fetches G6PD data for a single specimen.
 *
 * The query only fires when `labno` is a non-empty string.
 * Call `refetch()` manually or change `labno` to trigger a new fetch.
 *
 * @example
 * const { data, isLoading, isError } = useG6PDIndividual({ labno: '20261540478' });
 */
export const useG6PDIndividual = (
    params: G6PDIndividualParams,
) => {
    const enabled = !!params.labno?.trim();

    return useQuery<G6PDResponse, Error>({
        queryKey:  autoMailerKeys.individual(params.labno),
        queryFn:   () => fetchG6PDIndividual(params),
        enabled,
        staleTime: 5 * 60 * 1000,   // 5 min — lab results don't change often
        retry:     1,
    });
};

// ─── Summary report hook ──────────────────────────────────────────────────────

/**
 * Fetches G6PD data for all specimens received within a date range.
 *
 * The query only fires when both `dateFrom` and `dateTo` are provided
 * AND `enabled` is explicitly set to true (caller controls when to fetch,
 * e.g. on Generate button click).
 *
 * @example
 * const [fetch, setFetch] = useState(false);
 * const { data, isLoading } = useG6PDSummary({ dateFrom, dateTo }, fetch);
 * <button onClick={() => setFetch(true)}>Generate</button>
 */
export const useG6PDSummary = (
    params:  G6PDSummaryParams,
    enabled: boolean = false,
) => {
    const canFetch = enabled && !!params.dateFrom && !!params.dateTo;

    return useQuery<G6PDResponse, Error>({
        queryKey:  autoMailerKeys.summary(params.dateFrom, params.dateTo),
        queryFn:   () => fetchG6PDSummary(params),
        enabled:   canFetch,
        staleTime: 5 * 60 * 1000,
        retry:     1,
    });
};

// ─── Generate individual PDF (mutation) ───────────────────────────────────────

/**
 * Triggers PDF generation for a single specimen via the CrystalReports exe.
 * Use this for an explicit "Generate Report" button rather than useQuery,
 * since it's a side-effecting action (runs the exe, writes a file).
 *
 * @example
 * const { mutate, isPending, data } = useGenerateG6PDIndividual();
 * <button onClick={() => mutate({ labNo: '20261540478' })}>Generate PDF</button>
 * // data?.fileName -> pass to getG6PDReportUrl() once available
 */
export const useGenerateG6PDIndividual = () => {
    return useMutation<G6PDGenerateResponse, Error, G6PDGenerateIndividualParams>({
        mutationFn: (params) => generateG6PDIndividualReport(params),
    });
};

// ─── Generate summary PDF (mutation) ───────────────────────────────────────────

/**
 * Triggers PDF generation for a date range via the CrystalReports exe.
 *
 * @example
 * const { mutate, isPending, data } = useGenerateG6PDSummary();
 * <button onClick={() => mutate({ dateFrom, dateTo })}>Generate PDF</button>
 */
export const useGenerateG6PDSummary = () => {
    return useMutation<G6PDGenerateResponse, Error, G6PDGenerateSummaryParams>({
        mutationFn: (params) => generateG6PDSummaryReport(params),
    });
};