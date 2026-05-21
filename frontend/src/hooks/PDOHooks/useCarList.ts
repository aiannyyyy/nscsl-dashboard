import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import {
    getAllCarList,
    getFilteredCarList,
    getCarListGroupedByProvince,
    getCarListGrouped,
    getFacilityByCode,
    getNextCaseNumber,
    addCar,
    updateCar,
    updateCarStatus,
    deleteCarRecord,
    getMonthDateRange,
} from '../../services/PDOServices/carListApi';
import type {
    CarRecord,
    AddCarFormData,
    GroupedByProvince,
    GroupedBySubCode,
    FacilityDetails,
    NextCaseNumberResponse,
} from '../../services/PDOServices/carListApi';

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const carListKeys = {
    all:              ['carList'] as const,
    lists:            () => [...carListKeys.all, 'list'] as const,
    filtered:         (status: string, dateStart: string, dateEnd: string) =>
        [...carListKeys.all, 'filtered', { status, dateStart, dateEnd }] as const,
    groupedByProvince:(status?: string, dateStart?: string, dateEnd?: string, province?: string) =>
        [...carListKeys.all, 'groupedByProvince', { status, dateStart, dateEnd, province }] as const,
    grouped:          (from?: string, to?: string, province?: string, status?: string) =>
        [...carListKeys.all, 'grouped', { from, to, province, status }] as const,
    facility:         (facilityCode: string) =>
        [...carListKeys.all, 'facility', facilityCode] as const,
    nextCaseNumber:   (provinceCode: string, year: string) =>
        [...carListKeys.all, 'nextCaseNumber', { provinceCode, year }] as const,
};

// ─── Shared config ─────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches all CAR records, filtered client-side by month/year.
 * Auto-refreshes every 30 seconds.
 */
export const useCarList = (month: string, year: string) => {
    return useQuery<CarRecord[]>({
        queryKey:             [...carListKeys.lists(), { month, year }],
        queryFn:              async () => {
            const data      = await getAllCarList();
            const dateRange = getMonthDateRange(month, year);
            if (!dateRange) return data;
            return data.filter(r => {
                if (!r.date_endorsed) return false;
                const d = new Date(r.date_endorsed);
                return d >= new Date(dateRange.start) && d <= new Date(dateRange.end);
            });
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
 * Fetches CAR records filtered by status + date range.
 * Auto-refreshes every 30 seconds.
 */
export const useFilteredCarList = (
    status:    string,
    dateStart: string,
    dateEnd:   string,
    enabled:   boolean = true
) => {
    return useQuery<CarRecord[]>({
        queryKey:             carListKeys.filtered(status, dateStart, dateEnd),
        queryFn:              () => getFilteredCarList(status, dateStart, dateEnd),
        enabled:              enabled && !!dateStart && !!dateEnd,
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval:      REFRESH_INTERVAL,
        refetchIntervalInBackground: false,
        retry: 2,
    });
};

/**
 * Fetches CAR records grouped by province (for CarPerProvinceChart).
 * Auto-refreshes every 30 seconds.
 */
export const useCarListGroupedByProvince = (
    status?:    string,
    dateStart?: string,
    dateEnd?:   string,
    province?:  string,
    enabled:    boolean = true
) => {
    return useQuery<GroupedByProvince[]>({
        queryKey:             carListKeys.groupedByProvince(status, dateStart, dateEnd, province),
        queryFn:              () => getCarListGroupedByProvince(status, dateStart, dateEnd, province),
        enabled,
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval:      REFRESH_INTERVAL,
        refetchIntervalInBackground: false,
        retry: 2,
    });
};

/**
 * Fetches CAR records grouped by sub_code1 (for CorrectiveActionReportChart).
 * Auto-refreshes every 30 seconds.
 */
export const useCarListGrouped = (
    from?:     string,
    to?:       string,
    province?: string,
    status?:   string,
    enabled:   boolean = true
) => {
    return useQuery<GroupedBySubCode[]>({
        queryKey:             carListKeys.grouped(from, to, province, status),
        queryFn:              () => getCarListGrouped(from, to, province, status),
        enabled:              enabled && !!from && !!to,
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval:      REFRESH_INTERVAL,
        refetchIntervalInBackground: false,
        retry: 2,
    });
};

/**
 * One-shot facility lookup by code. No auto-refresh.
 */
export const useFacilityByCode = (
    facilityCode: string,
    enabled:      boolean = true
) => {
    return useQuery<FacilityDetails | null>({
        queryKey:             carListKeys.facility(facilityCode),
        queryFn:              () => getFacilityByCode(facilityCode),
        enabled:              enabled && facilityCode.trim().length > 0,
        staleTime:            5 * 60 * 1000,
        gcTime:              10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
    });
};

/**
 * Next case number for auto-generation. No auto-refresh.
 */
export const useNextCaseNumber = (
    provinceCode: string,
    year:         string,
    enabled:      boolean = true
) => {
    return useQuery<NextCaseNumberResponse>({
        queryKey:             carListKeys.nextCaseNumber(provinceCode, year),
        queryFn:              () => getNextCaseNumber(provinceCode, year),
        enabled:              enabled && !!provinceCode && !!year,
        staleTime:            0, // always fresh — case numbers change frequently
        gcTime:               0,
        refetchOnWindowFocus: false,
        retry: 1,
    });
};

// ─── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Adds a new CAR record. Invalidates all carList queries on success.
 */
export const useAddCar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (formData: AddCarFormData) => addCar(formData),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: carListKeys.all });
        },
    });
};

/**
 * Updates an existing CAR record. Invalidates all carList queries on success.
 */
export const useUpdateCar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: AddCarFormData }) =>
            updateCar(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: carListKeys.all });
        },
    });
};

/**
 * Updates only the status of a CAR record. Invalidates all carList queries on success.
 */
export const useUpdateCarStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            status,
            userName,
        }: {
            id:        number;
            status:    'open' | 'closed' | 'pending';
            userName?: string;
        }) => updateCarStatus(id, status, userName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: carListKeys.all });
        },
    });
};

/**
 * Deletes a CAR record. Invalidates all carList queries on success.
 */
export const useDeleteCar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteCarRecord(id),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: carListKeys.all });
        },
    });
};