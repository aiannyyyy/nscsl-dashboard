// src/services/LaboratoryServices/censusService.ts
import api from '../api';

// Only 'Received' is supported. Screened and Initial have been removed.
export type CumulativeSampleType = 'Received';

export interface CumulativeCensusParams {
    type: CumulativeSampleType;
}

export interface CumulativeCensusDataItem {
    MONTH: number;
    YEAR: number;
    TOTAL_SAMPLES: number;
}

export interface CumulativeCensusResponse {
    success: boolean;
    data: CumulativeCensusDataItem[];
    filters: {
        type: string;
        spectypes: string[];
    };
    count: number;
    executionTime: string;
    timestamp: string;
}

export interface CensusError {
    success: false;
    error: string;
    message: string;
    executionTime?: string;
}

class CensusService {
    /**
     * Get cumulative monthly census data for "Received" samples.
     * Only fetches live data (2026+); historical data is hardcoded in constants.
     */
    static async getCumulativeMonthlyCensus(
        params: CumulativeCensusParams
    ): Promise<CumulativeCensusResponse> {
        const response = await api.get<CumulativeCensusResponse>(
            '/laboratory/census/cumulative-monthly',
            { params }
        );
        return response.data;
    }
}

export default CensusService;