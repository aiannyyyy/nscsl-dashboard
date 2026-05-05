import api from '../api';

const LOGBOOK_ENDORSEMENT_ENDPOINT = '/laboratory/logbook-endorsement';

export interface LogbookLookupTest {
  mnemonic: string;
  testCode: string;
  testName: string;
  value: string | number | null;
}

export interface LogbookLookupPatient {
  labno: string;
  firstName: string;
  lastName: string;
  submid: string;
  tests: LogbookLookupTest[];
}

export interface LogbookLookupResponse {
  success: boolean;
  data?: LogbookLookupPatient;
  error?: string;
  message?: string;
}

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

export interface CreateLogbookEndorsementPayload {
  labno: string;
  patient_name: string;
  facility_code: string;
  category: string;
  mnemonic: string;
  analytes: string;
  values: string;
  analyst: string;
  tc?: string;
  tc_date?: string | null;
  qao?: string;
  qao_date?: string | null;
  fun?: string;
  fun_date?: string | null;
}

export interface UpdateLogbookEndorsementPayload {
  id: number;
  category: string;
  mnemonic: string;
  analytes: string;
  values: string;
  tc?: string;
  tc_date?: string | null;
  qao?: string;
  qao_date?: string | null;
  fun?: string;
  fun_date?: string | null;
  modified_by?: string;
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

export const getLogbookEndorsementPatientDetails = async (
  labno: string
): Promise<LogbookLookupResponse> => {
  const response = await api.get(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/lookup`, {
    params: { labno: labno.trim() },
  });
  return response.data;
};

export const getAllLogbookEndorsements = async (): Promise<LogbookEndorsementListResponse> => {
  const response = await api.get(LOGBOOK_ENDORSEMENT_ENDPOINT);
  return response.data;
};

export const createLogbookEndorsement = async (
  payload: CreateLogbookEndorsementPayload
): Promise<{ success: boolean; message: string; id: number }> => {
  const response = await api.post(LOGBOOK_ENDORSEMENT_ENDPOINT, payload);
  return response.data;
};

export const updateLogbookEndorsement = async (
  payload: UpdateLogbookEndorsementPayload
): Promise<{ success: boolean; message: string }> => {
  const response = await api.put(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/${payload.id}`, payload);
  return response.data;
};

export interface ApproveTeamCaptainResponse {
  success: boolean;
  message: string;
  tc: string;
  tc_date: string;
}

/** Team Captain only; sets tc + tc_date and notifies LM / QAO */
export const approveLogbookTeamCaptain = async (
  id: number
): Promise<ApproveTeamCaptainResponse> => {
  const response = await api.patch(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/${id}/team-captain-approve`);
  return response.data;
};

export type LabQaApproveRole = 'lab_manager' | 'qao';

export interface ApproveLabQaResponse {
  success: boolean;
  message: string;
  qao: string | null;
  qao_date: string | null;
  fun: string | null;
  fun_date: string | null;
}

/** Laboratory Manager writes fun/fun_date; QAO writes qao/qao_date */
export const approveLogbookLabQa = async (
  id: number,
  role: LabQaApproveRole
): Promise<ApproveLabQaResponse> => {
  const response = await api.patch(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/${id}/lab-qa-approve`, {
    role,
  });
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
  getLogbookEndorsementPatientDetails,
  getAllLogbookEndorsements,
  createLogbookEndorsement,
  updateLogbookEndorsement,
  approveLogbookTeamCaptain,
  approveLogbookLabQa,
  getLogbookCategoryStats,
  getLogbookMnemonicStats,
};
