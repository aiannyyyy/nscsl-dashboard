import api from '../api';

const LOGBOOK_ENDORSEMENT_ENDPOINT = '/laboratory/logbook-endorsement';

// ─── Lookup ───────────────────────────────────────────────────────────────────

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

// ─── Record ───────────────────────────────────────────────────────────────────

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
  /** Optional free-text note attached to the endorsement */
  note: string | null;
  /**
   * Comma-separated relative paths, e.g. "uploads/a.pdf,uploads/b.png"
   * (same storage pattern as UNSAT endorsements).
   */
  attachment_path: string | null;
  date_modified: string | null;
  modified_by: string | null;
}

export interface LogbookEndorsementListResponse {
  success: boolean;
  data: LogbookEndorsementRecord[];
}

// ─── Create ───────────────────────────────────────────────────────────────────

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
  note?: string | null;
  /** One or more files; sent as multipart field `attachments`. */
  attachments?: File[];
  /** @deprecated Prefer `attachments`; single file is still supported */
  attachment?: File | null;
}

// ─── Update ───────────────────────────────────────────────────────────────────

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
  note?: string | null;
  /** New files to add (append) unless files_to_keep / files_to_delete are sent. */
  attachments?: File[];
  /** @deprecated Prefer `attachments` */
  attachment?: File | null;
  /** Set to true to remove all attachments from disk and clear the column. */
  remove_attachment?: boolean;
  /** JSON-encoded string[] — explicit edit mode together with attachments / files_to_delete */
  files_to_keep?: string;
  /** JSON-encoded string[] of stored paths to delete from disk */
  files_to_delete?: string;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface LogbookStatsItem {
  category?: string;
  mnemonic?: string;
  count: number;
}

export interface LogbookStatsResponse {
  success: boolean;
  data: LogbookStatsItem[];
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export interface ApproveTeamCaptainResponse {
  success: boolean;
  message: string;
  tc: string;
  tc_date: string;
}

export type LabQaApproveRole = 'lab_manager' | 'qao';

export interface ApproveLabQaResponse {
  success: boolean;
  message: string;
  qao: string | null;
  qao_date: string | null;
  fun: string | null;
  fun_date: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a FormData from a create/update payload.
 * File lists use multer field name `attachments` (multiple).
 */
function toFormData(
  payload: Record<string, string | number | boolean | File | File[] | null | undefined>
): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
      for (const f of value as File[]) {
        fd.append('attachments', f);
      }
      continue;
    }
    if (value instanceof File) {
      fd.append('attachments', value);
    } else if (value === null) {
      fd.append(key, '');
    } else {
      fd.append(key, String(value));
    }
  }
  return fd;
}

// ─── API calls ────────────────────────────────────────────────────────────────

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
): Promise<{ success: boolean; message: string; id: number; attachment_path: string | null }> => {
  const { attachment, attachments, ...rest } = payload;
  const files: File[] =
    attachments && attachments.length
      ? attachments
      : attachment
        ? [attachment]
        : [];

  const fd = toFormData({
    ...rest,
    ...(files.length ? { attachments: files } : {}),
  });

  const response = await api.post(LOGBOOK_ENDORSEMENT_ENDPOINT, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateLogbookEndorsement = async (
  payload: UpdateLogbookEndorsementPayload
): Promise<{ success: boolean; message: string; attachment_path?: string | null }> => {
  const { id, attachment, attachments, remove_attachment, ...rest } = payload;
  const files: File[] =
    attachments && attachments.length
      ? attachments
      : attachment
        ? [attachment]
        : [];

  const fd = toFormData({
    ...rest,
    ...(files.length ? { attachments: files } : {}),
    ...(remove_attachment ? { remove_attachment: 'true' } : {}),
  });

  const response = await api.put(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/${id}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/** Team Captain only; sets tc + tc_date and notifies LM / QAO */
export const approveLogbookTeamCaptain = async (
  id: number
): Promise<ApproveTeamCaptainResponse> => {
  const response = await api.patch(`${LOGBOOK_ENDORSEMENT_ENDPOINT}/${id}/team-captain-approve`);
  return response.data;
};

/** Laboratory Manager or QAO approval */
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