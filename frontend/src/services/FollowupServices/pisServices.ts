import api from '../api';

// ==================== TYPES ====================

export interface PISSearchParams {
  labno?: string; labid?: string; lname?: string; fname?: string; submid?: string;
  birthdt?: string; dtcoll?: string; dtrecv?: string; dtrptd?: string;
  sex?: string; phyid?: string; outsideLab?: string; formno?: string;
}

export interface PISRecord {
  LABNO: string; LABID: string; FNAME: string; LNAME: string; SUBMID: string;
  BIRTHDT: string; BIRTHTM: string; DTCOLL: string; TMCOLL: string;
  DTRECV: string; TMRECV: string; DTRPTD: string; GESTAGE: string; AGECOLL: string; SEX: string;
}

export interface PISDetailRecord {
  LABNO: string; LABID: string; LNAME: string; FNAME: string;
  BIRTHDT: string; BIRTHTM: string; DTCOLL: string; TMCOLL: string;
  SPECTYPE: string; MILKTYPE: string; SEX: string; BIRTHWT: string;
  TWIN: string; TRANSFUS: string; DTXFUS: string; GESTAGE: string;
  SPECIMEN_AGE_DAYS: number; AGECOLL: string;
  DTRECV: string; TMRECV: string; DTRPTD: string;
  CLINSTAT: string; DEMCODE: string; PHYSID: string; BIRTHHOSP: string; RELEASEDT: string;
  INIT_TECH: number; INIT_TECH_NAME: string; VER_TECH: number; VER_TECH_NAME: string;
  PROVIDERID: string; DESCR1: string; STREET1: string; STREET2: string;
  CITY: string; COUNTY: string; PHONE: string; FAX: string;
  DESCR7: string; EMAIL: string; DESCR4: string; DESCR5: string; DESCR6: string;
  DISPOSITION: string; DISPDATE: string; USER_ID: number; CLOSED_BY_NAME: string;
}

export interface PISResponse {
  success: boolean; data: PISRecord[]; count: number;
  filters: PISSearchParams; executionTime: string; timestamp: string;
}

export interface PISDetailResponse {
  success: boolean; data: Record<string, PISDetailRecord[]>;
  count: number; labno: string; executionTime: string; timestamp: string;
}

// ==================== SERVICE ====================

const mapParamsToQuery = (params: Record<string, string>): PISSearchParams => {
  const mapped: PISSearchParams = {};
  if (params.labNumber)            mapped.labno      = params.labNumber;
  if (params.lastName)             mapped.lname      = params.lastName;
  if (params.firstName)            mapped.fname      = params.firstName;
  if (params.collectionHospitalId) mapped.submid     = params.collectionHospitalId;
  if (params.physicianId)          mapped.phyid      = params.physicianId;
  if (params.sex)                  mapped.sex        = params.sex;
  if (params.outsideLab)           mapped.outsideLab = params.outsideLab;
  if (params.formNumber)           mapped.formno     = params.formNumber;
  if (params.birthDate)            mapped.birthdt    = params.birthDate;
  if (params.dateCollection)       mapped.dtcoll     = params.dateCollection;
  if (params.dateReceived)         mapped.dtrecv     = params.dateReceived;
  if (params.dateReported)         mapped.dtrptd     = params.dateReported;
  return mapped;
};

export const searchPatients = async (params: Record<string, string>): Promise<PISResponse> => {
  try {
    const queryParams = mapParamsToQuery(params);
    const cleanParams = Object.fromEntries(Object.entries(queryParams).filter(([, v]) => v && v.trim() !== ''));
    const response = await api.get('/laboratory/pis/search', { params: cleanParams });
    return response.data;
  } catch (error) { console.error('[pisService] searchPatients error:', error); throw error; }
};

export const getPatientDetail = async (labno: string): Promise<PISDetailResponse> => {
  try {
    const response = await api.get('/laboratory/pis/detail', { params: { labno: labno.trim() } });
    return response.data;
  } catch (error) { console.error('[pisService] getPatientDetail error:', error); throw error; }
};

// ==================== RESULTS ====================

export interface PISResultRecord {
  ABBREV: string; VALUE: string; TESTCODE: string;
  EXPECTED: string; MNEMONIC: string; INSTRUCT: string; DISORDERRESULTTEXT: string;
}
export interface PISResultsResponse {
  success: boolean; data: PISResultRecord[]; count: number;
  labno: string; executionTime: string; timestamp: string;
}
export const getPatientResults = async (labno: string): Promise<PISResultsResponse> => {
  try {
    const response = await api.get('/laboratory/pis/results', { params: { labno: labno.trim() } });
    return response.data;
  } catch (error) { console.error('[pisService] getPatientResults error:', error); throw error; }
};

// ==================== TEST SEQUENCE ====================

export interface PISTestSeqRecord {
  LABNO: string; TESTSEQ: string | number; MNEMONIC: string; VALUE: string; RFLAG: string; ABBREV: string;
}
export interface PISTestSeqResponse {
  success: boolean; data: PISTestSeqRecord[]; count: number;
  labno: string; executionTime: string; timestamp: string;
}
export const getTestSequence = async (labno: string): Promise<PISTestSeqResponse> => {
  try {
    const response = await api.get('/laboratory/pis/testsequence', { params: { labno: labno.trim() } });
    return response.data;
  } catch (error) { console.error('[pisService] getTestSequence error:', error); throw error; }
};

// ==================== PATIENT FILTER CARDS ====================

export interface PISFilterCardRecord { LABNO: string; LNAME: string; FNAME: string; DTRPTD: string; }
export interface PISFilterCardsResponse {
  success: boolean; data: PISFilterCardRecord[]; count: number;
  fname: string; lname: string; executionTime: string; timestamp: string;
}
export const getPatientFilterCards = async (fname: string, lname: string): Promise<PISFilterCardsResponse> => {
  try {
    const response = await api.get('/laboratory/pis/filtercards', { params: { fname: fname.trim(), lname: lname.trim() } });
    return response.data;
  } catch (error) { console.error('[pisService] getPatientFilterCards error:', error); throw error; }
};

// ==================== AUDIT TRAIL ====================

export interface PISAuditRecord {
  LABNO: string; TABLECOLUMN: string; OLDDATA: string; NEWDATA: string;
  AUDIT_DATE: string; AUDIT_USER: string; LASTMOD: string;
  USER_ID: number | null; FIRSTNAME: string | null; LASTNAME: string | null;
  FULL_NAME: string | null; SOURCE_TABLE: 'AUDIT_RESULTS' | 'AUDIT_SAMPLE';
}
export interface PISAuditResponse {
  success: boolean; data: PISAuditRecord[]; count: number;
  labno: string; executionTime: string; timestamp: string;
}
export const getAuditTrail = async (labno: string): Promise<PISAuditResponse> => {
  try {
    const response = await api.get('/laboratory/pis/audit-trail', { params: { labno: labno.trim() } });
    return response.data;
  } catch (error) { console.error('[pisService] getAuditTrail error:', error); throw error; }
};

// ==================== IMAGE ====================

export const fetchPatientImage = async (labno: string): Promise<string> => {
  try {
    const response = await api.get('/laboratory/pis/image', {
      params: { labno: labno.trim() }, responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404) throw new Error('NOT_FOUND');
    console.error('[pisService] fetchPatientImage error:', error);
    throw error;
  }
};

// ==================== NOTES ====================

export interface PISNoteRecord {
  LABNO:           string;
  NOTES:           string;
  STATUS:          string | null;
  NOTEID:          number | null;
  LASTMOD:         string;
  USER_ID:         number | null;
  NOTEPRIORITY:    string | null;
  ERROR:           string | null;
  PHONECALL:       string | null;
  CREATE_DT:       string;
  CREATE_USER_ID:  number | null;
  CREATETIME:      string | null;
  USER_FIRSTNAME:  string | null;
  USER_LASTNAME:   string | null;
  CREATE_FIRSTNAME: string | null;
  CREATE_LASTNAME:  string | null;
}

export interface PISNotesResponse {
  success: boolean; data: PISNoteRecord[]; count: number;
  labno: string; executionTime: string; timestamp: string;
}

/**
 * Get sample notes for a LABNO
 * GET /api/laboratory/pis/notes?labno=:labno
 * Joins PHCMS.SAMPLE_NOTES_ARCHIVE with PHSECURE.USERS (modifier + creator)
 * Ordered by CREATE_DT DESC
 */
export const getNotes = async (labno: string): Promise<PISNotesResponse> => {
  try {
    const response = await api.get('/laboratory/pis/notes', {
      params: { labno: labno.trim() },
    });
    return response.data;
  } catch (error) {
    console.error('[pisService] getNotes error:', error);
    throw error;
  }
};

// ==================== LETTERS ====================
// Add these to your existing pisServices.ts

export interface PISLettersResponse {
  success:   boolean;
  labno:     string;
  count:     number;
  files:     string[];   // array of filenames e.g. ["20260580130_2026058_041656PM.jpg"]
  timestamp: string;
}

/**
 * Fetch list of letter filenames for a LABNO
 * GET /api/laboratory/pis/letters?labno=:labno
 */
export const fetchPatientLetters = async (labno: string): Promise<PISLettersResponse> => {
  try {
    const response = await api.get('/laboratory/pis/letters', {
      params: { labno: labno.trim() },
    });
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) throw new Error('NOT_FOUND');
    console.error('[pisService] fetchPatientLetters error:', error);
    throw error;
  }
};

/**
 * Fetch a single letter image as a blob URL
 * GET /api/laboratory/pis/letter-image?labno=:labno&filename=:filename
 */
export const fetchLetterImage = async (labno: string, filename: string): Promise<string> => {
  try {
    const response = await api.get('/laboratory/pis/letter-image', {
      params:       { labno: labno.trim(), filename },
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404) throw new Error('NOT_FOUND');
    console.error('[pisService] fetchLetterImage error:', error);
    throw error;
  }
};