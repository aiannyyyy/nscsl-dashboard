import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CalendarDays,
  BookOpen,
  CheckCircle,
  Download,
} from 'lucide-react';
import { exportLogbookEndorsementsToExcel } from '../../../utils/excelExport';
import {
  useLogbookEndorsementList,
  useApproveLogbookTeamCaptain,
  useApproveLogbookLabQa,
} from '../../../hooks/LaboratoryHooks/useLogbookEndorsement';
import { useAuth } from '../../../context/AuthContext';
import type { LogbookEndorsementRecord } from '../../../services/LaboratoryServices/logbookEndorsementServices';
import { LogbookModal } from './LogbookModal';
import PatientRecordModal, { type SampleRecord } from './PatientRecordModal';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const CATEGORY_COLORS: Record<string, string> = {
  NFTR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  METAB: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'HEMOG / GAL': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  ENDOCRINE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'SPECIAL / MONITORING': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Hematology: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Chemistry: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  Microbiology: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Immunology: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Urinalysis: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Coagulation: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  Serology: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

// ─── Grouped record type ──────────────────────────────────────────────────────
type GroupedRecord = LogbookEndorsementRecord & {
  _analytesList: string[];
  _valuesList: string[];
};

// ─── Group records by labno ───────────────────────────────────────────────────
const groupByLabno = (records: LogbookEndorsementRecord[]): GroupedRecord[] => {
  const map = new Map<string, GroupedRecord>();

  for (const r of records) {
    if (map.has(r.labno)) {
      const existing = map.get(r.labno)!;
      if (r.analytes && !existing._analytesList.includes(r.analytes)) {
        existing._analytesList.push(r.analytes);
      }
      if (r.values && !existing._valuesList.includes(r.values)) {
        existing._valuesList.push(r.values);
      }
    } else {
      map.set(r.labno, {
        ...r,
        _analytesList: r.analytes ? [r.analytes] : [],
        _valuesList: r.values ? [r.values] : [],
      });
    }
  }

  return [...map.values()];
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Extract "YYYY-MM-DD" from any date string/object, local time. */
const toDateOnly = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  // MySQL datetime: "2024-05-01 14:30:00" or ISO "2024-05-01T14:30:00.000Z"
  // Take first 10 chars which is always "YYYY-MM-DD"
  return trimmed.slice(0, 10);
};

const formatDateTimeParts = (raw?: string | null): { date: string; time: string } => {
  if (!raw) return { date: '—', time: '' };
  const trimmed = raw.trim();
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      date: parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  const [datePart, timePart] = trimmed.split(' ');
  if (!datePart) return { date: trimmed, time: '' };
  const d = new Date(datePart);
  const date = Number.isNaN(d.getTime())
    ? datePart
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  let time = '';
  if (timePart) {
    const [hStr, mStr] = timePart.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ?? '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    time = `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
  }

  return { date, time };
};

const formatDisplayDate = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};


// ─── Cell components ──────────────────────────────────────────────────────────
const DateTimeCell: React.FC<{ raw?: string | null; dense?: boolean }> = ({ raw, dense }) => {
  const { date, time } = formatDateTimeParts(raw);
  const dtCls = dense ? 'text-xs' : 'text-sm';
  const tmCls = dense ? 'text-[10px]' : 'text-xs';
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={`${dtCls} font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap`}>{date}</span>
      {time ? <span className={`${tmCls} text-gray-400 dark:text-gray-500 whitespace-nowrap`}>{time}</span> : null}
    </div>
  );
};

const PersonCell: React.FC<{ name?: string | null; datetime?: string | null; dense?: boolean }> = ({
  name,
  datetime,
  dense,
}) => {
  const displayName = name?.trim() ?? '';
  const { date, time } = formatDateTimeParts(datetime);
  const hasWhen = Boolean(datetime?.trim());
  const whenLine =
    hasWhen && (date !== '—' || time)
      ? `${date !== '—' ? date : ''}${time ? ` ${time}` : ''}`
      : '';
  const nameCls = dense ? 'text-xs' : 'text-sm';
  const whenCls = dense ? 'text-[10px]' : 'text-xs';

  if (!displayName && !hasWhen) {
    return <span className={`${nameCls} text-gray-400 dark:text-gray-500`}>—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {displayName && (
        <span className={`${nameCls} font-medium text-gray-900 dark:text-white truncate`}>{displayName}</span>
      )}
      {whenLine && (
        <span className={`${whenCls} text-gray-500 dark:text-gray-400 whitespace-nowrap`}>{whenLine}</span>
      )}
    </div>
  );
};

const DatePersonCell: React.FC<{ raw?: string | null; person?: string | null; dense?: boolean }> = ({
  raw,
  person,
  dense,
}) => {
  const { date, time } = formatDateTimeParts(raw);
  const who = person?.trim();
  const nameCls = dense ? 'text-xs' : 'text-sm';
  const smCls = dense ? 'text-[10px]' : 'text-xs';
  if (!who && !raw?.trim()) {
    return <span className={`${nameCls} text-gray-400 dark:text-gray-500`}>—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {who && <span className={`${nameCls} font-medium text-gray-900 dark:text-white truncate`}>{who}</span>}
      <span className={`${smCls} text-gray-600 dark:text-gray-300 whitespace-nowrap`}>{date}</span>
      {time && <span className={`${smCls} text-gray-400 dark:text-gray-500 whitespace-nowrap`}>{time}</span>}
    </div>
  );
};

const AnalyteValueList: React.FC<{
  items: string[];
  mono?: boolean;
  dense?: boolean;
  narrowNumeric?: boolean;
  /** If set, clip each line for compact table cells (full text in title), a la FacilityVisits remarks. */
  truncateAt?: number;
}> = ({ items, mono, dense, narrowNumeric, truncateAt }) => {
  const lineCls = dense ? 'text-xs' : 'text-sm';
  const emptyCls = dense ? 'text-xs' : 'text-sm';
  if (items.length === 0) return <span className={`${emptyCls} text-gray-400 dark:text-gray-500`}>—</span>;
  return (
    <div className={`flex flex-col ${dense ? 'gap-0.5' : 'gap-1'}`}>
      {items.map((item, i) => {
        const full = item;
        const text =
          truncateAt != null && full.length > truncateAt
            ? `${full.slice(0, truncateAt).trim()}...`
            : full;
        return (
          <span
            key={i}
            className={`${lineCls} leading-snug text-gray-700 dark:text-gray-300 ${mono ? 'font-mono tabular-nums' : ''} ${narrowNumeric || truncateAt != null ? 'block truncate max-w-full' : ''}`}
            title={full}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
};

// ─── Detail modal ─────────────────────────────────────────────────────────────
const DetailRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-lg flex flex-col gap-1 border border-gray-100 dark:border-gray-700/80">
    <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">{label}</span>
    <span className={`text-sm text-gray-800 dark:text-gray-100 break-words ${mono ? 'font-mono' : 'font-medium'}`}>
      {value}
    </span>
  </div>
);

/** Minimal PIS row: LABNO drives Oracle detail fetch; names help filter-card sidebar */
const sampleRecordFromEndorsement = (r: GroupedRecord): SampleRecord => {
  const name = (r.patient_name || '').trim();
  let FNAME = '';
  let LNAME = '';
  if (name) {
    const i = name.indexOf(' ');
    if (i === -1) {
      LNAME = name;
    } else {
      FNAME = name.slice(0, i).trim();
      LNAME = name.slice(i + 1).trim() || FNAME;
    }
  }
  const empty = '';
  return {
    LABNO: r.labno?.trim() ?? '',
    LABID: empty,
    LNAME,
    FNAME,
    SUBMID: r.facility_code?.trim() ?? '',
    BIRTHDT: empty,
    BIRTHTM: empty,
    DTCOLL: empty,
    TMCOLL: empty,
    DTRECV: empty,
    TMRECV: empty,
    DTRPTD: empty,
    GESTAGE: empty,
    AGECOLL: empty,
    SEX: empty,
  };
};

const TEAM_CAPTAIN_POSITION = 'Team Captain';
const LAB_MANAGER_POSITION = 'Laboratory Manager';
const QAO_POSITION = 'Quality Assurance Officer';

const ViewDetailsModal: React.FC<{
  record: GroupedRecord;
  onClose: () => void;
  onViewPis: (record: GroupedRecord) => void;
  showTeamCaptainApprove: boolean;
  onTeamCaptainApprove: () => void | Promise<void>;
  teamCaptainApprovePending: boolean;
  teamCaptainApproveError: string | null;
  showLabManagerApprove: boolean;
  showQaoApprove: boolean;
  onLabManagerApprove: () => void | Promise<void>;
  onQaoApprove: () => void | Promise<void>;
  labQaPending: boolean;
  labQaError: string | null;
}> = ({
  record,
  onClose,
  onViewPis,
  showTeamCaptainApprove,
  onTeamCaptainApprove,
  teamCaptainApprovePending,
  teamCaptainApproveError,
  showLabManagerApprove,
  showQaoApprove,
  onLabManagerApprove,
  onQaoApprove,
  labQaPending,
  labQaError,
}) => {
  const labTrim = record.labno?.trim() ?? '';

  const goPis = () => {
    if (!labTrim) return;
    onViewPis(record);
  };

  return (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    onClick={onClose}
    role="presentation"
  >
    <div
      className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="endorsement-detail-title"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
        <div>
          <h3 id="endorsement-detail-title" className="text-base font-semibold text-gray-900 dark:text-white">
            Endorsement Details
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{record.labno}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 py-5 overflow-y-auto max-h-[65vh] space-y-5">
        <div>
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded shrink-0" aria-hidden />
            Patient Information
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Date" value={<DateTimeCell raw={record.date_input} />} />
            <DetailRow label="Lab No." value={record.labno} mono />
            <DetailRow label="Patient Name" value={record.patient_name} />
            <DetailRow label="Facility Code" value={record.facility_code} />
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded shrink-0" aria-hidden />
            Test Information
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Mnemonic" value={record.mnemonic} />
            <DetailRow label="Category" value={record.category} />
            <div className="col-span-2">
              <DetailRow
                label={`Analytes (${record._analytesList.length})`}
                value={
                  <div className="flex flex-col gap-1">
                    {record._analytesList.map((a, i) => (
                      <span key={i} className="text-sm text-gray-800 dark:text-gray-100">{a}</span>
                    ))}
                  </div>
                }
              />
            </div>
            <div className="col-span-2">
              <DetailRow
                label={`Values (${record._valuesList.length})`}
                value={
                  <div className="flex flex-col gap-1">
                    {record._valuesList.map((v, i) => (
                      <span key={i} className="text-sm font-mono text-gray-800 dark:text-gray-100">{v}</span>
                    ))}
                  </div>
                }
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded shrink-0" aria-hidden />
            Personnel
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Analyst" value={<PersonCell name={record.analyst} datetime={record.analyst_date} />} />
            <DetailRow label="TC" value={<PersonCell name={record.tc} datetime={record.tc_date} />} />
            <DetailRow
              label="QAO / Lab Manager"
              value={<PersonCell name={record.qao} datetime={record.qao_date} />}
            />
            <DetailRow
              label="FUN"
              value={<PersonCell name={record.fun} datetime={record.fun_date} />}
            />
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-gray-400 rounded shrink-0" aria-hidden />
            Last updated
          </h4>
          <div className="grid grid-cols-1 gap-3">
            <DetailRow label="Date Modified" value={<DatePersonCell raw={record.date_modified} person={record.modified_by} />} />
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex flex-col gap-2">
        {teamCaptainApproveError && (
          <p className="text-xs text-red-600 dark:text-red-400 text-right">{teamCaptainApproveError}</p>
        )}
        {labQaError && (
          <p className="text-xs text-red-600 dark:text-red-400 text-right">{labQaError}</p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {showTeamCaptainApprove && (
            <button
              type="button"
              onClick={() => void onTeamCaptainApprove()}
              disabled={teamCaptainApprovePending || labQaPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {teamCaptainApprovePending ? 'Saving…' : 'Approve (TC)'}
            </button>
          )}
          {showLabManagerApprove && (
            <button
              type="button"
              onClick={() => void onLabManagerApprove()}
              disabled={labQaPending || teamCaptainApprovePending}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {labQaPending ? 'Saving…' : 'Approve (Lab Manager)'}
            </button>
          )}
          {showQaoApprove && (
            <button
              type="button"
              onClick={() => void onQaoApprove()}
              disabled={labQaPending || teamCaptainApprovePending}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {labQaPending ? 'Saving…' : 'Approve (QAO)'}
            </button>
          )}
          <button
            type="button"
            onClick={goPis}
            disabled={!labTrim}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            View PIS
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface EndorsementToFollowUpTableProps {
  /** "YYYY-MM-DD" — only records whose date_input matches this date are shown */
  selectedDate: string;
  /** From notification deep link: logbook row id → opens detail modal */
  focusEndorsementId?: string | null;
  /** Clear URL params after opening the focused record */
  onConsumedFocusEndorsement?: () => void;
}

// ─── Main table ───────────────────────────────────────────────────────────────
export const EndorsementToFollowUpTable: React.FC<EndorsementToFollowUpTableProps> = ({
  selectedDate,
  focusEndorsementId = null,
  onConsumedFocusEndorsement,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewRecord, setViewRecord] = useState<GroupedRecord | null>(null);
  const [pisRecord, setPisRecord] = useState<SampleRecord | null>(null);
  const openedFocusIdRef = useRef<number | null>(null);

  const { user } = useAuth();
  const approveTeamCaptainMutation = useApproveLogbookTeamCaptain();
  const approveLabQaMutation = useApproveLogbookLabQa();
  const { data, isLoading } = useLogbookEndorsementList();

  const userPosition = user?.position?.trim() ?? '';
  const tcDone = !!viewRecord && !!String(viewRecord.tc ?? '').trim();

  const showTeamCaptainApproveInModal =
    userPosition === TEAM_CAPTAIN_POSITION && !!viewRecord && !tcDone;

  const showLabManagerApproveInModal =
    userPosition === LAB_MANAGER_POSITION && !!viewRecord && tcDone && !String(viewRecord.qao ?? '').trim();

  const showQaoApproveInModal =
    userPosition === QAO_POSITION && !!viewRecord && tcDone && !String(viewRecord.qao ?? '').trim();

  const approveErrorMessage = (() => {
    const err = approveTeamCaptainMutation.error;
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const ax = err as {
        response?: { data?: { error?: string; message?: string } };
      };
      return ax.response?.data?.error || ax.response?.data?.message || null;
    }
    if (err instanceof Error) return err.message;
    return 'Approval failed.';
  })();

  const labQaErrorMessage = (() => {
    const err = approveLabQaMutation.error;
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const ax = err as {
        response?: { data?: { error?: string; message?: string } };
      };
      return ax.response?.data?.error || ax.response?.data?.message || null;
    }
    if (err instanceof Error) return err.message;
    return 'Approval failed.';
  })();

  const labQaPending = approveLabQaMutation.isPending;

  useEffect(() => {
    if (!focusEndorsementId) {
      openedFocusIdRef.current = null;
      return;
    }
    const rows = data?.data;
    if (!rows?.length) return;

    const id = Number(focusEndorsementId);
    if (!Number.isFinite(id)) return;
    if (openedFocusIdRef.current === id) return;

    const raw = rows.find((r) => r.id === id);
    if (!raw) return;

    openedFocusIdRef.current = id;
    const grouped: GroupedRecord = {
      ...raw,
      _analytesList: raw.analytes ? [raw.analytes] : [],
      _valuesList: raw.values ? [raw.values] : [],
    };
    queueMicrotask(() => {
      setViewRecord(grouped);
      onConsumedFocusEndorsement?.();
    });
  }, [focusEndorsementId, data?.data, onConsumedFocusEndorsement]);

  // Reset to page 1 whenever the selected date or search changes
  const resetPage = () => setPage(1);

  const filtered = useMemo(() => {
    const records = data?.data || [];
    const q = search.toLowerCase();

    const matched = records.filter((record) => {
      // ── Date filter: compare "YYYY-MM-DD" slice of date_input ──
      const recordDate = toDateOnly(record.date_input);
      if (recordDate !== selectedDate) return false;

      // ── Search filter ──
      if (q) {
        return Object.values(record).some((value) =>
          String(value ?? '').toLowerCase().includes(q)
        );
      }

      return true;
    });

    return groupByLabno(matched);
  }, [data?.data, selectedDate, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const colCount = 14;

  // Human-readable label for the selected date
  const dateLabel = formatDisplayDate(selectedDate);
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <>
      {showAddModal && <LogbookModal onClose={() => setShowAddModal(false)} />}
      {viewRecord && (
        <ViewDetailsModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onViewPis={(r) => {
            setPisRecord(sampleRecordFromEndorsement(r));
          }}
          showTeamCaptainApprove={showTeamCaptainApproveInModal}
          onTeamCaptainApprove={async () => {
            try {
              await approveTeamCaptainMutation.mutateAsync(viewRecord.id);
              setViewRecord(null);
            } catch {
              /* error surfaced via approveErrorMessage */
            }
          }}
          teamCaptainApprovePending={approveTeamCaptainMutation.isPending}
          teamCaptainApproveError={approveErrorMessage}
          showLabManagerApprove={showLabManagerApproveInModal}
          showQaoApprove={showQaoApproveInModal}
          onLabManagerApprove={async () => {
            try {
              await approveLabQaMutation.mutateAsync({
                id: viewRecord.id,
                role: 'lab_manager',
              });
              setViewRecord(null);
            } catch {
              /* labQaErrorMessage */
            }
          }}
          onQaoApprove={async () => {
            try {
              await approveLabQaMutation.mutateAsync({
                id: viewRecord.id,
                role: 'qao',
              });
              setViewRecord(null);
            } catch {
              /* labQaErrorMessage */
            }
          }}
          labQaPending={labQaPending}
          labQaError={labQaErrorMessage}
        />
      )}
      {pisRecord && (
        <PatientRecordModal record={pisRecord} onClose={() => setPisRecord(null)} />
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col transition-colors">
        {/* ── Header bar ── */}
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800">

          {/* ── Active date banner ── */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 flex-1 min-w-0 truncate">
              {isToday ? `Today — ${dateLabel}` : dateLabel}
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 tabular-nums">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Title + controls row ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 shrink-0">
                <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  Endorsement to Follow-Up Records
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Showing records for selected date
                </p>
              </div>
            </div>

            {/* ── Right side: search + export + add ── */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                  className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => exportLogbookEndorsementsToExcel(filtered, selectedDate)}
                disabled={filtered.length === 0}
                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-1.5 font-medium shrink-0 transition-colors"
                title="Export to Excel"
              >
                <Download className="w-3 h-3" />
                Export
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg flex items-center gap-1.5 font-medium shrink-0 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add for {isToday ? 'Today' : selectedDate}
              </button>
            </div>
          </div>
        </div>

        {/* ── Table (framed like FacilityVisits.tsx) ── */}
        <div className="px-4 pb-4 pt-1">
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full table-fixed text-xs relative leading-snug border-collapse">
                <colgroup>
                  <col className="w-[4.5rem]" />
                  <col className="w-[5rem]" />
                  <col className="w-[8.5rem]" />
                  <col className="w-[3rem]" />
                  <col className="w-[4rem]" />
                  <col className="w-[5.25rem]" />
                  <col className="w-[7.25rem]" />
                  <col className="w-[3.75rem]" />
                  <col className="w-[6.5rem]" />
                  <col className="w-[5.75rem]" />
                  <col className="w-[6.5rem]" />
                  <col className="w-[4.5rem]" />
                  <col className="w-[6rem]" />
                  <col className="w-[2.75rem]" />
                </colgroup>

                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    {(
                      [
                        { key: 'd', label: 'Date' },
                        { key: 'lab', label: 'Lab no.' },
                        { key: 'pt', label: 'Patient' },
                        { key: 'fc', label: 'Fac.' },
                        { key: 'mn', label: 'Mnem.' },
                        { key: 'cat', label: 'Category' },
                        { key: 'an', label: 'Analytes' },
                        { key: 'val', label: 'Values' },
                        { key: 'analyst', label: 'Analyst' },
                        { key: 'tc', label: 'TC' },
                        { key: 'qao', label: 'LM / QA' },
                        { key: 'fun', label: 'FUN' },
                        { key: 'mod', label: 'Modified' },
                        { key: 'act', label: 'Actions', sticky: true },
                      ] as const
                    ).map((col) =>
                      'sticky' in col && col.sticky ? (
                        <th
                          key={col.key}
                          className="sticky right-0 z-10 px-3 py-2 text-center font-medium whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/95 border-l border-gray-200 dark:border-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[-2px_0_4px_rgba(0,0,0,0.2)]"
                        >
                          {col.label}
                        </th>
                      ) : (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-left font-medium whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400"
                        >
                          {col.label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {isLoading ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-xs text-gray-500 dark:text-gray-400">
                    Loading records...
                  </td>
                </tr>
                  ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarDays className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        No records for {isToday ? 'today' : selectedDate}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        Use the date picker above to view another day, or add a new endorsement.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="mt-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 font-medium transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add endorsement for {isToday ? 'today' : selectedDate}
                      </button>
                    </div>
                  </td>
                </tr>
                  ) : (
                    paginated.map((row, i) => {
                  const isEven = i % 2 === 0;
                  const rowBg = isEven
                    ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60';
                  const stickyBg = isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30';

                  return (
                    <tr key={row.id} className={`transition-colors group ${rowBg}`}>
                      <td className="px-3 py-2 align-top text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        <DateTimeCell raw={row.date_input} dense />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="block font-mono font-medium text-xs text-blue-600 dark:text-blue-400 truncate" title={row.labno}>
                          {row.labno}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="block text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[9.75rem]" title={row.patient_name}>
                          {row.patient_name}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100/90 text-gray-800 dark:bg-gray-700/90 dark:text-gray-200 truncate max-w-full">
                          {row.facility_code}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100/90 text-blue-800 dark:bg-blue-900/35 dark:text-blue-300 truncate max-w-full border border-blue-200/60 dark:border-blue-800/40"
                          title={row.mnemonic}
                        >
                          {row.mnemonic}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium truncate max-w-full border border-black/5 dark:border-white/10 ${CATEGORY_COLORS[row.category] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
                          title={row.category}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top min-w-0">
                        <AnalyteValueList items={row._analytesList} dense truncateAt={36} />
                      </td>
                      <td className="px-3 py-2 align-top min-w-0">
                        <AnalyteValueList items={row._valuesList} mono dense narrowNumeric />
                      </td>
                      <td className="px-3 py-2 align-top"><PersonCell name={row.analyst} datetime={row.analyst_date} dense /></td>
                      <td className="px-3 py-2 align-top"><PersonCell name={row.tc} datetime={row.tc_date} dense /></td>
                      <td className="px-3 py-2 align-top">
                        <PersonCell name={row.qao || null} datetime={row.qao_date} dense />
                      </td>
                      <td className="px-3 py-2 align-top"><PersonCell name={row.fun} datetime={row.fun_date} dense /></td>
                      <td className="px-3 py-2 align-top"><DatePersonCell raw={row.date_modified} person={row.modified_by} dense /></td>

                      <td
                        className={`sticky right-0 z-10 px-3 py-2 align-top border-l border-gray-200 dark:border-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[-2px_0_4px_rgba(0,0,0,0.2)] transition-colors ${stickyBg} group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50`}
                      >
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setViewRecord(row)}
                            className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/25 rounded-lg transition-colors"
                            title="View details"
                            aria-label="View details"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Pagination ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg h-8 px-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};