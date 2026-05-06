import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CalendarDays,
  BookOpen,
  RotateCcw,
  Clock,
  CheckCircle,
  Download,
} from 'lucide-react';
import { exportLogbookEndorsementsToExcel } from '../../../utils/excelExport';
import {
  useLogbookEndorsementList,
  useLogbookEndorsementRecalledSectionList,
  useDoneRecallLogbookEndorsement,
} from '../../../hooks/FollowupHooks/useFunLogbookEndorsements';
import { useAuth } from '../../../context/AuthContext';
import type { LogbookEndorsementRecord } from '../../../services/FollowupServices/funLogbookEndorsementService';
import PatientRecordModal, { type SampleRecord } from '../../laboratory/components/PatientRecordModal';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

/** Mirrors Lab Manager + QAO storage: `lm|qa` merged in `qao`, or legacy QA-only string. */
const parseLmQaDisplay = (raw: string | null | undefined): { lm: string; qa: string } => {
  const s = (raw ?? '').trim();
  if (!s) return { lm: '', qa: '' };
  const i = s.indexOf('|');
  if (i === -1) return { lm: '', qa: s };
  return { lm: s.slice(0, i).trim(), qa: s.slice(i + 1).trim() };
};

const isRecallPendingRow = (r: LogbookEndorsementRecord): boolean => {
  const fu = r.fun != null ? String(r.fun).trim() : '';
  const fd = r.fun_date != null ? String(r.fun_date).trim() : '';
  return !fu && !fd;
};

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

// ─── Types ────────────────────────────────────────────────────────────────────
type RecallStatus = 'pending' | 'recalled';

const recallStatusFromRow = (r: LogbookEndorsementRecord): RecallStatus =>
  isRecallPendingRow(r) ? 'pending' : 'recalled';

type GroupedRecord = LogbookEndorsementRecord & {
  _analytesList: string[];
  _valuesList: string[];
  _recallStatus: RecallStatus;
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
      if (isRecallPendingRow(r)) existing._recallStatus = 'pending';
    } else {
      map.set(r.labno, {
        ...r,
        _analytesList: r.analytes ? [r.analytes] : [],
        _valuesList: r.values ? [r.values] : [],
        _recallStatus: recallStatusFromRow(r),
      });
    }
  }

  return [...map.values()];
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
const toDateOnly = (raw: string | null | undefined): string => {
  if (!raw) return '';
  return raw.trim().slice(0, 10);
};

const filterRecordsByDateAndSearch = (
  records: LogbookEndorsementRecord[],
  selectedDate: string,
  search: string
): LogbookEndorsementRecord[] => {
  const q = search.toLowerCase().trim();
  return records.filter((r) => {
    if (toDateOnly(r.date_input) !== selectedDate) return false;
    if (!q.length) return true;
    return Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q));
  });
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
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={`${dense ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap`}>{date}</span>
      {time ? <span className={`${dense ? 'text-[10px]' : 'text-xs'} text-gray-400 dark:text-gray-500 whitespace-nowrap`}>{time}</span> : null}
    </div>
  );
};

const LmQaCell: React.FC<{ qao: string | null; qao_date: string | null; dense?: boolean }> = ({
  qao,
  qao_date,
  dense,
}) => {
  const { lm, qa } = parseLmQaDisplay(qao);
  if (!lm && !qa) {
    return <span className={`${dense ? 'text-xs' : 'text-sm'} text-gray-400 dark:text-gray-500`}>—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {lm ? (
        <span className={`${dense ? 'text-xs' : 'text-sm'} font-medium text-gray-900 dark:text-gray-100 truncate`} title={lm}>
          {lm}
        </span>
      ) : null}
      {qa ? (
        <span className={`${dense ? 'text-xs' : 'text-sm'} font-medium text-gray-900 dark:text-gray-100 truncate`} title={qa}>
          {qa}
        </span>
      ) : null}
      {qao_date?.trim() ? <DateTimeCell raw={qao_date} dense /> : null}
    </div>
  );
};

const PersonCell: React.FC<{ name?: string | null; datetime?: string | null; dense?: boolean }> = ({ name, datetime, dense }) => {
  const displayName = name?.trim() ?? '';
  const { date, time } = formatDateTimeParts(datetime);
  const hasWhen = Boolean(datetime?.trim());
  const whenLine = hasWhen && (date !== '—' || time)
    ? `${date !== '—' ? date : ''}${time ? ` ${time}` : ''}`
    : '';

  if (!displayName && !hasWhen) {
    return <span className={`${dense ? 'text-xs' : 'text-sm'} text-gray-400 dark:text-gray-500`}>—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {displayName && <span className={`${dense ? 'text-xs' : 'text-sm'} font-medium text-gray-900 dark:text-white truncate`}>{displayName}</span>}
      {whenLine && <span className={`${dense ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 whitespace-nowrap`}>{whenLine}</span>}
    </div>
  );
};

const DatePersonCell: React.FC<{ raw?: string | null; person?: string | null; dense?: boolean }> = ({ raw, person, dense }) => {
  const { date, time } = formatDateTimeParts(raw);
  const who = person?.trim();
  const sm = dense ? 'text-[10px]' : 'text-xs';
  if (!who && !raw?.trim()) return <span className={`${dense ? 'text-xs' : 'text-sm'} text-gray-400 dark:text-gray-500`}>—</span>;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {who && <span className={`${dense ? 'text-xs' : 'text-sm'} font-medium text-gray-900 dark:text-white truncate`}>{who}</span>}
      <span className={`${sm} text-gray-600 dark:text-gray-300 whitespace-nowrap`}>{date}</span>
      {time && <span className={`${sm} text-gray-400 dark:text-gray-500 whitespace-nowrap`}>{time}</span>}
    </div>
  );
};

const AnalyteValueList: React.FC<{
  items: string[];
  mono?: boolean;
  dense?: boolean;
  narrowNumeric?: boolean;
  truncateAt?: number;
}> = ({ items, mono, dense, narrowNumeric, truncateAt }) => {
  if (items.length === 0) return <span className={`${dense ? 'text-xs' : 'text-sm'} text-gray-400 dark:text-gray-500`}>—</span>;
  return (
    <div className={`flex flex-col ${dense ? 'gap-0.5' : 'gap-1'}`}>
      {items.map((item, i) => {
        const text = truncateAt != null && item.length > truncateAt ? `${item.slice(0, truncateAt).trim()}...` : item;
        return (
          <span
            key={i}
            className={`${dense ? 'text-xs' : 'text-sm'} leading-snug text-gray-700 dark:text-gray-300 ${mono ? 'font-mono tabular-nums' : ''} ${narrowNumeric || truncateAt != null ? 'block truncate max-w-full' : ''}`}
            title={item}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const RecallStatusBadge: React.FC<{ status: RecallStatus }> = ({ status }) => {
  if (status === 'recalled') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 whitespace-nowrap">
        <CheckCircle className="w-2.5 h-2.5" />
        Recalled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 whitespace-nowrap">
      <Clock className="w-2.5 h-2.5" />
      Pending
    </span>
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

const sampleRecordFromEndorsement = (r: GroupedRecord): SampleRecord => {
  const name = (r.patient_name || '').trim();
  let FNAME = '', LNAME = '';
  if (name) {
    const i = name.indexOf(' ');
    if (i === -1) { LNAME = name; }
    else { FNAME = name.slice(0, i).trim(); LNAME = name.slice(i + 1).trim() || FNAME; }
  }
  const empty = '';
  return {
    LABNO: r.labno?.trim() ?? '', LABID: empty, LNAME, FNAME,
    SUBMID: r.facility_code?.trim() ?? '', BIRTHDT: empty, BIRTHTM: empty,
    DTCOLL: empty, TMCOLL: empty, DTRECV: empty, TMRECV: empty,
    DTRPTD: empty, GESTAGE: empty, AGECOLL: empty, SEX: empty,
  };
};

const ViewDetailsModal: React.FC<{
  record: GroupedRecord;
  onClose: () => void;
  onViewPis: (record: GroupedRecord) => void;
  onDoneRecall: () => void | Promise<void>;
  doneRecallPending: boolean;
  doneRecallError: string | null;
}> = ({ record, onClose, onViewPis, onDoneRecall, doneRecallPending, doneRecallError }) => {
  const isPending = record._recallStatus === 'pending';

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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div>
              <h3 id="endorsement-detail-title" className="text-base font-semibold text-gray-900 dark:text-white">
                Endorsement Details
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{record.labno}</p>
            </div>
            <RecallStatusBadge status={record._recallStatus} />
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

        {/* Body */}
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
                      {record._analytesList.map((a, i) => <span key={i} className="text-sm text-gray-800 dark:text-gray-100">{a}</span>)}
                    </div>
                  }
                />
              </div>
              <div className="col-span-2">
                <DetailRow
                  label={`Values (${record._valuesList.length})`}
                  value={
                    <div className="flex flex-col gap-1">
                      {record._valuesList.map((v, i) => <span key={i} className="text-sm font-mono text-gray-800 dark:text-gray-100">{v}</span>)}
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
              <DetailRow label="QAO / Lab Manager" value={<PersonCell name={record.qao} datetime={record.qao_date} />} />
              <DetailRow
                label="FUN (Recall)"
                value={
                  record.fun
                    ? <PersonCell name={record.fun} datetime={record.fun_date} />
                    : <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">Not yet recalled</span>
                }
              />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-gray-400 rounded shrink-0" aria-hidden />
              Last Updated
            </h4>
            <DetailRow label="Date Modified" value={<DatePersonCell raw={record.date_modified} person={record.modified_by} />} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex flex-col gap-2">
          {doneRecallError && (
            <p className="text-xs text-red-600 dark:text-red-400 text-right">{doneRecallError}</p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {isPending && (
              <button
                type="button"
                onClick={() => void onDoneRecall()}
                disabled={doneRecallPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                {doneRecallPending ? 'Saving…' : 'Done Recall'}
              </button>
            )}
            <button
              type="button"
              onClick={() => onViewPis(record)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
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
  selectedDate: string;
  focusEndorsementId?: string | null;
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
  const [sectionTab, setSectionTab] = useState<'queue' | 'recalled'>('queue');
  const [viewRecord, setViewRecord] = useState<GroupedRecord | null>(null);
  const [pisRecord, setPisRecord] = useState<SampleRecord | null>(null);
  const openedFocusIdRef = useRef<number | null>(null);

  const { user } = useAuth();
  const doneRecallMutation = useDoneRecallLogbookEndorsement();
  const { data: queueData, isLoading: queueLoading } = useLogbookEndorsementList();
  const { data: archiveData, isLoading: archiveLoading } = useLogbookEndorsementRecalledSectionList();

  const resetPage = () => setPage(1);

  const sourceRecords = useMemo(() => {
    if (sectionTab === 'queue') return queueData?.data ?? [];
    return (archiveData?.data ?? []).filter((r) => !isRecallPendingRow(r));
  }, [sectionTab, queueData?.data, archiveData?.data]);

  const isLoading = sectionTab === 'queue' ? queueLoading : archiveLoading;

  const queueTabCount = useMemo(
    () =>
      groupByLabno(filterRecordsByDateAndSearch(queueData?.data ?? [], selectedDate, search)).length,
    [queueData?.data, selectedDate, search]
  );

  const recalledTabCount = useMemo(
    () =>
      groupByLabno(
        filterRecordsByDateAndSearch(
          (archiveData?.data ?? []).filter((r) => !isRecallPendingRow(r)),
          selectedDate,
          search
        )
      ).length,
    [archiveData?.data, selectedDate, search]
  );

  // ── Focus from notification: pending queue first, then full archive ──
  useEffect(() => {
    if (!focusEndorsementId) { openedFocusIdRef.current = null; return; }
    const id = Number(focusEndorsementId);
    if (!Number.isFinite(id)) return;
    const pendingRows = queueData?.data ?? [];
    const archiveRows = archiveData?.data ?? [];
    if (!pendingRows.length && !archiveRows.length) return;
    const raw =
      pendingRows.find((r) => r.id === id) ?? archiveRows.find((r) => r.id === id);
    if (!raw) return;
    if (openedFocusIdRef.current === id) return;
    openedFocusIdRef.current = id;
    const grouped: GroupedRecord = {
      ...raw,
      _analytesList: raw.analytes ? [raw.analytes] : [],
      _valuesList: raw.values ? [raw.values] : [],
      _recallStatus: recallStatusFromRow(raw),
    };
    const tabForRow = isRecallPendingRow(raw) ? 'queue' : 'recalled';
    queueMicrotask(() => {
      setSectionTab(tabForRow);
      setViewRecord(grouped);
      onConsumedFocusEndorsement?.();
    });
  }, [focusEndorsementId, queueData?.data, archiveData?.data, onConsumedFocusEndorsement]);

  // ── Filter + group ──
  const allGrouped = useMemo(() => {
    const matched = filterRecordsByDateAndSearch(sourceRecords, selectedDate, search);
    return groupByLabno(matched);
  }, [sourceRecords, selectedDate, search]);

  const totalPages = Math.max(1, Math.ceil(allGrouped.length / pageSize));
  const paginated = allGrouped.slice((page - 1) * pageSize, page * pageSize);

  const dateLabel = formatDisplayDate(selectedDate);
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const colCount = 14;

  // ── Done Recall handler ──
  const handleDoneRecall = async () => {
    if (!viewRecord) return;
    const userName = (user?.name || '').trim();
    const funName = userName || 'Unknown user';
    try {
      await doneRecallMutation.mutateAsync({
        id: viewRecord.id,
        fun: funName,
        modified_by: funName,
      });
      setSectionTab('recalled');
      setViewRecord(null);
    } catch {
      /* surfaced via doneRecallError */
    }
  };

  const doneRecallError = (() => {
    const err = doneRecallMutation.error;
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const ax = err as { response?: { data?: { error?: string; message?: string } } };
      return ax.response?.data?.error || ax.response?.data?.message || null;
    }
    if (err instanceof Error) return err.message;
    return 'Failed to save recall.';
  })();

  return (
    <>
      {viewRecord && (
        <ViewDetailsModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onViewPis={(r) => { setPisRecord(sampleRecordFromEndorsement(r)); }}
          onDoneRecall={handleDoneRecall}
          doneRecallPending={doneRecallMutation.isPending}
          doneRecallError={doneRecallError}
        />
      )}
      {pisRecord && <PatientRecordModal record={pisRecord} onClose={() => setPisRecord(null)} />}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col transition-colors">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800">

          {/* Date banner */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 flex-1 min-w-0 truncate">
              {isToday ? `Today — ${dateLabel}` : dateLabel}
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 tabular-nums">
              {allGrouped.length} record{allGrouped.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Title + search */}
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
                  {sectionTab === 'queue'
                    ? 'Shows after Analyst → Team Captain → both LM & QAO approve; FUN recall not recorded yet.'
                    : 'FUN recall recorded (history); full archive filtered to completed recalls for this date.'}
                </p>
              </div>
            </div>

            {/* ── Right side: search + export ── */}
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
                onClick={() => exportLogbookEndorsementsToExcel(allGrouped, selectedDate)}
                disabled={allGrouped.length === 0}
                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-1.5 font-medium shrink-0 transition-colors"
                title="Export to Excel"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'queue' as const, label: 'Pending recall', Icon: Clock, count: queueTabCount },
                { key: 'recalled' as const, label: 'Recalled', Icon: CheckCircle, count: recalledTabCount },
              ]
            ).map(({ key, label, Icon, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setSectionTab(key); resetPage(); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  sectionTab === key
                    ? key === 'queue'
                      ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" aria-hidden />
                {label}
                <span className="tabular-nums">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
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
                  <col className="w-[7rem]" />
                  <col className="w-[3.5rem]" />
                  <col className="w-[6.25rem]" />
                  <col className="w-[5.5rem]" />
                  <col className="w-[6rem]" />
                  <col className="w-[5.25rem]" />
                  <col className="w-[5rem]" />
                  <col className="w-[2.75rem]" />
                </colgroup>

                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    {(
                      [
                        { key: 'd', label: 'Date' },
                        { key: 'lab', label: 'Lab No.' },
                        { key: 'pt', label: 'Patient' },
                        { key: 'fc', label: 'Fac.' },
                        { key: 'mn', label: 'Mnem.' },
                        { key: 'cat', label: 'Category' },
                        { key: 'an', label: 'Analytes' },
                        { key: 'val', label: 'Values' },
                        { key: 'analyst', label: 'Analyst' },
                        { key: 'tc', label: 'TC' },
                        { key: 'lmqao', label: 'LM/QAO' },
                        { key: 'fun', label: 'FUN' },
                        { key: 'status', label: 'Status' },
                        { key: 'act', label: '', sticky: true },
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
                            No {sectionTab === 'queue' ? 'pending recall' : 'recalled FUN'} records for{' '}
                            {isToday ? 'today' : selectedDate}
                          </p>
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
                          <td className="px-3 py-2 align-top"><DateTimeCell raw={row.date_input} dense /></td>
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
                          <td className="px-3 py-2 align-top">
                            <PersonCell name={row.analyst} datetime={row.analyst_date} dense />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <PersonCell name={row.tc} datetime={row.tc_date} dense />
                          </td>
                          <td className="px-3 py-2 align-top min-w-0">
                            <LmQaCell qao={row.qao} qao_date={row.qao_date} dense />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <PersonCell name={row.fun} datetime={row.fun_date} dense />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <RecallStatusBadge status={row._recallStatus} />
                          </td>
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
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
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