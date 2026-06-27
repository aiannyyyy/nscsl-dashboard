import axios from "axios";
import { applyMockAdapter } from "../../mocks/setupMocks";

/**
 * Base API instance
 * VITE_API_URL=http://localhost:5000/api
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 300000 // 5 minutes default
});

applyMockAdapter(api);

/**
 * ================================
 * TYPES
 * ================================
 */

export interface TopUnsatFacility {
  FACILITY_NAME?: string;
  facility_name?: string;
  PROVINCE?: string;
  province?: string;
  UNSATISFACTORY_COUNT?: number;
  unsatisfactory_count?: number;
}

export interface UnsatDetail {
  LABNO: string;
  FIRST_NAME?: string;
  first_name?: string;
  LAST_NAME?: string;
  last_name?: string;
  TEST_RESULT?: string;
  test_result?: string;
}

export interface FullPatient {
  LABNO: string;
  FIRST_NAME?: string;
  first_name?: string;
  LAST_NAME?: string;
  last_name?: string;
  TEST_RESULT?: string;
  test_result?: string;
  FACILITY_NAME?: string;
  facility_name?: string;
  PROVINCE?: string;
  province?: string;
}

export interface UnsatRate {
  facility_name: string;
  province: string;
  unsatisfactory_count: number;
  total_samples: number;
  unsat_rate: number;
}

export interface UnsatProvince {
  COUNTY: string;
  TOTAL_DISTINCT_UNSAT_PERIOD1: number;
  TOTAL_DISTINCT_UNSAT_PERIOD2: number;
}

/**
 * ================================
 * API METHODS
 * ================================
 */

/**
 * Top unsatisfactory facilities (BY COUNT)
 * @param from - Start date "YYYY-MM-DD HH:mm:ss"
 * @param to - End date "YYYY-MM-DD HH:mm:ss"
 * @param province - Optional: "all" or specific province name
 */
export const getTopUnsatisfactory = async (
  from: string,
  to: string,
  province?: string
): Promise<TopUnsatFacility[]> => {
  const params: Record<string, string> = { from, to };

  if (province && province !== "all") {
    params.province = province;
  }

  const response = await api.get("/unsat/top-unsatisfactory", {
    params,
    timeout: 300000
  });

  return response.data;
};

/**
 * Unsatisfactory patient details per facility (BY COUNT - modal)
 * @param from - Start date "YYYY-MM-DD"
 * @param to - End date "YYYY-MM-DD"
 * @param facilityName - Exact facility name
 */
export const getUnsatDetails = async (
  from: string,
  to: string,
  facilityName: string
): Promise<{ total: number; rows: UnsatDetail[] }> => {
  const response = await api.get("/unsat/details-unsatisfactory", {
    params: {
      from,
      to,
      facility_name: facilityName
    },
    timeout: 300000
  });

  return response.data;
};

/**
 * Total samples per facility
 * @param from - Start date "YYYY-MM-DD HH:mm:ss"
 * @param to - End date "YYYY-MM-DD HH:mm:ss"
 * @param facilityName - Exact facility name
 */
export const getTotalSamples = async (
  from: string,
  to: string,
  facilityName: string
): Promise<{ total_samples: number }> => {
  const response = await api.get("/unsat/total-samples", {
    params: {
      from,
      to,
      facility_name: facilityName
    },
    timeout: 300000
  });

  return response.data;
};

/**
 * Unsatisfactory rate per facility (BY PERCENTAGE)
 * @param from - Start date "YYYY-MM-DD HH:mm:ss"
 * @param to - End date "YYYY-MM-DD HH:mm:ss"
 * @param province - Optional: "all" or specific province name
 * @param facilityName - Optional: specific facility name
 */
export const getUnsatRate = async (
  from: string,
  to: string,
  province?: string,
  facilityName?: string
): Promise<UnsatRate[]> => {
  const params: Record<string, string> = { from, to };

  if (province && province !== "all") {
    params.province = province;
  }

  if (facilityName) {
    params.facility_name = facilityName;
  }

  const response = await api.get("/unsat/unsat-rate", {
    params,
    timeout: 300000
  });

  return response.data;
};

/**
 * Full patient list per facility (BY PERCENTAGE - modal)
 * @param from - Start date "YYYY-MM-DD"
 * @param to - End date "YYYY-MM-DD"
 * @param facilityName - Exact facility name
 */
export const getFullPatient = async (
  from: string,
  to: string,
  facilityName: string
): Promise<{ total: number; rows: FullPatient[] }> => {
  const response = await api.get("/unsat/full-patient", {
    params: {
      from,
      to,
      facility_name: facilityName
    },
    timeout: 300000
  });

  return response.data;
};

/**
 * Unsatisfactory comparison by province (Period 1 vs Period 2)
 * @param dateFrom1 - Period 1 start "YYYY-MM-DD HH:mm:ss"
 * @param dateTo1   - Period 1 end   "YYYY-MM-DD HH:mm:ss"
 * @param dateFrom2 - Period 2 start "YYYY-MM-DD HH:mm:ss"
 * @param dateTo2   - Period 2 end   "YYYY-MM-DD HH:mm:ss"
 */
export const getUnsatProvince = async (
  dateFrom1: string,
  dateTo1: string,
  dateFrom2: string,
  dateTo2: string
): Promise<{
  success: boolean;
  rows: UnsatProvince[];
  rowCount: number;
}> => {
  const response = await api.get("/unsat/unsat-province", {
    params: {
      dateFrom1,
      dateTo1,
      dateFrom2,
      dateTo2
    },
    timeout: 300000
  });

  return response.data;
};

/**
 * ================================
 * DEFAULT EXPORT
 * ================================
 */

export default {
  getTopUnsatisfactory,
  getUnsatDetails,
  getTotalSamples,
  getUnsatRate,
  getFullPatient,
  getUnsatProvince
};