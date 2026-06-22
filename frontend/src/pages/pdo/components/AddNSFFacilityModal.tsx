// src/pages/PDO/components/AddNSFFacilityModal.tsx
import React, { useState, useMemo } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useAddNSFFacility, useUpdateNSFFacility } from '../../../hooks/PDOHooks/useNSFFacilities';
import type { NSFFacility } from '../../../services/PDOServices/nsfFacilitesServices';
import { useAuth } from '../../../context/AuthContext';

// ─── Province / City Map ──────────────────────────────────────────────────────
const PROVINCE_CITY_MAP: Record<string, string[]> = {
  'BATANGAS': [
    'AGONCILLO', 'ALITAGTAG', 'BALAYAN', 'BALETE', 'BATANGAS CITY', 'BAUAN',
    'CALACA CITY', 'CALATAGAN', 'CUENCA', 'IBAAN', 'LAUREL', 'LEMERY', 'LIAN',
    'LIPA CITY', 'LOBO', 'MABINI', 'MALVAR', 'MATAASNAKAHOY', 'NASUGBU',
    'PADRE GARCIA', 'ROSARIO', 'SAN JOSE', 'SAN JUAN', 'SAN LUIS', 'SAN NICOLAS',
    'SAN PASCUAL', 'SANTA TERESITA', 'SANTO TOMAS CITY', 'TAAL', 'TALISAY',
    'TANAUAN CITY', 'TAYSAN', 'TINGLOY', 'TUY'
  ],
  'CAVITE': [
    'ALFONSO', 'AMADEO', 'BACOOR CITY', 'CARMONA', 'CAVITE CITY', 'DASMARINAS CITY',
    'GENERAL EMILIO AGUINALDO', 'GENERAL MARIANO ALVAREZ', 'GENERAL TRIAS CITY',
    'IMUS CITY', 'INDANG', 'KAWIT', 'MAGALLANES', 'MARAGONDON', 'MENDEZ', 'NAIC',
    'NOVELETA', 'ROSARIO', 'SILANG', 'TAGAYTAY CITY', 'TANZA', 'TERNATE',
    'TRECE MARTIRES CITY'
  ],
  'LAGUNA': [
    'ALAMINOS', 'BAY', 'BINAN CITY', 'CABUYAO CITY', 'CALAMBA CITY', 'CALAUAN',
    'CAVINTI', 'FAMY', 'KALAYAAN', 'LILIW', 'LOS BANOS', 'LUISIANA', 'LUMBAN',
    'MABITAC', 'MAGDALENA', 'MAJAYJAY', 'NAGCARLAN', 'PAETE', 'PAGSANJAN', 'PAKIL',
    'PANGIL', 'PILA', 'RIZAL', 'SAN PABLO CITY', 'SAN PEDRO CITY', 'SANTA CRUZ',
    'SANTA MARIA', 'SANTA ROSA CITY', 'SINILOAN', 'VICTORIA'
  ],
  'QUEZON': [
    'AGDANGAN', 'ALABAT', 'ATIMONAN', 'BUENAVISTA', 'BURDEOS', 'CALAUAG',
    'CANDELARIA', 'CATANAUAN', 'DOLORES', 'GENERAL LUNA', 'GENERAL NAKAR',
    'GUINAYANGAN', 'GUMACA', 'INFANTA', 'JOMALIG', 'LOPEZ', 'LUCBAN', 'LUCENA CITY',
    'MACALELON', 'MAUBAN', 'MULANAY', 'PADRE BURGOS', 'PAGBILAO', 'PANUKULAN',
    'PATNANUNGAN', 'PEREZ', 'PITOGO', 'PLARIDEL', 'POLILLO', 'QUEZON', 'REAL',
    'SAMPALOC', 'SAN ANDRES', 'SAN ANTONIO', 'SAN FRANCISCO', 'SAN NARCISO',
    'SARIAYA', 'TAGKAWAYAN', 'TAYABAS CITY', 'TIAONG', 'UNISAN'
  ],
  'RIZAL': [
    'ANGONO', 'ANTIPOLO CITY', 'BARAS', 'BINANGONAN', 'CAINTA', 'CARDONA',
    'JALAJALA', 'MORONG', 'PILILLA', 'RODRIGUEZ', 'SAN MATEO', 'TANAY', 'TAYTAY',
    'TERESA'
  ]
};

const ALL_PROVINCES = Object.keys(PROVINCE_CITY_MAP).sort();

const CATEGORIES: string[] = [
  'BHS', 'BIRTHING HOME', 'CHD', 'CHO', 'CLINIC', 'CONTINUITY CLINIC',
  'CUSTODIAL CARE', 'DIAGNOSTIC / THERAPEAUTIC', 'DIAGNOSTIC/THERAPEUTIC',
  'GENERAL HOSPITAL', 'HEALTH CENTER', 'HEALTH FACILITY', 'INFIRMARY',
  'INFIRMARY/DISPENSARY', 'LABORATORY', 'LEVEL 1', 'LEVEL 2', 'LEVEL 3',
  'LEVEL 4', 'LYING-IN', 'MEDICAL/DIAGNOSTIC CLINIC', 'MHO', 'N/A', 'NSC',
  'PHO', 'PHO-PHS', 'PRIMARY', 'PRIMARY CARE', 'PRIMARY CARE (BIRTHING HOME)',
  'PRIMARY CARE (BIRTHING HOME) BHS', 'PRIMARY CARE (BIRTHING HOME) OTHERS',
  'PRIMARY CARE (BIRTHING HOME) PRIVAT', 'PRIMARY CARE (BIRTHING HOME) PRIVATE',
  'PRIMARY CARE (BIRTHING HOME) RHU', 'PRIMARY CARE (INFIRMARY/DISPENSARY)',
  'RHU', 'SECONDARY', 'SPECIALIZED OUT-PATIENT', 'TERTIARY',
];

const TYPE1_OPTIONS: string[] = [
  'CHARTERED GOVERNMENT FACILITIES', 'CHD', 'CONTINUITY CLINIC',
  'DOH RETAINED HOSPITAL', 'LGU', 'N/A', 'NSC', 'PRIVATE',
];

const TYPE2_OPTIONS: string[] = [
  '3.5', 'CONTINUITY CLINIC', 'GOVERNMENT', 'LGU', 'NSC', 'NULL',
  'PARTNER AGENCY', 'PRIVATE',
];

const DESIGNATION_OPTIONS: string[] = [
  'ADMINISTRATOR', 'CHIEF OF HOSPITAL', 'CLINIC MANAGER', 'CLINIC MANAGER/OWNER',
  'CLINIC OWNER', 'FOLLOW-UP NURSE', 'HOSPITAL ADMINISTRATOR', 'MEDICAL ADMINISTRATOR',
  'MEDICAL DIRECTOR', 'MHO', 'MIDWIFE', 'MUNICIPAL HEALTH OFFICER', 'NBS COODINATOR',
  'NBS COORDINATOR', 'NBS COORDINATOR / NBS IN CHARGE', 'NBS HEAD', 'NBSC', 'NURSE I',
  'NURSING AIDE/CLERK', 'OWNER', 'OWNER/MANAGER', 'OWNER/NBS COORDINATOR', 'PRESIDENT',
  'REGIONAL COORDINATOR',
];

// ─── Constants ────────────────────────────────────────────────────────────────
const NOTIFICATION_EMAIL = 'itmis2nscsl@gmail.com';
const CURRENT_YEAR = String(new Date().getFullYear());

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toDateInput = (val?: string | null): string => {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

// ─── Email Notification (fire-and-forget) ─────────────────────────────────────
const sendFacilityEmail = async (
  facility: Partial<NSFFacility>,
  addedBy: string,
): Promise<void> => {
  try {
    const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    const rows: [string, string][] = [
      ['Facility Code',       facility.facility_code    ?? '—'],
      ['Facility Name',       facility.facility_name    ?? '—'],
      ['Category',            facility.category         ?? '—'],
      ['Type 1',              facility.type1            ?? '—'],
      ['Type 2',              facility.type2            ?? '—'],
      ['Region',              facility.region           ?? '—'],
      ['Province',            facility.province         ?? '—'],
      ['City / Municipality', facility.city             ?? '—'],
      ['Address',             facility.address          ?? '—'],
      ['Medical Director',    facility.medical_director ?? '—'],
      ['Contact Person',      facility.contact_person   ?? '—'],
      ['Designation',         facility.designation      ?? '—'],
      ['Tel / Cell',          facility.tel_cell         ?? '—'],
      ['Fax',                 facility.fax              ?? '—'],
      ['Email',               facility.email            ?? '—'],
      ['Date Accredited',     facility.date_accredited  ?? '—'],
      ['Year Accredited',     facility.year_accredited  ?? '—'],
      ['Last PO Date',        facility.last_po_date     ?? '—'],
      ['PO Number',           facility.po_number        ?? '—'],
      ['Remarks',             facility.remarks          ?? '—'],
    ];

    const tableRows = rows
      .map(([label, value]) =>
        `<tr>
          <td style="padding:6px 12px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;white-space:nowrap;">${label}</td>
          <td style="padding:6px 12px;color:#111827;border:1px solid #e5e7eb;">${value}</td>
        </tr>`,
      )
      .join('\n');

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#111827;">
  <div style="background:#1d4ed8;padding:24px 32px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:20px;">New NSF Facility Added</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Submitted on ${now} by <strong>${addedBy}</strong></p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px 32px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${tableRows}</table>
    <p style="margin-top:20px;font-size:12px;color:#6b7280;">
      This is an automated notification from the NSF Facility Registry System.
    </p>
  </div>
</div>`;

    await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Send an HTML email using Gmail:\nTo: ${NOTIFICATION_EMAIL}\nSubject: [NSF Registry] New Facility Added – ${facility.facility_name ?? 'Unknown'} (Code: ${facility.facility_code ?? '—'})\nBody (HTML):\n${htmlBody}\n\nAfter sending, reply with only: SENT`,
        }],
        mcp_servers: [
          { type: 'url', url: 'https://gmailmcp.googleapis.com/mcp/v1', name: 'gmail-mcp' },
        ],
      }),
    });
  } catch {
    // Swallow — email is best-effort; do not block the save
  }
};

// ─── Empty Form ───────────────────────────────────────────────────────────────
const EMPTY_FORM: Partial<NSFFacility> = {
  facility_code:    '',
  facility_name:    '',
  category:         '',
  type1:            '',
  type2:            '',
  medical_director: '',
  contact_person:   '',
  designation:      '',
  tel_cell:         '',
  fax:              '',
  email:            '',
  address:          '',
  city:             '',
  province:         '',
  region:           '4A',
  date_accredited:  '',
  year_accredited:  CURRENT_YEAR,
  last_po_date:     '',
  po_number:        '',
  remarks:          '',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface AddNSFFacilityModalProps {
  open:       boolean;
  onClose:    () => void;
  editing?:   NSFFacility | null;
  provinces?: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AddNSFFacilityModal: React.FC<AddNSFFacilityModalProps> = ({
  open,
  onClose,
  editing,
  provinces = [],
}) => {
  const addMutation    = useAddNSFFacility();
  const updateMutation = useUpdateNSFFacility();
  const { user }       = useAuth();
  const username       = user?.name ?? 'system';

  const [form,         setForm]         = useState<Partial<NSFFacility>>(EMPTY_FORM);
  const [citySearch,   setCitySearch]   = useState('');
  const [showCitySugg, setShowCitySugg] = useState(false);

  // Reset form whenever modal opens or editing target changes
  React.useEffect(() => {
    const base = editing ?? EMPTY_FORM;
    setForm({
      ...base,
      date_accredited: toDateInput(base.date_accredited),
      last_po_date:    toDateInput(base.last_po_date),
      year_accredited: editing ? (base.year_accredited ?? CURRENT_YEAR) : CURRENT_YEAR,
    });
    setCitySearch(editing?.city ?? '');
  }, [editing, open]);

  // ── Field helpers ────────────────────────────────────────────────────────
  const UPPERCASE_EXEMPT = new Set(['email', 'tel_cell', 'fax', 'facility_code', 'year_accredited']);

  const field = (key: keyof NSFFacility) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const raw = e.target.value;
    const value = !UPPERCASE_EXEMPT.has(key) && e.target.type !== 'number' && e.target.type !== 'email' && e.target.type !== 'date'
      ? raw.toUpperCase()
      : raw;
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(f => ({ ...f, province: e.target.value, city: '' }));
    setCitySearch('');
  };

  // ── City autocomplete ────────────────────────────────────────────────────
  const citiesForProvince = useMemo(() => {
    const prov = form.province ?? '';
    return prov && PROVINCE_CITY_MAP[prov] ? PROVINCE_CITY_MAP[prov] : [];
  }, [form.province]);

  const citySuggestions = useMemo(() => {
    if (!citySearch.trim()) return citiesForProvince;
    const q = citySearch.toLowerCase();
    return citiesForProvince.filter(c => c.toLowerCase().includes(q));
  }, [citySearch, citiesForProvince]);

  const pickCity = (c: string) => {
    setCitySearch(c);
    setForm(f => ({ ...f, city: c }));
    setShowCitySugg(false);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const isLoading = addMutation.isPending || updateMutation.isPending;

  // NOTE: This handler is called via onClick on a type="button" in the footer.
  // The footer lives OUTSIDE the <form> tag, so type="submit" would not reach it.
  // Using type="button" + onClick avoids that disconnect and prevents any double-fire.
  const handleSubmit = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // guard against accidental double-click
    try {
      if (editing?.id) {
        await updateMutation.mutateAsync({
          id:   editing.id,
          data: { ...form, modified_by: username },
        });
      } else {
        await addMutation.mutateAsync({ ...form, created_by: username });
        sendFacilityEmail(form, username); // intentionally not awaited
      }
      onClose();
    } catch {
      // errors surfaced via hook's onError
    }
  };

  if (!open) return null;

  // ── Style shortcuts ──────────────────────────────────────────────────────
  const inputCls         = "w-full h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const inputReadonlyCls = "w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none";
  const labelCls         = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";
  const legendCls        = "text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editing ? 'Edit Facility' : 'Add New Facility'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {editing
                ? `Editing: ${editing.facility_name}`
                : 'Fill in the details below to register a new NSF facility.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Basic Info */}
          <fieldset>
            <legend className={legendCls}>Basic Information</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Facility Code *</label>
                <input
                  type="text"
                  required
                  value={form.facility_code ?? ''}
                  onChange={field('facility_code')}
                  className={inputCls}
                  placeholder="e.g. 1234"
                />
              </div>
              <div>
                <label className={labelCls}>Facility Name *</label>
                <input
                  type="text"
                  required
                  value={form.facility_name ?? ''}
                  onChange={field('facility_name')}
                  className={inputCls}
                  placeholder="e.g. Healthway Daniel Mercado Medical Center"
                />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select value={form.category ?? ''} onChange={field('category')} className={inputCls}>
                  <option value="">— Select Category —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Type 1</label>
                <select value={form.type1 ?? ''} onChange={field('type1')} className={inputCls}>
                  <option value="">— Select Type 1 —</option>
                  {TYPE1_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Type 2</label>
                <select value={form.type2 ?? ''} onChange={field('type2')} className={inputCls}>
                  <option value="">— Select Type 2 —</option>
                  {TYPE2_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Region</label>
                <input
                  type="text"
                  value={form.region ?? '4A'}
                  onChange={field('region')}
                  className={inputCls}
                  placeholder="e.g. 4A"
                />
              </div>
            </div>
          </fieldset>

          {/* Location */}
          <fieldset>
            <legend className={legendCls}>Location</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Province</label>
                <select value={form.province ?? ''} onChange={handleProvinceChange} className={inputCls}>
                  <option value="">— Select Province —</option>
                  {ALL_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className={labelCls}>
                  City / Municipality
                  {!form.province && (
                    <span className="ml-1 text-gray-400 font-normal">(select a province first)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={citySearch}
                  disabled={!form.province}
                  onChange={e => {
                    setCitySearch(e.target.value);
                    setForm(f => ({ ...f, city: e.target.value }));
                    setShowCitySugg(true);
                  }}
                  onFocus={() => setShowCitySugg(true)}
                  onBlur={() => setTimeout(() => setShowCitySugg(false), 150)}
                  className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                  placeholder={form.province ? `Cities in ${form.province}…` : 'Select province first'}
                  autoComplete="off"
                />
                {showCitySugg && citySuggestions.length > 0 && (
                  <ul className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                    {citySuggestions.map(c => (
                      <li
                        key={c}
                        onMouseDown={() => pickCity(c)}
                        className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-gray-800 dark:text-gray-200"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <input
                  type="text"
                  value={form.address ?? ''}
                  onChange={field('address')}
                  className={inputCls}
                  placeholder="Street address"
                />
              </div>
            </div>
          </fieldset>

          {/* Contact Details */}
          <fieldset>
            <legend className={legendCls}>Contact Details</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Medical Director</label>
                <input
                  type="text"
                  value={form.medical_director ?? ''}
                  onChange={field('medical_director')}
                  className={inputCls}
                  placeholder="Dr. Full Name"
                />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input
                  type="text"
                  value={form.contact_person ?? ''}
                  onChange={field('contact_person')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Designation</label>
                <select value={form.designation ?? ''} onChange={field('designation')} className={inputCls}>
                  <option value="">— Select Designation —</option>
                  {DESIGNATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tel / Cell</label>
                <input
                  type="text"
                  value={form.tel_cell ?? ''}
                  onChange={field('tel_cell')}
                  className={inputCls}
                  placeholder="+63..."
                />
              </div>
              <div>
                <label className={labelCls}>Fax</label>
                <input
                  type="text"
                  value={form.fax ?? ''}
                  onChange={field('fax')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={field('email')}
                  className={inputCls}
                  placeholder="facility@example.com"
                />
              </div>
            </div>
          </fieldset>

          {/* Accreditation & PO */}
          <fieldset>
            <legend className={legendCls}>Accreditation & PO</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Date Accredited</label>
                <input
                  type="date"
                  value={form.date_accredited ?? ''}
                  onChange={field('date_accredited')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Year Accredited
                  <span className="ml-1 text-gray-400 font-normal">(auto)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={form.year_accredited ?? CURRENT_YEAR}
                  className={inputReadonlyCls}
                />
              </div>
              <div>
                <label className={labelCls}>Last PO Date</label>
                <input
                  type="date"
                  value={form.last_po_date ?? ''}
                  onChange={field('last_po_date')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>PO Number</label>
                <input
                  type="text"
                  value={form.po_number ?? ''}
                  onChange={field('po_number')}
                  className={inputCls}
                  placeholder="PO-2024-001"
                />
              </div>
            </div>
          </fieldset>

          {/* Remarks */}
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea
              rows={3}
              value={form.remarks ?? ''}
              onChange={field('remarks')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional notes…"
            />
          </div>

        </div>{/* end scrollable body */}

        {/* ── Footer ──
            The footer is intentionally OUTSIDE the form scroll area.
            The Save button uses type="button" + onClick={handleSubmit} because
            a type="submit" button only submits the <form> it lives inside —
            and this button is outside that form wrapper. Using type="button"
            avoids any browser-submit confusion and fires handleSubmit exactly once.
        */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="h-9 px-5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {editing ? 'Save Changes' : 'Add Facility'}
          </button>
        </div>

      </div>
    </div>
  );
};