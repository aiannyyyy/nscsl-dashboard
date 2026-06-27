import { MOCK_TOKEN } from '../config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

const seed = (key: string, min: number, max: number): number => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h << 5) - h + key.charCodeAt(i);
  const n = Math.abs(h) % (max - min + 1);
  return min + n;
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PROVINCES = ['BATANGAS', 'CAVITE', 'LAGUNA', 'QUEZON', 'RIZAL', 'LOPEZ_NEARBY'];

// ─── Auth ────────────────────────────────────────────────────────────────────

export const MOCK_USER = {
  id: '1',
  email: 'demo@portfolio.local',
  name: 'Demo Admin',
  role: 'admin' as const,
  department: 'all' as const,
  position: 'Portfolio Demo User',
};

export const mockLoginResponse = {
  success: true,
  token: MOCK_TOKEN,
  user: MOCK_USER,
};

// ─── PDO: Sample receive / screened ──────────────────────────────────────────

const spectypes = [
  { spectype: '20', samples: 0, labno: 0 },
  { spectype: '2', samples: 0, labno: 0 },
  { spectype: '3', samples: 0, labno: 0 },
];

export const mockCumulativeAllProvince = (from: string, to: string) => {
  const cumulativeData = PROVINCES.map((province) => {
    const total_samples = seed(province, 1200, 8500);
    const total_labno = Math.round(total_samples * 0.92);
    return {
      province,
      category: 'All',
      total_samples,
      total_labno,
      spectypes: spectypes.map((s) => ({
        ...s,
        samples: Math.round(total_samples * 0.2),
        labno: Math.round(total_labno * 0.2),
      })),
    };
  });
  const totalSamples = cumulativeData.reduce((s, d) => s + d.total_samples, 0);
  const totalLabNo = cumulativeData.reduce((s, d) => s + d.total_labno, 0);
  return {
    parameters: { type: 'cumulative', spectypes: ['20', '2', '3', '4', '5', '87'], dateRange: { from, to } },
    cumulativeData,
    rawData: [],
    summary: { totalRecords: cumulativeData.length, totalSamples, totalLabNo },
  };
};

export const mockMonthlyLabNoCount = (from: string, to: string, province: string) => {
  const year = parseInt(from.slice(0, 4), 10);
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    month_year: `${monthNames[i]} ${year}`,
    province,
    category: 'All',
    total_samples: seed(`${province}-${i}`, 80, 720),
    total_labno: seed(`${province}-lab-${i}`, 70, 680),
    spectypes: spectypes.map((s) => ({ ...s, samples: seed(`${province}-s-${i}`, 10, 120), labno: seed(`${province}-l-${i}`, 8, 110) })),
  }));
  const totalSamples = monthlyData.reduce((s, d) => s + d.total_samples, 0);
  return {
    parameters: { type: 'monthly', spectypes: ['20', '2', '3', '4', '5', '87'], province, dateRange: { from, to } },
    monthlyData,
    rawData: [],
    summary: { totalRecords: monthlyData.length, totalSamples, totalLabNo: Math.round(totalSamples * 0.93) },
  };
};

// ─── PDO: Facility visits ────────────────────────────────────────────────────

export const mockFacilityVisits = [
  { id: 1, facility_code: 'FAC-001', facility_name: 'Metro Health Center', date_visited: '2026-05-12', province: 'BATANGAS', status: 'active', remarks: 'Routine visit — all systems operational', created_by: 'Demo Admin', created_at: '2026-05-12T09:00:00Z' },
  { id: 2, facility_code: 'FAC-002', facility_name: 'Riverside Clinic', date_visited: '2026-05-08', province: 'CAVITE', status: 'active', remarks: 'Sample collection training completed', created_by: 'Demo Admin', created_at: '2026-05-08T14:30:00Z' },
  { id: 3, facility_code: 'FAC-003', facility_name: 'Valley District Hospital', date_visited: '2026-04-22', province: 'LAGUNA', status: 'inactive', remarks: 'Pending equipment upgrade', created_by: 'Demo Admin', created_at: '2026-04-22T11:00:00Z' },
  { id: 4, facility_code: 'FAC-004', facility_name: 'Coastal Medical Unit', date_visited: '2026-04-15', province: 'QUEZON', status: 'closed', remarks: 'Facility relocated', created_by: 'Demo Admin', created_at: '2026-04-15T08:45:00Z' },
];

export const mockFacilityStatusCount = { active: 42, inactive: 11, closed: 4 };

// ─── PDO: Notebooks ──────────────────────────────────────────────────────────

export const mockRecentNotebooks = {
  data: [
    { LABNO: '26000101', LABID: 'A001', FNAME: 'Alex', LNAME: 'Rivera', NOTES: 'Follow-up sample received', CREATE_DT: '2026-06-20', CREATETIME: '10:30:00', USER_ID: 'demo', LASTMOD: '2026-06-20' },
    { LABNO: '26000102', LABID: 'A002', FNAME: 'Jordan', LNAME: 'Santos', NOTES: 'Repeat screening scheduled', CREATE_DT: '2026-06-19', CREATETIME: '14:15:00', USER_ID: 'demo', LASTMOD: '2026-06-19' },
    { LABNO: '26000103', LABID: 'A003', FNAME: 'Casey', LNAME: 'Reyes', NOTES: 'Initial screening complete', CREATE_DT: '2026-06-18', CREATETIME: '09:00:00', USER_ID: 'demo', LASTMOD: '2026-06-18' },
  ],
};

/** Uppercase Oracle-style fields — used by notebooks/complete-details (flat response). */
export const mockCompletePatientDetails = (labno: string) => ({
  LABNO: labno,
  LABID: 'D001',
  FNAME: 'Alex',
  LNAME: 'Rivera',
  SEX: '1',
  BIRTHDT: '2026-01-15',
  BIRTHWT: '3200',
  SUBMID: 'SUB-001',
  BIRTHHOSP: 'Inborn',
  PROVIDER_DESCR1: 'Metro Health Center',
  FACILITY_NAME: 'Metro Health Center',
  PROVINCE: 'BATANGAS',
  disorderResults: [] as unknown[],
});

/** Lowercase fields — matches PatientDetails in patientDetailsTypes / patientApi. */
export const mockPatientDetails = (labno: string) => ({
  labno,
  labid: 'D001',
  fname: 'Alex',
  lname: 'Rivera',
  sex: '1',
  birthdt: '2026-01-15',
  birthwt: '3200',
  submid: 'SUB-001',
  birthhosp: 'Inborn',
  provider_descr1: 'Metro Health Center',
});

// ─── PDO: Timeliness ─────────────────────────────────────────────────────────

const timelinessMonth = (month: string) => ({
  month,
  aoc_mean_year1: seed(month + 'aoc1', 2, 5),
  aoc_mean_year2: seed(month + 'aoc2', 2, 5),
  aoc_median_year1: seed(month + 'aocm1', 2, 4),
  aoc_median_year2: seed(month + 'aocm2', 2, 4),
  aoc_mode_year1: seed(month + 'aocmo1', 1, 3),
  aoc_mode_year2: seed(month + 'aocmo2', 1, 3),
  transit_mean_year1: seed(month + 'tr1', 1, 4),
  transit_mean_year2: seed(month + 'tr2', 1, 4),
  transit_median_year1: seed(month + 'trm1', 1, 3),
  transit_median_year2: seed(month + 'trm2', 1, 3),
  transit_mode_year1: seed(month + 'trmo1', 1, 2),
  transit_mode_year2: seed(month + 'trmo2', 1, 2),
  aur_mean_year1: seed(month + 'aur1', 3, 7),
  aur_mean_year2: seed(month + 'aur2', 3, 7),
  aur_median_year1: seed(month + 'aurm1', 3, 6),
  aur_median_year2: seed(month + 'aurm2', 3, 6),
  aur_mode_year1: seed(month + 'aurmo1', 2, 5),
  aur_mode_year2: seed(month + 'aurmo2', 2, 5),
});

export const mockTimelinessResponse = (records = monthNames.map(timelinessMonth)) => ({
  success: true,
  data: records,
  recordCount: records.length,
  executionTime: '12ms',
});

// ─── PDO: Endorsements ───────────────────────────────────────────────────────

export const mockEndorsements = [
  { id: 1, labno: '26000101', fname: 'Alex', lname: 'Rivera', facility_code: 'FAC-001', facility_name: 'Metro Health Center', test_result: 'Normal', remarks: 'No action needed', date_endorsed: '2026-06-20T10:00:00Z', endorsed_by: 'Demo Tech', status: 1 },
  { id: 2, labno: '26000102', fname: 'Jordan', lname: 'Santos', facility_code: 'FAC-002', facility_name: 'Riverside Clinic', test_result: 'Abnormal', remarks: 'Refer to follow-up', date_endorsed: '2026-06-19T14:00:00Z', endorsed_by: 'Demo Tech', status: 1 },
  { id: 3, labno: '26000103', fname: 'Casey', lname: 'Reyes', facility_code: 'FAC-003', facility_name: 'Valley District Hospital', test_result: 'Unsatisfactory', remarks: 'Repeat sample requested', date_endorsed: '2026-06-18T09:30:00Z', endorsed_by: 'Demo Tech', status: 1 },
];

// ─── PDO: NSF ────────────────────────────────────────────────────────────────

export const mockNsfFacilities = [
  { id: 1, facility_code: 'NSF-001', facility_name: 'Northside Clinic', province: 'BATANGAS', status: 'active', last_sample_sent: '2026-06-01', total_samples: 245 },
  { id: 2, facility_code: 'NSF-002', facility_name: 'Eastgate Health Hub', province: 'CAVITE', status: 'active', last_sample_sent: '2026-06-05', total_samples: 189 },
  { id: 3, facility_code: 'NSF-003', facility_name: 'Summit Care Center', province: 'LAGUNA', status: 'inactive', last_sample_sent: '2026-03-12', total_samples: 67 },
];

export const mockNsfSummary = {
  total: 156,
  active: 128,
  inactive: 22,
  closed: 4,
  partner: 2,
};

export const mockNsfSummaryTrend = {
  total: 4,
  active: 3,
  inactive: 1,
  closed: 0,
  partner: 0,
};

export const mockNsfFacilitiesPaginated = (page = 1, limit = 20) => ({
  data: mockNsfFacilities,
  total: mockNsfFacilities.length,
  page,
  limit,
  total_pages: Math.max(1, Math.ceil(mockNsfFacilities.length / limit)),
});

const mockNsfReactivationByProvinceRows = PROVINCES.slice(0, 5).map((province) => ({
  province,
  count: seed(`${province}-react`, 2, 18),
}));

export const mockNsfReactivatedByProvince = {
  data: mockNsfReactivationByProvinceRows,
  total: mockNsfReactivationByProvinceRows.reduce((sum, row) => sum + row.count, 0),
};

// ─── PDO: CAR list ───────────────────────────────────────────────────────────

export const mockCarRecords = [
  { id: 1, case_no: 'CAR-2026-001', date_endorsed: '2026-06-01', endorsed_by: 'Demo User', facility_code: 'FAC-001', facility_name: 'Metro Health Center', city: 'Demo City', province: 'BATANGAS', labno: '26000101', repeat_field: 'N', status: 'open' as const, number_sample: 1, case_code: 'A', sub_code1: 'Sample Quality', sub_code2: '', sub_code3: '', sub_code4: '', remarks: 'Demo case record', frc: '', wrc: '', prepared_by: 'Demo User', followup_on: null, reviewed_on: null, closed_on: null, attachment_path: null },
  { id: 2, case_no: 'CAR-2026-002', date_endorsed: '2026-05-15', endorsed_by: 'Demo User', facility_code: 'FAC-002', facility_name: 'Riverside Clinic', city: 'Sample Town', province: 'CAVITE', labno: '26000102', repeat_field: 'Y', status: 'pending' as const, number_sample: 2, case_code: 'B', sub_code1: 'Documentation', sub_code2: '', sub_code3: '', sub_code4: '', remarks: 'Pending review', frc: '', wrc: '', prepared_by: 'Demo User', followup_on: null, reviewed_on: null, closed_on: null, attachment_path: null },
];

export const mockCarListGroupedByProvince = [
  { province: 'BATANGAS', count: 12 },
  { province: 'CAVITE', count: 8 },
  { province: 'LAGUNA', count: 6 },
  { province: 'QUEZON', count: 5 },
  { province: 'RIZAL', count: 4 },
];

export const mockCarListGrouped = [
  { sub_code1: 'Sample Quality', count: 12 },
  { sub_code1: 'Documentation', count: 8 },
  { sub_code1: 'Transport', count: 5 },
  { sub_code1: 'Equipment', count: 3 },
];

export const mockNextCaseNumber = {
  success: true,
  nextNumber: 3,
  formattedNumber: '003',
  preview: 'CAR-2026-003',
};

// ─── PDO: Unsat ──────────────────────────────────────────────────────────────

export const mockTopUnsat = PROVINCES.slice(0, 5).map((p, i) => ({
  FACILITY_NAME: `Demo Facility ${i + 1}`,
  PROVINCE: p,
  UNSATISFACTORY_COUNT: seed(p + 'unsat', 5, 45),
}));

// FIX: mockUnsatRate was previously a single flat object
//   { total_samples: 12500, unsatisfactory_count: 312, unsat_rate: '2.50' }
// but UnsatByPercentages.tsx (and the UnsatRate[] return type in
// unsatApi.ts) expect an ARRAY of per-facility rows, the same way
// mockTopUnsat above does it. Calling `.map()` on the old object
// caused: "Uncaught TypeError: data.map is not a function".
// There must be only ONE `mockUnsatRate` export in this file.
export const mockUnsatRate = PROVINCES.slice(0, 5).map((p, i) => {
  const total_samples = seed(p + 'unsat-total', 800, 3000);
  const unsatisfactory_count = seed(p + 'unsat-count', 5, 60);
  return {
    facility_name: `Demo Facility ${i + 1}`,
    province: p,
    unsatisfactory_count,
    total_samples,
    unsat_rate: Number(((unsatisfactory_count / total_samples) * 100).toFixed(2)),
  };
});

export const mockUnsatProvinceRows = PROVINCES.slice(0, 5).map((county) => ({
  COUNTY: county,
  TOTAL_DISTINCT_UNSAT_PERIOD1: seed(`${county}-unsat-p1`, 3, 25),
  TOTAL_DISTINCT_UNSAT_PERIOD2: seed(`${county}-unsat-p2`, 3, 25),
}));

export const mockUnsatDetailRows = [
  { LABNO: '26000101', FIRST_NAME: 'Alex', LAST_NAME: 'Rivera', TEST_RESULT: 'Unsatisfactory' },
  { LABNO: '26000102', FIRST_NAME: 'Jordan', LAST_NAME: 'Santos', TEST_RESULT: 'Repeat Required' },
  { LABNO: '26000103', FIRST_NAME: 'Casey', LAST_NAME: 'Reyes', TEST_RESULT: 'Unsatisfactory' },
];

export const mockUnsatFullPatientRows = [
  { LABNO: '26000101', FIRST_NAME: 'Alex', LAST_NAME: 'Rivera', TEST_RESULT: 'Unsatisfactory', FACILITY_NAME: 'Demo Facility 1', PROVINCE: 'BATANGAS' },
  { LABNO: '26000102', FIRST_NAME: 'Jordan', LAST_NAME: 'Santos', TEST_RESULT: 'Normal', FACILITY_NAME: 'Demo Facility 1', PROVINCE: 'BATANGAS' },
  { LABNO: '26000103', FIRST_NAME: 'Casey', LAST_NAME: 'Reyes', TEST_RESULT: 'Unsatisfactory', FACILITY_NAME: 'Demo Facility 1', PROVINCE: 'BATANGAS' },
];

// ─── Laboratory ──────────────────────────────────────────────────────────────

export const mockCardSummary = {
  success: true,
  data: {
    received: 3842,
    screened: 3610,
    unsat: 96,
    breakdown: { initial: 2100, repeatUnsat: 420, repeatAbnormal: 380, repeatNormal: 510, monitoring: 290, unfit: 142 },
  },
  filters: { type: 'current_month' as const },
  executionTime: '8ms',
  timestamp: now(),
};

export const mockDailySamples = (year: string, month: string) => {
  const monthIndex = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(month.toLowerCase());
  const daysInMonth = monthIndex >= 0 ? new Date(parseInt(year, 10), monthIndex + 1, 0).getDate() : 30;
  const data = Array.from({ length: daysInMonth }, (_, i) => ({
    RECEIVED_DATE: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    TOTAL_SAMPLES: seed(`${year}-${month}-${i}`, 80, 220),
  }));
  return {
    success: true,
    data,
    filters: { year, month, sampleType: 'received', specTypes: ['20', '2', '3', '4', '5', '87'] },
    recordCount: data.length,
    executionTime: '10ms',
    timestamp: now(),
  };
};

export const mockYtdComparison = (year1: string, year2: string) => ({
  success: true,
  data: Array.from({ length: 24 }, (_, i) => ({
    YEAR: i < 12 ? parseInt(year1, 10) : parseInt(year2, 10),
    MONTH: (i % 12) + 1,
    TOTAL_SAMPLES: seed(`ytd-${i}`, 800, 3200),
  })),
  filters: { year1, year2, type: 'received' },
  recordCount: 24,
  executionTime: '15ms',
  timestamp: now(),
});

export const mockTrackingStats = {
  success: true,
  data: {
    dtcoll_to_dtrecv: { average: 2.4, median: 2.0, mode: 1.8 },
    dtrecv_to_dtrptd: { average: 4.1, median: 3.8, mode: 3.5 },
  },
  filters: { year: 2026, month: 6, startDate: '2026-06-01', endDate: '2026-06-30' },
  executionTime: '6ms',
  timestamp: now(),
};

export const mockCumulativeMonthlyCensus = {
  success: true,
  data: Array.from({ length: 6 }, (_, i) => ({
    MONTH: i + 1,
    YEAR: 2026,
    TOTAL_SAMPLES: seed(`census-${i}`, 900, 2800),
  })),
  filters: { type: 'Received', spectypes: ['20', '2', '3', '4', '5', '87'] },
  count: 6,
  executionTime: '5ms',
  timestamp: now(),
};

export const mockAnnualCensus = {
  success: true,
  data: Array.from({ length: 6 }, (_, i) => ({
    YEAR_MONTH: `2026-${String(i + 1).padStart(2, '0')}`,
    TOTAL_SAMPLES: seed(`annual-${i}`, 1200, 4500),
  })),
  filters: { spectypes: ['20', '2', '3', '4', '5', '87'], dateFrom: '2026-01-01' },
  count: 6,
  executionTime: '5ms',
  timestamp: now(),
};

export const mockDemogSummary = {
  entry: {
    'Jay Arr Apelado': 142,
    'Angelica Brutas': 128,
    'Mary Rose Gomez': 115,
    'Abigail Morfe': 98,
  },
  verification: {
    'Apelado Jay Arr': 138,
    'Brutas Angelica': 125,
    'Gomez Mary Rose': 110,
    'Morfe Abigail': 95,
  },
};

const SPEED_TECHS = ['Jay Arr Apelado', 'Angelica Brutas', 'Mary Rose Gomez', 'Abigail Morfe', 'Demo Tech E'];

export const mockSpeedMonitoring = {
  success: true,
  data: SPEED_TECHS.map((FIRSTNAME, i) => ({
    FIRSTNAME,
    MONTHLY_AVG_INIT_TIME_SECONDS: seed(`speed-sec-${i}`, 180, 720),
    TOTAL_SAMPLES: seed(`speed-samples-${i}`, 40, 180),
  })),
  meta: { year: '2026', month: '6', type: 'entry' },
  recordCount: SPEED_TECHS.length,
  executionTime: '8ms',
};

const supplyThresholds = (critical: number, warning: number, unit: string) => ({
  critical,
  warning,
  unit,
});

export const mockLabSupplies = {
  success: true,
  count: 6,
  timestamp: now(),
  data: [
    { itemCode: 'SUP-001', description: 'Filter Paper', stock: 450, unit: 'pcs', status: 'normal' as const, thresholds: supplyThresholds(50, 100, 'pcs') },
    { itemCode: 'SUP-002', description: 'Collection Tubes', stock: 82, unit: 'boxes', status: 'warning' as const, thresholds: supplyThresholds(20, 50, 'boxes') },
    { itemCode: 'SUP-003', description: 'Lancets', stock: 12, unit: 'boxes', status: 'critical' as const, thresholds: supplyThresholds(15, 30, 'boxes') },
    { itemCode: 'SUP-004', description: 'Gloves (Medium)', stock: 0, unit: 'boxes', status: 'out-of-stock' as const, thresholds: supplyThresholds(10, 25, 'boxes') },
    { itemCode: 'SUP-005', description: 'Barcode Labels', stock: 320, unit: 'rolls', status: 'normal' as const, thresholds: supplyThresholds(40, 80, 'rolls') },
    { itemCode: 'SUP-006', description: 'Specimen Bags', stock: 28, unit: 'packs', status: 'warning' as const, thresholds: supplyThresholds(10, 35, 'packs') },
  ],
};

export const mockLabReagents = {
  success: true,
  count: 5,
  timestamp: now(),
  data: [
    { itemCode: 'RG-001', description: 'Screening Reagent A', stock: 24, unit: 'kits', status: 'normal' as const, thresholds: supplyThresholds(5, 10, 'kits') },
    { itemCode: 'RG-002', description: 'Confirmatory Reagent B', stock: 8, unit: 'kits', status: 'warning' as const, thresholds: supplyThresholds(4, 8, 'kits') },
    { itemCode: 'RG-003', description: 'G6PD Reagent', stock: 3, unit: 'kits', status: 'critical' as const, thresholds: supplyThresholds(3, 6, 'kits') },
    { itemCode: 'RG-004', description: 'PKU Reagent', stock: 0, unit: 'kits', status: 'out-of-stock' as const, thresholds: supplyThresholds(2, 5, 'kits') },
    { itemCode: 'RG-005', description: 'CAH Reagent', stock: 15, unit: 'kits', status: 'normal' as const, thresholds: supplyThresholds(3, 8, 'kits') },
  ],
};

// ─── Followup ────────────────────────────────────────────────────────────────

export const mockFollowupSummaryCards = {
  totalPerMonth: {
    success: true,
    data: [{ current_month: 142, last_month: 128 }],
  },
  totalPerDay: {
    success: true,
    data: [{ today_count: 18, yesterday_count: 15, month_count: 142 }],
  },
  totalPending: {
    success: true,
    data: [{ current_pending: 47, yesterday_pending: 52 }],
  },
  averageRecallTime: {
    success: true,
    data: [{ current_avg_minutes: 192, last_avg_minutes: 210 }],
  },
  nurseRecallStats: {
    success: true,
    data: [
      { nurse_name: 'Nurse A', total_recalled_month: 28, total_recalled_today: 4 },
      { nurse_name: 'Nurse B', total_recalled_month: 22, total_recalled_today: 3 },
      { nurse_name: 'Nurse C', total_recalled_month: 19, total_recalled_today: 2 },
    ],
  },
};

// ─── IT Job Orders ───────────────────────────────────────────────────────────

export const mockJobOrders = [
  { id: 1, work_order_no: 'WO-2026-001', title: 'Network printer offline', description: 'Lab printer not responding on Floor 2', type: 'Hardware', category: 'Printer', priority: 'medium' as const, status: 'in_progress' as const, requester_id: 1, requester_name: 'Demo User', department: 'Laboratory', created_at: '2026-06-18T08:00:00Z', updated_at: '2026-06-20T10:00:00Z', tech_name: 'IT Support A' },
  { id: 2, work_order_no: 'WO-2026-002', title: 'Email access issue', description: 'Cannot access shared mailbox', type: 'Software', category: 'Email', priority: 'high' as const, status: 'pending_approval' as const, requester_id: 2, requester_name: 'Demo Staff', department: 'Follow Up', created_at: '2026-06-19T09:30:00Z', updated_at: '2026-06-19T09:30:00Z' },
  { id: 3, work_order_no: 'WO-2026-003', title: 'Workstation upgrade', description: 'Replace aging desktop in reception', type: 'Hardware', category: 'Computer', priority: 'low' as const, status: 'resolved' as const, requester_id: 1, requester_name: 'Demo User', department: 'Admin', created_at: '2026-06-10T11:00:00Z', updated_at: '2026-06-15T16:00:00Z', tech_name: 'IT Support B', resolved_at: '2026-06-15T16:00:00Z' },
];

export const mockJobOrderStats = { total: 24, pending: 5, in_progress: 8, resolved: 11 };

// ─── Intranet ────────────────────────────────────────────────────────────────

export const mockIntranetCategories = {
  message: 'Success',
  categories: [
    { id: 1, name: 'Policies', description: 'Company policies and guidelines', color: '#3B82F6', icon: 'folder', file_count: 12, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, name: 'Training Materials', description: 'Staff training documents', color: '#10B981', icon: 'folder', file_count: 8, created_at: '2026-01-01T00:00:00Z' },
    { id: 3, name: 'Reports', description: 'Monthly and quarterly reports', color: '#F59E0B', icon: 'folder', file_count: 24, created_at: '2026-01-01T00:00:00Z' },
  ],
  count: 3,
};

export const mockIntranetFileList = {
  folders: [
    { id: 1, name: 'General', parent_id: null, created_by: 1, created_by_name: 'Demo Admin', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: 2, name: 'Archived', parent_id: null, created_by: 1, created_by_name: 'Demo Admin', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ],
  files: [
    { id: 1, file_name: 'Q2-Summary-Report.pdf', file_path: '/mock/q2-summary.pdf', file_type: 'application/pdf', file_size: 245000, folder_id: 1, created_by: 1, created_by_name: 'Demo Admin', created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
    { id: 2, file_name: 'Staff-Handbook-2026.docx', file_path: '/mock/handbook.docx', file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', file_size: 89000, folder_id: 1, created_by: 1, created_by_name: 'Demo Admin', created_at: '2026-05-15T00:00:00Z', updated_at: '2026-05-15T00:00:00Z' },
  ],
  location: 'Root',
};

export const mockIntranetStats = {
  total_files: 44,
  total_folders: 12,
  total_size: 15600000,
  recent_uploads: 5,
  shared_with_me: 3,
};

export const mockIntranetActivity = {
  activities: [
    { id: 1, action: 'upload', file_name: 'Q2-Summary-Report.pdf', user_name: 'Demo Admin', created_at: '2026-06-01T10:00:00Z' },
    { id: 2, action: 'download', file_name: 'Staff-Handbook-2026.docx', user_name: 'Demo Staff', created_at: '2026-05-28T14:30:00Z' },
  ],
};

// ─── Calendar ──────────────────────────────────────────────────────────────────

export const mockCalendarEvents = [
  { event_id: 1, title: 'Team Meeting', description: 'Weekly sync', start_date: '2026-06-26T09:00:00', end_date: '2026-06-26T10:00:00', all_day: false, color: '#3B82F6', created_by: 1, assigned_users: [1] },
  { event_id: 2, title: 'Training Session', description: 'New protocol review', start_date: '2026-06-27T14:00:00', end_date: '2026-06-27T16:00:00', all_day: false, color: '#10B981', created_by: 1, assigned_users: [1, 2] },
];

export const mockCalendarUsers = [
  { id: 1, name: 'Demo Admin', email: 'demo@portfolio.local' },
  { id: 2, name: 'Demo Staff', email: 'staff@portfolio.local' },
];

export const mockHolidays = (year: number) => [
  { date: `${year}-01-01`, localName: "New Year's Day", name: "New Year's Day", countryCode: 'PH' },
  { date: `${year}-06-12`, localName: 'Independence Day', name: 'Independence Day', countryCode: 'PH' },
  { date: `${year}-12-25`, localName: 'Christmas Day', name: 'Christmas Day', countryCode: 'PH' },
];

// ─── Chat ────────────────────────────────────────────────────────────────────

export const mockConversations = [
  { id: 1, conversationName: 'Demo Staff', conversationType: 'direct' as const, createdAt: '2026-06-01T00:00:00Z', otherUserId: 2, name: 'Demo Staff', user_name: 'demostaff', email: 'staff@portfolio.local', lastMessage: 'Thanks for the update!', lastMessageTime: '2026-06-20T15:00:00Z', isOnline: true, unreadCount: 0 },
];

export const mockChatMessages = [
  { id: 1, conversationId: 1, senderId: 2, content: 'Hi, is the report ready?', messageType: 'text' as const, isRead: true, isDeleted: false, createdAt: '2026-06-20T14:00:00Z', userId: 2, user_name: 'demostaff', name: 'Demo Staff', email: 'staff@portfolio.local' },
  { id: 2, conversationId: 1, senderId: 1, content: 'Yes, uploaded to the intranet.', messageType: 'text' as const, isRead: true, isDeleted: false, createdAt: '2026-06-20T14:30:00Z', userId: 1, user_name: 'demoadmin', name: 'Demo Admin', email: 'demo@portfolio.local' },
];

// ─── Notifications ───────────────────────────────────────────────────────────

export const mockNotifications = [
  { id: 1, department: 'Program', user_id: null, type: 'info', title: 'Demo Notification', message: 'This is sample notification data for portfolio display.', link: null, reference_id: null, reference_type: null, is_read: false, created_by: 'System', created_at: '2026-06-20T08:00:00Z', read_at: null },
];

// ─── Admin users ─────────────────────────────────────────────────────────────

export const mockAdminUsers = [
  { user_id: 1, username: 'demoadmin', name: 'Demo Admin', email: 'demo@portfolio.local', role: 'admin' as const, dept: 'Admin', position: 'Portfolio Demo User' },
  { user_id: 2, username: 'demostaff', name: 'Demo Staff', email: 'staff@portfolio.local', role: 'user' as const, dept: 'Laboratory', position: 'Lab Technician' },
  { user_id: 3, username: 'demofollow', name: 'Demo Follow-up', email: 'followup@portfolio.local', role: 'user' as const, dept: 'Followup', position: 'Follow-up Nurse' },
];

export const mockCreateUserResponse = (body: Record<string, unknown> = {}) => {
  const username = String(body.username ?? 'newuser');
  return {
    user_id: seed(`user-${username}`, 100, 999),
    username,
    name: String(body.name ?? 'New User'),
    dept: String(body.dept ?? 'Program'),
    position: String(body.position ?? 'Staff'),
    role: (body.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
  };
};

// ─── Quezon samples ──────────────────────────────────────────────────────────

const mockSampleBreakdown = (prefix: string, facilityCount = 3) =>
  Array.from({ length: facilityCount }, (_, i) => ({
    submid: String(1000 + seed(`${prefix}-submid-${i}`, 0, 899)),
    descr1: `${prefix} Demo Facility ${i + 1}`,
    total_count: seed(`${prefix}-count-${i}`, 15, 95),
  }));

const mockSampleCityRows = (cityNames: string[]) =>
  cityNames.map((city) => {
    const breakdown = mockSampleBreakdown(city);
    return {
      city,
      total_count: breakdown.reduce((sum, item) => sum + item.total_count, 0),
      breakdown,
    };
  });

export const mockQuezonSamples = (county = 'BATANGAS') => {
  const data = mockSampleCityRows(['Demo City A', 'Demo City B', 'Demo City C']).map((row) => ({
    ...row,
    county,
  }));
  return {
    success: true,
    total_records: data.reduce((sum, row) => sum + row.total_count, 0),
    county,
    data,
  };
};

export const mockNearbyLopezSamples = (() => {
  const data = mockSampleCityRows(['Lopez', 'Nearby Town A', 'Nearby Town B']);
  return {
    success: true,
    total_records: data.reduce((sum, row) => sum + row.total_count, 0),
    data,
  };
})();

// ─── NSF Performance ─────────────────────────────────────────────────────────

export const mockNsfPerformanceLabDetails = (
  submid: string,
  dateFrom = '2026-01-01',
  dateTo = '2026-06-30',
) => {
  const submidNum = parseInt(submid, 10) || 1000;
  const birthCategories = ['INBORN', 'OUTBORN', 'HOB', 'HOMEBIRTH', 'UNKNOWN'] as const;
  const issueDescriptions = ['NORMAL', 'CONTAMINATED', 'INSUFFICIENT', 'LESS_THAN_24_HOURS', 'MISSING_INFORMATION', 'DATA_ERASURES'] as const;
  const data = Array.from({ length: 6 }, (_, i) => ({
    LABNO: `26${String(i + 1).padStart(6, '0')}`,
    SUBMID: submidNum,
    FNAME: 'Demo',
    LNAME: `Patient${i + 1}`,
    SPECTYPE: 20,
    SPECTYPE_LABEL: 'ENBS',
    BIRTHHOSP: 'Demo Hospital',
    BIRTH_CATEGORY: birthCategories[i % birthCategories.length],
    ISSUE_DESCRIPTION: issueDescriptions[i % issueDescriptions.length],
  }));
  return {
    success: true,
    data,
    executionTime: '8ms',
    recordCount: data.length,
    filters: { submid, dateFrom, dateTo },
  };
};

export const mockNsfPerformance = {
  success: true,
  data: PROVINCES.slice(0, 5).map((county, i) => {
    const total = seed(county + 'samples', 200, 1500);
    const unsatCount = seed(county + 'unsat', 2, 40);
    return {
      SUBMID: 1000 + i,
      FACILITY_NAME: `${county} Demo Facility`,
      TOTAL_SAMPLE_COUNT: total,
      TOTAL_INBORN: Math.round(total * 0.7),
      TOTAL_HOMEBIRTH: Math.round(total * 0.1),
      TOTAL_HOB: Math.round(total * 0.05),
      TOTAL_UNKNOWN: Math.round(total * 0.05),
      OUTBORN_TOTAL: Math.round(total * 0.3),
      MISSING_INFORMATION: seed(county + 'missing', 0, 10),
      LESS_THAN_24_HOURS: seed(county + '24h', 0, 15),
      INSUFFICIENT: seed(county + 'insuff', 0, 8),
      CONTAMINATED: seed(county + 'contam', 0, 5),
      DATA_ERASURES: seed(county + 'erase', 0, 4),
      TOTAL_UNSAT_COUNT: unsatCount,
      TOTAL_UNSAT_RATE: Number(((unsatCount / total) * 100).toFixed(2)),
      AVE_AOC: Number((seed(county + 'aoc', 2, 6)).toFixed(1)),
      TRANSIT_TIME: Number((seed(county + 'transit', 1, 4)).toFixed(1)),
      INBORN_AVERAGE: Number((seed(county + 'inb', 70, 95)).toFixed(1)),
      OUTBORN_AVERAGE: Number((seed(county + 'outb', 60, 90)).toFixed(1)),
    };
  }),
  executionTime: '9ms',
  recordCount: 5,
  filters: { county: 'all', dateFrom: '2026-01-01', dateTo: '2026-06-30' },
};

// ─── Lopez / Calabarzon filter cards ─────────────────────────────────────────

export const mockLopezFilterCards = {
  success: true,
  data: mockSampleCityRows(['Lopez', 'Nearby Town A', 'Nearby Town B']),
};

export const mockCalabarzonFilterCards = {
  success: true,
  data: (['CAVITE', 'LAGUNA', 'BATANGAS', 'RIZAL', 'QUEZON'] as const).map((county) => {
    const cities = mockSampleCityRows([`${county.charAt(0)}${county.slice(1).toLowerCase()} City`]);
    return {
      county,
      total_count: cities.reduce((sum, city) => sum + city.total_count, 0),
      cities,
    };
  }),
};

// ─── Common errors ───────────────────────────────────────────────────────────

export const mockCommonErrors = {
  success: true,
  data: [
    { USERNAME: 'JAYARR', TABLECOLUMN: 'BIRTHWT', TOTAL_COUNT: 45 },
    { USERNAME: 'ANGELB', TABLECOLUMN: 'SEX', TOTAL_COUNT: 32 },
    { USERNAME: 'MARYRG', TABLECOLUMN: 'BIRTHDT', TOTAL_COUNT: 18 },
    { USERNAME: 'ABIGM', TABLECOLUMN: 'SUBMID', TOTAL_COUNT: 12 },
  ],
  filters: { year: '2026', month: '6', dateRange: { start: '2026-06-01', end: '2026-06-30' } },
  executionTime: '6ms',
  timestamp: now(),
};

export const mockCommonErrorBreakdown = (tableColumn = 'BIRTHWT') => ({
  success: true,
  data: {
    detailedRecords: [],
    technicianSummary: [
      {
        tech_name: 'Jay Arr Apelado',
        tech_id: '222',
        count: 12,
        errors: [
          { labno: '26000101', lname: 'Rivera', fname: 'Alex', dtrecv: '2026-06-15', tableColumn, oldData: '', newData: '3200', createDt: '2026-06-15' },
        ],
      },
      {
        tech_name: 'Angelica Brutas',
        tech_id: '202',
        count: 8,
        errors: [],
      },
    ],
    totalRecords: 20,
  },
  filters: { year: '2026', month: '6', tableColumn, dateRange: { start: '2026-06-01', end: '2026-06-30' } },
  executionTime: '5ms',
  timestamp: now(),
});

// ─── Logbook endorsements ─────────────────────────────────────────────────────

export const mockLogbookEndorsements = [
  { id: 1, labno: '26000101', fname: 'Alex', lname: 'Rivera', category: 'G6PD', mnemonic: 'G6PD', status: 'pending', date_endorsed: '2026-06-20T10:00:00Z' },
  { id: 2, labno: '26000102', fname: 'Jordan', lname: 'Santos', category: 'PKU', mnemonic: 'PKU', status: 'approved', date_endorsed: '2026-06-19T14:00:00Z' },
];

export const mockLogbookStats = {
  category: [{ category: 'G6PD', count: 12 }, { category: 'PKU', count: 8 }, { category: 'CAH', count: 5 }],
  mnemonic: [{ mnemonic: 'G6PD', count: 12 }, { mnemonic: 'PKU', count: 8 }],
};

// ─── CMS Urgent / Auto mailer / PIS ──────────────────────────────────────────

export const mockCmsPatientResults = (date = '2026-06-20') => ({
  success: true,
  date,
  total: 3,
  data: [
    { LABNO: '26000101', LNAME: 'Rivera', FNAME: 'Alex', DTRECV: '2026-06-18', SUBMID: '1001', TWIN: 'N', MNEMONICS: 'G6PD, PKU' },
    { LABNO: '26000102', LNAME: 'Santos', FNAME: 'Jordan', DTRECV: '2026-06-19', SUBMID: '1002', TWIN: 'Y', MNEMONICS: 'CAH' },
    { LABNO: '26000103', LNAME: 'Reyes', FNAME: 'Casey', DTRECV: '2026-06-19', SUBMID: '1003', TWIN: 'N', MNEMONICS: 'G6PD' },
  ],
});

export const mockCmsDisorderResults = (labno = '26000101') => ({
  success: true,
  labno,
  total: 1,
  data: [
    {
      MAILERNAME: 'Demo Mailer',
      LABNO: labno,
      LNAME: 'Rivera',
      FNAME: 'Alex',
      disorders: [
        { NAME: 'G6PD Deficiency', RFLAG: 'A', DESCR1: 'Abnormal G6PD result' },
        { NAME: 'PKU', RFLAG: 'P', DESCR1: 'Presumptive positive' },
      ],
    },
  ],
});

export const mockCmsGenerateReport = (body: Record<string, unknown> = {}) => {
  const labNo = String(body.labNo ?? '26000101');
  return {
    success: true,
    labNo,
    urgent: Boolean(body.urgent),
    source: 'master' as const,
    hasData: true,
    fileName: `cms_${labNo}_demo.pdf`,
  };
};

export const mockPisSearchResults = {
  success: true,
  data: [
    { LABNO: '26000101', FNAME: 'Alex', LNAME: 'Rivera', BIRTHDT: '2026-01-15', SUBMID: 'SUB-001' },
  ],
};

export const mockPisDetail = (labno: string) => ({
  success: true,
  data: mockCompletePatientDetails(labno),
});

const buildG6pdRecord = (i: number) => ({
  MAILERNAME: 'Demo Mailer',
  LABNO: `26G${String(i + 1).padStart(4, '0')}`,
  REPTCODE: 'G6PD',
  MNEMONIC: 'G6PD',
  AVG_REPTCODE: 'G6PD',
  VALUE: i % 3 === 0 ? 'Deficient' : 'Normal',
  TESTCODE: 'G6PD',
  DESCR1: 'G6PD Screening',
  DEMOG_LABNO: `26G${String(i + 1).padStart(4, '0')}`,
  LNAME: 'Demo',
  FNAME: `Patient${i + 1}`,
  PHYSID: 'DR001',
  BIRTHDT: '2026-01-15',
  BIRTHWT: '3200',
  DTCOLL: '2026-06-10',
  DTRPTD: '2026-06-15',
  SUBMID: '1001',
  TWIN: 'N',
  SEX: '1',
  ADRS_TYPE: 'H',
  STREET1: '123 Demo St',
  STREET2: '',
  CITY: 'Demo City',
  PROVIDER_NAME: 'Metro Health Center',
  DESCR4: '',
  DESCR5: '',
  DESCR6: '',
});

export const mockG6pdResponse = (filters: Record<string, string> = {}) => {
  const data = Array.from({ length: 6 }, (_, i) => buildG6pdRecord(i));
  return {
    success: true,
    data,
    filters,
    total: data.length,
    executionTime: '9ms',
    timestamp: now(),
  };
};

export const mockG6pdGenerateReport = (body: Record<string, unknown> = {}) => ({
  success: true,
  labNo: body.labNo ? String(body.labNo) : undefined,
  dateFrom: body.dateFrom ? String(body.dateFrom) : undefined,
  dateTo: body.dateTo ? String(body.dateTo) : undefined,
  hasData: true,
  fileName: body.labNo
    ? `g6pd_individual_${body.labNo}.pdf`
    : `g6pd_summary_${body.dateFrom ?? '2026-06-01'}_${body.dateTo ?? '2026-06-30'}.pdf`,
});

export const mockFollowupPatientDetails = (dateFrom = '2026-06-01', dateTo = '2026-06-30', testCode = 'ALL') => {
  const data = [
    {
      LABNO: '26000101',
      LINK: null,
      MNEMONIC: 'G6PD',
      VALUE: 'Deficient',
      TESTCODE: 'G6PD',
      LASTMOD: '2026-06-20',
      DTRECV: '2026-06-18',
      CURRENT_DTCOLL: '2026-06-17',
      LINKED_DTCOLL: null,
      BIRTHTM: '08:30:00',
      CURRENT_TMCOLL: '09:00:00',
      LINKED_TMCOLL: null,
      LNAME: 'Rivera',
      FNAME: 'Alex',
      PHYSID: 'DR001',
      BIRTHDT: '2026-01-15',
      BIRTHWT: '3200',
      SUBMID: '1001',
      SEX: '1',
      GESTAGE: '39',
      CLINSTAT: '1',
      COUNTY: 'BATANGAS',
      TMRECV: '10:15:00',
    },
    {
      LABNO: '26000102',
      LINK: null,
      MNEMONIC: 'PKU',
      VALUE: 'Normal',
      TESTCODE: 'PKU',
      LASTMOD: '2026-06-19',
      DTRECV: '2026-06-19',
      CURRENT_DTCOLL: '2026-06-18',
      LINKED_DTCOLL: null,
      BIRTHTM: '14:00:00',
      CURRENT_TMCOLL: '14:30:00',
      LINKED_TMCOLL: null,
      LNAME: 'Santos',
      FNAME: 'Jordan',
      PHYSID: 'DR002',
      BIRTHDT: '2026-02-10',
      BIRTHWT: '3100',
      SUBMID: '1002',
      SEX: '2',
      GESTAGE: '38',
      CLINSTAT: '1',
      COUNTY: 'CAVITE',
      TMRECV: '11:00:00',
    },
  ].filter((row) => testCode === 'ALL' || row.TESTCODE === testCode);

  return {
    success: true,
    data,
    meta: {
      totalRecords: data.length,
      filters: { dateFrom, dateTo, testCode },
    },
    executionTime: '7ms',
    timestamp: now(),
  };
};

export const mockFollowupTestCodes = {
  success: true,
  data: ['ALL', 'G6PD', 'PKU', 'CAH', 'CH'],
  total: 5,
  timestamp: now(),
};

// ─── Generic success helpers ───────────────────────────────────────────────────

export const mockSuccess = (message = 'Success') => ({ success: true, message });
export const mockEmptyList: unknown[] = [];

// ─── Weather (portfolio demo — no external API) ─────────────────────────────

export interface MockWeatherDay {
  day: string;
  temp: number;
  icon: string;
}

export interface MockWeatherCurrent {
  temp: number;
  desc: string;
  icon: string;
  forecast: MockWeatherDay[];
}

const mockWeatherByProvince: Record<string, MockWeatherCurrent> = {
  Batangas: { temp: 29, desc: 'partly cloudy', icon: '☁️', forecast: [{ day: 'Mon', temp: 28, icon: '☀️' }, { day: 'Tue', temp: 29, icon: '☁️' }, { day: 'Wed', temp: 27, icon: '🌧️' }, { day: 'Thu', temp: 28, icon: '☁️' }, { day: 'Fri', temp: 30, icon: '☀️' }] },
  Cavite: { temp: 31, desc: 'clear sky', icon: '☀️', forecast: [{ day: 'Mon', temp: 30, icon: '☀️' }, { day: 'Tue', temp: 31, icon: '☀️' }, { day: 'Wed', temp: 29, icon: '☁️' }, { day: 'Thu', temp: 30, icon: '☀️' }, { day: 'Fri', temp: 32, icon: '☀️' }] },
  Rizal: { temp: 28, desc: 'light rain', icon: '🌧️', forecast: [{ day: 'Mon', temp: 27, icon: '🌧️' }, { day: 'Tue', temp: 28, icon: '☁️' }, { day: 'Wed', temp: 26, icon: '🌧️' }, { day: 'Thu', temp: 27, icon: '☁️' }, { day: 'Fri', temp: 28, icon: '🌦️' }] },
  Quezon: { temp: 27, desc: 'overcast clouds', icon: '☁️', forecast: [{ day: 'Mon', temp: 26, icon: '☁️' }, { day: 'Tue', temp: 27, icon: '☁️' }, { day: 'Wed', temp: 25, icon: '🌧️' }, { day: 'Thu', temp: 26, icon: '☁️' }, { day: 'Fri', temp: 27, icon: '🌤️' }] },
  Laguna: { temp: 30, desc: 'scattered clouds', icon: '🌤️', forecast: [{ day: 'Mon', temp: 29, icon: '🌤️' }, { day: 'Tue', temp: 30, icon: '☀️' }, { day: 'Wed', temp: 28, icon: '☁️' }, { day: 'Thu', temp: 29, icon: '🌤️' }, { day: 'Fri', temp: 31, icon: '☀️' }] },
};

export const getMockWeather = (provinceName: string): MockWeatherCurrent =>
  mockWeatherByProvince[provinceName] ?? mockWeatherByProvince.Batangas;