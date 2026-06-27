import axios from 'axios';
import { applyMockAdapter } from '../../mocks/setupMocks';

/**
 * Base API instance
 * VITE_API_URL=http://localhost:5000/api
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes default
});

applyMockAdapter(api);

// ============================================================================
// TYPES & INTERFACES - Data Queries
// ============================================================================

export interface NsfPerformanceParams {
  county: string;
  dateFrom: string;
  dateTo: string;
}

export interface NsfPerformanceLabDetailsParams {
  submid: string;
  dateFrom: string;
  dateTo: string;
}

export interface NsfPerformanceData {
  SUBMID: number;
  FACILITY_NAME: string;
  TOTAL_SAMPLE_COUNT: number;
  TOTAL_INBORN: number;
  TOTAL_HOMEBIRTH: number;
  TOTAL_HOB: number;
  TOTAL_UNKNOWN: number;
  OUTBORN_TOTAL: number;
  MISSING_INFORMATION: number;
  LESS_THAN_24_HOURS: number;
  INSUFFICIENT: number;
  CONTAMINATED: number;
  DATA_ERASURES: number;
  TOTAL_UNSAT_COUNT: number;
  TOTAL_UNSAT_RATE: number;
  AVE_AOC: number;
  TRANSIT_TIME: number;
  INBORN_AVERAGE: number;
  OUTBORN_AVERAGE: number;
}

export interface LabDetailsData {
  LABNO: string;
  SUBMID: number;
  FNAME: string;
  LNAME: string;
  SPECTYPE: number;
  SPECTYPE_LABEL: string;
  BIRTHHOSP: string;
  BIRTH_CATEGORY: string;
  ISSUE_DESCRIPTION: string;
}

export interface NsfPerformanceResponse {
  success: boolean;
  data: NsfPerformanceData[];
  executionTime: string;
  recordCount: number;
  filters: {
    county: string;
    dateFrom: string;
    dateTo: string;
  };
  message?: string;
}

export interface LabDetailsResponse {
  success: boolean;
  data: LabDetailsData[];
  executionTime: string;
  recordCount: number;
  filters: {
    submid: string;
    dateFrom: string;
    dateTo: string;
  };
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  executionTime?: string;
}

// ============================================================================
// TYPES & INTERFACES - Crystal Reports Generation
// ============================================================================

export interface GenerateReportParams {
  submid: string;
  dateFrom: string;
  dateTo: string;
}

export interface ReportFile {
  name: string;
  size: number;
  created: string;
  modified: string;
}

export interface ListReportsResponse {
  reportsDirectory: string;
  totalFiles: number;
  files: ReportFile[];
  generator: string;
  timestamp: string;
}

export interface ReportHealthResponse {
  status: 'ok' | 'error';
  reportGenerator: string;
  vbnetExecutable: 'available' | 'not available' | 'unknown';
  directories: {
    output: {
      path: string;
      exists: boolean;
    };
    temp: {
      path: string;
      exists: boolean;
    };
    crystalReportExporter: {
      path: string;
      exists: boolean;
    };
    vbnetReports?: {
      path: string;
      exists: boolean;
    };
  };
  executable: {
    path: string;
    exists: boolean;
    name: string;
  };
  template: {
    name: string;
    path: string;
    exists: boolean;
  };
  recentFiles: string[];
  issues?: string[] | null;
  configuration: {
    CRYSTAL_REPORTS_DIR: string;
    OUTPUT_DIR: string;
    TEMP_DIR: string;
    REPORT_TEMPLATE: string;
  };
  timestamp: string;
}

export interface ReportErrorResponse {
  error: string;
  details?: string;
  requestId: string;
}

// ============================================================================
// API FUNCTIONS - Data Queries
// ============================================================================

/**
 * Fetch NSF Performance data by county and date range
 * @param params - county, dateFrom, dateTo
 */
export const getNsfPerformance = async (
  params: NsfPerformanceParams
): Promise<NsfPerformanceResponse> => {
  try {
    console.log('🔍 Fetching NSF Performance data:', params);

    const response = await api.get<NsfPerformanceResponse>(
      '/pdo/nsf-performance',
      {
        params: {
          county: params.county,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
        timeout: 300000, // 5 minutes
      }
    );

    console.log('✅ NSF Performance data received:', {
      recordCount: response.data.recordCount,
      executionTime: response.data.executionTime,
    });

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch NSF Performance data:', error);

    if (axios.isAxiosError(error)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch NSF performance data',
        message: error.response?.data?.message || error.message,
        executionTime: error.response?.data?.executionTime,
      };
      throw errorResponse;
    }
    throw error;
  }
};

/**
 * Fetch NSF Performance Lab Details by submid and date range
 * @param params - submid, dateFrom, dateTo
 */
export const getNsfPerformanceLabDetails = async (
  params: NsfPerformanceLabDetailsParams
): Promise<LabDetailsResponse> => {
  try {
    console.log('🔍 Fetching Lab Details:', params);

    const response = await api.get<LabDetailsResponse>(
      '/pdo/nsf-performance/lab-details',
      {
        params: {
          submid: params.submid,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
        timeout: 300000, // 5 minutes
      }
    );

    console.log('✅ Lab Details received:', {
      recordCount: response.data.recordCount,
      executionTime: response.data.executionTime,
    });

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch Lab Details:', error);

    if (axios.isAxiosError(error)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch lab details',
        message: error.response?.data?.message || error.message,
        executionTime: error.response?.data?.executionTime,
      };
      throw errorResponse;
    }
    throw error;
  }
};

// ============================================================================
// API FUNCTIONS - Crystal Reports Generation
// ============================================================================

/**
 * Generate NSF Performance PDF report using Crystal Reports (VB.NET Executable)
 * @param params - submid, dateFrom, dateTo
 * @returns Promise with PDF blob
 */
export const generateNsfReport = async (
  params: GenerateReportParams
): Promise<Blob> => {
  try {
    console.log('📄 Generating Crystal Reports PDF:', {
      ...params,
      generator: 'Crystal Reports via VB.NET Executable',
    });

    const response = await api.get('/pdo/nsf-performance/generate-report', {
      params: {
        submid: params.submid,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
      responseType: 'blob',
      timeout: 180000, // 3 minutes - Crystal Reports may take longer
      headers: {
        Accept: 'application/pdf',
      },
    });

    if (response.data.type !== 'application/pdf') {
      console.error('❌ Invalid response type:', response.data.type);
      throw new Error('Invalid response type: expected PDF from Crystal Reports');
    }

    console.log('✅ Crystal Reports PDF generated successfully:', {
      size: `${(response.data.size / 1024).toFixed(2)} KB`,
      requestId: response.headers['x-request-id'],
      generator: response.headers['x-report-generator'],
      submid: params.submid,
    });

    return response.data;
  } catch (error) {
    console.error('❌ Failed to generate Crystal Report:', error);

    if (axios.isAxiosError(error)) {
      if (
        error.response?.data instanceof Blob &&
        error.response.data.type === 'application/json'
      ) {
        const text = await error.response.data.text();
        try {
          const jsonError = JSON.parse(text);
          const errorResponse: ReportErrorResponse = {
            error: jsonError.error || 'Failed to generate Crystal Report',
            details: jsonError.details,
            requestId: jsonError.requestId,
          };
          console.error('❌ Crystal Reports Error Details:', errorResponse);
          throw errorResponse;
        } catch {
          throw new Error('Failed to generate Crystal Report: Invalid error response');
        }
      }

      if (error.code === 'ECONNABORTED') {
        throw new Error(
          'Crystal Report generation timed out. The report may be too large or the server is busy. Please try again.'
        );
      }

      if (error.code === 'ERR_NETWORK') {
        throw new Error(
          'Network error: Unable to connect to Crystal Reports server. Please check your connection.'
        );
      }

      if (error.response?.status === 500) {
        throw new Error(
          'Crystal Reports generation failed on the server. Please contact support.'
        );
      }

      throw new Error(
        error.response?.data?.error || error.message || 'Failed to generate Crystal Report'
      );
    }
    throw error;
  }
};

/**
 * Download PDF blob with proper filename
 * @param blob - PDF blob from generateNsfReport
 * @param params - Parameters used to generate the report (for filename)
 */
export const downloadReportBlob = (blob: Blob, params: GenerateReportParams): void => {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const dateFrom = params.dateFrom.replace(/-/g, '');
    const dateTo = params.dateTo.replace(/-/g, '');
    link.download = `nsf_performance_${params.submid}_${dateFrom}_${dateTo}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => window.URL.revokeObjectURL(url), 100);

    console.log('✅ Crystal Report PDF download initiated:', link.download);
  } catch (error) {
    console.error('❌ Failed to download Crystal Report PDF:', error);
    throw new Error('Failed to download PDF file');
  }
};

/**
 * Open PDF blob in new tab
 * @param blob - PDF blob from generateNsfReport
 */
export const openReportInNewTab = (blob: Blob): void => {
  try {
    const url = window.URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

    if (!newWindow) {
      throw new Error('Failed to open new window. Please allow popups for this site.');
    }

    setTimeout(() => window.URL.revokeObjectURL(url), 60000);

    console.log('✅ Crystal Report PDF opened in new tab');
  } catch (error) {
    console.error('❌ Failed to open PDF in new tab:', error);
    throw new Error('Failed to open PDF in new tab. Please check popup settings.');
  }
};

/**
 * List all available Crystal Reports PDF files
 */
export const listReports = async (): Promise<ListReportsResponse> => {
  try {
    console.log('📋 Fetching Crystal Reports list...');

    const response = await api.get<ListReportsResponse>(
      '/pdo/nsf-performance/reports',
      { timeout: 10000 }
    );

    console.log('✅ Report list received:', {
      totalFiles: response.data.totalFiles,
      generator: response.data.generator,
    });

    return response.data;
  } catch (error) {
    console.error('❌ Failed to list reports:', error);

    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || 'Failed to list Crystal Reports'
      );
    }
    throw error;
  }
};

/**
 * Download a specific Crystal Report file by filename
 * @param filename - Name of the PDF file to download
 */
export const getReportByFilename = async (filename: string): Promise<Blob> => {
  try {
    console.log('📥 Downloading Crystal Report:', filename);

    const response = await api.get(
      `/pdo/nsf-performance/reports/${encodeURIComponent(filename)}`,
      {
        responseType: 'blob',
        timeout: 30000,
      }
    );

    console.log('✅ Crystal Report downloaded:', {
      filename,
      size: `${(response.data.size / 1024).toFixed(2)} KB`,
      generator: response.headers['x-report-generator'],
    });

    return response.data;
  } catch (error) {
    console.error('❌ Failed to download Crystal Report:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Crystal Report file not found: ${filename}`);
      }
      if (error.response?.status === 403) {
        throw new Error('Access denied to Crystal Report file');
      }
      throw new Error(`Failed to download Crystal Report: ${filename}`);
    }
    throw error;
  }
};

/**
 * Download a specific Crystal Report file by filename (triggers browser download)
 * @param filename - Name of the PDF file
 */
export const downloadReportByFilename = async (filename: string): Promise<void> => {
  try {
    const blob = await getReportByFilename(filename);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => window.URL.revokeObjectURL(url), 100);

    console.log('✅ Crystal Report download initiated:', filename);
  } catch (error) {
    console.error('❌ Crystal Report download failed:', error);
    throw error;
  }
};

/**
 * Check health status of Crystal Reports generation system (VB.NET Executable)
 */
export const getReportSystemHealth = async (): Promise<ReportHealthResponse> => {
  try {
    console.log('🏥 Checking Crystal Reports system health...');

    const response = await api.get<ReportHealthResponse>(
      '/pdo/nsf-performance/report-health',
      { timeout: 10000 }
    );

    console.log('✅ Health check complete:', {
      status: response.data.status,
      generator: response.data.reportGenerator,
      vbnetExe: response.data.vbnetExecutable,
      templateExists: response.data.template.exists,
    });

    if (response.data.vbnetExecutable === 'not available') {
      console.warn('⚠️ Crystal Reports VB.NET executable not available. Check installation.');
    }

    if (!response.data.template.exists) {
      console.warn('⚠️ Crystal Reports template (.rpt) not found:', response.data.template.path);
    }

    if (response.data.issues && response.data.issues.length > 0) {
      console.warn('⚠️ Configuration Issues:', response.data.issues);
    }

    return response.data;
  } catch (error) {
    console.error('❌ Crystal Reports health check failed:', error);

    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || 'Failed to check Crystal Reports system health'
      );
    }
    throw error;
  }
};

/**
 * Validate Crystal Reports setup before generating reports
 * @returns Promise<boolean> - true if system is ready
 */
export const validateCrystalReportsSetup = async (): Promise<boolean> => {
  try {
    const health = await getReportSystemHealth();

    const isValid =
      health.status === 'ok' &&
      health.vbnetExecutable === 'available' &&
      health.template.exists &&
      health.directories.output.exists &&
      health.directories.crystalReportExporter.exists &&
      health.executable.exists;

    if (!isValid) {
      console.error('❌ Crystal Reports setup validation failed:', {
        status: health.status,
        vbnetExe: health.vbnetExecutable,
        executableExists: health.executable.exists,
        templateExists: health.template.exists,
        outputDirExists: health.directories.output.exists,
        exporterDirExists: health.directories.crystalReportExporter.exists,
        issues: health.issues,
      });
    }

    return isValid;
  } catch (error) {
    console.error('❌ Crystal Reports validation error:', error);
    return false;
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Data queries
  getNsfPerformance,
  getNsfPerformanceLabDetails,

  // Crystal Reports generation
  generateNsfReport,
  downloadReportBlob,
  openReportInNewTab,

  // Crystal Reports management
  listReports,
  getReportByFilename,
  downloadReportByFilename,
  getReportSystemHealth,
  validateCrystalReportsSetup,
};