import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import {
    searchPatients,
    getAllNotebookEntries,
    addNotebookEntry,
} from '../../services/PDOServices/notebooksApi'; // adjust path as needed
import type {
    SearchCriteria,
    PatientSearchResult,
    NotebookEntry,
} from '../../services/PDOServices/notebooksApi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const notebookKeys = {
    all:     ['notebooks'] as const,
    recent:  () => [...notebookKeys.all, 'recent'] as const,
    search:  (criteria: SearchCriteria) =>
        [...notebookKeys.all, 'search', criteria] as const,
    entries: (labno: string, labid: string, fname: string, lname: string) =>
        [...notebookKeys.all, 'entries', { labno, labid, fname, lname }] as const,
};

// ─── Shared config ─────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches recent notebook entries for the main Notebooks table.
 * Auto-refreshes every 30 seconds.
 */
export const useRecentNotebooks = () => {
    return useQuery<any[]>({
        queryKey:  notebookKeys.recent(),
        queryFn:   async () => {
            const response = await fetch(`${API_BASE_URL}/notebooks/recent`, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return data.data || [];
        },
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval:      REFRESH_INTERVAL,
        refetchIntervalInBackground: false,
        retry: 2,
    });
};

/**
 * Fetches patient search results.
 * Only runs when criteria has at least one non-empty field.
 */
export const usePatientSearch = (
    criteria: SearchCriteria,
    enabled: boolean = true
) => {
    return useQuery<PatientSearchResult[]>({
        queryKey:             notebookKeys.search(criteria),
        queryFn:              () => searchPatients(criteria),
        enabled:              enabled && Object.values(criteria).some(v => v && v.trim() !== ''),
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
    });
};

/**
 * Fetches all notebook entries (Oracle + MySQL) for a specific patient.
 * Re-fetches when the modal opens (patient changes) or after a new entry is added.
 * No auto-refresh — only triggered by patient selection or mutation invalidation.
 */
export const useNotebookEntries = (
    labno:   string,
    labid:   string,
    fname:   string,
    lname:   string,
    enabled: boolean = true
) => {
    return useQuery<NotebookEntry[]>({
        queryKey:             notebookKeys.entries(labno, labid, fname, lname),
        queryFn:              () => getAllNotebookEntries(labno, labid, fname, lname),
        enabled:              enabled && !!labno,
        staleTime:            0,      // always re-fetch when the modal opens
        gcTime:               5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
    });
};

// ─── Mutations ─────────────────────────────────────────────────────────────────

interface AddNotebookParams {
    labno:    string;
    labid:    string;
    fname:    string;
    lname:    string;
    notes:    string;
    files:    File[];
    username: string;
}

/**
 * Adds a new notebook entry.
 * On success, invalidates:
 *   - recent notebooks (main table refreshes)
 *   - the specific patient's notebook entries (detail modal refreshes)
 */
export const useAddNotebook = (
    labno: string,
    labid: string,
    fname: string,
    lname: string,
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: AddNotebookParams) =>
            addNotebookEntry(
                params.labno,
                params.labid,
                params.fname,
                params.lname,
                params.notes,
                params.files,
                params.username,
            ),
        onSuccess: () => {
            // Refresh the main recent table
            queryClient.invalidateQueries({ queryKey: notebookKeys.recent() });
            // Refresh the patient's notebook entries in the detail modal
            queryClient.invalidateQueries({
                queryKey: notebookKeys.entries(labno, labid, fname, lname),
            });
        },
    });
};