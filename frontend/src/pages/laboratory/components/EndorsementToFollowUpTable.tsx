import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
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
  Paperclip,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  ExternalLink,
  Save,
} from 'lucide-react';
import { exportLogbookEndorsementsToExcel } from '../../../utils/excelExport';
import {
  useLogbookEndorsementList,
  useApproveLogbookTeamCaptain,
  useApproveLogbookLabQa,
  useUpdateLogbookEndorsement,
} from '../../../hooks/LaboratoryHooks/useLogbookEndorsement';
import { useAuth } from '../../../context/AuthContext';
import type { LogbookEndorsementRecord } from '../../../services/LaboratoryServices/logbookEndorsementServices';
import { LogbookModal } from './LogbookModal';
import PatientRecordModal, { type SampleRecord } from './PatientRecordModal';
import { parseLogbookAttachmentPaths } from './LogbookAttachmentsPanel';

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const TOOLTIP_OFFSET = { x: 12, y: -130 };

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
const toDateOnly = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
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

const toMySqlDateTimeOrNull = (raw?: string | null): string | null => {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }
  const normalized = s.replace('T', ' ').replace('Z', '');
  return normalized.slice(0, 19);
};

// ─── File type helpers ────────────────────────────────────────────────────────
const getFileExtension = (filename: string): string =>
  filename.split('.').pop()?.toLowerCase() ?? '';

const isImageFile = (filename: string): boolean =>
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(getFileExtension(filename));

const isPdfFile = (filename: string): boolean =>
  getFileExtension(filename) === 'pdf';

const getFileIcon = (filename: string) => {
  if (isImageFile(filename)) return ImageIcon;
  if (isPdfFile(filename)) return FileText;
  return File;
};

// ─── Attachment Viewer Modal ──────────────────────────────────────────────────
const AttachmentViewerModal: React.FC<{
  filePaths: string[];
  labno: string;
  onClose: () => void;
}> = ({ filePaths, labno, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedPath = filePaths[selectedIndex];
  const fileName = selectedPath?.split('/').pop() ?? '';

  const fileUrl = selectedPath?.startsWith('http')
  ? selectedPath
  : `http://localhost:5000/${selectedPath}`;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-6xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
        style={{ maxHeight: '100vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-viewer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <Paperclip className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 id="attachment-viewer-title" className="text-sm font-semibold text-gray-900 dark:text-white">
                Attachments
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{labno}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Sidebar: file list */}
          {filePaths.length > 1 && (
            <div className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
              <p className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
                {filePaths.length} file{filePaths.length !== 1 ? 's' : ''}
              </p>
              <ul className="pb-3 space-y-0.5 px-2">
                {filePaths.map((fp, idx) => {
                  const name = fp.split('/').pop() ?? fp;
                  const Icon = getFileIcon(name);
                  const isActive = idx === selectedIndex;
                  return (
                    <li key={fp}>
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs truncate">{name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Main preview area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* File name bar */}
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {(() => { const Icon = getFileIcon(fileName); return <Icon className="w-4 h-4 text-gray-400 shrink-0" />; })()}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{fileName}</span>
              </div>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={fileName}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </a>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4 min-h-0">
              {isImageFile(fileName) ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : isPdfFile(fileName) ? (
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0`}
                  title={fileName}
                  className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
                  style={{ minHeight: '600px' }}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  {(() => { const Icon = getFileIcon(fileName); return <Icon className="w-14 h-14 text-gray-300 dark:text-gray-600" />; })()}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Preview not available for this file type
                    </p>
                  </div>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={fileName}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>

            {/* Navigation arrows for multi-file */}
            {filePaths.length > 1 && (
              <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                  disabled={selectedIndex === 0}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous file"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400 tabular-nums">
                  {selectedIndex + 1} / {filePaths.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIndex((i) => Math.min(filePaths.length - 1, i + 1))}
                  disabled={selectedIndex === filePaths.length - 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next file"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
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
  pairedWith?: string[];
}> = ({ items, mono, dense, pairedWith }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const flatItems = items.flatMap((i) => i.split('|').map((s) => s.trim()).filter(Boolean));
  const flatPaired = pairedWith?.flatMap((i) => i.split('|').map((s) => s.trim()).filter(Boolean));

  if (flatItems.length === 0)
    return <span className={`${dense ? 'text-xs' : 'text-sm'} text-gray-400 dark:text-gray-500`}>—</span>;

  const preview = flatItems[0].length > 20 ? `${flatItems[0].slice(0, 20).trim()}…` : flatItems[0];
  const rest = flatItems.length - 1;

  return (
    <div
      ref={ref}
      className="relative min-w-0"
      onMouseEnter={(e) => {
        setTooltipPos({
          top: e.clientY + window.scrollY + TOOLTIP_OFFSET.y,
          left: e.clientX + window.scrollX + TOOLTIP_OFFSET.x,
        });
        setShowTooltip(true);
      }}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex flex-col gap-0.5 cursor-default">
        <span
          className={`${dense ? 'text-xs' : 'text-sm'} leading-snug text-gray-700 dark:text-gray-300 ${mono ? 'font-mono tabular-nums' : ''} block truncate max-w-full`}
        >
          {preview}
        </span>
        {rest > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 w-fit">
            +{rest} more
          </span>
        )}
      </div>

      {showTooltip && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2 min-w-[220px] max-w-[340px]"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left pb-1 px-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Analyte</th>
                {flatPaired && <th className="text-left pb-1 px-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Value</th>}
              </tr>
            </thead>
            <tbody>
              {flatItems.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-700/40'}>
                  <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{item}</td>
                  {flatPaired && (
                    <td className="px-2 py-1 font-mono text-gray-700 dark:text-gray-300">{flatPaired[i] ?? '—'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── Detail modal helpers ─────────────────────────────────────────────────────
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

const parseLmQaDisplay = (raw: string | null | undefined): { lm: string; qa: string } => {
  const s = (raw ?? '').trim();
  if (!s) return { lm: '', qa: '' };
  const i = s.indexOf('|');
  if (i === -1) return { lm: '', qa: s };
  return { lm: s.slice(0, i).trim(), qa: s.slice(i + 1).trim() };
};

const LmQaCell: React.FC<{ qao: string | null; qao_date: string | null; dense?: boolean }> = ({
  qao,
  qao_date,
  dense,
}) => {
  const { lm, qa } = parseLmQaDisplay(qao);
  const { date, time } = formatDateTimeParts(qao_date);
  const hasWhen = Boolean(qao_date?.trim());
  const whenLine =
    hasWhen && (date !== '—' || time)
      ? `${date !== '—' ? date : ''}${time ? ` ${time}` : ''}`
      : '';

  if (!lm && !qa && !hasWhen) {
    return <span className={`${dense ? 'text-xs' : 'text-sm'} text-gray-400 dark:text-gray-500`}>—</span>;
  }

  const nameCls = dense ? 'text-xs' : 'text-sm';
  const whenCls = dense ? 'text-[10px]' : 'text-xs';

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {lm && (
        <span className={`${nameCls} font-medium text-gray-900 dark:text-gray-100 truncate`} title={lm}>
          {lm}
        </span>
      )}
      {qa && (
        <span className={`${nameCls} font-medium text-gray-900 dark:text-gray-100 truncate`} title={qa}>
          {qa}
        </span>
      )}
      {whenLine && (
        <span className={`${whenCls} text-gray-500 dark:text-gray-400 whitespace-nowrap`}>{whenLine}</span>
      )}
    </div>
  );
};

const TEAM_CAPTAIN_POSITION = 'Team Captain';
const LAB_MANAGER_POSITION = 'Laboratory Manager';
const QAO_POSITION = 'Quality Assurance Officer';

// ─── View Details Modal ───────────────────────────────────────────────────────
const ViewDetailsModal: React.FC<{
  record: GroupedRecord;
  onClose: () => void;
  onViewPis: (record: GroupedRecord) => void;
  // ── Save changes (note + attachments only, independent of approve) ──
  onSaveChanges: (payload: {
    note: string;
    newFiles: File[];
    filesToKeep: string[];
    filesToDelete: string[];
  }) => void | Promise<void>;
  savePending: boolean;
  saveError: string | null;
  // ── User position (gates note/attachment editing) ──
  userPosition: string;
  // ── Approve actions ──
  showTeamCaptainApprove: boolean;
  onTeamCaptainApprove: (payload: {
    note: string;
    newFiles: File[];
    filesToKeep: string[];
    filesToDelete: string[];
  }) => void | Promise<void>;
  teamCaptainApprovePending: boolean;
  teamCaptainApproveError: string | null;
  showLabManagerApprove: boolean;
  showQaoApprove: boolean;
  onLabManagerApprove: (payload: {
    note: string;
    newFiles: File[];
    filesToKeep: string[];
    filesToDelete: string[];
  }) => void | Promise<void>;
  onQaoApprove: (payload: {
    note: string;
    newFiles: File[];
    filesToKeep: string[];
    filesToDelete: string[];
  }) => void | Promise<void>;
  labQaPending: boolean;
  labQaError: string | null;
}> = ({
  record,
  onClose,
  onViewPis,
  onSaveChanges,
  savePending,
  saveError,
  userPosition,
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

  // ── Note & attachment state (only used/shown for LM and QAO) ──
  const [editableNote, setEditableNote] = useState(record.note ?? '');
  const [existingFiles, setExistingFiles] = useState<string[]>(
    parseLogbookAttachmentPaths(record.attachment_path)
  );
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  // Only Lab Manager and QAO can edit notes and attachments
  const canEditNoteAndAttachments =
    userPosition === LAB_MANAGER_POSITION || userPosition === QAO_POSITION;

  const anyPending = savePending || teamCaptainApprovePending || labQaPending;

  const goPis = () => {
    if (!labTrim) return;
    onViewPis(record);
  };

  const buildEditPayload = () => ({
    note: editableNote,
    newFiles,
    filesToKeep: existingFiles,
    filesToDelete,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="endorsement-detail-title"
      >
        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 shrink-0 rounded-t-xl">
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

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 min-h-0">

          {/* ── Patient Information ── */}
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

          {/* ── Test Information ── */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded shrink-0" aria-hidden />
              Test Information
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Mnemonic" value={record.mnemonic} />
              <DetailRow label="Category" value={record.category} />
              <div className="col-span-2">
                <div className="bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-100 dark:border-gray-700/80 overflow-hidden">
                  <div className="px-3 pt-2.5 pb-1.5">
                    <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
                      Analytes &amp; Values ({Math.max(
                        record._analytesList.flatMap((a) => a.split('|')).length,
                        record._valuesList.flatMap((v) => v.split('|')).length
                      )})
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-t border-gray-100 dark:border-gray-700/80">
                      <thead>
                        <tr className="bg-gray-100/70 dark:bg-gray-700/40">
                          <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 w-1/2">
                            Analyte
                          </th>
                          <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 w-1/2">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {(() => {
                          const flatAnalytes = record._analytesList.flatMap((a) =>
                            a.split('|').map((s) => s.trim()).filter(Boolean)
                          );
                          const flatValues = record._valuesList.flatMap((v) =>
                            v.split('|').map((s) => s.trim()).filter(Boolean)
                          );
                          const rowCount = Math.max(flatAnalytes.length, flatValues.length);
                          return Array.from({ length: rowCount }).map((_, i) => (
                            <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/30'}>
                              <td className="px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 break-words">
                                {flatAnalytes[i] ?? '—'}
                              </td>
                              <td className="px-3 py-1.5 text-sm font-mono text-gray-700 dark:text-gray-300 break-words">
                                {flatValues[i] ?? '—'}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Personnel ── */}
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
                value={<LmQaCell qao={record.qao} qao_date={record.qao_date} />}
              />
              <DetailRow
                label="FUN"
                value={<PersonCell name={record.fun} datetime={record.fun_date} />}
              />
            </div>
          </div>

          {/* ── Last updated ── */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-gray-400 rounded shrink-0" aria-hidden />
              Last updated
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <DetailRow
                label="Date Modified"
                value={<DatePersonCell raw={record.date_modified} person={record.modified_by} />}
              />
            </div>
          </div>

          {/* ── Note & Attachments — LM and QAO only, at the bottom ── */}
          {canEditNoteAndAttachments && (
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-amber-500 rounded shrink-0" aria-hidden />
                Note &amp; Attachments
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  LM / QAO only
                </span>
              </h4>

              <div className="space-y-4">
                {/* Note textarea */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Note
                  </label>
                  <textarea
                    value={editableNote}
                    onChange={(e) => setEditableNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add or update endorsement note..."
                  />
                </div>

                {/* Current attachments */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Current attachments
                  </label>
                  {existingFiles.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">No current attachments</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {existingFiles.map((fp) => {
                        const fn = fp.split('/').pop() || fp;
                        const Icon = getFileIcon(fn);
                        return (
                          <li
                            key={fp}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{fn}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFilesToDelete((prev) => (prev.includes(fp) ? prev : [...prev, fp]));
                                setExistingFiles((prev) => prev.filter((x) => x !== fp));
                              }}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
                              aria-label={`Remove ${fn}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Add new attachments */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Add attachments
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-300 transition-colors">
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Choose files</span>
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        const incoming = Array.from(e.target.files || []);
                        if (!incoming.length) return;
                        setNewFiles((prev) => [...prev, ...incoming]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <span className="ml-2 text-[11px] text-gray-400">10 MB max each file</span>

                  {newFiles.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {newFiles.map((f, idx) => {
                        const Icon = getFileIcon(f.name);
                        return (
                          <li
                            key={`${f.name}-${idx}-${f.size}`}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{f.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
                              aria-label={`Remove ${f.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex flex-col gap-2 shrink-0 rounded-b-xl">
          {/* Error messages */}
          {saveError && (
            <p className="text-xs text-red-600 dark:text-red-400 text-right">{saveError}</p>
          )}
          {teamCaptainApproveError && (
            <p className="text-xs text-red-600 dark:text-red-400 text-right">{teamCaptainApproveError}</p>
          )}
          {labQaError && (
            <p className="text-xs text-red-600 dark:text-red-400 text-right">{labQaError}</p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {/* Save Changes — only visible to LM and QAO, independent of approve */}
            {canEditNoteAndAttachments && (
              <button
                type="button"
                onClick={() => void onSaveChanges(buildEditPayload())}
                disabled={anyPending}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4 shrink-0" />
                {savePending ? 'Saving…' : 'Save Changes'}
              </button>
            )}

            {/* Approve (TC) */}
            {showTeamCaptainApprove && (
              <button
                type="button"
                onClick={() => void onTeamCaptainApprove(buildEditPayload())}
                disabled={anyPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                {teamCaptainApprovePending ? 'Saving…' : 'Approve (TC)'}
              </button>
            )}

            {/* Approve (Lab Manager) */}
            {showLabManagerApprove && (
              <button
                type="button"
                onClick={() => void onLabManagerApprove(buildEditPayload())}
                disabled={anyPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                {labQaPending ? 'Saving…' : 'Approve (Lab Manager)'}
              </button>
            )}

            {/* Approve (QAO) */}
            {showQaoApprove && (
              <button
                type="button"
                onClick={() => void onQaoApprove(buildEditPayload())}
                disabled={anyPending}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                {labQaPending ? 'Saving…' : 'Approve (QAO)'}
              </button>
            )}

            {/* View PIS */}
            <button
              type="button"
              onClick={goPis}
              disabled={!labTrim}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              View PIS
            </button>

            {/* Close */}
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewRecord, setViewRecord] = useState<GroupedRecord | null>(null);
  const [pisRecord, setPisRecord] = useState<SampleRecord | null>(null);
  const [attachmentRecord, setAttachmentRecord] = useState<GroupedRecord | null>(null);
  const openedFocusIdRef = useRef<number | null>(null);

  const { user } = useAuth();
  const approveTeamCaptainMutation = useApproveLogbookTeamCaptain();
  const approveLabQaMutation = useApproveLogbookLabQa();
  const updateMutation = useUpdateLogbookEndorsement();
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
      const ax = err as { response?: { data?: { error?: string; message?: string } } };
      return ax.response?.data?.error || ax.response?.data?.message || null;
    }
    if (err instanceof Error) return err.message;
    return 'Approval failed.';
  })();

  const labQaErrorMessage = (() => {
    const err = approveLabQaMutation.error;
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const ax = err as { response?: { data?: { error?: string; message?: string } } };
      return ax.response?.data?.error || ax.response?.data?.message || null;
    }
    if (err instanceof Error) return err.message;
    return 'Approval failed.';
  })();

  const updateErrorMessage = (() => {
    const err = updateMutation.error;
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const ax = err as { response?: { data?: { error?: string; message?: string } } };
      return ax.response?.data?.error || ax.response?.data?.message || null;
    }
    if (err instanceof Error) return err.message;
    return 'Update failed.';
  })();

  const labQaPending = approveLabQaMutation.isPending;

  // ── Persist edits (note + attachments) ───────────────────────────────────
  const persistEdits = async (payload: {
    note: string;
    newFiles: File[];
    filesToKeep: string[];
    filesToDelete: string[];
  }) => {
    if (!viewRecord) return;
    await updateMutation.mutateAsync({
      id: viewRecord.id,
      category: viewRecord.category,
      mnemonic: viewRecord.mnemonic,
      analytes: viewRecord.analytes,
      values: viewRecord.values,
      tc: viewRecord.tc ?? undefined,
      tc_date: toMySqlDateTimeOrNull(viewRecord.tc_date),
      qao: viewRecord.qao ?? undefined,
      qao_date: toMySqlDateTimeOrNull(viewRecord.qao_date),
      fun: viewRecord.fun ?? undefined,
      fun_date: toMySqlDateTimeOrNull(viewRecord.fun_date),
      modified_by: user?.name || 'SYSTEM',
      note: payload.note.trim() ? payload.note.trim() : null,
      attachments: payload.newFiles,
      files_to_keep: JSON.stringify(payload.filesToKeep),
      files_to_delete: JSON.stringify(payload.filesToDelete),
    });
  };

  // ── Save Changes handler (no approval, just persists note/attachments) ──
  const handleSaveChanges = async (payload: {
    note: string;
    newFiles: File[];
    filesToKeep: string[];
    filesToDelete: string[];
  }) => {
    try {
      await persistEdits(payload);
      // Keep modal open after save so user can see the result
    } catch {
      // error surfaced via updateErrorMessage
    }
  };

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

  const resetPage = () => setPage(1);

  const filtered = useMemo(() => {
    const records = data?.data || [];
    const q = search.toLowerCase();

    const matched = records.filter((record) => {
      const recordDate = toDateOnly(record.date_input);
      if (recordDate !== selectedDate) return false;
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

  // Date | LabNo | Patient | Fac | Mnem | Cat | Analytes | Values | Analyst | TC | LM/QA | Note | Attachment | FUN | Actions
  const colCount = 15;

  const dateLabel = formatDisplayDate(selectedDate);
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <>
      {showAddModal && <LogbookModal onClose={() => setShowAddModal(false)} />}

      {viewRecord && (
        <ViewDetailsModal
          key={viewRecord.id}
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onViewPis={(r) => setPisRecord(sampleRecordFromEndorsement(r))}
          // ── Save Changes (independent, no approval) ──
          onSaveChanges={handleSaveChanges}
          savePending={updateMutation.isPending}
          saveError={updateErrorMessage}
          // ── User position gates note/attachment editing ──
          userPosition={userPosition}
          // ── Approve actions ──
          showTeamCaptainApprove={showTeamCaptainApproveInModal}
          onTeamCaptainApprove={async (payload) => {
            try {
              await persistEdits(payload);
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
          onLabManagerApprove={async (payload) => {
            try {
              await persistEdits(payload);
              await approveLabQaMutation.mutateAsync({ id: viewRecord.id, role: 'lab_manager' });
              setViewRecord(null);
            } catch { /* labQaErrorMessage */ }
          }}
          onQaoApprove={async (payload) => {
            try {
              await persistEdits(payload);
              await approveLabQaMutation.mutateAsync({ id: viewRecord.id, role: 'qao' });
              setViewRecord(null);
            } catch { /* labQaErrorMessage */ }
          }}
          labQaPending={labQaPending}
          labQaError={labQaErrorMessage}
        />
      )}

      {pisRecord && (
        <PatientRecordModal record={pisRecord} onClose={() => setPisRecord(null)} />
      )}

      {attachmentRecord && (
        <AttachmentViewerModal
          filePaths={parseLogbookAttachmentPaths(attachmentRecord.attachment_path)}
          labno={attachmentRecord.labno}
          onClose={() => setAttachmentRecord(null)}
        />
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col transition-colors">
        {/* ── Header bar ── */}
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800">
          {/* Active date banner */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 flex-1 min-w-0 truncate">
              {isToday ? `Today — ${dateLabel}` : dateLabel}
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 tabular-nums">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Title + controls row */}
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

        {/* ── Table ── */}
        <div className="px-4 pb-4 pt-1">
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full w-max text-xs relative leading-snug border-collapse">
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
                  <col className="w-[8.5rem]" />
                  <col className="w-[4.75rem]" />
                  <col className="w-[4.5rem]" />
                  <col className="w-[2.75rem]" />
                </colgroup>

                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    {(
                      [
                        { key: 'd',          label: 'Date' },
                        { key: 'lab',        label: 'Lab no.' },
                        { key: 'pt',         label: 'Patient' },
                        { key: 'fc',         label: 'Fac.' },
                        { key: 'mn',         label: 'Mnem.' },
                        { key: 'cat',        label: 'Category' },
                        { key: 'an',         label: 'Analytes' },
                        { key: 'val',        label: 'Values' },
                        { key: 'analyst',    label: 'Analyst' },
                        { key: 'tc',         label: 'TC' },
                        { key: 'qao',        label: 'LM / QA' },
                        { key: 'note',       label: 'Note' },
                        { key: 'attachment', label: 'Attachment' },
                        { key: 'fun',        label: 'FUN' },
                        { key: 'act',        label: 'Actions', sticky: true },
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

                      const attachmentPaths = parseLogbookAttachmentPaths(row.attachment_path);
                      const hasAttachments = attachmentPaths.length > 0;

                      return (
                        <tr key={row.id} className={`transition-colors group ${rowBg}`}>
                          {/* Date */}
                          <td className="px-3 py-2 align-top text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            <DateTimeCell raw={row.date_input} dense />
                          </td>
                          {/* Lab no */}
                          <td className="px-3 py-2 align-top">
                            <span className="block font-mono font-medium text-xs text-blue-600 dark:text-blue-400 truncate" title={row.labno}>
                              {row.labno}
                            </span>
                          </td>
                          {/* Patient */}
                          <td className="px-3 py-2 align-top">
                            <span className="block text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[9.75rem]" title={row.patient_name}>
                              {row.patient_name}
                            </span>
                          </td>
                          {/* Facility */}
                          <td className="px-3 py-2 align-top whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100/90 text-gray-800 dark:bg-gray-700/90 dark:text-gray-200 truncate max-w-full">
                              {row.facility_code}
                            </span>
                          </td>
                          {/* Mnemonic */}
                          <td className="px-3 py-2 align-top whitespace-nowrap">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100/90 text-blue-800 dark:bg-blue-900/35 dark:text-blue-300 truncate max-w-full border border-blue-200/60 dark:border-blue-800/40"
                              title={row.mnemonic}
                            >
                              {row.mnemonic}
                            </span>
                          </td>
                          {/* Category */}
                          <td className="px-3 py-2 align-top">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium truncate max-w-full border border-black/5 dark:border-white/10 ${CATEGORY_COLORS[row.category] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
                              title={row.category}
                            >
                              {row.category}
                            </span>
                          </td>
                          {/* Analytes */}
                          <td className="px-3 py-2 align-top min-w-0">
                            <AnalyteValueList items={row._analytesList} dense pairedWith={row._valuesList} />
                          </td>
                          {/* Values */}
                          <td className="px-3 py-2 align-top min-w-0">
                            <AnalyteValueList items={row._valuesList} mono dense />
                          </td>
                          {/* Analyst */}
                          <td className="px-3 py-2 align-top">
                            <PersonCell name={row.analyst} datetime={row.analyst_date} dense />
                          </td>
                          {/* TC */}
                          <td className="px-3 py-2 align-top">
                            <PersonCell name={row.tc} datetime={row.tc_date} dense />
                          </td>
                          {/* LM / QA */}
                          <td className="px-3 py-2 align-top">
                            <LmQaCell qao={row.qao} qao_date={row.qao_date} dense />
                          </td>
                          {/* Note */}
                          <td className="px-3 py-2 align-top min-w-0">
                            <span
                              className="block text-xs text-gray-700 dark:text-gray-300 truncate max-w-[10rem]"
                              title={row.note || ''}
                            >
                              {row.note?.trim() || '—'}
                            </span>
                          </td>
                          {/* Attachment */}
                          <td className="px-3 py-2 align-top whitespace-nowrap">
                            {hasAttachments ? (
                              <button
                                type="button"
                                onClick={() => setAttachmentRecord(row)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors cursor-pointer"
                                title={`View ${attachmentPaths.length} attachment(s)`}
                              >
                                <Paperclip className="w-3 h-3" />
                                {attachmentPaths.length}
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </td>
                          {/* FUN */}
                          <td className="px-3 py-2 align-top">
                            <PersonCell name={row.fun} datetime={row.fun_date} dense />
                          </td>

                          {/* Actions — sticky */}
                          <td
                            className={`sticky right-0 z-10 px-3 py-2 align-top border-l border-gray-200 dark:border-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[-2px_0_4px_rgba(0,0,0,0.2)] transition-colors ${stickyBg} group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50`}
                          >
                            <div className="flex items-center justify-center gap-0.5">
                              {hasAttachments && (
                                <button
                                  type="button"
                                  onClick={() => setAttachmentRecord(row)}
                                  className="inline-flex p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/25 rounded-lg transition-colors"
                                  title={`${attachmentPaths.length} attachment(s)`}
                                  aria-label="View attachments"
                                >
                                  <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                </button>
                              )}
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