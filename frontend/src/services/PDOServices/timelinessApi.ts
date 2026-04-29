/* ================= TYPES ================= */

export interface TimelinessRecord {
  month: string;

  // Age of Collection
  aoc_mean_year1: number;
  aoc_mean_year2: number;
  aoc_median_year1: number;
  aoc_median_year2: number;
  aoc_mode_year1: number;
  aoc_mode_year2: number;

  // Transit Time
  transit_mean_year1: number;
  transit_mean_year2: number;
  transit_median_year1: number;
  transit_median_year2: number;
  transit_mode_year1: number;
  transit_mode_year2: number;

  // Age Upon Receipt
  aur_mean_year1: number;
  aur_mean_year2: number;
  aur_median_year1: number;
  aur_median_year2: number;
  aur_mode_year1: number;
  aur_mode_year2: number;
}

export interface TimelinessResponse {
  success: boolean;
  data: TimelinessRecord[];
  recordCount: number;
  executionTime: string;
  rawDataCount?: number;
  filters?: Record<string, unknown>;
}

/* ================= API ================= */

/**
 * COUNTY MODE — single month + province filter
 * Endpoint: GET /api/timeliness
 */
export const fetchTimelinessData = async (
  year1: string,
  year2: string,
  month: string,
  province: string
): Promise<TimelinessResponse> => {
  const res = await fetch(
    `/api/timeliness?year1=${year1}&year2=${year2}&month=${month}&province=${encodeURIComponent(province)}`
  );
  if (!res.ok) throw new Error('Failed to fetch timeliness data');
  return res.json();
};

/**
 * COUNTY CUMULATIVE MODE — Jan to selected month + province filter
 * Endpoint: GET /api/timeliness/summary
 * province param is optional — pass 'All Provinces' or empty to skip filter
 */
export const fetchTimelinessCountyCumulative = async (
  year1: string,
  year2: string,
  startMonth: string,
  endMonth: string,
  province: string
): Promise<TimelinessResponse> => {
  const res = await fetch(
    `/api/timeliness/summary?year1=${year1}&year2=${year2}&startMonth=${startMonth}&endMonth=${endMonth}&province=${encodeURIComponent(province)}`
  );
  if (!res.ok) throw new Error('Failed to fetch timeliness county cumulative data');
  return res.json();
};

/**
 * MONTHLY MODE — single month, no province filter
 * Endpoint: GET /api/timeliness/monthly
 */
export const fetchTimelinessMonthly = async (
  year1: string,
  year2: string,
  month: string
): Promise<TimelinessResponse> => {
  const res = await fetch(
    `/api/timeliness/monthly?year1=${year1}&year2=${year2}&month=${month}`
  );
  if (!res.ok) throw new Error('Failed to fetch timeliness monthly data');
  return res.json();
};

/**
 * SUMMARY MODE — cumulative Jan to selected month, no province filter
 * Endpoint: GET /api/timeliness/summary
 * startMonth is always '1' (January)
 */
export const fetchTimelinessSummary = async (
  year1: string,
  year2: string,
  startMonth: string,
  endMonth: string
): Promise<TimelinessResponse> => {
  const res = await fetch(
    `/api/timeliness/summary?year1=${year1}&year2=${year2}&startMonth=${startMonth}&endMonth=${endMonth}`
  );
  if (!res.ok) throw new Error('Failed to fetch timeliness summary data');
  return res.json();
};