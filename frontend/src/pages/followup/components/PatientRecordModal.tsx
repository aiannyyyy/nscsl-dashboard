import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, User, ZoomIn, Image as ImageIcon, ClipboardList,
  Download, Mail, FileText, BookOpen, FlaskConical,
  Maximize2, Send, Calendar, Activity, Building2,
  Stethoscope, ChevronDown, ChevronUp,
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
// TYPES
// ═══════════════════════════════════════════════

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
  LABNO: string; NOTES: string; LASTMOD: string; USER_ID: number | null;
  NOTEPRIORITY: string | null; ERROR: string | null; CREATE_DT: string;
  CREATE_USER_ID: number | null; STATUS: string | null; NOTEID: number | null;
  PHONECALL: string | null; CREATETIME: string | null;
  USER_FIRSTNAME: string | null; USER_LASTNAME: string | null;
  CREATE_FIRSTNAME: string | null; CREATE_LASTNAME: string | null;
}

// ═══════════════════════════════════════════════
// HELPERS
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
    case 'A': return 'Ambiguous';
    default: return s || '—';
  }
};

const val = (x?: unknown): string =>
  x != null && String(x).trim() !== '' ? String(x).trim() : '—';

const formatAge = (raw?: string): string => {
  if (!raw || raw === '—') return '—';
  const totalHours = parseFloat(raw);
  if (isNaN(totalHours) || totalHours < 0) return raw;
  const days = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);
  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days} day(s)`;
  return `${hours} hour(s)`;
};

const pick = (detail?: unknown, row?: unknown): string =>
  val(detail) !== '—' ? val(detail) : val(row);

// ═══════════════════════════════════════════════
// CARD COMPONENTS
// ═══════════════════════════════════════════════

/** Section card wrapper with colored left border accent */
const InfoCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  accent: string;
  headerBg: string;
  children: React.ReactNode;
  collapsible?: boolean;
}> = ({ title, icon, accent, headerBg, children, collapsible = false }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-3 border-l-4 ${accent}`}>
      <div
        className={`flex items-center justify-between px-3 py-2 ${headerBg} dark:bg-gray-800/60`}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ cursor: collapsible ? 'pointer' : 'default', userSelect: 'none' }}
      >
        <div className="flex items-center gap-2">
          <span className="opacity-60">{icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">{title}</span>
        </div>
        {collapsible && (open ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />)}
      </div>
      {open && <div className="bg-white dark:bg-gray-900">{children}</div>}
    </div>
  );
};

/** Compact field row inside a card */
const F: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  mono?: boolean;
}> = ({ label, value, valueColor = 'text-gray-800 dark:text-gray-200', bold = false, mono = false }) => (
  <div className="flex items-baseline gap-1 px-3 py-[3px] border-b border-gray-50 dark:border-gray-800 last:border-b-0">
    <span className="flex-shrink-0 w-[148px] text-[10.5px] text-gray-500 dark:text-gray-400 leading-tight">{label}</span>
    <span className={`text-[10.5px] leading-tight min-w-0 truncate ${valueColor} ${bold ? 'font-semibold' : ''} ${mono ? 'font-mono' : ''}`}>
      {value}
    </span>
  </div>
);

/** Action button in sidebar */
const ABtn: React.FC<{
  icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean;
  variant?: 'default' | 'active' | 'amber' | 'emerald';
}> = ({ icon, label, onClick, disabled, variant = 'default' }) => {
  const base = 'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    default: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-700',
    active:  'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300',
    amber:   'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300',
    emerald: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 dark:hover:bg-emerald-900/20',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {icon}{label}
    </button>
  );
};

// ═══════════════════════════════════════════════
// EMAIL MODAL
// ═══════════════════════════════════════════════

const EmailModal: React.FC<{
  detail: Record<string, any> | null;
  record: SampleRecord;
  includePatientInfo: boolean;
  onClose: () => void;
}> = ({ detail, record, includePatientInfo, onClose }) => {
  const d = detail;
  const [sendTo, setSendTo] = useState(val(d?.EMAIL) !== '—' ? val(d?.EMAIL) : '');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const labno = pick(d?.LABNO, record.LABNO);
  const lname = pick(d?.LNAME, record.LNAME);
  const fname = pick(d?.FNAME, record.FNAME);
  const mailStatus = (pick(d?.DTRPTD, record.DTRPTD) !== '—') ? 'MAILED' : 'UNMAILED';

  const baseLines = ['Newborn Screening Center - Southern Luzon', 'Please see attachment for Filter Card Image'];
  const patientLines = includePatientInfo ? ['', `Lab No: ${labno}`, `Last Name: ${lname}`, `First Name: ${fname}`, `Status: ${mailStatus}`] : [];
  const allLines = [...baseLines, ...patientLines];

  const handleSend = () => {
    if (!sendTo.trim()) { setStatus('Please enter a recipient email address.'); return; }
    setSending(true); setStatus('Sending…');
    const subject = encodeURIComponent(`Filter Card Image - Lab No: ${labno}`);
    const body = encodeURIComponent(allLines.join('\n'));
    window.location.href = `mailto:${sendTo.trim()}?subject=${subject}&body=${body}`;
    setTimeout(() => { setSending(false); setStatus('Email client opened.'); }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ animation: 'pisIn .2s cubic-bezier(.34,1.56,.64,1)', width: '520px', maxWidth: '96vw', height: '420px' }}>
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><Mail size={13} className="text-white" /></div>
            <p className="text-sm font-bold text-white">Send Email of Filter Card Image</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={13} /></button>
        </div>
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <label className="text-[12px] font-semibold text-gray-600 whitespace-nowrap">Send To:</label>
          <input type="email" value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="recipient@email.com"
            className="flex-1 h-8 px-3 text-[12px] rounded border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1 overflow-auto px-4 py-3">
          <div className="text-[12px] leading-relaxed text-gray-800 font-mono whitespace-pre-wrap">
            {allLines.map((line, i) => <div key={i} className={line === '' ? 'h-3' : ''}>{line}</div>)}
          </div>
        </div>
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className={`text-[11px] ${status.includes('opened') ? 'text-emerald-600' : status.includes('enter') ? 'text-red-500' : 'text-gray-400'}`}>
            {status || (includePatientInfo ? 'Patient info included' : '')}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-7 px-3 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={handleSend} disabled={sending} className="h-7 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50">
              <Send size={11} />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// AUDIT TRAIL MODAL
// ═══════════════════════════════════════════════

const AuditTrailModal: React.FC<{ labno: string; patientName: string; onClose: () => void }> = ({ labno, patientName, onClose }) => {
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'AUDIT_RESULTS' | 'AUDIT_SAMPLE'>('ALL');
  const [search, setSearch] = useState('');

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
        (row.OLDDATA || '').toLowerCase().includes(q) ||
        (row.NEWDATA || '').toLowerCase().includes(q) ||
        (row.FULL_NAME || '').toLowerCase().includes(q);
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
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-semibold">
            {(['ALL', 'AUDIT_RESULTS', 'AUDIT_SAMPLE'] as const).map(k => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 border-r border-gray-200 last:border-r-0 transition-colors ${filter === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                {k === 'ALL' ? 'All' : k === 'AUDIT_RESULTS' ? 'Results' : 'Sample'}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            className="h-8 pl-3 pr-3 text-[11px] rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
          <span className="ml-auto text-[11px] text-gray-500">{loading ? 'Loading…' : `${filtered.length} record(s)`}</span>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-3 text-gray-400">
              <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading audit trail…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400"><p className="text-sm">No records found</p></div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 border-b border-gray-200">
                  {['Source', 'Column', 'Old Value', 'New Value', 'Name', 'Audit Date', 'Last Modified'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-gray-500 border-r border-gray-200 last:border-r-0 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                    <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.SOURCE_TABLE === 'AUDIT_RESULTS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {row.SOURCE_TABLE === 'AUDIT_RESULTS' ? 'RESULTS' : 'SAMPLE'}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap font-semibold text-gray-800">{row.TABLECOLUMN || '—'}</td>
                    <td className="px-3 py-2 border-r border-gray-100 max-w-[160px]">
                      <span className="block truncate text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-mono">{row.OLDDATA || <span className="italic text-gray-300">empty</span>}</span>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100 max-w-[160px]">
                      <span className="block truncate text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">{row.NEWDATA || <span className="italic text-gray-300">empty</span>}</span>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap font-medium text-gray-700 uppercase">{row.FULL_NAME || row.AUDIT_USER || '—'}</td>
                    <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap font-mono text-gray-500">{row.AUDIT_DATE || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-500">{row.LASTMOD || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
          <button onClick={onClose} className="h-7 px-4 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// MAGNIFIER VIEWER — SCROLLABLE, full-width
// ═══════════════════════════════════════════════

const MagnifierViewer: React.FC<{ src: string; zoom: number; labno: string }> = ({ src, zoom, labno }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [hovering, setHovering] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });

  const LENS_SIZE = 120;
  const MAG_FACTOR = 3;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lx = Math.max(LENS_SIZE / 2, Math.min(x, rect.width - LENS_SIZE / 2));
    const ly = Math.max(LENS_SIZE / 2, Math.min(y, rect.height - LENS_SIZE / 2));
    setLensPos({ x: lx - LENS_SIZE / 2, y: ly - LENS_SIZE / 2 });
    setBgPos({ x: -(lx * MAG_FACTOR - LENS_SIZE / 2), y: -(ly * MAG_FACTOR - LENS_SIZE / 2) });
  }, []);

  return (
    // KEY FIX: overflow-auto → scrollable; items-start → image starts at top
    <div
      className="w-full h-full overflow-auto"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={handleMouseMove}
      style={{ cursor: hovering ? 'crosshair' : 'default' }}
    >
      <div className="p-3" style={{ width: zoom <= 100 ? '100%' : `${zoom}%`, minWidth: '100%' }}>
        <div className="relative">
          <img
            ref={imgRef}
            src={src}
            alt={`Specimen scan for ${labno}`}
            draggable={false}
            style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
            className="rounded-lg shadow-md"
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
// LETTERS MODAL
// ═══════════════════════════════════════════════

const LettersModal: React.FC<{ labno: string; patientName: string; onClose: () => void }> = ({ labno, patientName, onClose }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imgLoading, setImgLoading] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!labno) return;
    setListLoading(true); setListError(null); setFiles([]);
    fetchPatientLetters(labno)
      .then(res => { const f = res.files ?? []; setFiles(f); if (f.length > 0) setSelectedFile(f[0]); })
      .catch(err => setListError(err?.message === 'NOT_FOUND' ? 'No letters found.' : 'Failed to load letters.'))
      .finally(() => setListLoading(false));
  }, [labno]);

  const loadImage = useCallback((file: string) => {
    if (imageUrls[file] !== undefined) return;
    setImgLoading(prev => ({ ...prev, [file]: true }));
    fetchLetterImage(labno, file)
      .then(url => setImageUrls(prev => ({ ...prev, [file]: url })))
      .catch(() => setImageUrls(prev => ({ ...prev, [file]: '' })))
      .finally(() => setImgLoading(prev => ({ ...prev, [file]: false })));
  }, [labno, imageUrls]);

  useEffect(() => { files.forEach(file => loadImage(file)); }, [files]);
  useEffect(() => { if (selectedFile) loadImage(selectedFile); }, [selectedFile]);
  useEffect(() => { return () => { Object.values(imageUrls).forEach(url => { if (url) URL.revokeObjectURL(url); }); }; }, []);
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onClose]);

  const selectedUrl = selectedFile ? (imageUrls[selectedFile] ?? null) : null;
  const isImgLoading = selectedFile ? (imgLoading[selectedFile] ?? false) : false;

  return (
    <div className="fixed inset-0 z-[25000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{ animation: 'pisIn .2s cubic-bezier(.34,1.56,.64,1)', width: '1150px', maxWidth: '98vw', height: '88vh' }}>
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><BookOpen size={15} className="text-white" /></div>
            <div>
              <p className="text-sm font-bold text-white">Letters</p>
              <p className="text-[11px] text-emerald-200">Lab No: <span className="font-mono font-semibold">{labno}</span><span className="mx-2 opacity-50">·</span>{patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={14} /></button>
        </div>
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col overflow-y-auto" style={{ width: '160px' }}>
            <div className="px-3 py-2 border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Documents</p>
            </div>
            {listLoading ? (
              <div className="flex items-center justify-center flex-1"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : listError ? (
              <div className="flex items-center justify-center flex-1 px-3 text-center"><p className="text-[11px] text-gray-400">{listError}</p></div>
            ) : files.map((file, i) => {
              const isSelected = file === selectedFile;
              const thumbUrl = imageUrls[file];
              const thumbLoading = imgLoading[file] ?? false;
              return (
                <button key={file} onClick={() => { setSelectedFile(file); setZoom(100); }}
                  className={`w-full text-left p-2 transition-colors border-l-2 ${isSelected ? 'bg-emerald-50 border-emerald-500' : 'hover:bg-gray-100 border-transparent'}`}>
                  <div className="w-full rounded overflow-hidden bg-gray-200 mb-1 flex items-center justify-center" style={{ height: '100px' }}>
                    {thumbLoading ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      : thumbUrl ? <img src={thumbUrl} alt={`Letter ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
                        : <BookOpen size={20} className="text-gray-400 opacity-40" />}
                  </div>
                  <p className={`text-[9px] font-bold text-center truncate ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`}>Letter {i + 1}</p>
                </button>
              );
            })}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {!listLoading && !listError && files.length > 0 && (
              <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="w-7 h-7 rounded bg-gray-100 font-bold flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors text-base">−</button>
                  <button onClick={() => setZoom(100)} className="w-12 text-center text-[12px] font-mono font-bold text-gray-700 hover:text-blue-600 transition-colors">{zoom}%</button>
                  <button onClick={() => setZoom(z => Math.min(600, z + 25))} className="w-7 h-7 rounded bg-gray-100 font-bold flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors text-base">+</button>
                </div>
                {[50, 100, 150, 200].map(pct => (
                  <button key={pct} onClick={() => setZoom(pct)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-colors ${zoom === pct ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600'}`}>
                    {pct}%
                  </button>
                ))}
                <div className="ml-auto flex gap-2">
                  <button onClick={() => { if (selectedUrl) window.open(selectedUrl, '_blank'); }} disabled={!selectedUrl}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                    <Maximize2 size={11} /> Full View
                  </button>
                  <button onClick={() => { if (!selectedUrl || !selectedFile) return; const a = document.createElement('a'); a.href = selectedUrl; a.download = selectedFile; document.body.appendChild(a); a.click(); document.body.removeChild(a); }} disabled={!selectedUrl}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                    <Download size={11} /> Download
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 bg-gray-200 overflow-auto">
              {isImgLoading ? (
                <div className="flex items-center justify-center h-full gap-3 text-gray-400">
                  <div className="w-9 h-9 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Loading letter…</p>
                </div>
              ) : selectedUrl ? (
                <div className="p-4" style={{ width: zoom <= 100 ? '100%' : `${zoom}%`, minWidth: '100%' }}>
                  <img src={selectedUrl} alt={selectedFile ?? 'Letter'} draggable={false}
                    style={{ width: '100%', height: 'auto', display: 'block' }} className="rounded shadow-lg" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p className="text-xs opacity-50">Select a letter</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 px-5 py-2 border-t border-gray-200 bg-white flex items-center justify-between">
          <span className="text-[11px] text-gray-400">Lab No: <span className="font-mono text-gray-600">{labno}</span></span>
          <button onClick={onClose} className="h-7 px-4 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// PATIENT RECORD MODAL — REDESIGNED
// ═══════════════════════════════════════════════

const PatientRecordModal: React.FC<{ record: SampleRecord | null; onClose: () => void }> = ({ record, onClose }) => {
  const [zoom, setZoom] = useState(100);
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [testSeq, setTestSeq] = useState<TestSeqRow[]>([]);
  const [testSeqLoading, setTestSeqLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [filterCards, setFilterCards] = useState<FilterCardRow[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [activeLabno, setActiveLabno] = useState<string>('');
  const [activeRecord, setActiveRecord] = useState<SampleRecord | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [includePatientInfo, setIncludePatientInfo] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showLetters, setShowLetters] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesFetched, setNotesFetched] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<'not_found' | 'error' | null>(null);

  const currentRecord = activeRecord ?? record;
  const currentLabno = activeRecord?.LABNO ?? record?.LABNO ?? '';

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
        if (showAudit) { setShowAudit(false); return; }
        if (showEmail) { setShowEmail(false); return; }
        if (showNotes) { setShowNotes(false); return; }
        if (showLetters) { setShowLetters(false); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose, showAudit, showEmail, showNotes, showLetters]);

  if (!record || !currentRecord) return null;

  const handleResultClick = (abbrev: string, rowIndex: number) => {
    if (selectedRow === rowIndex) { setSelectedRow(null); setTestSeq([]); return; }
    setSelectedRow(rowIndex); setTestSeqLoading(true); setTestSeq([]);
    getTestSequence(currentLabno)
      .then(res => { const filtered = res.data.filter((r: any) => r.ABBREV === abbrev); setTestSeq(filtered.length > 0 ? filtered : res.data); })
      .catch(() => setTestSeq([]))
      .finally(() => setTestSeqLoading(false));
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a'); a.href = imageUrl; a.download = `specimen_${currentLabno}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const d = detail;
  const labno   = pick(d?.LABNO,   record.LABNO);
  const labid   = pick(d?.LABID,   record.LABID);
  const lname   = pick(d?.LNAME,   record.LNAME);
  const fname   = pick(d?.FNAME,   record.FNAME);
  const birthdt = pick(d?.BIRTHDT, record.BIRTHDT);
  const birthtm = fmt12h(d?.BIRTHTM ?? record.BIRTHTM);
  const dtcoll  = pick(d?.DTCOLL,  record.DTCOLL);
  const tmcoll  = fmt12h(d?.TMCOLL  ?? record.TMCOLL);
  const dtrecv  = pick(d?.DTRECV,  record.DTRECV);
  const tmrecv  = fmt12h(d?.TMRECV  ?? record.TMRECV);
  const dtrptd  = pick(d?.DTRPTD,  record.DTRPTD);
  const gestage = pick(d?.GESTAGE, record.GESTAGE);
  const agecoll = pick(d?.AGECOLL, record.AGECOLL);
  const sex     = sexLabel(pick(d?.SEX, record.SEX));
  const status  = dtrptd !== '—' ? 'MAILED' : 'UNMAILED';
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
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div
          className="flex flex-col rounded-xl shadow-2xl overflow-hidden border border-blue-200 dark:border-blue-900/60"
          style={{
            animation: 'pisIn .22s cubic-bezier(.34,1.56,.64,1)',
            width: '98vw', maxWidth: '1640px', height: '95vh',
            background: '#f1f5f9',
          }}
        >

          {/* ─── HEADER ─── */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Patient Information</p>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  Lab No:&nbsp;<span className="font-mono font-semibold">{labno}</span>
                  <span className="mx-2 opacity-50">·</span>{fullName}
                  <span className={`ml-3 px-2 py-0.5 rounded-full text-[9px] font-bold ${status === 'MAILED' ? 'bg-emerald-500/80' : 'bg-red-500/80'} text-white`}>
                    {status}
                  </span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={14} /></button>
          </div>

          {/* ─── BODY ─── */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ══ LEFT: Demographics — card-based, scrollable ══ */}
            <div className="flex-shrink-0 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700"
              style={{ width: '360px', background: '#f8fafc' }}>

              <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Demographics</span>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-3 py-3">

                  {/* ── Card: Identity ── */}
                  <InfoCard title="Identity" icon={<User size={12} />} accent="border-blue-400" headerBg="bg-blue-50">
                    <F label="Lab No"     value={labno} valueColor="text-blue-700 dark:text-blue-400" bold mono />
                    <F label="Form No"    value={labid} mono />
                    <F label="Last Name"  value={lname} bold />
                    <F label="First Name" value={fname} />
                    <F label="Sex"        value={sex} />
                  </InfoCard>

                  {/* ── Card: Specimen & Collection ── */}
                  <InfoCard title="Specimen & Collection" icon={<Calendar size={12} />} accent="border-indigo-400" headerBg="bg-indigo-50">
                    <F label="Birth"         value={`${birthdt} @ ${birthtm}`} />
                    <F label="Collection"    value={`${dtcoll} @ ${tmcoll}`} />
                    <F label="Specimen Type" value={spectype} />
                    <F label="Milk Type"     value={milktype} />
                    <F label="Date Received" value={tmrecv !== '—' ? `${dtrecv} @ ${tmrecv}` : dtrecv} />
                    <F label="Date Reported" value={dtrptd} />
                  </InfoCard>

                  {/* ── Card: Clinical ── */}
                  <InfoCard title="Clinical Info" icon={<Activity size={12} />} accent="border-violet-400" headerBg="bg-violet-50">
                    <F label="Birth Weight"      value={birthwt} />
                    <F label="Birth Order"       value={twin} />
                    <F label="Blood Transfused"  value={transfus} />
                    <F label="Transfused Date"   value={dtxfus} />
                    <F label="Gestation Age"     value={gestage !== '—' ? `${gestage} Weeks` : '—'} />
                    <F label="Specimen Age"      value={specimenAge} />
                    <F label="Age at Collection" value={formatAge(agecoll)} />
                    <F label="Clinical Status"   value={clinstat} />
                    <F label="Demog Acceptable"  value={demcode} />
                  </InfoCard>

                  {/* ── Card: Provider & Facility (collapsible) ── */}
                  <InfoCard title="Provider & Facility" icon={<Building2 size={12} />} accent="border-emerald-400" headerBg="bg-emerald-50" collapsible>
                    <F label="Physician ID"        value={physid} valueColor="text-emerald-700 dark:text-emerald-400" bold />
                    <F label="Birth Hospital ID"   value={birthhosp} />
                    <F label="Birth Hospital Name" value={descr1} valueColor="text-emerald-700 dark:text-emerald-400" />
                    <F label="Facility Code"       value={providerid} />
                    <F label="Facility Name"       value={descr1} />
                    <F label="Address 1"           value={street1} />
                    <F label="Address 2"           value={street2} />
                    <F label="City"                value={city} />
                    <F label="Province"            value={county} />
                    <F label="Phone"               value={phone} />
                    <F label="Fax"                 value={fax} />
                    <F label="Mobile"              value={mobile} />
                    <F label="Email"               value={email} />
                  </InfoCard>

                  {/* ── Card: Processing & Status (collapsible) ── */}
                  <InfoCard title="Processing & Status" icon={<Stethoscope size={12} />} accent="border-sky-400" headerBg="bg-sky-50" collapsible>
                    <F label="Coordinator"        value={coord} valueColor="text-emerald-700 dark:text-emerald-400" bold />
                    <F label="Demog Release"      value={releasedt} valueColor="text-blue-700 dark:text-blue-400" />
                    <F label="Initial Entry"      value={initTech} valueColor="text-emerald-700 dark:text-emerald-400" />
                    <F label="Verification Entry" value={verTech} />
                    <F label="Second Copy Date"   value={val(d?.SECONDCOPY)} />
                    <F label="Outside Lab"        value={val(d?.OUTLAB)} />
                    <F label="Status"             value={status}
                      valueColor={status === 'MAILED' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
                      bold />
                  </InfoCard>

                  {/* ── Card: Disposition (only if has data) ── */}
                  {(disposition !== '—' || dispdate !== '—' || closedBy !== '—') && (
                    <InfoCard title="Disposition" icon={<X size={12} />} accent="border-orange-400" headerBg="bg-orange-50">
                      <F label="Disposition"      value={disposition} valueColor="text-orange-700 dark:text-orange-400" bold />
                      <F label="Disposition Date" value={dispdate} valueColor="text-orange-700 dark:text-orange-400" />
                      <F label="Closed By"        value={closedBy} />
                    </InfoCard>
                  )}

                </div>
              )}
            </div>

            {/* ══ RIGHT PANEL ══ */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

              {/* TOP: Results/Mailers + Test Sequence */}
              <div className="flex flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                style={{ height: '260px' }}>

                {/* Results / Mailers */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  <div className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest">
                    Results / Mailers
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="border-collapse" style={{ minWidth: '860px', width: '100%' }}>
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          {['TEST', 'CODE', 'MNEMONIC', 'VALUE', 'RESULT', 'TEXT', 'REFERENCE RANGE', 'INSTRUCT'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap last:border-r-0">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resLoading ? (
                          <tr><td colSpan={8} className="py-8 text-center text-[11px]">
                            <div className="flex items-center justify-center gap-2 text-gray-400">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading results…
                            </div>
                          </td></tr>
                        ) : results.length === 0 ? (
                          <tr><td colSpan={8} className="py-8 text-center text-gray-300 text-[11px]">No results found</td></tr>
                        ) : results.map((row, i) => {
                          const resultText = (row.DISORDERRESULTTEXT || '').toLowerCase();
                          const isNormal = resultText.includes('normal') || resultText === '' || resultText === '—';
                          const rowBg = isNormal ? (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70') : 'bg-red-50';
                          return (
                            <tr key={i} onClick={() => handleResultClick(row.ABBREV, i)}
                              className={`border-b border-gray-100 hover:bg-blue-50/70 transition-colors cursor-pointer ${selectedRow === i ? 'ring-2 ring-inset ring-blue-400' : ''} ${rowBg}`}>
                              <td className={`px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap border-r border-gray-100 ${isNormal ? 'text-gray-800' : 'text-red-700'}`}>{row.ABBREV || '—'}</td>
                              <td className="px-2 py-[3px] text-[11px] font-mono text-gray-600 border-r border-gray-100">{row.TESTCODE || '—'}</td>
                              <td className="px-2 py-[3px] text-[11px] text-gray-600 border-r border-gray-100">{row.MNEMONIC || '—'}</td>
                              <td className={`px-2 py-[3px] text-[11px] font-semibold tabular-nums border-r border-gray-100 ${isNormal ? 'text-blue-600' : 'text-red-600'}`}>{row.VALUE || '—'}</td>
                              <td className="px-2 py-[3px] border-r border-gray-100">
                                {isNormal
                                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">Normal</span>
                                  : <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">Abnormal</span>}
                              </td>
                              <td className={`px-2 py-[3px] text-[11px] whitespace-nowrap border-r border-gray-100 ${isNormal ? 'text-gray-500' : 'text-red-600 font-medium'}`}>{row.DISORDERRESULTTEXT || '—'}</td>
                              <td className="px-2 py-[3px] text-[11px] text-gray-500 font-mono whitespace-nowrap border-r border-gray-100">{row.EXPECTED || '—'}</td>
                              <td className="px-2 py-[3px] text-[11px] text-gray-400 whitespace-nowrap">{row.INSTRUCT || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Test Sequence */}
                <div className="flex-shrink-0 border-l border-gray-200 flex flex-col overflow-hidden" style={{ width: '210px' }}>
                  <div className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest truncate">
                    {selectedRow !== null && results[selectedRow] ? `Test Seq: ${results[selectedRow].ABBREV}` : 'Test Sequence'}
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr>
                          {['SEQ', 'MNC', 'RFLAG', 'VALUE'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-600 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {testSeqLoading ? (
                          <tr><td colSpan={4} className="px-2 py-8 text-center text-[10px]">
                            <div className="flex items-center justify-center gap-1.5 text-gray-400">
                              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading…
                            </div>
                          </td></tr>
                        ) : testSeq.length === 0 ? (
                          <tr><td colSpan={4} className="px-2 py-8 text-center text-[10px] text-gray-300">
                            {selectedRow !== null ? 'No sequence data' : 'Click a result row'}
                          </td></tr>
                        ) : testSeq.map((s, i) => {
                          const isAbnormal = s.RFLAG && s.RFLAG.trim() !== '';
                          return (
                            <tr key={i} className={`border-b border-gray-100 ${isAbnormal ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-2 py-[3px] text-[10px] font-mono text-gray-600 border-r border-gray-100">{s.TESTSEQ || '—'}</td>
                              <td className="px-2 py-[3px] text-[10px] text-gray-600 border-r border-gray-100 truncate max-w-[60px]">{s.MNEMONIC || '—'}</td>
                              <td className="px-2 py-[3px] text-[10px] border-r border-gray-100">
                                {isAbnormal ? <span className="text-red-600 font-bold">{s.RFLAG}</span> : <span className="text-gray-300">—</span>}
                              </td>
                              <td className={`px-2 py-[3px] text-[10px] font-semibold tabular-nums ${isAbnormal ? 'text-red-600' : 'text-blue-600'}`}>{s.VALUE || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* BOTTOM: Image viewer + right sidebar */}
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* ── Image / Notes area ── */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                  {/* Image toolbar */}
                  {!showNotes && (
                    <div className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-gray-900 border-b border-gray-200 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mr-1">Specimen Image</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setZoom(z => Math.max(25, z - 25))} disabled={!hasImage}
                          className="w-6 h-6 rounded bg-gray-100 text-gray-700 font-bold flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-40 text-sm">−</button>
                        <button onClick={() => setZoom(100)} disabled={!hasImage}
                          className="w-12 text-center text-[11px] font-mono font-bold text-gray-700 hover:text-blue-600 transition-colors disabled:opacity-40">
                          {zoom}%
                        </button>
                        <button onClick={() => setZoom(z => Math.min(600, z + 25))} disabled={!hasImage}
                          className="w-6 h-6 rounded bg-gray-100 text-gray-700 font-bold flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-40 text-sm">+</button>
                      </div>
                      {hasImage && [50, 100, 150, 200].map(pct => (
                        <button key={pct} onClick={() => setZoom(pct)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-colors ${zoom === pct ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600'}`}>
                          {pct}%
                        </button>
                      ))}
                      <div className="ml-auto flex items-center gap-1">
                        {imageUrl && (
                          <>
                            <button onClick={() => window.open(imageUrl, '_blank')}
                              className="h-6 px-2 text-[10px] font-semibold rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-1">
                              <Maximize2 size={10} /> Full
                            </button>
                            <button onClick={handleDownload}
                              className="h-6 px-2 text-[10px] font-semibold rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-1">
                              <Download size={10} /> Save
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Image viewer — SCROLLABLE (KEY FIX) ── */}
                  {!showNotes && (
                    <div className="flex-1 bg-gray-300 dark:bg-gray-800 overflow-auto">
                      {imageLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 select-none">
                          <div className="w-9 h-9 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs font-medium">Loading image…</p>
                          <p className="text-[10px] opacity-60 font-mono">{currentLabno}</p>
                        </div>
                      ) : imageUrl ? (
                        <MagnifierViewer src={imageUrl} zoom={zoom} labno={currentLabno} />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 select-none">
                          <ImageIcon size={52} className="mb-2.5 opacity-20" />
                          <p className="text-xs font-medium opacity-50">
                            {imageError === 'not_found' ? 'No specimen image found'
                              : imageError === 'error' ? 'Failed to load image'
                                : 'Specimen scan image'}
                          </p>
                          <p className="text-[10px] opacity-30 mt-1 font-mono">{currentLabno}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes panel */}
                  {showNotes && (
                    <div className="flex-1 flex flex-col overflow-hidden border-t-2 border-amber-300 bg-amber-50/30">
                      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-amber-100 border-b border-amber-200">
                        <div className="flex items-center gap-2">
                          <FileText size={13} className="text-amber-600" />
                          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Sample Notes</span>
                          {!notesLoading && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                              {notes.length} note{notes.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <button onClick={() => setShowNotes(false)} className="w-6 h-6 rounded flex items-center justify-center text-amber-500 hover:bg-amber-200 transition-colors"><X size={12} /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {notesLoading ? (
                          <div className="flex items-center justify-center h-full gap-2 text-amber-500">
                            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading notes…</span>
                          </div>
                        ) : notes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                            <FileText size={32} className="opacity-20" />
                            <p className="text-sm">No notes found</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-amber-100">
                            {notes.map((note, i) => {
                              const fmtDT = (raw: string | null | undefined): string => {
                                if (!raw) return '—';
                                const d2 = new Date(raw);
                                if (isNaN(d2.getTime())) return raw;
                                return d2.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                              };
                              const creator = note.CREATE_FIRSTNAME && note.CREATE_LASTNAME
                                ? `${note.CREATE_FIRSTNAME} ${note.CREATE_LASTNAME}`
                                : `User #${note.CREATE_USER_ID ?? '?'}`;
                              return (
                                <div key={note.NOTEID ?? i} className="px-4 py-3 hover:bg-amber-50 transition-colors">
                                  {note.NOTEPRIORITY === '1' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 mb-2 inline-block">HIGH PRIORITY</span>
                                  )}
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-[12px] font-bold text-gray-800 uppercase">{creator}</span>
                                    <span className="text-[11px] font-mono text-amber-600 whitespace-nowrap flex-shrink-0">{fmtDT(note.CREATE_DT)}</span>
                                  </div>
                                  <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
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
                <div className="flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto"
                  style={{ width: '196px' }}>

                  {/* Actions */}
                  <div className="px-2.5 py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Actions</p>
                    <div className="flex flex-col gap-1.5">
                      <ABtn icon={<ClipboardList size={11} />} label="Audit Trail" onClick={() => setShowAudit(true)} />
                      <ABtn icon={<Maximize2 size={11} />} label="Full Image" onClick={() => imageUrl && window.open(imageUrl, '_blank')} disabled={!hasImage} />
                      <ABtn icon={<Download size={11} />} label="Download Image" onClick={handleDownload} disabled={!hasImage} />

                      {/* Include Patient Info toggle */}
                      <button onClick={() => setIncludePatientInfo(v => !v)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                          includePatientInfo
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                        }`}>
                        <div className={`w-3.5 h-3.5 rounded flex-shrink-0 border-[1.5px] flex items-center justify-center transition-all ${includePatientInfo ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'}`}>
                          {includePatientInfo && (
                            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        Include Patient Info
                      </button>

                      <ABtn icon={<Mail size={11} />} label="Email" onClick={() => setShowEmail(true)} />

                      <button onClick={() => setShowNotes(v => !v)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                          showNotes
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300'
                        }`}>
                        <FileText size={11} className="flex-shrink-0" />
                        {showNotes ? 'Hide Notes' : 'Show Notes'}
                        {notes.length > 0 && (
                          <span className="ml-auto text-[9px] font-bold px-1.5 rounded bg-amber-100 text-amber-700">{notes.length}</span>
                        )}
                      </button>

                      <ABtn icon={<BookOpen size={11} />} label="Show Letters" onClick={() => setShowLetters(true)} variant="emerald" />
                    </div>
                  </div>

                  {/* Patient Filter Cards */}
                  <div className="px-2.5 py-2.5 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Patient Filter Cards
                      {filterCards.length > 1 && <span className="ml-1 text-blue-500">({filterCards.length})</span>}
                    </p>
                    {filterLoading ? (
                      <div className="flex justify-center py-2"><div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                      <div className="rounded-lg overflow-hidden border border-gray-200 text-[10px]">
                        <div className="flex bg-gray-100 border-b border-gray-200 sticky top-0">
                          <span className="px-1.5 py-1 font-bold text-gray-600 border-r border-gray-200" style={{ width: '72px', flexShrink: 0 }}>Labno</span>
                          <span className="px-1.5 py-1 font-bold text-gray-600 border-r border-gray-200" style={{ width: '52px', flexShrink: 0 }}>Status</span>
                          <span className="flex-1 px-1.5 py-1 font-bold text-gray-600">View</span>
                        </div>
                        <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                          {filterCards.length === 0 ? (
                            <div className="flex items-center bg-white">
                              <span className="px-1.5 py-1 font-mono text-gray-700 border-r border-gray-200 truncate" style={{ width: '72px', flexShrink: 0 }}>{labno}</span>
                              <span className={`px-1.5 py-1 font-semibold border-r border-gray-200 ${status === 'MAILED' ? 'text-emerald-600' : 'text-red-500'}`} style={{ width: '52px', flexShrink: 0 }}>{status}</span>
                              <span className="px-1 py-0.5 flex-shrink-0">
                                <button className="h-5 px-1.5 text-[9px] rounded font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-0.5">
                                  <FlaskConical size={8} /> PIS
                                </button>
                              </span>
                            </div>
                          ) : filterCards.map((card, i) => {
                            const cardStatus = card.DTRPTD && card.DTRPTD.trim() ? 'MAILED' : 'UNMAILED';
                            const isActive = card.LABNO === activeLabno;
                            return (
                              <div key={i} className={`flex items-center border-b border-gray-100 last:border-b-0 ${isActive ? 'bg-blue-50' : 'bg-white'}`}>
                                <span className={`px-1.5 py-1 font-mono border-r border-gray-200 truncate ${isActive ? 'text-blue-700 font-bold' : 'text-gray-700'}`} style={{ width: '72px', flexShrink: 0 }}>{card.LABNO}</span>
                                <span className={`px-1.5 py-1 font-semibold border-r border-gray-200 ${cardStatus === 'MAILED' ? 'text-emerald-600' : 'text-red-500'}`} style={{ width: '52px', flexShrink: 0 }}>{cardStatus}</span>
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
                <span className="ml-3 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-600">Patient Info Included in Email</span>
              )}
            </span>
            <button onClick={onClose}
              className="h-7 px-4 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Close
            </button>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes pisIn {
            from { opacity:0; transform:scale(.97) translateY(10px); }
            to   { opacity:1; transform:scale(1)   translateY(0);    }
          }
        `}}
        />
      </div>

      {showAudit   && <AuditTrailModal labno={currentLabno} patientName={fullName} onClose={() => setShowAudit(false)} />}
      {showEmail   && currentRecord && <EmailModal detail={detail} record={currentRecord} includePatientInfo={includePatientInfo} onClose={() => setShowEmail(false)} />}
      {showLetters && <LettersModal labno={currentLabno} patientName={fullName} onClose={() => setShowLetters(false)} />}
    </>
  );
};

export default PatientRecordModal;