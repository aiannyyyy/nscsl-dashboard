// src/services/receiveApi.ts
import axios from "axios";
import { applyMockAdapter } from "../../mocks/setupMocks";

/**
 * Base API instance
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 60000
});

applyMockAdapter(api);

/**
 * ================================
 * TYPES
 * ================================
 */

export interface MonthlyLabNoParams {
  from: string;        // YYYY-MM-DD
  to: string;          // YYYY-MM-DD
  province: string;    // e.g., "BATANGAS", "CAVITE", etc.
}

export interface CumulativeAllProvinceParams {
  from: string;        // YYYY-MM-DD
  to: string;          // YYYY-MM-DD
}

export interface SpectypeData {
  spectype: string;
  samples: number;
  labno: number;
}

export interface MonthlyDataItem {
  year: number;
  month: number;
  month_year: string;
  province: string;
  category: string;
  total_samples: number;
  total_labno: number;
  spectypes: SpectypeData[];
}

export interface CumulativeDataItem {
  province: string;
  category: string;
  total_samples: number;
  total_labno: number;
  spectypes: SpectypeData[];
}

export interface ApiResponse {
  parameters: {
    type: string;
    spectypes: string[];
    province?: string;
    dateRange: {
      from: string;
      to: string;
    };
  };
  monthlyData?: MonthlyDataItem[];
  cumulativeData?: CumulativeDataItem[];
  rawData: any[];
  summary: {
    totalRecords: number;
    totalSamples: number;
    totalLabNo: number;
  };
}

export interface TwoYearComparisonData {
  year1: {
    year: number;
    data: ApiResponse;
  };
  year2: {
    year: number;
    data: ApiResponse;
  };
}

export interface ProvinceComparisonItem {
  province: string;
  year1Total: number;
  year2Total: number;
  year1LabNo: number;
  year2LabNo: number;
  difference: number;
  percentageChange: string;
}

/**
 * ================================
 * API METHODS
 * ================================
 */

/**
 * Fetch monthly lab number count for a specific province
 * Used for Chart: Monthly cumulative per month
 */
export const getMonthlyLabNoCount = async (
  params: MonthlyLabNoParams
): Promise<ApiResponse> => {
  const response = await api.get("/sample-receive/monthly-labno-count", {
    params: {
      from: params.from,
      to: params.to,
      province: params.province,
    }
  });
  return response.data;
};

/**
 * Fetch cumulative data for all provinces (BATANGAS, LAGUNA, CAVITE, RIZAL, QUEZON, LOPEZ_NEARBY)
 * Used for Chart: Cumulative per year - all provinces
 */
export const getCumulativeAllProvince = async (
  params: CumulativeAllProvinceParams
): Promise<ApiResponse> => {
  const response = await api.get("/sample-receive/cumulative-all-province", {
    params: {
      from: params.from,
      to: params.to,
    }
  });
  return response.data;
};

/**
 * ================================
 * TWO-YEAR COMPARISON HELPERS (FOR CUMULATIVE CHARTS)
 * ================================
 */

/**
 * Fetch 2-year comparison for a single province (Chart 1)
 * @param year1 - First year to compare (e.g., 2023)
 * @param year2 - Second year to compare (e.g., 2024)
 * @param province - Province name (e.g., "BATANGAS")
 * @returns Filtered data for the selected province across 2 years
 */
export const getTwoYearComparisonForProvince = async (
  year1: number,
  year2: number,
  province: string
): Promise<{
  year1Data: CumulativeDataItem | undefined;
  year2Data: CumulativeDataItem | undefined;
  comparison: {
    samplesDiff: number;
    samplesPercentageChange: string;
    labNoDiff: number;
    labNoPercentageChange: string;
  };
}> => {
  const [data1, data2] = await Promise.all([
    getCumulativeAllProvince(getYearDateRange(year1)),
    getCumulativeAllProvince(getYearDateRange(year2))
  ]);

  // Trim whitespace from province names in response data
  const year1Data = data1.cumulativeData?.find(d => d.province.trim().toUpperCase() === province.trim().toUpperCase());
  const year2Data = data2.cumulativeData?.find(d => d.province.trim().toUpperCase() === province.trim().toUpperCase());

  const year1Samples = year1Data?.total_samples || 0;
  const year2Samples = year2Data?.total_samples || 0;
  const year1LabNo = year1Data?.total_labno || 0;
  const year2LabNo = year2Data?.total_labno || 0;

  return {
    year1Data,
    year2Data,
    comparison: {
      samplesDiff: year2Samples - year1Samples,
      samplesPercentageChange: calculatePercentageDiff(year1Samples, year2Samples),
      labNoDiff: year2LabNo - year1LabNo,
      labNoPercentageChange: calculatePercentageDiff(year1LabNo, year2LabNo)
    }
  };
};

/**
 * Fetch 2-year comparison for all provinces (Chart 2)
 * @param year1 - First year to compare (e.g., 2023)
 * @param year2 - Second year to compare (e.g., 2024)
 * @returns Comparison data for all 5 provinces (excludes LOPEZ_NEARBY)
 */
export const getTwoYearComparisonAllProvinces = async (
  year1: number,
  year2: number
): Promise<{
  raw: TwoYearComparisonData;
  formatted: ProvinceComparisonItem[];
}> => {
  const [data1, data2] = await Promise.all([
    getCumulativeAllProvince(getYearDateRange(year1)),
    getCumulativeAllProvince(getYearDateRange(year2))
  ]);

  // ✅ Only include the 5 main provinces (EXCLUDE LOPEZ_NEARBY from "Show All Provinces" chart)
  const provinces = ['BATANGAS', 'CAVITE', 'LAGUNA', 'QUEZON', 'RIZAL'];

  const formatted = provinces.map(province => {
    // Trim whitespace when finding province data
    const year1Data = data1.cumulativeData?.find(d => d.province.trim().toUpperCase() === province);
    const year2Data = data2.cumulativeData?.find(d => d.province.trim().toUpperCase() === province);

    const year1Total = year1Data?.total_samples || 0;
    const year2Total = year2Data?.total_samples || 0;
    const year1LabNo = year1Data?.total_labno || 0;
    const year2LabNo = year2Data?.total_labno || 0;

    return {
      province,
      year1Total,
      year2Total,
      year1LabNo,
      year2LabNo,
      difference: year2Total - year1Total,
      percentageChange: calculatePercentageDiff(year1Total, year2Total)
    };
  });

  return {
    raw: {
      year1: { year: year1, data: data1 },
      year2: { year: year2, data: data2 }
    },
    formatted
  };
};

/**
 * Fetch cumulative data up to a specific month (for cumulative month dropdown)
 * @param year - Year (e.g., 2024)
 * @param endMonth - End month name (e.g., "June")
 * @returns Cumulative data from January to the specified month
 */
export const getCumulativeUpToMonth = async (
  year: number,
  endMonth: string
): Promise<ApiResponse> => {
  const monthRange = getMonthDateRange(year, endMonth);
  
  return getCumulativeAllProvince({
    from: formatDate(year, 1, 1), // Start from January 1st
    to: monthRange.to              // End at last day of selected month
  });
};

/**
 * Fetch 2-year comparison up to a specific month (for Chart 2 with month filter)
 * @param year1 - First year
 * @param year2 - Second year  
 * @param endMonth - End month name (e.g., "June")
 * @returns Comparison for all provinces up to the specified month (excludes LOPEZ_NEARBY)
 */
export const getTwoYearComparisonUpToMonth = async (
  year1: number,
  year2: number,
  endMonth: string
): Promise<{
  raw: TwoYearComparisonData;
  formatted: ProvinceComparisonItem[];
}> => {
  const [data1, data2] = await Promise.all([
    getCumulativeUpToMonth(year1, endMonth),
    getCumulativeUpToMonth(year2, endMonth)
  ]);

  // ✅ Only include the 5 main provinces (EXCLUDE LOPEZ_NEARBY from "Show All Provinces" chart)
  const provinces = ['BATANGAS', 'CAVITE', 'LAGUNA', 'QUEZON', 'RIZAL'];

  const formatted = provinces.map(province => {
    // Trim whitespace when finding province data
    const year1Data = data1.cumulativeData?.find(d => d.province.trim().toUpperCase() === province);
    const year2Data = data2.cumulativeData?.find(d => d.province.trim().toUpperCase() === province);

    const year1Total = year1Data?.total_samples || 0;
    const year2Total = year2Data?.total_samples || 0;
    const year1LabNo = year1Data?.total_labno || 0;
    const year2LabNo = year2Data?.total_labno || 0;

    return {
      province,
      year1Total,
      year2Total,
      year1LabNo,
      year2LabNo,
      difference: year2Total - year1Total,
      percentageChange: calculatePercentageDiff(year1Total, year2Total)
    };
  });

  return {
    raw: {
      year1: { year: year1, data: data1 },
      year2: { year: year2, data: data2 }
    },
    formatted
  };
};

/**
 * ================================
 * HELPER FUNCTIONS
 * ================================
 */

/**
 * Helper function to format date to YYYY-MM-DD
 */
export const formatDate = (year: number, month: number, day: number = 1): string => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Helper function to get date range for a full year
 */
export const getYearDateRange = (year: number): { from: string; to: string } => {
  return {
    from: formatDate(year, 1, 1),
    to: formatDate(year, 12, 31),
  };
};

/**
 * Helper function to get date range for a specific month
 */
export const getMonthDateRange = (year: number, monthName: string): { from: string; to: string } => {
  const monthMap: { [key: string]: number } = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
  };
  
  const month = monthMap[monthName];
  if (!month) {
    throw new Error(`Invalid month name: ${monthName}`);
  }
  
  const lastDay = new Date(year, month, 0).getDate();
  
  return {
    from: formatDate(year, month, 1),
    to: formatDate(year, month, lastDay),
  };
};

/**
 * Helper function to get month name from month number
 */
export const getMonthName = (monthNumber: number): string => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error(`Invalid month number: ${monthNumber}`);
  }
  
  return months[monthNumber - 1];
};

/**
 * Helper function to calculate percentage difference
 */
export const calculatePercentageDiff = (oldValue: number, newValue: number): string => {
  if (oldValue === 0) return newValue > 0 ? "+100%" : "0%";
  
  const diff = ((newValue - oldValue) / oldValue) * 100;
  const sign = diff > 0 ? "+" : "";
  
  return `${sign}${diff.toFixed(1)}%`;
};

/**
 * Helper function to calculate difference
 */
export const calculateDiff = (oldValue: number, newValue: number): string => {
  const diff = newValue - oldValue;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff}`;
};

/**
 * Get all available provinces (includes LOPEZ_NEARBY)
 */
export const getAvailableProvinces = (): string[] => {
  return ['BATANGAS', 'CAVITE', 'LAGUNA', 'QUEZON', 'RIZAL', 'LOPEZ_NEARBY'];
};

/**
 * Get all available months
 */
export const getAvailableMonths = (): string[] => {
  return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
};

/**
 * ================================
 * DEFAULT EXPORT
 * ================================
 */

export default {
  // Core API
  getMonthlyLabNoCount,
  getCumulativeAllProvince,
  
  // Two-year comparison helpers (for cumulative charts)
  getTwoYearComparisonForProvince,
  getTwoYearComparisonAllProvinces,
  getCumulativeUpToMonth,
  getTwoYearComparisonUpToMonth,
  
  // Utility helpers
  formatDate,
  getYearDateRange,
  getMonthDateRange,
  getMonthName,
  calculatePercentageDiff,
  calculateDiff,
  getAvailableProvinces,
  getAvailableMonths,
};