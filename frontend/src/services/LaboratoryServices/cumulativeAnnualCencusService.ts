// src/services/LaboratoryServices/cumulativeAnnualCensusService.ts
import api from '../api';

// ---------------------------------------------------------------------------
// Shared response shape — all 3 endpoints return the same structure
// Each row is one YYYY-MM bucket with a TOTAL_SAMPLES count
// ---------------------------------------------------------------------------

export interface AnnualCensusRow {
  YEAR_MONTH: string;     // e.g. "2026-01"
  TOTAL_SAMPLES: number;
}

export interface AnnualCensusResponse {
  success: boolean;
  data: AnnualCensusRow[];
  filters: {
    spectypes: string[];
    dateFrom: string;     // "2026-01-01"
  };
  count: number;
  executionTime: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// 3 API calls — one per endpoint
// ---------------------------------------------------------------------------

/** Received — SPECTYPEs: 20, 2, 3, 4, 5, 87 — 2026+ */
export const getAnnualCensusReceived = async (): Promise<AnnualCensusResponse> => {
  const response = await api.get<AnnualCensusResponse>(
    '/laboratory/cumulative-annual-census'
  );
  return response.data;
};

/** Screened — SPECTYPEs: 20, 2, 3, 4, 87 — 2026+ */
export const getAnnualCensusScreened = async (): Promise<AnnualCensusResponse> => {
  const response = await api.get<AnnualCensusResponse>(
    '/laboratory/cumulative-annual-census/screened'
  );
  return response.data;
};

/** Initial — SPECTYPE: 20 — 2026+ */
export const getAnnualCensusInitial = async (): Promise<AnnualCensusResponse> => {
  const response = await api.get<AnnualCensusResponse>(
    '/laboratory/cumulative-annual-census/initial'
  );
  return response.data;
};