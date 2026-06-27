import axios, { AxiosError } from 'axios';
import { applyMockAdapter } from '../../mocks/setupMocks';

// =================== TYPES ===================

export interface CarRecord {
  id: number;
  case_no: string;
  date_endorsed: string;
  endorsed_by: string;
  facility_code: string;
  facility_name: string;
  city: string;
  province: string;
  labno: string;
  repeat_field: string;
  status: 'open' | 'closed' | 'pending';
  number_sample: number;
  case_code: string;
  sub_code1: string;
  sub_code2: string;
  sub_code3: string;
  sub_code4: string;
  remarks: string;
  frc: string;
  wrc: string;
  prepared_by: string;
  followup_on: string | null;
  reviewed_on: string | null;
  closed_on: string | null;
  attachment_path: string | null;
  created_by?: string | null;
  created_at?: string | null;
  modified_by?: string | null;
  modified_at?: string | null;
}

export interface AddCarFormData {
  caseNo: string;
  endorsedDate: string;
  endorsedBy: string;
  facilityCode: string;
  facilityName?: string;
  city?: string;
  province?: string;
  labNo?: string;
  repeat?: string;
  status?: string;
  numSamples?: string;
  caseCode?: string;
  subCode1?: string;
  subCode2?: string;
  subCode3?: string;
  subCode4?: string;
  remarks?: string;
  frc?: string;
  wrc?: string;
  preparedBy?: string;
  followupOn?: string;
  reviewedOn?: string;
  closedOn?: string;
  attachment?: File;
  userName?: string; // ⭐ Added for tracking
}

export interface FacilityDetails {
  facilitycode: string;
  adrs_type: string;
  facilityname: string;
  city: string;
  province: string;
}

export interface GroupedByProvince {
  province: string;
  count: number;
}

export interface GroupedBySubCode {
  sub_code1: string;
  count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  total?: number;
  count?: number;
  message?: string;
  error?: string;
}

export interface StatusUpdateRequest {
  id: number;
  status: 'open' | 'closed' | 'pending';
  userName?: string; // ⭐ Added for tracking
}

export interface StatusUpdateResponse {
  success: boolean;
  message: string;
  affectedRows: number;
  updatedRecord: {
    id: number;
    status: string;
    closed_on: string | null;
    modified_by?: string | null;
    modified_at?: string | null;
  };
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  affectedRows: number;
}

// ⭐ NEW: Next case number response interface
export interface NextCaseNumberResponse {
  success: boolean;
  nextNumber: number;
  formattedNumber: string;
  preview: string;
  message?: string;
}

// =================== CONFIGURATION ===================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

applyMockAdapter(axiosInstance);

// Request interceptor for logging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// =================== API FUNCTIONS ===================

/**
 * Get all car records
 */
export const getAllCarList = async (): Promise<CarRecord[]> => {
  try {
    const response = await axiosInstance.get<ApiResponse<CarRecord[]>>('/car-list');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching car list:', error);
    throw error;
  }
};

/**
 * Get filtered car list by status and date range
 */
export const getFilteredCarList = async (
  status: string,
  dateStart: string,
  dateEnd: string
): Promise<CarRecord[]> => {
  try {
    const response = await axiosInstance.get<ApiResponse<CarRecord[]>>('/car-filtered', {
      params: {
        status,
        date_start: dateStart,
        date_end: dateEnd,
      },
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching filtered car list:', error);
    throw error;
  }
};

/**
 * Get car list grouped by province
 */
export const getCarListGroupedByProvince = async (
  status?: string,
  dateStart?: string,
  dateEnd?: string,
  province?: string
): Promise<GroupedByProvince[]> => {
  try {
    const response = await axiosInstance.get<ApiResponse<GroupedByProvince[]>>(
      '/car-list/grouped-by-province',
      {
        params: {
          status: status || '',
          date_start: dateStart,
          date_end: dateEnd,
          province: province || '',
        },
      }
    );
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching car list grouped by province:', error);
    throw error;
  }
};

/**
 * Get car list grouped by sub_code1 (for pie chart)
 */
/**
 * Get car list grouped by sub_code1 (for pie chart)
 */
export const getCarListGrouped = async (
  from?: string,
  to?: string,
  province?: string,
  status?: string   // ← add
): Promise<GroupedBySubCode[]> => {
  try {
    const response = await axiosInstance.get<ApiResponse<GroupedBySubCode[]>>(
      '/car-list/grouped',
      {
        params: {
          from,
          to,
          province: province || '',
          status: status || '',   // ← add
        },
      }
    );
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching grouped car list:', error);
    throw error;
  }
};

/**
 * Get facility details by code (Oracle lookup)
 */
export const getFacilityByCode = async (
  facilityCode: string
): Promise<FacilityDetails | null> => {
  const response = await axiosInstance.get('/facility', {
    params: { facilitycode: facilityCode }
  });

  if (response.data?.found && response.data.data) {
    const f = response.data.data;
    return {
      facilitycode: f.FACILITY_CODE,
      adrs_type: f.ADRS_TYPE,
      facilityname: f.FACILITY_NAME,
      city: f.CITY,
      province: f.PROVINCE,
    };
  }

  return null;
};

/**
 * ⭐ NEW: Get next case number for auto-generation
 * @param provinceCode - Province code (e.g., 'LAG', 'CAV', 'BAT', 'RIZ', 'QUE')
 * @param year - Year in 2-digit format (e.g., '26' for 2026)
 * @returns Next case number information
 */
export const getNextCaseNumber = async (
  provinceCode: string,
  year: string
): Promise<NextCaseNumberResponse> => {
  try {
    const response = await axiosInstance.get<NextCaseNumberResponse>(
      '/car-list/next-case-number',
      {
        params: {
          province: provinceCode,
          year: year,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting next case number:', error);
    throw error;
  }
};

/**
 * Add new car record with file upload
 */
export const addCar = async (formData: AddCarFormData): Promise<ApiResponse<any>> => {
  try {
    const data = new FormData();

    // Map frontend field names to backend field names
    data.append('case_no', formData.caseNo);
    data.append('date_endorsed', formData.endorsedDate);
    data.append('endorsed_by', formData.endorsedBy || '');
    data.append('facility_code', formData.facilityCode);
    data.append('facility_name', formData.facilityName || '');
    data.append('city', formData.city || '');
    data.append('province', formData.province || '');
    data.append('labno', formData.labNo || '');
    data.append('repeat_field', formData.repeat || '');
    data.append('status', formData.status || 'open');
    data.append('number_sample', formData.numSamples || '');
    data.append('case_code', formData.caseCode || '');
    data.append('sub_code1', formData.subCode1 || '');
    data.append('sub_code2', formData.subCode2 || '');
    data.append('sub_code3', formData.subCode3 || '');
    data.append('sub_code4', formData.subCode4 || '');
    data.append('remarks', formData.remarks || '');
    data.append('frc', formData.frc || '');
    data.append('wrc', formData.wrc || '');
    data.append('prepared_by', formData.preparedBy || '');
    data.append('followup_on', formData.followupOn || '');
    data.append('reviewed_on', formData.reviewedOn || '');
    data.append('closed_on', formData.closedOn || '');

    // ⭐ Add userName for tracking
    if (formData.userName) {
      data.append('userName', formData.userName);
    }

    // Append file if exists
    if (formData.attachment) {
      data.append('attachment', formData.attachment);
    }

    const response = await axios.post(`${API_BASE_URL}/add-car`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error('Error adding car record:', error);
    throw error;
  }
};

/**
 * Update existing car record with file upload
 */
export const updateCar = async (id: number, formData: AddCarFormData): Promise<ApiResponse<any>> => {
  try {
    const data = new FormData();

    // Add the ID to the form data
    data.append('id', id.toString());

    // Map frontend field names to backend field names
    data.append('case_no', formData.caseNo);
    data.append('date_endorsed', formData.endorsedDate);
    data.append('endorsed_by', formData.endorsedBy || '');
    data.append('facility_code', formData.facilityCode);
    data.append('facility_name', formData.facilityName || '');
    data.append('city', formData.city || '');
    data.append('province', formData.province || '');
    data.append('labno', formData.labNo || '');
    data.append('repeat_field', formData.repeat || '');
    data.append('status', formData.status || 'open');
    data.append('number_sample', formData.numSamples || '');
    data.append('case_code', formData.caseCode || '');
    data.append('sub_code1', formData.subCode1 || '');
    data.append('sub_code2', formData.subCode2 || '');
    data.append('sub_code3', formData.subCode3 || '');
    data.append('sub_code4', formData.subCode4 || '');
    data.append('remarks', formData.remarks || '');
    data.append('frc', formData.frc || '');
    data.append('wrc', formData.wrc || '');
    data.append('prepared_by', formData.preparedBy || '');
    data.append('followup_on', formData.followupOn || '');
    data.append('reviewed_on', formData.reviewedOn || '');
    data.append('closed_on', formData.closedOn || '');

    // ⭐ Add userName for tracking
    if (formData.userName) {
      data.append('userName', formData.userName);
    }

    // Append file if exists (new file uploaded)
    if (formData.attachment) {
      data.append('attachment', formData.attachment);
    }

    const response = await axios.put(`${API_BASE_URL}/car-list/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error('Error updating car record:', error);
    throw error;
  }
};

/**
 * Update car record status
 */
export const updateCarStatus = async (
  id: number,
  status: 'open' | 'closed' | 'pending',
  userName?: string
): Promise<StatusUpdateResponse> => {
  try {
    const payload: StatusUpdateRequest = {
      id,
      status,
    };

    // ⭐ Add userName for tracking
    if (userName) {
      payload.userName = userName;
    }

    const response = await axiosInstance.post<StatusUpdateResponse>('/update-status', payload);
    return response.data;
  } catch (error) {
    console.error('Error updating car status:', error);
    throw error;
  }
};

/**
 * Delete car record
 */
export const deleteCarRecord = async (id: number): Promise<DeleteResponse> => {
  try {
    const response = await axiosInstance.delete<DeleteResponse>(`/car-list/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting car record:', error);
    throw error;
  }
};

/**
 * Test database connection
 */
export const testDatabaseConnection = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get('/test-db');
    return response.data;
  } catch (error) {
    console.error('Error testing database connection:', error);
    throw error;
  }
};

// =================== UTILITY FUNCTIONS ===================

/**
 * Format date for API (converts datetime-local to MySQL datetime format)
 */
export const formatDateForAPI = (dateString: string): string => {
  if (!dateString) return '';
  // datetime-local format: "2024-01-29T14:30"
  // MySQL format: "2024-01-29 14:30:00"
  return dateString.replace('T', ' ') + ':00';
};

/**
 * Calculate date range for month
 */
export const getMonthDateRange = (month: string, year: string) => {
  const monthIndex = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ].indexOf(month);

  if (monthIndex === -1) return null;

  const startDate = new Date(parseInt(year), monthIndex, 1);
  const endDate = new Date(parseInt(year), monthIndex + 1, 0, 23, 59, 59);

  return {
    start: startDate.toISOString().split('T')[0] + ' 00:00:00',
    end: endDate.toISOString().split('T')[0] + ' 23:59:59',
  };
};

/**
 * Error message extractor
 */
export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || error.message;
  }
  return error.message || 'An unknown error occurred';
};