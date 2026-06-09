/**
 * Historical Cumulative Annual Census Data (2013–2025)
 *
 * Hardcoded per year totals for each census type.
 * The live API (2026+) will override/append for current year data.
 *
 * Sources (from reference images):
 *   received  — 6 test + ENBS bars, TOTAL line  (2013 onwards)
 *   screened  — ENBS bar only, TOTAL line        (2018 onwards)
 *   initial   — ENBS bar only, TOTAL line        (2018 onwards)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnnualReceivedItem {
  year: number;
  test6: number;   // grey bar  (6 test)
  enbs: number;    // orange bar (ENBS)
  total: number;   // blue line
}

export interface AnnualScreenedItem {
  year: number;
  enbs: number;    // orange bar
  total: number;   // blue line
}

export interface AnnualInitialItem {
  year: number;
  enbs: number;    // orange bar
  total: number;   // blue line
}

// ---------------------------------------------------------------------------
// Received (2013–2025)
// Values read from reference image — 6 test (grey) + ENBS (orange) = TOTAL line
// ---------------------------------------------------------------------------
export const HISTORICAL_RECEIVED: AnnualReceivedItem[] = [
  { year: 2013, test6: 11823,  enbs: 0,      total: 11823  },
  { year: 2014, test6: 121725, enbs: 0,      total: 121725 },
  { year: 2015, test6: 148542, enbs: 11861,  total: 160403 },
  { year: 2016, test6: 156167, enbs: 31071,  total: 187238 },
  { year: 2017, test6: 168581, enbs: 41821,  total: 210402 },
  { year: 2018, test6: 165055, enbs: 48078,  total: 213131 },
  { year: 2019, test6: 48000,  enbs: 169525, total: 217525 },
  { year: 2020, test6: 14,     enbs: 199783, total: 199797 },
  { year: 2021, test6: 0,      enbs: 169154, total: 169154 },
  { year: 2022, test6: 0,      enbs: 180834, total: 180834 },
  { year: 2023, test6: 0,      enbs: 197947, total: 197947 },
  { year: 2024, test6: 0,      enbs: 192302, total: 192302 },
  { year: 2025, test6: 0,      enbs: 192785, total: 192785 },
];

// ---------------------------------------------------------------------------
// Screened / Total Samples Screened (2018–2025)
// ---------------------------------------------------------------------------
export const HISTORICAL_SCREENED: AnnualScreenedItem[] = [
  { year: 2018, enbs: 188855, total: 188855 },
  { year: 2019, enbs: 213740, total: 213740 },
  { year: 2020, enbs: 196904, total: 196904 },
  { year: 2021, enbs: 167601, total: 167601 },
  { year: 2022, enbs: 179558, total: 179558 },
  { year: 2023, enbs: 196031, total: 196031 },
  { year: 2024, enbs: 190083, total: 190083 },
  { year: 2025, enbs: 188095, total: 188095 },
];

// ---------------------------------------------------------------------------
// Initial / Initial Samples Screened (2018–2025)
// ---------------------------------------------------------------------------
export const HISTORICAL_INITIAL: AnnualInitialItem[] = [
  { year: 2018, enbs: 183569, total: 183569 },
  { year: 2019, enbs: 203688, total: 203688 },
  { year: 2020, enbs: 188202, total: 188202 },
  { year: 2021, enbs: 161348, total: 161348 },
  { year: 2022, enbs: 172946, total: 172946 },
  { year: 2023, enbs: 188196, total: 188196 },
  { year: 2024, enbs: 180973, total: 180973 },
  { year: 2025, enbs: 175757, total: 175757 },
];