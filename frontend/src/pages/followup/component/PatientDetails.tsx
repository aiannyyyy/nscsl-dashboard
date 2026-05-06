import React, { useState, useRef, useEffect } from 'react';
import {
    Search, Download, Eye, X, Calendar,
    User, FlaskConical, ClipboardList, MapPin,
    Loader2, AlertCircle, FileSpreadsheet, Image as ImgIcon,
} from 'lucide-react';
import { usePatientDetails } from '../../../hooks/FollowupHooks/usePatientDetails';
import { downloadChart } from '../../../utils/chartDownloadUtils';
import type { PatientDetail } from '../../../services/FollowupServices/patientDetailsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today        = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastOfMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
const fmtISO       = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const fmtDisplay = (val?: string | null): { date: string; time: string } | null => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return { date: val, time: '' };
    const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time };
};

// Oracle TMCOLL/BIRTHTM are stored as numeric strings like "1430" = 14:30
const fmtTm = (tm?: string | null): string => {
    if (!tm) return '';
    const s = String(tm).padStart(4, '0');
    const hh = s.slice(0, 2);
    const mm = s.slice(2, 4);
    const h = parseInt(hh, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${mm} ${ampm}`;
};

const DateCell: React.FC<{ val?: string | null; tm?: string | null }> = ({ val, tm }) => {
    const f = fmtDisplay(val);
    if (!f) return <span className="text-slate-400">—</span>;
    const timeStr = tm ? fmtTm(tm) : (f.time !== '12:00 AM' ? f.time : '');
    return (
        <div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">{f.date}</p>
            {timeStr && <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{timeStr}</p>}
        </div>
    );
};

const fmtSex = (val?: string | null) => {
    if (!val) return '—';
    const map: Record<string, string> = { '1': 'Male', '2': 'Female', 'A': 'Ambiguous' };
    return map[val.toUpperCase()] ?? val;
};

const sexBadgeColor = (val?: string | null): BadgeColor => {
    if (!val) return 'slate';
    const v = val.toUpperCase();
    if (v === '1') return 'violet';
    if (v === '2') return 'rose';
    return 'amber';
};

// ─── Badge ────────────────────────────────────────────────────────────────────

const BADGE_STYLES = {
    slate:   'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    rose:    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
} as const;

type BadgeColor = keyof typeof BADGE_STYLES;

const Badge: React.FC<{ label?: string | null; color?: BadgeColor }> = ({ label, color = 'slate' }) => (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide ${BADGE_STYLES[color]}`}>
        {label ?? '—'}
    </span>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const DetailModal: React.FC<{
    patient: PatientDetail | null;
    matched: boolean;
    onClose: () => void;
}> = ({ patient, matched, onClose }) => {
    useEffect(() => {
        if (!patient) return;
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [patient, onClose]);

    if (!patient) return null;

    const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-500">{icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                {children}
            </div>
        </div>
    );

    const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {value ?? <span className="text-slate-400">—</span>}
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/60"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl">
                    <div>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Patient Record</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                            {patient.LNAME}, {patient.FNAME}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Lab No. <span className="font-semibold text-slate-600 dark:text-slate-300">{patient.LABNO}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 mt-0.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={17} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <Section icon={<User size={13} />} title="Patient Information">
                        {/* Lab No — green if LABNO===LINK, red otherwise (same as table) */}
                        <Field label="Lab No."         value={<Badge label={patient.LABNO} color={matched ? 'emerald' : 'rose'} />} />
                        {/* Link — always green if present */}
                        <Field label="Link"            value={<Badge label={patient.LINK ?? '—'} color={patient.LINK ? 'emerald' : 'slate'} />} />
                        {/* Sex — violet/rose/amber badge matching table */}
                        <Field label="Sex"             value={<Badge label={fmtSex(patient.SEX)} color={sexBadgeColor(patient.SEX)} />} />
                        <Field label="Birth Date"      value={<DateCell val={patient.BIRTHDT} tm={patient.BIRTHTM} />} />
                        <Field label="Birth Weight"    value={patient.BIRTHWT} />
                        <Field label="Gestational Age" value={patient.GESTAGE} />
                        {/* Clinical Status — emerald badge matching table */}
                        <Field label="Clinical Status" value={<Badge label={patient.CLINSTAT} color={patient.CLINSTAT ? 'emerald' : 'slate'} />} />
                    </Section>

                    <hr className="border-slate-100 dark:border-slate-800" />

                    <Section icon={<FlaskConical size={13} />} title="Test Information">
                        <Field label="Mnemonic"           value={<Badge label={patient.MNEMONIC} color="emerald" />} />
                        <Field label="Test Code"          value={<Badge label={patient.TESTCODE} color="amber" />} />
                        <Field label="Value"              value={patient.VALUE} />
                        <Field label="Date Received"      value={<DateCell val={patient.DTRECV} tm={patient.TMRECV} />} />
                        <Field label="Current Collection" value={<DateCell val={patient.CURRENT_DTCOLL} tm={patient.CURRENT_TMCOLL} />} />
                        <Field label="Linked Collection"  value={<DateCell val={patient.LINKED_DTCOLL} tm={patient.LINKED_TMCOLL} />} />
                        <Field label="Last Modified"      value={<DateCell val={patient.LASTMOD} />} />
                    </Section>

                    <hr className="border-slate-100 dark:border-slate-800" />

                    <Section icon={<ClipboardList size={13} />} title="Provider & Submission">
                        <Field label="Physician ID"  value={patient.PHYSID} />
                        <Field label="Facility Code"  value={patient.SUBMID} />
                    </Section>

                    <hr className="border-slate-100 dark:border-slate-800" />

                    <Section icon={<MapPin size={13} />} title="Location">
                        <Field label="County" value={patient.COUNTY} />
                    </Section>
                </div>

                {/* Footer */}
                <div className="shrink-0 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Export Dropdown ──────────────────────────────────────────────────────────

const ExportMenu: React.FC<{
    disabled: boolean;
    onExportExcel: () => void;
    onExportPng: () => void;
}> = ({ disabled, onExportExcel, onExportPng }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
                <Download size={13} />
                Export
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-20 overflow-hidden">
                    <button
                        onClick={() => { onExportExcel(); setOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                        <FileSpreadsheet size={14} className="text-emerald-500" />
                        Export as Excel
                    </button>
                    <button
                        onClick={() => { onExportPng(); setOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                        <ImgIcon size={14} className="text-blue-500" />
                        Export as PNG
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Test Codes ───────────────────────────────────────────────────────────────
// 'ALL' = show records matching every code in this list combined
// Individual entries = filter to that single code only
 
const TEST_CODES = [
    'ALL',
    'TSH1', 'TSH2',
    'OHP1', 'OHP2', 'OHP3',
    'GMU', 'GN1', 'GC1', 'GN2', 'GC2', 'GMVC', 'GNC', 'GCC', 'GALP',
    'PHEMS1', 'PHEMS2',
    'LEUMS1', 'LEUMS2',
    'METMS1', 'METMS2',
    'SAMS2',
    'TYRMS1', 'TYRMS2',
    'CITMS1', 'CITMS2',
    'CUDMS1', 'CUDMS2',
    'CP1MS1', 'CP1MS2',
    'CP2MS1', 'CP2MS2',
    'GA2MS1', 'GA2MS2',
    'MCAMS1', 'MCAMS2',
    'VLCMS1', 'VLCMS2',
    'LCHMS1', 'LCHMS2',
    'MMAMS1', 'MMAMS2',
    'MDMS1', 'MDMS2',
    'BKTMS1', 'BKTMS2',
    'IVAMS1', 'IVAMS2',
    'GA1MS1', 'GA1MS2',
    'STPN', 'TPN1',
    'BTND1', 'BTND2',
    'IRT1', 'IRT2', 'IRT3',
    'BARTS',
    'FE', 'F', 'FAEB', 'FAES', 'FEA', 'FS', 'FDA',
    'BTS1',
] as const;
 

// ─── Table Column Config ──────────────────────────────────────────────────────

interface ColDef {
    key: keyof PatientDetail | 'FULL_NAME';
    label: string;
}

const COLUMNS: ColDef[] = [
    { key: 'LABNO',          label: 'Lab No.'         },
    { key: 'LINK',           label: 'Link'            },
    { key: 'FULL_NAME',      label: 'Patient Name'    },
    { key: 'SEX',            label: 'Sex'             },
    { key: 'BIRTHDT',        label: 'Birth Date'      },
    { key: 'BIRTHWT',        label: 'Birth Weight'    },
    { key: 'GESTAGE',        label: 'Gest. Age'       },
    { key: 'MNEMONIC',       label: 'Mnemonic'        },
    { key: 'TESTCODE',       label: 'Test Code'       },
    { key: 'VALUE',          label: 'Value'           },
    { key: 'LASTMOD',        label: 'Last Modified'   },
    { key: 'DTRECV',         label: 'Date Received'   },
    { key: 'CURRENT_DTCOLL', label: 'Curr. Collection'},
    { key: 'LINKED_DTCOLL',  label: 'Linked Collection'},
    { key: 'PHYSID',         label: 'Physician ID'    },
    { key: 'SUBMID',         label: 'Facility Code'    },
    { key: 'CLINSTAT',       label: 'Clin. Status'    },
    { key: 'COUNTY',         label: 'Province/County' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const PatientDetails: React.FC = () => {
    const cardRef = useRef<HTMLDivElement>(null);

    // ── Filter state (UI controls)
    const [dateFrom, setDateFrom] = useState(fmtISO(firstOfMonth));
    const [dateTo,   setDateTo]   = useState(fmtISO(lastOfMonth));
    const [testCode, setTestCode] = useState<string>('ALL');
    const [search,   setSearch]   = useState('');

    // ── Committed filters — pre-filled with current month so data loads on mount
    const [committed, setCommitted] = useState<{ dateFrom: string; dateTo: string; testCode: string }>({
        dateFrom: fmtISO(firstOfMonth),
        dateTo:   fmtISO(lastOfMonth),
        testCode: 'ALL',
    });
    const handleGenerate = () => setCommitted({ dateFrom, dateTo, testCode });

    // ── Modal state — store both patient and whether it's matched
    const [selected, setSelected] = useState<{ patient: PatientDetail; matched: boolean } | null>(null);

    // ── Data fetching — auto-loads on mount with current month, refreshes on Generate
    const { data, isLoading, isError, error, isFetching } = usePatientDetails(committed);
    const rows = data?.data ?? [];

    // ── If LABNO === LINK → both green. If not → LABNO red, LINK still green.
    const isMatched = (r: PatientDetail): boolean =>
        r.LINK !== null && r.LABNO === r.LINK;

    // ── Client-side search filter
    const filtered = rows.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            r.LABNO?.toLowerCase().includes(q)    ||
            r.LNAME?.toLowerCase().includes(q)    ||
            r.FNAME?.toLowerCase().includes(q)    ||
            r.TESTCODE?.toLowerCase().includes(q) ||
            r.MNEMONIC?.toLowerCase().includes(q) ||
            r.COUNTY?.toLowerCase().includes(q)
        );
    });

    // ── Plain string date formatter for Excel export
    const fmtStr = (val?: string | null) => {
        const f = fmtDisplay(val);
        if (!f) return '—';
        return f.time ? `${f.date} ${f.time}` : f.date;
    };

    // ── Export handlers
    const handleExportExcel = () => {
        downloadChart({
            elementId: 'patient-details-table',
            filename: `patient-details-${dateFrom}-to-${dateTo}`,
            format: 'excel',
            sheetName: 'Patient Details',
            data: filtered.map(r => ({
                'Lab No.':           r.LABNO,
                'Last Name':         r.LNAME,
                'First Name':        r.FNAME,
                'Mnemonic':          r.MNEMONIC,
                'Test Code':         r.TESTCODE,
                'Value':             r.VALUE,
                'Date Received':     fmtStr(r.DTRECV),
                'Current Collection':fmtStr(r.CURRENT_DTCOLL),
                'Linked Collection': fmtStr(r.LINKED_DTCOLL),
                'Last Modified':     fmtStr(r.LASTMOD),
                'Clinical Status':   r.CLINSTAT,
                'Physician ID':      r.PHYSID,
                'Facility Code':      r.SUBMID,
                'Sex':               r.SEX,
                'Birth Date':        fmtStr(r.BIRTHDT),
                'Birth Weight':      r.BIRTHWT,
                'Gestational Age':   r.GESTAGE,
                'County':            r.COUNTY,
            })),
        });
    };

    const handleExportPng = () => {
        downloadChart({
            elementId: 'patient-details-card',
            filename: `patient-details-${dateFrom}-to-${dateTo}`,
            format: 'png',
            scale: 2,
        });
    };

    return (
        <>
            <DetailModal
                patient={selected?.patient ?? null}
                matched={selected?.matched ?? false}
                onClose={() => setSelected(null)}
            />

            <div
                id="patient-details-card"
                ref={cardRef}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col overflow-hidden"
                style={{ height: 600 }}
            >
                {/* ── Card Header ───────────────────────────────────── */}
                <div className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
                    {/* Title + action */}
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Patient Details</h2>
                        </div>

                        <div className="flex items-center gap-2">
                            {isFetching && !isLoading && (
                                <Loader2 size={13} className="animate-spin text-blue-400" />
                            )}
                            <ExportMenu
                                disabled={isLoading || filtered.length === 0}
                                onExportExcel={handleExportExcel}
                                onExportPng={handleExportPng}
                            />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date From */}
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                            <Calendar size={12} className="text-slate-400 shrink-0" />
                            <input
                                type="date"
                                value={dateFrom}
                                max={dateTo}
                                onChange={e => setDateFrom(e.target.value)}
                                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-[7.5rem]"
                            />
                        </label>

                        <span className="text-slate-400 text-xs">—</span>

                        {/* Date To */}
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                            <Calendar size={12} className="text-slate-400 shrink-0" />
                            <input
                                type="date"
                                value={dateTo}
                                min={dateFrom}
                                onChange={e => setDateTo(e.target.value)}
                                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-[7.5rem]"
                            />
                        </label>

                        {/* Test Code */}
                        <select
                            value={testCode}
                            onChange={e => setTestCode(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                        >
                            {TEST_CODES.map(tc => (
                                <option key={tc} value={tc}>{tc}</option>
                            ))}
                        </select>

                        {/* Generate Button — now blue */}
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
                        >
                            {isLoading ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : null}
                            Generate
                        </button>

                        {/* Search */}
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 ml-auto cursor-text">
                            <Search size={12} className="text-slate-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search name, lab no, county..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none w-44"
                            />
                        </label>

                        {/* Record count */}
                        {!isLoading && (
                            <span className="text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                                {filtered.length.toLocaleString()} record{filtered.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Table ─────────────────────────────────────────── */}
                <div id="patient-details-table" className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                            <Loader2 size={26} className="animate-spin text-blue-400" />
                            <p className="text-sm">Loading patient data…</p>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <AlertCircle size={26} className="text-rose-400" />
                            <p className="text-sm text-rose-500">{(error as Error)?.message ?? 'Failed to load data'}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                            <FlaskConical size={28} className="text-slate-300 dark:text-slate-600" />
                            <p className="text-sm">No records found for the selected filters</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50/95 dark:bg-slate-800/95 border-b border-slate-100 dark:border-slate-700">
                                    {COLUMNS.map(col => (
                                        <th
                                            key={col.key}
                                            className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap"
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap sticky right-0 bg-slate-50/95 dark:bg-slate-800/95">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row, i) => (
                                    <tr
                                        key={`${row.LABNO}-${row.LINK ?? i}`}
                                        className="border-b border-slate-50 dark:border-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group"
                                    >
                                        {/* Lab No. — green if LABNO===LINK, red otherwise */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <Badge label={row.LABNO} color={isMatched(row) ? 'emerald' : 'rose'} />
                                        </td>
                                        {/* Link — always green badge if present */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <Badge label={row.LINK ?? '—'} color={row.LINK ? 'emerald' : 'slate'} />
                                        </td>
                                        {/* Patient Name (merged) */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs leading-tight">{row.LNAME}</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight">{row.FNAME}</p>
                                        </td>
                                        {/* Sex */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <Badge label={fmtSex(row.SEX)} color={sexBadgeColor(row.SEX)} />
                                        </td>
                                        {/* Birth Date */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <DateCell val={row.BIRTHDT} tm={row.BIRTHTM} />
                                        </td>
                                        {/* Birth Weight */}
                                        <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {row.BIRTHWT ?? '—'}
                                        </td>
                                        {/* Gestational Age */}
                                        <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {row.GESTAGE ?? '—'}
                                        </td>
                                        {/* Mnemonic */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <Badge label={row.MNEMONIC} color="emerald" />
                                        </td>
                                        {/* Test Code */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <Badge label={row.TESTCODE} color="amber" />
                                        </td>
                                        {/* Value */}
                                        <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {row.VALUE ?? '—'}
                                        </td>
                                        {/* Last Modified */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <DateCell val={row.LASTMOD} />
                                        </td>
                                        {/* Date Received */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <DateCell val={row.DTRECV} tm={row.TMRECV} />
                                        </td>
                                        {/* Current Collection */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <DateCell val={row.CURRENT_DTCOLL} tm={row.CURRENT_TMCOLL} />
                                        </td>
                                        {/* Linked Collection */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <DateCell val={row.LINKED_DTCOLL} tm={row.LINKED_TMCOLL} />
                                        </td>
                                        {/* Physician ID */}
                                        <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {row.PHYSID ?? '—'}
                                        </td>
                                        {/* Facility Code */}
                                        <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {row.SUBMID ?? '—'}
                                        </td>
                                        {/* Clinical Status */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <Badge label={row.CLINSTAT} color={row.CLINSTAT ? 'emerald' : 'slate'} />
                                        </td>
                                        {/* Province/County */}
                                        <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {row.COUNTY ?? '—'}
                                        </td>
                                        {/* Action — View button now blue */}
                                        <td className="px-4 py-2.5 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors">
                                            <button
                                                onClick={() => setSelected({ patient: row, matched: isMatched(row) })}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                            >
                                                <Eye size={11} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
};