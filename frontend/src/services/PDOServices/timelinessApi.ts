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
  data: TimelinessRecord[];
  recordCount: number;
  executionTime: string;
}

/* ================= API ================= */

/**
 * Fetch timeliness data filtered by province (single month)
 */
export const fetchTimelinessData = async (
  year1: string,
  year2: string,
  month: string,
  province: string
): Promise<TimelinessResponse> => {
  const res = await fetch(
    `/api/timeliness?year1=${year1}&year2=${year2}&month=${month}&province=${province}`
  );
  if (!res.ok) throw new Error('Failed to fetch timeliness data');
  return res.json();
};

/**
 * Fetch timeliness summary without county filter (cumulative range)
 * startMonth is always 1 (January), endMonth is user-selected
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