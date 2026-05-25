// src/pages/PDO/components/AddNSFFacilityModal.tsx
import React, { useState, useMemo } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useAddNSFFacility, useUpdateNSFFacility } from '../../../hooks/PDOHooks/useNSFFacilities';
import type { NSFFacility } from '../../../services/PDOServices/nsfFacilitesServices';
import { useAuth } from '../../../context/AuthContext';

// ─── Province / City Map ──────────────────────────────────────────────────────
const PROVINCE_CITY_MAP: Record<string, string[]> = {
  'Batangas':    ['Batangas City', 'Lipa', 'Tanauan', 'Santo Tomas', 'Nasugbu', 'Balayan', 'Lemery', 'Rosario', 'San Jose', 'Mabini', 'Padre Garcia'],
  'Cavite':      ['Bacoor', 'Cavite City', 'Dasmariñas', 'Imus', 'Tagaytay', 'Trece Martires', 'General Trias', 'Silang', 'Mendez', 'Naic', 'Tanza'],
  'Laguna':      ['Calamba', 'San Pablo', 'Santa Rosa', 'Biñan', 'Cabuyao', 'Los Baños', 'Pagsanjan', 'Sta. Cruz', 'Bay', 'Victoria'],
  'Quezon':      ['Lucena', 'Tayabas', 'Candelaria', 'Tiaong', 'Sariaya', 'Gumaca', 'Lopez', 'Infanta', 'Mauban', 'Pagbilao'],
  'Rizal':       ['Antipolo', 'Cainta', 'Taytay', 'Angono', 'Binangonan', 'San Mateo', 'Morong', 'Cardona', 'Tanay', 'Teresa'],
};

const ALL_PROVINCES = Object.keys(PROVINCE_CITY_MAP).sort();

// ─── Date Helper ──────────────────────────────────────────────────────────────
/**
 * Normalise any date value to "YYYY-MM-DD" for <input type="date">.
 * Accepts ISO-8601 strings, already-formatted strings, or null/undefined.
 * Returns '' when absent or unparseable.
 */
const toDateInput = (val?: string | null): string => {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

// ─── Empty Form ───────────────────────────────────────────────────────────────
const EMPTY_FORM: Partial<NSFFacility> = {
  facility_code:    0,
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
  year_accredited:  undefined,
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

  // Reset form when modal opens or editing changes — normalise date fields here
  React.useEffect(() => {
    const base = editing ?? EMPTY_FORM;
    setForm({
      ...base,
      date_accredited: toDateInput(base.date_accredited),
      last_po_date:    toDateInput(base.last_po_date),
    });
    setCitySearch(editing?.city ?? '');
  }, [editing, open]);

  const field = (key: keyof NSFFacility) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }));

  const provincePool = provinces.length > 0 ? provinces : ALL_PROVINCES;

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(f => ({ ...f, province: e.target.value, city: '' }));
    setCitySearch('');
  };

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

  const isLoading = addMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing?.id) {
        await updateMutation.mutateAsync({
          id:   editing.id,
          data: { ...form, modified_by: username },
        });
      } else {
        await addMutation.mutateAsync({ ...form, created_by: username });
      }
      onClose();
    } catch {
      // errors handled in hook
    }
  };

  if (!open) return null;

  const inputCls = "w-full h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editing ? 'Edit Facility' : 'Add New Facility'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {editing ? `Editing: ${editing.facility_name}` : 'Fill in the details below to register a new NSF facility.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Basic Info */}
          <fieldset>
            <legend className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Basic Information</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Facility Code *</label>
                <input type="number" required value={form.facility_code ?? ''} onChange={field('facility_code')} className={inputCls} placeholder="e.g. 10001" />
              </div>
              <div>
                <label className={labelCls}>Facility Name *</label>
                <input type="text" required value={form.facility_name ?? ''} onChange={field('facility_name')} className={inputCls} placeholder="e.g. St. Luke's Medical Center" />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <input type="text" value={form.category ?? ''} onChange={field('category')} className={inputCls} placeholder="e.g. Hospital" />
              </div>
              <div>
                <label className={labelCls}>Type 1</label>
                <input type="text" value={form.type1 ?? ''} onChange={field('type1')} className={inputCls} placeholder="e.g. Government" />
              </div>
              <div>
                <label className={labelCls}>Type 2</label>
                <input type="text" value={form.type2 ?? ''} onChange={field('type2')} className={inputCls} placeholder="e.g. Primary" />
              </div>
              <div>
                <label className={labelCls}>Region</label>
                <input type="text" value={form.region ?? ''} onChange={field('region')} className={inputCls} placeholder="e.g. 4A" />
              </div>
            </div>
          </fieldset>

          {/* Location */}
          <fieldset>
            <legend className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Location</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Province</label>
                <select value={form.province ?? ''} onChange={handleProvinceChange} className={inputCls}>
                  <option value="">— Select Province —</option>
                  {provincePool.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className={labelCls}>
                  City / Municipality
                  {!form.province && <span className="ml-1 text-gray-400 font-normal">(select a province first)</span>}
                </label>
                <input
                  type="text"
                  value={citySearch}
                  disabled={!form.province}
                  onChange={e => { setCitySearch(e.target.value); setForm(f => ({ ...f, city: e.target.value })); setShowCitySugg(true); }}
                  onFocus={() => setShowCitySugg(true)}
                  onBlur={() => setTimeout(() => setShowCitySugg(false), 150)}
                  className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                  placeholder={form.province ? `Cities in ${form.province}…` : 'Select province first'}
                  autoComplete="off"
                />
                {showCitySugg && citySuggestions.length > 0 && (
                  <ul className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                    {citySuggestions.map(c => (
                      <li key={c} onMouseDown={() => pickCity(c)} className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-gray-800 dark:text-gray-200">
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <input type="text" value={form.address ?? ''} onChange={field('address')} className={inputCls} placeholder="Street address" />
              </div>
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset>
            <legend className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Contact Details</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Medical Director</label>
                <input type="text" value={form.medical_director ?? ''} onChange={field('medical_director')} className={inputCls} placeholder="Dr. Full Name" />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input type="text" value={form.contact_person ?? ''} onChange={field('contact_person')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Designation</label>
                <input type="text" value={form.designation ?? ''} onChange={field('designation')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tel / Cell</label>
                <input type="text" value={form.tel_cell ?? ''} onChange={field('tel_cell')} className={inputCls} placeholder="+63..." />
              </div>
              <div>
                <label className={labelCls}>Fax</label>
                <input type="text" value={form.fax ?? ''} onChange={field('fax')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email ?? ''} onChange={field('email')} className={inputCls} placeholder="facility@example.com" />
              </div>
            </div>
          </fieldset>

          {/* Accreditation */}
          <fieldset>
            <legend className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Accreditation & PO</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Date Accredited</label>
                <input type="date" value={form.date_accredited ?? ''} onChange={field('date_accredited')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Year Accredited</label>
                <input type="number" value={form.year_accredited ?? ''} onChange={field('year_accredited')} className={inputCls} placeholder="e.g. 2024" />
              </div>
              <div>
                <label className={labelCls}>Last PO Date</label>
                <input type="date" value={form.last_po_date ?? ''} onChange={field('last_po_date')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>PO Number</label>
                <input type="text" value={form.po_number ?? ''} onChange={field('po_number')} className={inputCls} placeholder="PO-2024-001" />
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
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            onClick={handleSubmit as any}
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