import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ChevronDown, X, ChevronLeft, ChevronRight,
  User, ZoomIn, Image as ImageIcon, ClipboardList,
  Download, Mail, FileText, BookOpen, FlaskConical,
  Maximize2, Send, Calendar, Activity, Building2, Stethoscope,
} from 'lucide-react';
import {
  getPatientDetail,
  getPatientResults,
  getTestSequence,
  getPatientFilterCards,
  fetchPatientImage,
  getAuditTrail,
  getNotes,
  fetchPatientLetters,
  fetchLetterImage,
} from '../../../services/FollowupServices/pisServices';

// ═══════════════════════════════════════════════
// TYPES  (unchanged)
// ═══════════════════════════════════════════════

export interface SearchParams {
  lastName: string; firstName: string; patientNumber: string; formNumber: string;
  birthDate: string; collectionHospitalId: string; dateCollection: string; sex: string;
  labNumber: string; physicianId: string; dateReceived: string; outsideLab: string;
  contactLastName: string; contactFirstName: string; dateReported: string;
}

export interface SampleRecord {
  LABNO: string; LABID: string; LNAME: string; FNAME: string; SUBMID: string;
  BIRTHDT: string; BIRTHTM: string; DTCOLL: string; TMCOLL: string;
  DTRECV: string; TMRECV: string; DTRPTD: string; GESTAGE: string; AGECOLL: string; SEX: string;
}

interface FilterCardRow { LABNO: string; LNAME: string; FNAME: string; DTRPTD: string; }
interface TestSeqRow { LABNO: string; TESTSEQ: string | number; MNEMONIC: string; VALUE: string; RFLAG: string; ABBREV: string; }
interface ResultRow { ABBREV: string; VALUE: string; TESTCODE: string; EXPECTED: string; MNEMONIC: string; INSTRUCT: string; DISORDERRESULTTEXT: string; }

interface AuditRow {
  LABNO: string; TABLECOLUMN: string; OLDDATA: string; NEWDATA: string;
  AUDIT_DATE: string; AUDIT_USER: string; LASTMOD: string;
  USER_ID: number | null; FIRSTNAME: string | null; LASTNAME: string | null;
  FULL_NAME: string | null; SOURCE_TABLE: 'AUDIT_RESULTS' | 'AUDIT_SAMPLE';
}

interface NoteRow {
  LABNO:            string;
  NOTES:            string;
  LASTMOD:          string;
  USER_ID:          number | null;
  NOTEPRIORITY:     string | null;
  ERROR:            string | null;
  CREATE_DT:        string;
  CREATE_USER_ID:   number | null;
  STATUS:           string | null;
  NOTEID:           number | null;
  PHONECALL:        string | null;
  CREATETIME:       string | null;
  USER_FIRSTNAME:   string | null;
  USER_LASTNAME:    string | null;
  CREATE_FIRSTNAME: string | null;
  CREATE_LASTNAME:  string | null;
}

interface Props {
  onSearch: (params: SearchParams) => void;
  results: SampleRecord[];
  isLoading: boolean;
  totalCount: number;
  /** From route query e.g. `?labNumber=` — prefill search and load results */
  deeplinkLabNumber?: string | null;
}

// ═══════════════════════════════════════════════
// CONSTANTS  (unchanged)
// ═══════════════════════════════════════════════

const SEX_OPTIONS         = ['', '1', '2', 'A', 'M', 'F'];
const OUTSIDE_LAB_OPTIONS = ['', '1', '2', '3', '4', '5', '6'];
const PAGE_SIZE           = 50;

const EMPTY_PARAMS: SearchParams = {
  lastName: '', firstName: '', patientNumber: '', formNumber: '',
  birthDate: '', collectionHospitalId: '', dateCollection: '', sex: '',
  labNumber: '', physicianId: '', dateReceived: '', outsideLab: '',
  contactLastName: '', contactFirstName: '', dateReported: '',
};

// ═══════════════════════════════════════════════
// HELPERS  (unchanged)
// ═══════════════════════════════════════════════

const fmt12h = (time?: unknown): string => {
  const t = time != null ? String(time).trim() : '';
  if (!t) return '—';
  const digits = t.replace(/:/g, '');
  if (digits.length < 4) return t;
  const hh = parseInt(digits.slice(0, 2), 10);
  const mm = digits.slice(2, 4);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(h12).padStart(2, '0')}:${mm} ${period}`;
};

const sexLabel = (s: string): string => {
  switch (s?.toUpperCase()) {
    case '1': case 'M': return 'Male';
    case '2': case 'F': return 'Female';
    case 'A':           return 'Ambiguous';
    default:            return s || '—';
  }
};

const sexBadge = (s: string): { label: string; cls: string } => {
  switch (s?.toUpperCase()) {
    case '1': case 'M': return { label: 'Male',   cls: 'text-blue-600  bg-blue-50  border-blue-200  dark:text-blue-400  dark:bg-blue-900/30  dark:border-blue-700' };
    case '2': case 'F': return { label: 'Female', cls: 'text-pink-600  bg-pink-50  border-pink-200  dark:text-pink-400  dark:bg-pink-900/30  dark:border-pink-700' };
    case 'A':           return { label: 'Ambig.', cls: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-700' };
    default:            return { label: s || '—', cls: 'text-gray-500  bg-gray-50  border-gray-200  dark:text-gray-400  dark:bg-gray-800    dark:border-gray-700' };
  }
};

const val = (x?: unknown): string =>
  x != null && String(x).trim() !== '' ? String(x).trim() : '—';

const formatAge = (raw?: string): string => {
  if (!raw || raw === '—') return '—';
  const totalHours = parseFloat(raw);
  if (isNaN(totalHours) || totalHours < 0) return raw;
  const days  = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);
  if (days > 0 && hours > 0) return `${days} day(s) and ${hours} hour(s)`;
  if (days > 0)              return `${days} day(s)`;
  return `${hours} hour(s)`;
};

const pick = (detail?: unknown, row?: unknown): string =>
  val(detail) !== '—' ? val(detail) : val(row);

const formatDateTime = (date: string, time?: string): React.ReactNode => {
  if (!date || date === '—') return <span className="text-gray-300 dark:text-gray-600">—</span>;
  const t = fmt12h(time);
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-medium text-gray-800 dark:text-gray-200">{date}</span>
      {t && t !== '—' && <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{t}</span>}
    </div>
  );
};

const formatPatientName = (lname: string, fname: string): React.ReactNode => {
  if (!lname && !fname) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-semibold text-gray-900 dark:text-gray-100">{lname || '—'}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{fname || '—'}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════
// ── NEW: Demographics card components ──────────
// ═══════════════════════════════════════════════

/**
 * Collapsible card used in the Demographics left panel.
 * accent  = Tailwind border-l color class  e.g. "border-blue-400"
 * headerBg = Tailwind bg class             e.g. "bg-blue-50"
 */
const DemoCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  accent: string;
  headerBg: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}> = ({ title, icon, accent, headerBg, children, collapsible = false, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-3 border-l-4 ${accent}`}>
      <div
        className={`flex items-center justify-between px-3 py-2 ${headerBg} dark:bg-gray-800/60`}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ cursor: collapsible ? 'pointer' : 'default', userSelect: 'none' }}
      >
        <div className="flex items-center gap-2">
          <span className="opacity-60 text-gray-600 dark:text-gray-400">{icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">{title}</span>
        </div>
        {collapsible && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-gray-400 transition-transform ${open ? '' : '-rotate-180'}`}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      {open && <div className="bg-white dark:bg-gray-900">{children}</div>}
    </div>
  );
};

/** Single field row inside a DemoCard */
const DC: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  mono?: boolean;
}> = ({ label, value, valueColor = 'text-gray-800 dark:text-gray-200', bold = false, mono = false }) => (
  <div className="flex items-baseline gap-1 px-3 py-[3.5px] border-b border-gray-50 dark:border-gray-800 last:border-b-0">
    <span className="flex-shrink-0 w-[152px] text-[10.5px] text-gray-500 dark:text-gray-400 leading-tight">{label}</span>
    <span className={`text-[10.5px] leading-tight min-w-0 truncate ${valueColor} ${bold ? 'font-semibold' : ''} ${mono ? 'font-mono' : ''}`}>
      {value}
    </span>
  </div>
);

// ═══════════════════════════════════════════════
// MODAL ATOMS  (keep PanelBar for Results/TestSeq headers)
// ═══════════════════════════════════════════════

const PanelBar: React.FC<{ title: string }> = ({ title }) => (
  <div className="px-3 py-[5px] bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest flex-shrink-0 select-none">
    {title}
  </div>
);

const ABtn: React.FC<{
  icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium
      bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
      text-gray-700 dark:text-gray-300
      hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400
      hover:border-blue-300 dark:hover:border-blue-700
      transition-all duration-150
      disabled:opacity-40 disabled:cursor-not-allowed
      disabled:hover:bg-gray-50 disabled:hover:text-gray-700 disabled:hover:border-gray-200">
    {icon}{label}
  </button>
);

// ═══════════════════════════════════════════════
// EMAIL MODAL  (unchanged from original)
// ═══════════════════════════════════════════════

const EmailModal: React.FC<{
  detail: Record<string, any> | null;
  record: SampleRecord;
  includePatientInfo: boolean;
  onClose: () => void;
}> = ({ detail, record, includePatientInfo, onClose }) => {
  const d = detail;
  const facilityEmail = val(d?.EMAIL) !== '—' ? val(d?.EMAIL) : '';
  const [sendTo,  setSendTo]  = useState(facilityEmail);
  const [status,  setStatus]  = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const labno    = pick(d?.LABNO,   record.LABNO);
  const labid    = pick(d?.LABID,   record.LABID);
  const lname    = pick(d?.LNAME,   record.LNAME);
  const fname    = pick(d?.FNAME,   record.FNAME);
  const birthdt  = pick(d?.BIRTHDT, record.BIRTHDT);
  const birthtm  = fmt12h(d?.BIRTHTM  ?? record.BIRTHTM);
  const dtcoll   = pick(d?.DTCOLL,  record.DTCOLL);
  const tmcoll   = fmt12h(d?.TMCOLL   ?? record.TMCOLL);
  const dtrecv   = pick(d?.DTRECV,  record.DTRECV);
  const dtrptd   = pick(d?.DTRPTD,  record.DTRPTD);
  const gestage  = pick(d?.GESTAGE, record.GESTAGE);
  const agecoll  = pick(d?.AGECOLL, record.AGECOLL);
  const sex      = sexLabel(pick(d?.SEX, record.SEX));
  const spectype = val(d?.SPECTYPE);
  const milktype = val(d?.MILKTYPE);
  const birthwt  = d?.BIRTHWT ? `${val(d.BIRTHWT)} gms` : '—';
  const twin     = val(d?.TWIN);
  const transfus = val(d?.TRANSFUS);
  const dtxfus   = val(d?.DTXFUS);
  const clinstat = val(d?.CLINSTAT);
  const demcode  = val(d?.DEMCODE);
  const physid   = val(d?.PHYSID);
  const birthhosp     = val(d?.BIRTHHOSP);
  const birthhospname = val(d?.DESCR1);
  const providerid    = val(d?.PROVIDERID);
  const descr1        = val(d?.DESCR1);
  const street1       = val(d?.STREET1);
  const street2       = val(d?.STREET2);
  const city          = val(d?.CITY);
  const county        = val(d?.COUNTY);
  const phone         = val(d?.PHONE);
  const fax           = val(d?.FAX);
  const mobile        = val(d?.DESCR7);
  const emailAddr     = val(d?.EMAIL);
  const coord         = [d?.DESCR4, d?.DESCR5, d?.DESCR6].filter(Boolean).join(' ').trim() || '—';
  const releasedt     = val(d?.RELEASEDT);
  const initTech      = val(d?.INIT_TECH_NAME);
  const verTech       = val(d?.VER_TECH_NAME);
  const secondcpy     = val(d?.SECONDCOPY);
  const outlab        = val(d?.OUTLAB);
  const mailStatus    = (pick(d?.DTRPTD, record.DTRPTD) !== '—') ? 'MAILED' : 'UNMAILED';
  const disposition   = val(d?.DISPOSITION);
  const dispdate      = val(d?.DISPDATE);
  const closedBy      = val(d?.CLOSED_BY_NAME);
  const specimenAge   = d?.SPECIMEN_AGE_DAYS != null ? formatAge(String(d.SPECIMEN_AGE_DAYS * 24)) : formatAge(agecoll);

  const patientInfoLines: string[] = includePatientInfo ? [
    '', `Lab No: ${labno}`, `Form No: ${labid}`, `Last Name: ${lname}`, `First Name: ${fname}`,
    '', `Birth: ${birthdt} @ ${birthtm}`, `Collection: ${dtcoll} @ ${tmcoll}`,
    `Specimen Type: ${spectype}`, `Milk Type: ${milktype}`,
    '', `Sex: ${sex}`, `Birth Weight: ${birthwt}`, `Birth Order: ${twin}`,
    `Blood Transfused: ${transfus}`, `Transfused Date: ${dtxfus}`,
    `Gestation Age: ${gestage !== '—' ? `${gestage} Weeks` : '—'}`,
    `Specimen Age: ${specimenAge}`, `Age at Collection: ${formatAge(agecoll)}`,
    '', `Date Received: ${dtrecv}`, `Date Reported: ${dtrptd}`,
    `Clinical Status: ${clinstat}`, `Demog Acceptable: ${demcode}`,
    '', `Physician ID: ${physid}`, `Birth Hospital ID: ${birthhosp}`, `Birth Hospital Name: ${birthhospname}`,
    '', `Facility Code: ${providerid}`, `Facility Name: ${descr1}`,
    `Address 1: ${street1}`, `Address 2: ${street2}`, `City: ${city}`, `Province: ${county}`,
    `Phone: ${phone}`, `Fax: ${fax}`, `Mobile: ${mobile}`, `Email: ${emailAddr}`,
    '', `Coordinator: ${coord}`, `Demog Release: ${releasedt}`,
    `Initial Entry: ${initTech}`, `Verification Entry: ${verTech}`,
    `Second Copy Date: ${secondcpy}`, `Outside Lab: ${outlab}`,
    '', `Status: ${mailStatus}`,
    '', `Disposition: ${disposition}`, `Disposition Date: ${dispdate}`, `Closed By: ${closedBy}`,
  ] : [];

  const baseLines = ['Newborn Screening Center - Southern Luzon', 'Please see attachment for Filter Card Image'];
  const allLines  = [...baseLines, ...patientInfoLines];

  const handleSend = () => {
    if (!sendTo.trim()) { setStatus('Please enter a recipient email address.'); return; }
    setSending(true); setStatus('Sending…');
    const subject = encodeURIComponent(`Filter Card Image - Lab No: ${labno}`);
    const body    = encodeURIComponent(allLines.join('\n'));
    window.location.href = `mailto:${sendTo.trim()}?subject=${subject}&body=${body}`;
    setTimeout(() => { setSending(false); setStatus('Email client opened. Please verify and send from your mail app.'); }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ animation: 'pisIn .2s cubic-bezier(.34,1.56,.64,1)', width: '560px', maxWidth: '96vw', height: '600px' }}>
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><Mail size={13} className="text-white" /></div>
            <p className="text-sm font-bold text-white">Send Email of Filter Card Image</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={13} /></button>
        </div>
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
          <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Send To:</label>
          <input type="email" value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="recipient@email.com"
            className="flex-1 h-8 px-3 text-[12px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1 overflow-auto px-4 py-3">
          <div className="text-[12px] leading-relaxed text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap select-text">
            {allLines.map((line, i) => <div key={i} className={line === '' ? 'h-3' : ''}>{line}</div>)}
          </div>
        </div>
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status ? (
              <span className={`text-[11px] font-medium ${status.includes('opened') ? 'text-emerald-600 dark:text-emerald-400' : status.includes('Please enter') ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>{status}</span>
            ) : (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{includePatientInfo ? 'Patient info included' : 'Patient info not included'}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-7 px-3 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={handleSend} disabled={sending} className="h-7 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={11} />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// AUDIT TRAIL MODAL  (unchanged from original)
// ═══════════════════════════════════════════════

const AuditTrailModal: React.FC<{ labno: string; patientName: string; onClose: () => void }> = ({ labno, patientName, onClose }) => {
  const [audit,   setAudit]   = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState<'ALL' | 'AUDIT_RESULTS' | 'AUDIT_SAMPLE'>('ALL');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    if (!labno) return;
    setLoading(true);
    getAuditTrail(labno).then(res => setAudit(res.data ?? [])).catch(() => setAudit([])).finally(() => setLoading(false));
  }, [labno]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const filtered = audit.filter(row => {
    if (filter !== 'ALL' && row.SOURCE_TABLE !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (row.TABLECOLUMN || '').toLowerCase().includes(q) ||
             (row.OLDDATA     || '').toLowerCase().includes(q) ||
             (row.NEWDATA     || '').toLowerCase().includes(q) ||
             (row.FULL_NAME   || '').toLowerCase().includes(q) ||
             (row.AUDIT_USER  || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ animation: 'pisIn .2s cubic-bezier(.34,1.56,.64,1)', width: '1100px', maxWidth: '98vw', height: '80vh' }}>
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><ClipboardList size={15} className="text-white" /></div>
            <div>
              <p className="text-sm font-bold text-white">Audit Trail</p>
              <p className="text-[11px] text-slate-300">Lab No: <span className="font-mono font-semibold">{labno}</span><span className="mx-2 opacity-50">·</span>{patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={14} /></button>
        </div>
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-semibold">
            {([{ key: 'ALL', label: 'All' }, { key: 'AUDIT_RESULTS', label: 'Results' }, { key: 'AUDIT_SAMPLE', label: 'Sample' }] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1.5 transition-colors border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${filter === key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search column, value, user…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-8 pl-7 pr-3 text-[11px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="ml-auto text-[11px] text-gray-500 dark:text-gray-400">
            {loading ? 'Loading…' : <span><span className="font-semibold text-gray-700 dark:text-gray-200">{filtered.length}</span> record{filtered.length !== 1 ? 's' : ''}</span>}
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading audit trail…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <ClipboardList size={36} className="opacity-20" />
              <p className="text-sm">{audit.length === 0 ? 'No audit records found' : 'No records match filter'}</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {['Source','Column','Old Value','New Value','Name','Audit Date','Last Modified'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-800/40'}`}>
                    <td className="px-3 py-2 border-r border-gray-100 dark:border-gray-800 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.SOURCE_TABLE === 'AUDIT_RESULTS' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {row.SOURCE_TABLE === 'AUDIT_RESULTS' ? 'RESULTS' : 'SAMPLE'}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100 dark:border-gray-800 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200">{row.TABLECOLUMN || '—'}</td>
                    <td className="px-3 py-2 border-r border-gray-100 dark:border-gray-800 max-w-[160px]">
                      <span className="block truncate text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded font-mono">
                        {row.OLDDATA != null && row.OLDDATA !== '' ? row.OLDDATA : <span className="text-gray-300 italic">empty</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100 dark:border-gray-800 max-w-[160px]">
                      <span className="block truncate text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded font-mono">
                        {row.NEWDATA != null && row.NEWDATA !== '' ? row.NEWDATA : <span className="text-gray-300 italic">empty</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100 dark:border-gray-800 whitespace-nowrap">
                      {row.FULL_NAME ? (
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-gray-800 dark:text-gray-200 uppercase">{row.FULL_NAME}</span>
                          {row.AUDIT_USER && <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono uppercase">{row.AUDIT_USER}</span>}
                        </div>
                      ) : (
                        <span className="font-medium text-gray-500 dark:text-gray-400 uppercase">{row.AUDIT_USER || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100 dark:border-gray-800 whitespace-nowrap font-mono text-gray-500 dark:text-gray-400">{row.AUDIT_DATE || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-500 dark:text-gray-400">{row.LASTMOD || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">AUDIT_RESULTS + AUDIT_SAMPLE · ordered by AUDIT_DATE DESC</span>
          <button onClick={onClose} className="h-7 px-4 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// MAGNIFIER VIEWER  — FIXED: scrollable, full-width
// ═══════════════════════════════════════════════

const MagnifierViewer: React.FC<{ src: string; zoom: number; labno: string }> = ({ src, zoom, labno }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef  = useRef<HTMLImageElement>(null);
  const [hovering, setHovering] = useState(false);
  const [lensPos,  setLensPos]  = useState({ x: 0, y: 0 });
  const [bgPos,    setBgPos]    = useState({ x: 0, y: 0 });

  // Reset scroll to top-left whenever zoom changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop  = 0;
      containerRef.current.scrollLeft = 0;
    }
  }, [zoom]);

  const LENS_SIZE  = 120;
  const MAG_FACTOR = 3;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lx = Math.max(LENS_SIZE / 2, Math.min(x, rect.width  - LENS_SIZE / 2));
    const ly = Math.max(LENS_SIZE / 2, Math.min(y, rect.height - LENS_SIZE / 2));
    setLensPos({ x: lx - LENS_SIZE / 2, y: ly - LENS_SIZE / 2 });
    setBgPos({ x: -(lx * MAG_FACTOR - LENS_SIZE / 2), y: -(ly * MAG_FACTOR - LENS_SIZE / 2) });
  }, []);

  const isZoomed = zoom > 100;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        overflow: isZoomed ? 'auto' : 'hidden',
        display: isZoomed ? 'block' : 'flex',
        alignItems: isZoomed ? undefined : 'center',
        justifyContent: isZoomed ? undefined : 'center',
        cursor: hovering ? 'crosshair' : 'default',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={handleMouseMove}
    >
      <div style={{ padding: '12px', width: isZoomed ? `${zoom}%` : '100%', boxSizing: 'border-box', flexShrink: 0 }}>
        <div className="relative">
          <img
            ref={imgRef}
            src={src}
            alt={`Specimen scan for ${labno}`}
            draggable={false}
            style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
            className="rounded shadow-md"
          />

          {/* Magnifier lens */}
          {hovering && imgRef.current && (
            <div style={{
              position: 'absolute', left: `${lensPos.x}px`, top: `${lensPos.y}px`,
              width: `${LENS_SIZE}px`, height: `${LENS_SIZE}px`,
              borderRadius: '50%', border: '2px solid rgba(59,130,246,0.8)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.4), 0 4px 20px rgba(0,0,0,0.35)',
              backgroundImage: `url(${src})`, backgroundRepeat: 'no-repeat',
              backgroundSize: `${imgRef.current.getBoundingClientRect().width * MAG_FACTOR}px auto`,
              backgroundPosition: `${bgPos.x}px ${bgPos.y}px`,
              pointerEvents: 'none', zIndex: 10,
            }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: '1px', height: '100%', background: 'rgba(59,130,246,0.4)', position: 'absolute' }} />
                <div style={{ height: '1px', width: '100%', background: 'rgba(59,130,246,0.4)', position: 'absolute' }} />
              </div>
            </div>
          )}

          {/* Hover hint */}
          {!hovering && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium pointer-events-none select-none"
              style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}>
              <ZoomIn size={10} /> Hover to magnify
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// LETTERS MODAL  (unchanged from original)
// ═══════════════════════════════════════════════

const LettersModal: React.FC<{
  labno:       string;
  patientName: string;
  onClose:     () => void;
}> = ({ labno, patientName, onClose }) => {
  const [files,        setFiles]        = useState<string[]>([]);
  const [listLoading,  setListLoading]  = useState(true);
  const [listError,    setListError]    = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [imageUrls,    setImageUrls]    = useState<Record<string, string>>({});
  const [imgLoading,   setImgLoading]   = useState<Record<string, boolean>>({});
  const [zoom,         setZoom]         = useState(100);
  const [hovering,     setHovering]     = useState(false);
  const [lensPos,      setLensPos]      = useState({ x: 0, y: 0 });
  const [bgPos,        setBgPos]        = useState({ x: 0, y: 0 });
  const viewerImgRef = useRef<HTMLImageElement>(null);

  const LENS_SIZE  = 130;
  const MAG_FACTOR = 3;

  useEffect(() => {
    if (!labno) return;
    setListLoading(true); setListError(null); setFiles([]);
    fetchPatientLetters(labno)
      .then(res => {
        const f = res.files ?? [];
        setFiles(f);
        if (f.length > 0) setSelectedFile(f[0]);
      })
      .catch(err => {
        setListError(err?.message === 'NOT_FOUND' ? 'No letters found for this record.' : 'Failed to load letters list.');
      })
      .finally(() => setListLoading(false));
  }, [labno]);

  const loadImage = useCallback((file: string) => {
    if (imageUrls[file] !== undefined) return;
    setImgLoading(prev => ({ ...prev, [file]: true }));
    fetchLetterImage(labno, file)
      .then(url  => setImageUrls(prev => ({ ...prev, [file]: url })))
      .catch(()  => setImageUrls(prev => ({ ...prev, [file]: '' })))
      .finally(() => setImgLoading(prev => ({ ...prev, [file]: false })));
  }, [labno, imageUrls]);

  useEffect(() => { files.forEach(file => loadImage(file)); }, [files]);
  useEffect(() => { if (selectedFile) loadImage(selectedFile); }, [selectedFile]);
  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach(url => { if (url) URL.revokeObjectURL(url); });
    };
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const img = viewerImgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lx = Math.max(LENS_SIZE / 2, Math.min(x, rect.width  - LENS_SIZE / 2));
    const ly = Math.max(LENS_SIZE / 2, Math.min(y, rect.height - LENS_SIZE / 2));
    setLensPos({ x: lx - LENS_SIZE / 2, y: ly - LENS_SIZE / 2 });
    setBgPos({ x: -(lx * MAG_FACTOR - LENS_SIZE / 2), y: -(ly * MAG_FACTOR - LENS_SIZE / 2) });
  }, []);

  const selectedUrl  = selectedFile ? (imageUrls[selectedFile] ?? null) : null;
  const isImgLoading = selectedFile ? (imgLoading[selectedFile] ?? false) : false;

  const handleDownload = () => {
    if (!selectedUrl || !selectedFile) return;
    const a = document.createElement('a');
    a.href = selectedUrl; a.download = selectedFile;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const parseFileTime = (filename: string): string => {
    const parts = filename.replace(/\.[^.]+$/, '').split('_');
    if (parts.length >= 3) {
      const raw  = parts[parts.length - 1];
      const ampm = raw.slice(-2);
      const digs = raw.slice(0, -2);
      if (digs.length === 6) return `${digs.slice(0,2)}:${digs.slice(2,4)}:${digs.slice(4,6)} ${ampm}`;
    }
    return filename;
  };

  return (
    <div className="fixed inset-0 z-[25000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ animation: 'pisIn .2s cubic-bezier(.34,1.56,.64,1)', width: '1150px', maxWidth: '98vw', height: '88vh' }}>
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><BookOpen size={15} className="text-white" /></div>
            <div>
              <p className="text-sm font-bold text-white">Letters</p>
              <p className="text-[11px] text-emerald-200">Lab No: <span className="font-mono font-semibold">{labno}</span><span className="mx-2 opacity-50">·</span>{patientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!listLoading && !listError && files.length > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">{files.length} letter{files.length !== 1 ? 's' : ''}</span>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={14} /></button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col overflow-y-auto" style={{ width: '185px' }}>
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 sticky top-0 bg-gray-50 dark:bg-gray-800/50 z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Documents</p>
            </div>
            {listLoading ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px]">Loading…</p>
              </div>
            ) : listError ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400 px-3 text-center">
                <BookOpen size={28} className="opacity-20" />
                <p className="text-[11px]">{listError}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {files.map((file, i) => {
                  const isSelected   = file === selectedFile;
                  const thumbUrl     = imageUrls[file];
                  const thumbLoading = imgLoading[file] ?? false;
                  const timeLabel    = parseFileTime(file);
                  return (
                    <button key={file} onClick={() => { setSelectedFile(file); setZoom(100); }}
                      className={`w-full text-left p-2.5 transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/30 border-l-2 border-emerald-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 border-l-2 border-transparent'}`}>
                      <div className="w-full rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 mb-1.5 flex items-center justify-center" style={{ height: '115px' }}>
                        {thumbLoading ? <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          : thumbUrl ? <img src={thumbUrl} alt={`Letter ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
                            : <BookOpen size={24} className="text-gray-400 opacity-40" />}
                      </div>
                      <p className={`text-[10px] font-bold leading-tight text-center truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-400'}`}>Letter {i + 1}</p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center font-mono leading-tight mt-0.5 truncate">{timeLabel}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {!listLoading && !listError && files.length > 0 && (
              <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors text-base">−</button>
                  <button onClick={() => setZoom(100)} className="w-12 text-center text-[12px] font-mono font-bold text-gray-700 dark:text-gray-200 tabular-nums hover:text-blue-600 transition-colors">{zoom}%</button>
                  <button onClick={() => setZoom(z => Math.min(600, z + 25))} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors text-base">+</button>
                </div>
                {[50, 100, 125, 150, 175, 200].map(pct => (
                  <button key={pct} onClick={() => setZoom(pct)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-colors ${zoom === pct ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'}`}>{pct}%</button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => { if (selectedUrl) window.open(selectedUrl, '_blank'); }} disabled={!selectedUrl}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                    <Maximize2 size={11} /> Full View
                  </button>
                  <button onClick={handleDownload} disabled={!selectedUrl}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                    <Download size={11} /> Download
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 bg-gray-200 dark:bg-gray-800 overflow-auto flex items-start justify-center relative"
              onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} onMouseMove={handleMouseMove}
              style={{ cursor: hovering && !!selectedUrl ? 'crosshair' : 'default' }}>
              {listLoading ? (
                <div className="flex flex-col items-center justify-center h-full w-full gap-3 text-gray-400">
                  <div className="w-9 h-9 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedUrl ? (
                <div className="p-4 relative inline-block" style={{ width: `${zoom}%`, minWidth: '200px', flexShrink: 0 }}>
                  <img ref={viewerImgRef} src={selectedUrl} alt={selectedFile ?? 'Letter'} draggable={false}
                    style={{ width: '100%', height: 'auto', maxWidth: 'none', display: 'block', userSelect: 'none' }}
                    className="rounded shadow-lg" />
                  {hovering && viewerImgRef.current && (
                    <div style={{ position: 'absolute', left: `${lensPos.x + 16}px`, top: `${lensPos.y + 16}px`, width: `${LENS_SIZE}px`, height: `${LENS_SIZE}px`, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.8)', boxShadow: '0 0 0 1px rgba(255,255,255,0.4), 0 4px 20px rgba(0,0,0,0.35)', backgroundImage: `url(${selectedUrl})`, backgroundRepeat: 'no-repeat', backgroundSize: `${viewerImgRef.current.getBoundingClientRect().width * MAG_FACTOR}px auto`, backgroundPosition: `${bgPos.x}px ${bgPos.y}px`, pointerEvents: 'none', zIndex: 10 }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ width: '1px', height: '100%', background: 'rgba(16,185,129,0.4)', position: 'absolute' }} />
                        <div style={{ height: '1px', width: '100%', background: 'rgba(16,185,129,0.4)', position: 'absolute' }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full gap-2 text-gray-400 select-none">
                  <BookOpen size={52} className="opacity-20" />
                  <p className="text-xs font-medium opacity-60">{listError ?? 'Select a letter'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 px-5 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">Lab No: <span className="font-mono text-gray-600 dark:text-gray-300">{labno}</span></span>
          <button onClick={onClose} className="h-7 px-4 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// PATIENT RECORD MODAL  ← THIS IS WHAT WAS REDESIGNED
// ═══════════════════════════════════════════════

const PatientRecordModal: React.FC<{ record: SampleRecord | null; onClose: () => void }> = ({ record, onClose }) => {
  const [zoom,       setZoom]       = useState(100);   // ← default 100 (was 300)
  const [detail,     setDetail]     = useState<Record<string, any> | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [results,    setResults]    = useState<ResultRow[]>([]);
  const [resLoading,     setResLoading]     = useState(false);
  const [testSeq,        setTestSeq]        = useState<TestSeqRow[]>([]);
  const [testSeqLoading, setTestSeqLoading] = useState(false);
  const [selectedRow,    setSelectedRow]    = useState<number | null>(null);
  const [filterCards,   setFilterCards]   = useState<FilterCardRow[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [activeLabno,   setActiveLabno]   = useState<string>('');
  const [activeRecord,  setActiveRecord]  = useState<SampleRecord | null>(null);
  const [showAudit,          setShowAudit]          = useState(false);
  const [includePatientInfo, setIncludePatientInfo] = useState(false);
  const [showEmail,          setShowEmail]          = useState(false);
  const [showLetters,        setShowLetters]        = useState(false);
  const [showNotes,    setShowNotes]    = useState(false);
  const [notes,        setNotes]        = useState<NoteRow[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesFetched, setNotesFetched] = useState(false);
  const [imageUrl,     setImageUrl]     = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError,   setImageError]   = useState<'not_found' | 'error' | null>(null);

  const currentRecord = activeRecord ?? record;
  const currentLabno  = activeRecord?.LABNO ?? record?.LABNO ?? '';

  useEffect(() => {
    if (!currentLabno) return;
    setDetail(null); setError(null); setLoading(true); setTestSeq([]); setSelectedRow(null);
    getPatientDetail(currentLabno)
      .then(res => { const rows = res.data?.[currentLabno]; if (rows?.length > 0) setDetail(rows[0]); else setError('No detail record found.'); })
      .catch(() => setError('Failed to load patient detail.'))
      .finally(() => setLoading(false));
  }, [currentLabno]);

  useEffect(() => {
    if (!currentLabno) return;
    setResults([]); setResLoading(true);
    getPatientResults(currentLabno).then(res => setResults(res.data ?? [])).catch(() => setResults([])).finally(() => setResLoading(false));
  }, [currentLabno]);

  useEffect(() => {
    if (!record?.FNAME || !record?.LNAME) return;
    setFilterCards([]); setFilterLoading(true); setActiveLabno(record?.LABNO ?? '');
    getPatientFilterCards(record.FNAME, record.LNAME).then(res => setFilterCards(res.data ?? [])).catch(() => setFilterCards([])).finally(() => setFilterLoading(false));
  }, [record?.LABNO, record?.FNAME, record?.LNAME]);

  useEffect(() => {
    if (!currentLabno) return;
    setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setImageError(null); setImageLoading(true); setZoom(100);
    fetchPatientImage(currentLabno)
      .then(url => { setImageUrl(url); setImageError(null); })
      .catch(err => { setImageError(err?.message === 'NOT_FOUND' ? 'not_found' : 'error'); setImageUrl(null); })
      .finally(() => setImageLoading(false));
    return () => { setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); };
  }, [currentLabno]);

  useEffect(() => { setNotes([]); setNotesFetched(false); }, [currentLabno]);

  useEffect(() => {
    if (!showNotes || !currentLabno || notesFetched) return;
    setNotesLoading(true);
    getNotes(currentLabno).then(res => setNotes(res.data ?? [])).catch(() => setNotes([])).finally(() => { setNotesLoading(false); setNotesFetched(true); });
  }, [showNotes, currentLabno, notesFetched]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAudit)   { setShowAudit(false);   return; }
        if (showEmail)   { setShowEmail(false);    return; }
        if (showNotes)   { setShowNotes(false);    return; }
        if (showLetters) { setShowLetters(false);  return; }
        onClose();
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose, showAudit, showEmail, showNotes, showLetters]);

  if (!record) return null;
  if (!currentRecord) return null;

  const handleResultClick = (abbrev: string, rowIndex: number) => {
    if (selectedRow === rowIndex) { setSelectedRow(null); setTestSeq([]); return; }
    setSelectedRow(rowIndex); setTestSeqLoading(true); setTestSeq([]);
    getTestSequence(currentLabno)
      .then(res => { const filtered = res.data.filter(r => r.ABBREV === abbrev); setTestSeq(filtered.length > 0 ? filtered : res.data); })
      .catch(() => setTestSeq([]))
      .finally(() => setTestSeqLoading(false));
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl; a.download = `specimen_${currentLabno}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleFullImage = () => { if (imageUrl) window.open(imageUrl, '_blank'); };
  const zoomIn    = () => setZoom(z => Math.min(600, z + 25));
  const zoomOut   = () => setZoom(z => Math.max(25,  z - 25));
  const zoomReset = () => setZoom(100);

  const d = detail;

  const labno    = pick(d?.LABNO,   record.LABNO);
  const labid    = pick(d?.LABID,   record.LABID);
  const lname    = pick(d?.LNAME,   record.LNAME);
  const fname    = pick(d?.FNAME,   record.FNAME);
  const birthdt  = pick(d?.BIRTHDT, record.BIRTHDT);
  const birthtm  = fmt12h(d?.BIRTHTM  ?? record.BIRTHTM);
  const dtcoll   = pick(d?.DTCOLL,  record.DTCOLL);
  const tmcoll   = fmt12h(d?.TMCOLL   ?? record.TMCOLL);
  const dtrecv   = pick(d?.DTRECV,  record.DTRECV);
  const tmrecv   = fmt12h(d?.TMRECV   ?? record.TMRECV);
  const dtrptd   = pick(d?.DTRPTD,  record.DTRPTD);
  const gestage  = pick(d?.GESTAGE, record.GESTAGE);
  const agecoll  = pick(d?.AGECOLL, record.AGECOLL);
  const sex      = sexLabel(pick(d?.SEX, record.SEX));
  const status   = dtrptd !== '—' ? 'MAILED' : 'UNMAILED';
  const fullName = `${lname}, ${fname}`;
  const hasImage = !!imageUrl;

  const spectype    = val(d?.SPECTYPE);
  const milktype    = val(d?.MILKTYPE);
  const birthwt     = d?.BIRTHWT ? `${val(d.BIRTHWT)} gms` : '—';
  const twin        = val(d?.TWIN);
  const transfus    = val(d?.TRANSFUS);
  const dtxfus      = val(d?.DTXFUS);
  const clinstat    = val(d?.CLINSTAT);
  const demcode     = val(d?.DEMCODE);
  const physid      = val(d?.PHYSID);
  const birthhosp   = val(d?.BIRTHHOSP);
  const releasedt   = val(d?.RELEASEDT);
  const initTech    = val(d?.INIT_TECH_NAME);
  const verTech     = val(d?.VER_TECH_NAME);
  const providerid  = val(d?.PROVIDERID);
  const descr1      = val(d?.DESCR1);
  const street1     = val(d?.STREET1);
  const street2     = val(d?.STREET2);
  const city        = val(d?.CITY);
  const county      = val(d?.COUNTY);
  const phone       = val(d?.PHONE);
  const fax         = val(d?.FAX);
  const mobile      = val(d?.DESCR7);
  const email       = val(d?.EMAIL);
  const coord       = [d?.DESCR4, d?.DESCR5, d?.DESCR6].filter(Boolean).join(' ').trim() || '—';
  const specimenAge = d?.SPECIMEN_AGE_DAYS != null ? formatAge(String(d.SPECIMEN_AGE_DAYS * 24)) : formatAge(agecoll);
  const disposition = val(d?.DISPOSITION);
  const dispdate    = val(d?.DISPDATE);
  const closedBy    = val(d?.CLOSED_BY_NAME);

  return (
    <>
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-gray-50 dark:bg-gray-950 rounded-xl shadow-2xl overflow-hidden border border-blue-200 dark:border-blue-900/60"
        style={{ animation: 'pisIn .22s cubic-bezier(.34,1.56,.64,1)', width: '98vw', maxWidth: '1600px', height: '95vh' }}>

        {/* ─── HEADER ─── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><User size={18} className="text-white" /></div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Patient Information</p>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Lab No:&nbsp;<span className="font-mono font-semibold">{labno}</span>
                <span className="mx-2 opacity-50">·</span>{fullName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={14} /></button>
        </div>

        {/* ─── BODY ─── */}
        {/* gap-2 + p-2 gives visible spacing between all 3 sections */}
        <div className="flex flex-1 overflow-hidden min-h-0 gap-2 p-2" style={{ background: '#e2e8f0' }}>

          {/* ══ LEFT: Demographics — NEW card-based layout ══ */}
          <div className="flex-shrink-0 flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
            style={{ width: '410px', background: '#f8fafc' }}>

            {/* Subheader */}
            <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Demographics</span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-3 py-3">

                {/* Card 1: Identity */}
                <DemoCard title="Identity" icon={<User size={12} />} accent="border-blue-400" headerBg="bg-blue-50">
                  <DC label="Lab No"     value={labno}  valueColor="text-blue-700 dark:text-blue-400" bold mono />
                  <DC label="Form No"    value={labid}  mono />
                  <DC label="Last Name"  value={lname}  bold />
                  <DC label="First Name" value={fname} />
                  <DC label="Sex"        value={sex} />
                </DemoCard>

                {/* Card 2: Specimen & Collection */}
                <DemoCard title="Specimen & Collection" icon={<Calendar size={12} />} accent="border-indigo-400" headerBg="bg-indigo-50">
                  <DC label="Birth"          value={`${birthdt} @ ${birthtm}`} />
                  <DC label="Collection"     value={`${dtcoll} @ ${tmcoll}`} />
                  <DC label="Specimen Type"  value={spectype} />
                  <DC label="Milk Type"      value={milktype} />
                  <DC label="Date Received"  value={tmrecv !== '—' ? `${dtrecv} @ ${tmrecv}` : dtrecv} />
                  <DC label="Date Reported"  value={dtrptd} />
                </DemoCard>

                {/* Card 3: Clinical Info */}
                <DemoCard title="Clinical Info" icon={<Activity size={12} />} accent="border-violet-400" headerBg="bg-violet-50">
                  <DC label="Birth Weight"      value={birthwt} />
                  <DC label="Birth Order"       value={twin} />
                  <DC label="Blood Transfused"  value={transfus} />
                  <DC label="Transfused Date"   value={dtxfus} />
                  <DC label="Gestation Age"     value={gestage !== '—' ? `${gestage} Weeks` : '—'} />
                  <DC label="Specimen Age"      value={specimenAge} />
                  <DC label="Age at Collection" value={formatAge(agecoll)} />
                  <DC label="Clinical Status"   value={clinstat} />
                  <DC label="Demog Acceptable"  value={demcode} />
                </DemoCard>

                {/* Card 4: Provider & Facility (collapsible) */}
                <DemoCard title="Provider & Facility" icon={<Building2 size={12} />} accent="border-emerald-400" headerBg="bg-emerald-50" collapsible>
                  <DC label="Physician ID"        value={physid} valueColor="text-emerald-700 dark:text-emerald-400" bold />
                  <DC label="Birth Hospital ID"   value={birthhosp} />
                  <DC label="Birth Hospital Name" value={descr1} valueColor="text-emerald-700 dark:text-emerald-400" />
                  <DC label="Facility Code"       value={providerid} />
                  <DC label="Facility Name"       value={descr1} />
                  <DC label="Address 1"           value={street1} />
                  <DC label="Address 2"           value={street2} />
                  <DC label="City"                value={city} />
                  <DC label="Province"            value={county} />
                  <DC label="Phone"               value={phone} />
                  <DC label="Fax"                 value={fax} />
                  <DC label="Mobile"              value={mobile} />
                  <DC label="Email"               value={email} />
                </DemoCard>

                {/* Card 5: Processing & Status (collapsible) */}
                <DemoCard title="Processing & Status" icon={<Stethoscope size={12} />} accent="border-sky-400" headerBg="bg-sky-50" collapsible>
                  <DC label="Coordinator"        value={coord} valueColor="text-emerald-700 dark:text-emerald-400" bold />
                  <DC label="Demog Release"      value={releasedt} valueColor="text-blue-700 dark:text-blue-400" />
                  <DC label="Initial Entry"      value={initTech} valueColor="text-emerald-700 dark:text-emerald-400" />
                  <DC label="Verification Entry" value={verTech} />
                  <DC label="Second Copy Date"   value={val(d?.SECONDCOPY)} />
                  <DC label="Outside Lab"        value={val(d?.OUTLAB)} />
                  <DC label="Status"             value={status}
                    valueColor={status === 'MAILED' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
                    bold />
                </DemoCard>

                {/* Card 6: Disposition (only shown when data exists) */}
                {(disposition !== '—' || dispdate !== '—' || closedBy !== '—') && (
                  <DemoCard title="Disposition" icon={<X size={12} />} accent="border-orange-400" headerBg="bg-orange-50">
                    <DC label="Disposition"      value={disposition} valueColor="text-orange-700 dark:text-orange-400" bold />
                    <DC label="Disposition Date" value={dispdate}    valueColor="text-orange-700 dark:text-orange-400" />
                    <DC label="Closed By"        value={closedBy} />
                  </DemoCard>
                )}

              </div>
            )}
          </div>

          {/* ══ RIGHT PANEL ══ */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 gap-2">

            {/* TOP: Results/Mailers + Test Sequence — card */}
            <div className="flex flex-shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900" style={{ height: '260px' }}>

              {/* Results / Mailers */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <PanelBar title="Results / Mailers" />
                <div className="overflow-auto flex-1">
                  <table className="border-collapse" style={{ minWidth: '860px', width: '100%' }}>
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        {['TEST','CODE','MNEMONIC','VALUE','RESULT','TEXT','REFERENCE RANGE','INSTRUCT'].map(h => (
                          <th key={h} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-700 whitespace-nowrap last:border-r-0">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resLoading ? (
                        <tr><td colSpan={8} className="py-8 text-center" style={{ fontSize: '11px' }}>
                          <div className="flex items-center justify-center gap-2 text-gray-400">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading results…
                          </div>
                        </td></tr>
                      ) : results.length === 0 ? (
                        <tr><td colSpan={8} className="py-8 text-center text-gray-300 dark:text-gray-600" style={{ fontSize: '11px' }}>No results found</td></tr>
                      ) : results.map((row, i) => {
                        const resultText = (row.DISORDERRESULTTEXT || '').toLowerCase();
                        const isNormal = resultText.includes('normal') || resultText === '' || resultText === '—';
                        const rowBg = isNormal ? (i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/70 dark:bg-gray-800/50') : 'bg-red-50 dark:bg-red-900/20';
                        return (
                          <tr key={i} onClick={() => handleResultClick(row.ABBREV, i)}
                            className={`border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/70 dark:hover:bg-blue-900/20 transition-colors cursor-pointer ${selectedRow === i ? 'ring-2 ring-inset ring-blue-400' : ''} ${rowBg}`}>
                            <td className={`px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap border-r border-gray-100 dark:border-gray-800 ${isNormal ? 'text-gray-800 dark:text-gray-100' : 'text-red-700 dark:text-red-300'}`}>{row.ABBREV || '—'}</td>
                            <td className="px-2 py-[3px] text-[11px] font-mono text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800">{row.TESTCODE || '—'}</td>
                            <td className="px-2 py-[3px] text-[11px] text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800">{row.MNEMONIC || '—'}</td>
                            <td className={`px-2 py-[3px] text-[11px] font-semibold tabular-nums border-r border-gray-100 dark:border-gray-800 ${isNormal ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{row.VALUE || '—'}</td>
                            <td className="px-2 py-[3px] border-r border-gray-100 dark:border-gray-800">
                              {isNormal ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Normal</span>
                                        : <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Abnormal</span>}
                            </td>
                            <td className={`px-2 py-[3px] text-[11px] whitespace-nowrap border-r border-gray-100 dark:border-gray-800 ${isNormal ? 'text-gray-500 dark:text-gray-400' : 'text-red-600 dark:text-red-400 font-medium'}`}>{row.DISORDERRESULTTEXT || '—'}</td>
                            <td className="px-2 py-[3px] text-[11px] text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap border-r border-gray-100 dark:border-gray-800">{row.EXPECTED || '—'}</td>
                            <td className="px-2 py-[3px] text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{row.INSTRUCT || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Test Sequence / Analytes */}
              <div className="flex-shrink-0 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden rounded-r-xl" style={{ width: '220px' }}>
                <PanelBar title={selectedRow !== null && results[selectedRow] ? `Test Seq: ${results[selectedRow].ABBREV}` : "Test Sequence / Analytes"} />
                <div className="overflow-auto flex-1">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                      <tr>
                        {['SEQ','MNC','RFLAG','VALUE'].map(h => (
                          <th key={h} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-700 last:border-r-0 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {testSeqLoading ? (
                        <tr><td colSpan={4} className="px-2 py-8 text-center" style={{ fontSize: '10px' }}>
                          <div className="flex items-center justify-center gap-1.5 text-gray-400">
                            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading…
                          </div>
                        </td></tr>
                      ) : testSeq.length === 0 ? (
                        <tr><td colSpan={4} className="px-2 py-8 text-center text-[10px] text-gray-300 dark:text-gray-600">
                          {selectedRow !== null ? 'No sequence data' : 'Click a result row'}
                        </td></tr>
                      ) : testSeq.map((s, i) => {
                        const isAbnormal = s.RFLAG && s.RFLAG.trim() !== '';
                        return (
                          <tr key={i} className={`border-b border-gray-100 dark:border-gray-800 ${isAbnormal ? 'bg-red-50 dark:bg-red-900/20' : i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                            <td className="px-2 py-[3px] text-[10px] font-mono text-gray-600 dark:text-gray-400 border-r border-gray-100">{s.TESTSEQ || '—'}</td>
                            <td className="px-2 py-[3px] text-[10px] text-gray-600 dark:text-gray-400 border-r border-gray-100 truncate max-w-[60px]">{s.MNEMONIC || '—'}</td>
                            <td className="px-2 py-[3px] text-[10px] border-r border-gray-100">
                              {isAbnormal ? <span className="text-red-600 dark:text-red-400 font-bold">{s.RFLAG}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className={`px-2 py-[3px] text-[10px] font-semibold tabular-nums ${isAbnormal ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>{s.VALUE || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* BOTTOM: Specimen image + Right sidebar — card */}
            <div className="flex flex-1 overflow-hidden min-h-0 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">

              {/* ── Image viewer + Notes panel ── */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* Image toolbar — shown only when notes panel is hidden */}
                {!showNotes && (
                  <div className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mr-1">Specimen Image</span>
                    {/* Zoom controls */}
                    <div className="flex items-center gap-1">
                      <button onClick={zoomOut} disabled={!hasImage}
                        className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-40 text-sm">−</button>
                      <button onClick={zoomReset} disabled={!hasImage}
                        className="w-12 text-center text-[11px] font-mono font-bold text-gray-700 dark:text-gray-200 tabular-nums hover:text-blue-600 transition-colors disabled:opacity-40">
                        {zoom}%
                      </button>
                      <button onClick={zoomIn} disabled={!hasImage}
                        className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-40 text-sm">+</button>
                    </div>
                    {hasImage && (
                      <div className="flex gap-1">
                        {[50, 100, 125, 150, 175, 200].map(pct => (
                          <button key={pct} onClick={() => setZoom(pct)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-colors ${zoom === pct ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'}`}>
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-1.5">
                      {imageUrl && (
                        <>
                          <button onClick={handleFullImage}
                            className="h-6 px-2 text-[10px] font-semibold rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-1">
                            <Maximize2 size={10} /> Full
                          </button>
                          <button onClick={handleDownload}
                            className="h-6 px-2 text-[10px] font-semibold rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-1">
                            <Download size={10} /> Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Image viewer — SCROLLABLE, full-width by default ── */}
                {!showNotes && (
                  <div className="flex-1 bg-gray-200 dark:bg-gray-800 overflow-hidden" style={{ position: 'relative', minHeight: 0 }}>
                    {imageLoading ? (
                      <div style={{ position: 'absolute', inset: 0 }} className="flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500 select-none">
                        <div className="w-9 h-9 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-medium">Loading image…</p>
                        <p className="text-[10px] opacity-60 font-mono">{currentLabno}</p>
                      </div>
                    ) : imageUrl ? (
                      <MagnifierViewer src={imageUrl} zoom={zoom} labno={currentLabno} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0 }} className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 select-none pointer-events-none">
                        <ImageIcon size={52} className="mx-auto mb-2.5 opacity-20" />
                        <p className="text-xs font-medium opacity-50">
                          {imageError === 'not_found' ? 'No specimen image found' : imageError === 'error' ? 'Failed to load image' : 'Specimen scan image'}
                        </p>
                        <p className="text-[10px] opacity-30 mt-1 font-mono">{currentLabno}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes panel */}
                {showNotes && (
                  <div className="flex-1 flex flex-col overflow-hidden border-t-2 border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10">
                    <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800/60">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Notebook Entries</span>
                        {!notesLoading && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 dark:bg-amber-800/60 dark:text-amber-300">
                            {notes.length} note{notes.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <button onClick={() => setShowNotes(false)}
                        className="w-6 h-6 rounded flex items-center justify-center text-amber-500 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {notesLoading ? (
                        <div className="flex items-center justify-center h-full gap-2 text-amber-500">
                          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Loading notes…</span>
                        </div>
                      ) : notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 dark:text-gray-600">
                          <FileText size={32} className="opacity-20" />
                          <p className="text-sm">No notes found for this record</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
                          {notes.map((note, i) => {
                            const fmtDT = (raw: string | null | undefined): string => {
                              if (!raw) return '—';
                              const d = new Date(raw);
                              if (isNaN(d.getTime())) return raw;
                              return `${d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                            };
                            const creatorName  = note.CREATE_FIRSTNAME && note.CREATE_LASTNAME ? `${note.CREATE_FIRSTNAME} ${note.CREATE_LASTNAME}` : note.CREATE_USER_ID ? `User #${note.CREATE_USER_ID}` : '—';
                            const modifierName = note.USER_FIRSTNAME   && note.USER_LASTNAME   ? `${note.USER_FIRSTNAME} ${note.USER_LASTNAME}`     : note.USER_ID         ? `User #${note.USER_ID}`         : '—';
                            const isModified   = note.LASTMOD && note.LASTMOD !== note.CREATE_DT;
                            const samePerson   = creatorName === modifierName;
                            return (
                              <div key={note.NOTEID ?? i} className="px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                {note.NOTEPRIORITY === '1' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700 mb-2 inline-block">HIGH PRIORITY</span>}
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 uppercase">{creatorName}</span>
                                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap flex-shrink-0">{fmtDT(note.CREATE_DT)}</span>
                                </div>
                                {isModified && (
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className={`text-[12px] font-bold uppercase ${samePerson ? 'text-gray-600 dark:text-gray-400' : 'text-orange-600 dark:text-orange-400'}`}>{modifierName}</span>
                                    <span className="text-[11px] font-mono text-gray-400 whitespace-nowrap flex-shrink-0">{fmtDT(note.LASTMOD)}</span>
                                  </div>
                                )}
                                <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words mt-1.5">
                                  {note.NOTES || <span className="italic text-gray-400">No content</span>}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ══ RIGHT SIDEBAR ══ */}
              <div className="flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto" style={{ width: '200px' }}>

                {/* Actions */}
                <div className="px-2 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Actions</p>
                  <div className="flex flex-col gap-1.5">
                    <ABtn icon={<Maximize2     size={11} />} label="Full Image"     onClick={handleFullImage}       disabled={!hasImage} />
                    <ABtn icon={<ClipboardList size={11} />} label="Audit Trail"    onClick={() => setShowAudit(true)} />
                    <ABtn icon={<Download      size={11} />} label="Download Image" onClick={handleDownload}        disabled={!hasImage} />

                    {/* Include Patient Info checkbox */}
                    <button onClick={() => setIncludePatientInfo(v => !v)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                        includePatientInfo
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-700'
                      }`}>
                      <div className={`w-3.5 h-3.5 rounded flex-shrink-0 border-[1.5px] flex items-center justify-center transition-all ${includePatientInfo ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-700 border-gray-400 dark:border-gray-500'}`}>
                        {includePatientInfo && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      Include Patient Info
                    </button>

                    <ABtn icon={<Mail size={11} />} label="Email" onClick={() => setShowEmail(true)} />

                    {/* Notes toggle */}
                    <button onClick={() => setShowNotes(v => !v)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                        showNotes
                          ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 dark:hover:border-amber-700'
                      }`}>
                      <FileText size={11} className="flex-shrink-0" />
                      {showNotes ? 'Hide Notes' : 'Show Notes'}
                      {notes.length > 0 && (
                        <span className={`ml-auto text-[9px] font-bold px-1 rounded ${showNotes ? 'bg-amber-200 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {notes.length}
                        </span>
                      )}
                    </button>

                    {/* Letters */}
                    <button onClick={() => setShowLetters(true)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 dark:hover:border-emerald-700">
                      <BookOpen size={11} className="flex-shrink-0" />
                      Show Letters
                    </button>
                  </div>
                </div>

                {/* Patient Filter Cards */}
                <div className="px-2 py-2 flex-shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                    Patient Filter Cards
                    {filterCards.length > 1 && <span className="ml-1 text-blue-500">({filterCards.length})</span>}
                  </p>
                  {filterLoading ? (
                    <div className="flex justify-center py-2"><div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : (
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-[10px]" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                      <div className="flex bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                        <span className="px-1.5 py-1 font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700" style={{ width: '72px', flexShrink: 0 }}>Labno</span>
                        <span className="px-1.5 py-1 font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700" style={{ width: '52px', flexShrink: 0 }}>Status</span>
                        <span className="flex-1 px-1.5 py-1 font-bold text-gray-600 dark:text-gray-300">View</span>
                      </div>
                      {filterCards.length === 0 ? (
                        <div className="flex items-center bg-white dark:bg-gray-900">
                          <span className="px-1.5 py-1 font-mono text-gray-700 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 truncate" style={{ width: '72px', flexShrink: 0 }}>{labno}</span>
                          <span className={`px-1.5 py-1 font-semibold border-r border-gray-200 dark:border-gray-700 ${status === 'MAILED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`} style={{ width: '52px', flexShrink: 0 }}>{status}</span>
                          <span className="px-1 py-0.5 flex-shrink-0">
                            <button className="h-5 px-1.5 text-[9px] rounded font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-0.5">
                              <FlaskConical size={8} /> PIS
                            </button>
                          </span>
                        </div>
                      ) : filterCards.map((card, i) => {
                        const cardStatus = card.DTRPTD && card.DTRPTD.trim() ? 'MAILED' : 'UNMAILED';
                        const isActive   = card.LABNO === activeLabno;
                        return (
                          <div key={i} className={`flex items-center border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'}`}>
                            <span className={`px-1.5 py-1 font-mono border-r border-gray-200 dark:border-gray-700 truncate ${isActive ? 'text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-700 dark:text-gray-200'}`} style={{ width: '72px', flexShrink: 0 }}>{card.LABNO}</span>
                            <span className={`px-1.5 py-1 font-semibold border-r border-gray-200 dark:border-gray-700 ${cardStatus === 'MAILED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`} style={{ width: '52px', flexShrink: 0 }}>{cardStatus}</span>
                            <span className="px-1 py-0.5 flex-shrink-0">
                              <button onClick={() => { setActiveLabno(card.LABNO); setActiveRecord({ ...record!, LABNO: card.LABNO }); }}
                                className={`h-5 px-1.5 text-[9px] rounded font-semibold border transition-colors flex items-center gap-0.5 ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                                <FlaskConical size={8} /> PIS
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <div className="flex-shrink-0 px-5 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Record:&nbsp;<span className="font-mono text-gray-600 dark:text-gray-300">{labno}</span>
            <span className="mx-2 opacity-40">·</span>{fullName}
            {includePatientInfo && (
              <span className="ml-3 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">Patient Info Included in Email</span>
            )}
            {showNotes && notes.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {notes.length} Note{notes.length !== 1 ? 's' : ''}
              </span>
            )}
          </span>
          <button onClick={onClose}
            className="h-7 px-4 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Close
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pisIn {
          from { opacity:0; transform:scale(.97) translateY(10px); }
          to   { opacity:1; transform:scale(1)   translateY(0);    }
        }
      `}} />
    </div>

    {showAudit   && <AuditTrailModal labno={currentLabno} patientName={fullName} onClose={() => setShowAudit(false)} />}
    {showEmail   && currentRecord && <EmailModal detail={detail} record={currentRecord} includePatientInfo={includePatientInfo} onClose={() => setShowEmail(false)} />}
    {showLetters && <LettersModal labno={currentLabno} patientName={fullName} onClose={() => setShowLetters(false)} />}
    </>
  );
};

// ═══════════════════════════════════════════════
// SEARCH FORM ATOMS  (unchanged)
// ═══════════════════════════════════════════════

const Field: React.FC<{
  label: string; name: keyof SearchParams; value: string;
  onChange: (name: keyof SearchParams, value: string) => void;
  type?: string; disabled?: boolean;
}> = ({ label, name, value, onChange, type = 'text', disabled = false }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</label>
    <input type={type} value={value} disabled={disabled} onChange={(e) => onChange(name, e.target.value)}
      className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800/50" />
  </div>
);

const SelectField: React.FC<{
  label: string; name: keyof SearchParams; value: string;
  options: string[]; onChange: (name: keyof SearchParams, value: string) => void;
}> = ({ label, name, value, options, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</label>
    <div className="relative">
      <select value={value} onChange={(e) => onChange(name, e.target.value)}
        className="h-9 w-full px-3 pr-8 text-sm rounded-lg border appearance-none border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150">
        {options.map(o => <option key={o} value={o}>{o === '' ? '— All —' : o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

// ═══════════════════════════════════════════════
// SEARCH FORM  (unchanged)
// ═══════════════════════════════════════════════

const SearchForm: React.FC<{
  params: SearchParams; onChange: (name: keyof SearchParams, value: string) => void;
  onSearch: () => void; onClear: () => void; isLoading: boolean;
}> = ({ params, onChange, onSearch, onClear, isLoading }) => (
  <div onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
    <div className="grid grid-cols-4 gap-4 mb-4">
      <Field label="Last Name"              name="lastName"             value={params.lastName}             onChange={onChange} />
      <Field label="First Name"             name="firstName"            value={params.firstName}            onChange={onChange} />
      <Field label="Patient Number"         name="patientNumber"        value={params.patientNumber}        onChange={onChange} disabled />
      <Field label="Form Number"            name="formNumber"           value={params.formNumber}           onChange={onChange} />
    </div>
    <div className="grid grid-cols-4 gap-4 mb-4">
      <Field label="Birth Date"             name="birthDate"            value={params.birthDate}            onChange={onChange} type="date" />
      <Field label="Collection Hospital ID" name="collectionHospitalId" value={params.collectionHospitalId} onChange={onChange} />
      <Field label="Date Collection"        name="dateCollection"       value={params.dateCollection}       onChange={onChange} type="date" />
      <SelectField label="Sex"              name="sex"                  value={params.sex}                  options={SEX_OPTIONS} onChange={onChange} />
    </div>
    <div className="grid grid-cols-4 gap-4 mb-4">
      <Field label="Lab Number"             name="labNumber"            value={params.labNumber}            onChange={onChange} />
      <Field label="Physician ID"           name="physicianId"          value={params.physicianId}          onChange={onChange} />
      <Field label="Date Received"          name="dateReceived"         value={params.dateReceived}         onChange={onChange} type="date" />
      <SelectField label="Outside Lab"      name="outsideLab"           value={params.outsideLab}           options={OUTSIDE_LAB_OPTIONS} onChange={onChange} />
    </div>
    <div className="grid grid-cols-4 gap-4 mb-5">
      <Field label="Contact's Last Name"    name="contactLastName"      value={params.contactLastName}      onChange={onChange} disabled />
      <Field label="Contact's First Name"   name="contactFirstName"     value={params.contactFirstName}     onChange={onChange} disabled />
      <Field label="Date Reported"          name="dateReported"         value={params.dateReported}         onChange={onChange} type="date" />
      <div />
    </div>
    <div className="flex items-center justify-end gap-3">
      <button onClick={onClear}
        className="h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-all duration-150">
        <X size={14} /> Clear
      </button>
      <button onClick={onSearch} disabled={isLoading}
        className="h-9 px-5 text-sm rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
        <Search size={14} />{isLoading ? 'Searching…' : 'Search'}
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════
// PAGINATION  (unchanged)
// ═══════════════════════════════════════════════

const Pagination: React.FC<{
  currentPage: number; totalPages: number; totalCount: number; pageSize: number; onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, totalCount, pageSize, onPageChange }) => {
  if (totalPages <= 1) return null;
  const from  = (currentPage - 1) * pageSize + 1;
  const to    = Math.min(currentPage * pageSize, totalCount);
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{from}–{to}</span> of{' '}
        <span className="font-semibold text-gray-700 dark:text-gray-300">{totalCount}</span> records
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e-${i}`} className="h-8 w-8 flex items-center justify-center text-xs text-gray-400">…</span>
            : <button key={p} onClick={() => onPageChange(p as number)}
                className={`h-8 w-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-colors ${p === currentPage ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {p}
              </button>
        )}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// RESULTS TABLE  (unchanged)
// ═══════════════════════════════════════════════

const ResultsTable: React.FC<{
  results: SampleRecord[]; totalCount: number; isLoading: boolean; onView: (record: SampleRecord) => void;
}> = ({ results = [], totalCount = 0, isLoading, onView }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const sorted        = [...results].sort((a, b) => String(b.LABNO).localeCompare(String(a.LABNO), undefined, { numeric: true }));
  const totalPages    = Math.ceil(sorted.length / PAGE_SIZE);
  const paginatedRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [results]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="mt-4">
      {totalCount > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Search Results</span>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
            {totalCount} record{totalCount !== 1 ? 's' : ''} found
          </span>
        </div>
      )}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <Search size={36} className="mb-3 opacity-25" />
          <p className="text-sm">No records found. Try adjusting your search filters.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden shadow-sm border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                    {['Lab No','Lab ID','Patient Name','Facility Code','Birth Date','Date Coll.','Date Recv.','Date Rptd.','Gest. Age','Age Coll.','Sex','Status','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, i) => {
                    const sx = sexBadge(row.SEX);
                    return (
                      <tr key={`${row.LABNO}-${i}`}
                        className={`border-b border-gray-100 dark:border-gray-700/50 transition-colors duration-100 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/40'} hover:bg-blue-50/50 dark:hover:bg-gray-700/50`}>
                        <td className="px-4 py-3 whitespace-nowrap"><span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-tight">{row.LABNO || '—'}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.LABID || '—'}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0"><User size={13} className="text-blue-500 dark:text-blue-400" /></div>
                            {formatPatientName(row.LNAME, row.FNAME)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.SUBMID ? <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded font-mono bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{row.SUBMID}</span>
                            : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDateTime(row.BIRTHDT, row.BIRTHTM)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDateTime(row.DTCOLL,  row.TMCOLL)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDateTime(row.DTRECV,  row.TMRECV)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDateTime(row.DTRPTD)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {row.GESTAGE ? <span className="font-semibold text-gray-700 dark:text-gray-300">{row.GESTAGE}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {row.AGECOLL ? <span className="font-semibold text-gray-700 dark:text-gray-300">{formatAge(row.AGECOLL)}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${sx.cls}`}>{sx.label}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.DTRPTD?.trim()
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> Mailed</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" /> Unmailed</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button onClick={() => onView(row)}
                            className="h-7 px-3 text-xs rounded-lg font-medium bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 hover:border-blue-300 dark:hover:border-blue-400/60 flex items-center gap-1.5 transition-all duration-150">
                            <FlaskConical size={11} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} totalCount={sorted.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// ROOT COMPONENT  (unchanged)
// ═══════════════════════════════════════════════

export const PatientInformationSystem: React.FC<Props> = ({
  onSearch,
  results = [],
  isLoading,
  totalCount,
  deeplinkLabNumber = null,
}) => {
  const [params,     setParams]     = useState<SearchParams>(EMPTY_PARAMS);
  const [viewRecord, setViewRecord] = useState<SampleRecord | null>(null);
  const handleChange = (name: keyof SearchParams, value: string) => setParams(prev => ({ ...prev, [name]: value }));

  useEffect(() => {
    const lab = deeplinkLabNumber?.trim();
    if (!lab) return;
    const merged: SearchParams = { ...EMPTY_PARAMS, labNumber: lab };
    setParams(merged);
    onSearch(merged);
  }, [deeplinkLabNumber, onSearch]);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-5 flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-blue-500" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Patient Information System</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Search and manage patient sample records</p>
        </div>
      </div>
      <SearchForm params={params} onChange={handleChange} onSearch={() => onSearch(params)} onClear={() => setParams(EMPTY_PARAMS)} isLoading={isLoading} />
      <ResultsTable results={results} totalCount={totalCount} isLoading={isLoading} onView={(record) => setViewRecord(record)} />
      <PatientRecordModal record={viewRecord} onClose={() => setViewRecord(null)} />
    </div>
  );
};

export default PatientInformationSystem;