import api from '../api';

export interface BreakdownItem {
  submid:      string;
  descr1:      string;
  total_count: number;
}

export interface FilterCardResult {
  city:        string;
  total_count: number;
  breakdown:   BreakdownItem[];
}

export interface FilterCardResponse {
  success: boolean;
  data:    FilterCardResult[];
}

export interface CalabarzOnBreakdownItem {
  submid:      string;
  descr1:      string;
  total_count: number;
}

export interface CalabarzOnCityResult {
  city:        string;
  total_count: number;
  breakdown:   CalabarzOnBreakdownItem[];
}

export interface CalabarzOnCountyResult {
  county:      string;
  total_count: number;
  cities:      CalabarzOnCityResult[];
}

export interface CalabarzOnFilterCardResponse {
  success: boolean;
  data:    CalabarzOnCountyResult[];
}

export interface FilterCardParams {
  date_from: string;
  date_to:   string;
}

// ── Lopez (QUEZON county) ─────────────────────────────────────
export const getLopezPurchasedFilterCards = async (
  params: FilterCardParams
): Promise<FilterCardResponse> => {
  try {
    const response = await api.get<FilterCardResponse>(
      '/pdo/lopez-purchased-filter-cards',
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching Lopez purchased filter cards:', error);
    throw error;
  }
};

// ── Nearby Lopez (SUBMID-based) = getLopezPurchasedFilterCards ───
export const getNearbyLopezPurchasedFilterCards = async (
  params: FilterCardParams
): Promise<FilterCardResponse> => {
  try {
    const response = await api.get<FilterCardResponse>(
      '/pdo/lopez-purchased-filter-cards',
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching Nearby Lopez purchased filter cards:', error);
    throw error;
  }
};

// ── CALABARZON ────────────────────────────────────────────────
export const getCalabarzOnPurchasedFilterCards = async (
  params: FilterCardParams
): Promise<CalabarzOnFilterCardResponse> => {
  try {
    const response = await api.get<CalabarzOnFilterCardResponse>(
      '/pdo/calabarzon-purchased-filter-cards',
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching CALABARZON purchased filter cards:', error);
    throw error;
  }
};