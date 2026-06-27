import {
  mockLoginResponse,
  MOCK_USER,
  mockCumulativeAllProvince,
  mockMonthlyLabNoCount,
  mockFacilityVisits,
  mockFacilityStatusCount,
  mockRecentNotebooks,
  mockPatientDetails,
  mockCompletePatientDetails,
  mockTimelinessResponse,
  mockEndorsements,
  mockNsfFacilities,
  mockNsfFacilitiesPaginated,
  mockNsfSummary,
  mockNsfSummaryTrend,
  mockNsfReactivatedByProvince,
  mockCarRecords,
  mockCarListGroupedByProvince,
  mockCarListGrouped,
  mockNextCaseNumber,
  mockTopUnsat,
  mockUnsatRate,
  mockUnsatProvinceRows,
  mockUnsatDetailRows,
  mockUnsatFullPatientRows,
  mockCardSummary,
  mockDailySamples,
  mockYtdComparison,
  mockTrackingStats,
  mockCumulativeMonthlyCensus,
  mockAnnualCensus,
  mockDemogSummary,
  mockSpeedMonitoring,
  mockLabSupplies,
  mockLabReagents,
  mockFollowupSummaryCards,
  mockJobOrders,
  mockJobOrderStats,
  mockIntranetCategories,
  mockIntranetFileList,
  mockIntranetStats,
  mockIntranetActivity,
  mockCalendarEvents,
  mockCalendarUsers,
  mockHolidays,
  mockConversations,
  mockChatMessages,
  mockNotifications,
  mockAdminUsers,
  mockQuezonSamples,
  mockNearbyLopezSamples,
  mockNsfPerformance,
  mockNsfPerformanceLabDetails,
  mockLopezFilterCards,
  mockCalabarzonFilterCards,
  mockCommonErrors,
  mockCommonErrorBreakdown,
  mockLogbookEndorsements,
  mockLogbookStats,
  mockCmsPatientResults,
  mockCmsDisorderResults,
  mockCmsGenerateReport,
  mockPisSearchResults,
  mockPisDetail,
  mockG6pdResponse,
  mockG6pdGenerateReport,
  mockFollowupPatientDetails,
  mockFollowupTestCodes,
  mockCreateUserResponse,
  mockSuccess,
  mockEmptyList,
} from './data/mockFixtures';

export interface MockContext {
  method: string;
  path: string;
  searchParams: URLSearchParams;
  body?: unknown;
}

/** Strip host and /api prefix so all callers normalize to the same path shape. */
export function normalizeApiPath(rawUrl: string): string {
  try {
    const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'http://localhost');
    let path = url.pathname;
    if (path.startsWith('/api/')) path = path.slice(5);
    else if (path.startsWith('/api')) path = path.slice(4);
    return path.replace(/^\/+/, '');
  } catch {
    return rawUrl.replace(/^\/api\/?/, '').replace(/^\/+/, '');
  }
}

export function parseSearchParams(rawUrl: string): URLSearchParams {
  try {
    const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'http://localhost');
    return url.searchParams;
  } catch {
    const q = rawUrl.indexOf('?');
    return new URLSearchParams(q >= 0 ? rawUrl.slice(q + 1) : '');
  }
}

function param(params: URLSearchParams, key: string, fallback = ''): string {
  return params.get(key) ?? fallback;
}

function parseBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  if (body instanceof FormData) return {};
  if (typeof body === 'object') return body as Record<string, unknown>;
  return {};
}

/**
 * Resolve a mock response for the given request.
 * Returns `null` when the URL is external (weather, etc.) and should use real fetch.
 */
export function resolveMock(
  method: string,
  rawUrl: string,
  axiosParams?: Record<string, unknown>,
  body?: unknown,
): unknown | null {
  // Pass through external APIs
  if (rawUrl.startsWith('http') && !rawUrl.includes('/api')) {
    return null;
  }

  const path = normalizeApiPath(rawUrl);
  const searchParams = parseSearchParams(rawUrl);

  // Merge axios query params
  if (axiosParams) {
    Object.entries(axiosParams).forEach(([k, v]) => {
      if (v != null) searchParams.set(k, String(v));
    });
  }

  const ctx: MockContext = {
    method: method.toUpperCase(),
    path,
    searchParams,
    body: parseBody(body),
  };

  return routeMock(ctx);
}

function routeMock(ctx: MockContext): unknown {
  const { method, path, searchParams } = ctx;

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path === 'auth/login' && method === 'POST') return mockLoginResponse;
  if (path === 'auth/logout' && method === 'POST') return mockSuccess('Logged out');
  if (path === 'auth/verify') return { valid: true };
  if (path === 'auth/me') return { user: MOCK_USER };
  if (path.startsWith('auth/')) return mockSuccess();

  // ── Admin ─────────────────────────────────────────────────────────────────
  if (path === 'admin/users' && method === 'GET') return mockAdminUsers;
  if (path === 'admin/users' && method === 'POST') {
    return mockCreateUserResponse(parseBody(ctx.body ?? {}));
  }
  if (path.match(/^admin\/users\/\d+$/) && method === 'DELETE') return mockSuccess('User deleted');
  if (path.startsWith('admin/access/')) {
    if (method === 'GET') return {};
    return mockSuccess('Access saved');
  }
  if (path.startsWith('admin/')) return mockSuccess();

  // ── Notifications ─────────────────────────────────────────────────────────
  if (path === 'notifications/unread-count') return { count: 1 };
  if (path === 'notifications' || path.startsWith('notifications')) {
    if (method === 'GET') return mockNotifications;
    return mockSuccess();
  }

  // ── PDO: Sample receive / screened ────────────────────────────────────────
  if (path === 'sample-receive/cumulative-all-province' || path === 'sample-screened/cumulative-all-province') {
    return mockCumulativeAllProvince(
      param(searchParams, 'from', '2026-01-01'),
      param(searchParams, 'to', '2026-12-31'),
    );
  }
  if (path === 'sample-receive/monthly-labno-count' || path === 'sample-screened/monthly-labno-count') {
    return mockMonthlyLabNoCount(
      param(searchParams, 'from', '2026-01-01'),
      param(searchParams, 'to', '2026-12-31'),
      param(searchParams, 'province', 'BATANGAS'),
    );
  }

  // ── PDO: Facility visits ──────────────────────────────────────────────────
  if (path === 'facility-visits/facility-status-count') return mockFacilityStatusCount;
  if (path === 'facility-visits/lookup-facility') return [['FAC-001', '', 'Metro Health Center', 'BATANGAS']];
  if (path === 'facility-visits' || path.startsWith('facility-visits/')) {
    if (method === 'GET') return mockFacilityVisits;
    return mockSuccess();
  }

  // ── PDO: Notebooks ────────────────────────────────────────────────────────
  if (path === 'notebooks/recent') return mockRecentNotebooks;
  if (path === 'notebooks/fetch-image') return { success: true, image: null };
  if (path === 'notebooks/complete-details') {
    return mockCompletePatientDetails(param(searchParams, 'labno', '26000101'));
  }
  if (path.startsWith('notebooks/')) return method === 'GET' ? mockEmptyList : mockSuccess();

  // ── PDO: Timeliness ───────────────────────────────────────────────────────
  if (path === 'timeliness' || path === 'timeliness/summary' || path === 'timeliness/monthly') {
    return mockTimelinessResponse();
  }

  // ── PDO: Endorsements ─────────────────────────────────────────────────────
  if (path === 'endorsements' && method === 'GET') return mockEndorsements;
  if (path === 'endorsements/stats') return { total: mockEndorsements.length, active: 3, inactive: 0 };
  if (path === 'endorsements/test-results/unique') {
    return [...new Set(mockEndorsements.map((e) => e.test_result))];
  }
  if (path.startsWith('endorsements/')) {
    if (path.includes('/lookup/')) {
      return { success: true, data: { labNumber: '26000101', firstName: 'Alex', lastName: 'Rivera', facilityCode: 'FAC-001', facilityName: 'Metro Health Center', testResult: 'Normal', dateReceived: '2026-06-01' } };
    }
    if (method === 'GET') return mockEndorsements[0];
    return mockSuccess();
  }

  // ── PDO: NSF ──────────────────────────────────────────────────────────────
  if (path === 'nsf/summary') return mockNsfSummary;
  if (path === 'nsf/summary/trend') return mockNsfSummaryTrend;
  if (path === 'nsf/distribution') {
    return {
      data: [
        { status: 'active', count: 128 },
        { status: 'inactive', count: 22 },
        { status: 'closed', count: 4 },
        { status: 'partner', count: 2 },
      ],
    };
  }
  if (path === 'nsf/provinces') return { data: ['BATANGAS', 'CAVITE', 'LAGUNA', 'QUEZON', 'RIZAL'] };
  if (path === 'nsf/reactivation/by-province') return mockNsfReactivatedByProvince;
  if (path === 'nsf/reactivation/logs') {
    return { data: mockEmptyList, total: 0, page: 1, limit: 20, total_pages: 0 };
  }
  if (path === 'nsf/reactivation') return { data: mockEmptyList };
  if (path === 'nsf' && method === 'GET') {
    const page = parseInt(param(searchParams, 'page', '1'), 10);
    const limit = parseInt(param(searchParams, 'limit', '20'), 10);
    return mockNsfFacilitiesPaginated(page, limit);
  }
  if (path.startsWith('nsf/') && method === 'GET') {
    const idMatch = path.match(/^nsf\/(\d+)$/);
    if (idMatch) return { data: mockNsfFacilities[0] };
    return mockSuccess();
  }
  if (path.startsWith('nsf/')) return mockSuccess();

  // ── PDO: NSF Performance ──────────────────────────────────────────────────
  if (path.startsWith('pdo/nsf-performance')) {
    if (path.includes('lab-details')) {
      return mockNsfPerformanceLabDetails(
        param(searchParams, 'submid', '1000'),
        param(searchParams, 'dateFrom', '2026-01-01'),
        param(searchParams, 'dateTo', '2026-06-30'),
      );
    }
    if (path.includes('reports')) return mockEmptyList;
    if (path.includes('report-health')) return { healthy: true };
    if (path.includes('generate-report')) return mockSuccess('Report generated');
    return mockNsfPerformance;
  }

  // ── PDO: CAR list ─────────────────────────────────────────────────────────
  if (path === 'car-list/grouped-by-province') {
    return { success: true, data: mockCarListGroupedByProvince };
  }
  if (path === 'car-list/grouped') {
    return { success: true, data: mockCarListGrouped };
  }
  if (path === 'car-list/next-case-number') return mockNextCaseNumber;
  if (path === 'facility') return [{ facilitycode: 'FAC-001', facilityname: 'Metro Health Center', province: 'BATANGAS' }];
  if (path === 'test-db') return { connected: true };
  if (path === 'car-list' || path.startsWith('car-list/') || path === 'add-car' || path === 'update-status') {
    if (method === 'GET') return { success: true, data: mockCarRecords };
    return mockSuccess();
  }

  // ── PDO: Unsat ────────────────────────────────────────────────────────────
  if (path === 'unsat/top-unsatisfactory') return mockTopUnsat;
  if (path === 'unsat/unsat-rate') return mockUnsatRate;
  if (path === 'unsat/total-samples') return { total_samples: 12500 };
  if (path === 'unsat/details-unsatisfactory') {
    return { total: mockUnsatDetailRows.length, rows: mockUnsatDetailRows };
  }
  if (path === 'unsat/full-patient') {
    return { total: mockUnsatFullPatientRows.length, rows: mockUnsatFullPatientRows };
  }
  if (path === 'unsat/unsat-province') {
    return {
      success: true,
      rows: mockUnsatProvinceRows,
      rowCount: mockUnsatProvinceRows.length,
    };
  }
  if (path.startsWith('unsat/')) return mockEmptyList;

  // ── PDO: Samples ──────────────────────────────────────────────────────────
  if (path === 'samples/quezon') {
    return mockQuezonSamples(param(searchParams, 'county', 'BATANGAS'));
  }
  if (path === 'samples/nearby-lopez') return mockNearbyLopezSamples;
  if (path === 'pdo/lopez-purchased-filter-cards') return mockLopezFilterCards;
  if (path === 'pdo/calabarzon-purchased-filter-cards') return mockCalabarzonFilterCards;

  // ── PDO: Patient ──────────────────────────────────────────────────────────
  if (path === 'patient/details') return mockPatientDetails(param(searchParams, 'labno', '26000101'));

  // ── Laboratory ────────────────────────────────────────────────────────────
  if (path === 'laboratory/card-summary') return mockCardSummary;
  if (path === 'laboratory/total-daily-samples') {
    return mockDailySamples(param(searchParams, 'year', '2026'), param(searchParams, 'month', 'june'));
  }
  if (path === 'laboratory/ytd-sample-comparison') {
    return mockYtdComparison(param(searchParams, 'year1', '2025'), param(searchParams, 'year2', '2026'));
  }
  if (path === 'laboratory/tracking-stats') return mockTrackingStats;
  if (path === 'laboratory/census/cumulative-monthly') return mockCumulativeMonthlyCensus;
  if (path.startsWith('laboratory/cumulative-annual-census')) return mockAnnualCensus;
  if (path === 'laboratory/demog-summary-cards' || path.startsWith('laboratory/demog-summary-cards/')) return mockDemogSummary;
  if (path === 'laboratory/lab-supplies') return mockLabSupplies;
  if (path === 'laboratory/lab-reagents') return mockLabReagents;
  if (path === 'speed-monitoring') return mockSpeedMonitoring;
  if (path === 'common-errors/breakdown') {
    return mockCommonErrorBreakdown(param(searchParams, 'tableColumn', 'BIRTHWT'));
  }
  if (path === 'common-errors') return mockCommonErrors;

  // ── Laboratory: Logbook endorsement ───────────────────────────────────────
  if (path === 'laboratory/logbook-endorsement/stats/category') return mockLogbookStats.category;
  if (path === 'laboratory/logbook-endorsement/stats/mnemonic') return mockLogbookStats.mnemonic;
  if (path.startsWith('laboratory/logbook-endorsement')) {
    if (method === 'GET') return mockLogbookEndorsements;
    return mockSuccess();
  }

  // ── Laboratory: PIS ───────────────────────────────────────────────────────
  if (path === 'laboratory/pis/search') return mockPisSearchResults;
  if (path === 'laboratory/pis/detail' || path === 'laboratory/pis/results') {
    return mockPisDetail(param(searchParams, 'labno', '26000101'));
  }
  if (path.startsWith('laboratory/pis/')) return { success: true, data: mockEmptyList };

  // ── Followup ──────────────────────────────────────────────────────────────
  if (path === 'followup/summary-cards/total-count-per-month') return mockFollowupSummaryCards.totalPerMonth;
  if (path === 'followup/summary-cards/total-count-per-day') return mockFollowupSummaryCards.totalPerDay;
  if (path === 'followup/summary-cards/total-pending') return mockFollowupSummaryCards.totalPending;
  if (path === 'followup/summary-cards/average-recall-time') return mockFollowupSummaryCards.averageRecallTime;
  if (path === 'followup/summary-cards/nurse-recall-stats') return mockFollowupSummaryCards.nurseRecallStats;
  if (path === 'followup/cms-urgent/patient-results') {
    return mockCmsPatientResults(param(searchParams, 'date', '2026-06-20'));
  }
  if (path === 'followup/cms-urgent/patient-disorder-results') {
    return mockCmsDisorderResults(param(searchParams, 'labno', '26000101'));
  }
  if (path === 'followup/cms-urgent/generate-report' && method === 'POST') {
    return mockCmsGenerateReport(parseBody(ctx.body ?? {}));
  }
  if (path.startsWith('followup/cms-urgent/serve-report/')) {
    return { message: 'Portfolio demo — PDF generation not available in mock mode' };
  }
  if (path.startsWith('followup/cms-urgent/')) return mockSuccess();
  if (path === 'followup/auto-mailer/individual') {
    return mockG6pdResponse({ labno: param(searchParams, 'labno', '26G0001') });
  }
  if (path === 'followup/auto-mailer/summary') {
    return mockG6pdResponse({
      dateFrom: param(searchParams, 'dateFrom', '2026-06-01'),
      dateTo: param(searchParams, 'dateTo', '2026-06-30'),
    });
  }
  if (path === 'followup/auto-mailer/individual/generate' && method === 'POST') {
    return mockG6pdGenerateReport(parseBody(ctx.body ?? {}));
  }
  if (path === 'followup/auto-mailer/summary/generate' && method === 'POST') {
    return mockG6pdGenerateReport(parseBody(ctx.body ?? {}));
  }
  if (path.startsWith('followup/auto-mailer/serve-report/')) {
    return { message: 'Portfolio demo — PDF generation not available in mock mode' };
  }
  if (path.startsWith('followup/auto-mailer/')) return mockG6pdResponse({});
  if (path === 'followup/logbook-endorsement/stats/category') return mockLogbookStats.category;
  if (path === 'followup/logbook-endorsement/stats/mnemonic') return mockLogbookStats.mnemonic;
  if (path === 'followup/logbook-endorsement/recalled') return mockEmptyList;
  if (path.startsWith('followup/logbook-endorsement')) {
    if (method === 'GET') return mockLogbookEndorsements;
    return mockSuccess();
  }
  if (path === 'followup/patient-details/test-codes') return mockFollowupTestCodes;
  if (path === 'followup/patient-details') {
    return mockFollowupPatientDetails(
      param(searchParams, 'dateFrom', '2026-06-01'),
      param(searchParams, 'dateTo', '2026-06-30'),
      param(searchParams, 'testCode', 'ALL'),
    );
  }

  // ── IT Job Orders ─────────────────────────────────────────────────────────
  if (path === 'it-job-order/stats') return mockJobOrderStats;
  if (path === 'it-job-order/my-active') return mockJobOrders.filter((j) => j.status === 'in_progress');
  if (path === 'it-job-order/queue/status') return { queue: mockJobOrders.filter((j) => j.status === 'pending_approval') };
  if (path.startsWith('it-job-order/')) {
    if (method === 'GET') {
      const id = path.match(/it-job-order\/(\d+)/)?.[1];
      if (id) return { ...mockJobOrders[0], id: parseInt(id, 10), attachments: [], comments: [], history: [] };
      return mockJobOrders;
    }
    return mockSuccess();
  }
  if (path === 'it-job-order') {
    if (method === 'GET') return mockJobOrders;
    return mockSuccess('Job order created');
  }

  // ── Intranet ──────────────────────────────────────────────────────────────
  if (path === 'intranet/files/stats' || path.match(/intranet\/files\/stats\/\d+/)) return mockIntranetStats;
  if (path === 'intranet/files/activity' || path.startsWith('intranet/files/activity')) return mockIntranetActivity;
  if (path === 'intranet/files/shared-with-me') return { files: mockIntranetFileList.files };
  if (path.startsWith('intranet/files/list')) return mockIntranetFileList;
  if (path.startsWith('intranet/files/starred')) return { files: [] };
  if (path.startsWith('intranet/files/search')) return mockIntranetFileList;
  if (path.startsWith('intranet/files/')) {
    if (method === 'GET') return mockIntranetFileList;
    return mockSuccess();
  }
  if (path.startsWith('intranet/categories')) {
    if (method === 'GET') return mockIntranetCategories;
    return mockSuccess();
  }
  if (path.startsWith('intranet/share/')) return { shared: mockEmptyList };
  if (path.startsWith('intranet/move/') || path.startsWith('intranet/category-move/')) return mockSuccess();

  // ── Calendar ──────────────────────────────────────────────────────────────
  if (path === 'calendar/users') return mockCalendarUsers;
  if (path === 'calendar/check-reminders') return { reminders: [] };
  if (path.startsWith('calendar/holidays')) {
    return mockHolidays(parseInt(param(searchParams, 'year', String(new Date().getFullYear())), 10));
  }
  if (path === 'calendar' || path.startsWith('calendar/')) {
    if (method === 'GET') return mockCalendarEvents;
    return mockSuccess();
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  if (path === 'chat/conversations') return mockConversations;
  if (path.startsWith('chat/messages/')) return mockChatMessages;
  if (path === 'chat/users') {
    return mockAdminUsers.map((u) => ({
      id: u.user_id,
      user_name: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.dept,
      isOnline: true,
    }));
  }
  if (path === 'chat/status') return { online: true };
  if (path.startsWith('chat/')) return mockSuccess();

  // ── Catch-all ─────────────────────────────────────────────────────────────
  if (method === 'GET') return mockEmptyList;
  return mockSuccess();
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PROVINCES = ['BATANGAS', 'CAVITE', 'LAGUNA', 'QUEZON', 'RIZAL'];
