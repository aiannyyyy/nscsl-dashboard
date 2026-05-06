import api from '../api';

const LOGBOOK_ENDORSEMENT_ENDPOINT = '/followup/logbook-endorsement';

/** React Query root for Follow-Up logbook list — invalidate from Laboratory actions. */
export const FOLLOWUP_LOGBOOK_ENDORSEMENT_QUERY_ROOT = ['followup', 'logbookEndorsement'] as const;

export interface LogbookEndorsementRecord {
  id: number;
  date_input: string;
  labno: string;
  patient_name: string;
  facility_code: string;
  category: string;
  mnemonic: string;
  analytes: string;
  values: string;
  analyst: string;
  analyst_date: string;
  tc: string | null;
  tc_date: string | null;
  qao: string | null;
  qao_date: string | null;
  fun: string | null;
  fun_date: string | null;
  date_modified: string | null;
  modified_by: string | null;
}

export interface LogbookEndorsementListResponse {
  success: boolean;
  data: LogbookEndorsementRecord[];
}

export interface LogbookStatsItem {
  category?: string;
  mnemonic?: string;
  count: number;
}

export interface LogbookStatsResponse {
  success: boolean;
  data: LogbookStatsItem[];
}

export const getAllLogbookEndorsements = async (): Promise<LogbookEndorsementListResponse> => {
  const response = await api.get(LOGBOOK_ENDORSEMENT_ENDPOINT);
  return response.data;
};

/** Full endorsement list for Follow-Up “Recalled” / archive (same shape as pending list). */
export const getLogbookEndorsementsRecalledSection = async (): Promise<LogbookEndorsementListResponse> => {
  const response = await api.get(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/recalled`);
  return response.data;
};

export const doneRecallLogbookEndorsement = async (
  id: number,
  payload: { fun: string; modified_by?: string }
): Promise<{ success: boolean; message: string }> => {
  const response = await api.patch(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/${id}/done-recall`, payload);
  return response.data;
};

export const getLogbookCategoryStats = async (): Promise<LogbookStatsResponse> => {
  const response = await api.get(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/stats/category`);
  return response.data;
};

export const getLogbookMnemonicStats = async (): Promise<LogbookStatsResponse> => {
  const response = await api.get(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/stats/mnemonic`);
  return response.data;
};

export default {
  getAllLogbookEndorsements,
  getLogbookEndorsementsRecalledSection,
  doneRecallLogbookEndorsement,
  getLogbookCategoryStats,
  getLogbookMnemonicStats,
};