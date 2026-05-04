import React, { useMemo, useState } from 'react';
import { Plus, Search, X, Eye, Pencil, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import {
  useLogbookEndorsementList,
  useUpdateLogbookEndorsement,
} from '../../../hooks/LaboratoryHooks/useLogbookEndorsement';
import type { LogbookEndorsementRecord } from '../../../services/LaboratoryServices/logbookEndorsementServices';
import { LogbookModal } from './LogbookModal';

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const CATEGORY_OPTIONS = ['NFTR', 'METAB', 'HEMOG / GAL', 'ENDOCRINE', 'SPECIAL / MONITORING'] as const;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCurrentUsername = (): string => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      return parsed?.name || parsed?.username || parsed?.email || 'SYSTEM';
    }
  } catch {
    // Ignore malformed local storage payload.
  }

  try {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const parsed = JSON.parse(currentUser);
      return parsed?.username || parsed?.fullName || 'SYSTEM';
    }
  } catch {
    // Ignore malformed local storage payload.
  }

  return 'SYSTEM';
};

const EditModal: React.FC<{ record: LogbookEndorsementRecord; onClose: () => void }> = ({ record, onClose }) => {
  const updateMutation = useUpdateLogbookEndorsement();
  const [form, setForm] = useState({
    category: record.category,
    mnemonic: record.mnemonic,
    analytes: record.analytes,
    values: record.values,
    tc: record.tc || '',
    tc_date: record.tc_date || '',
    qao: record.qao || '',
    qao_date: record.qao_date || '',
    fun: record.fun || '',
    fun_date: record.fun_date || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      id: record.id,
      ...form,
      modified_by: getCurrentUsername(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Endorsement</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <InputField label="Mnemonic" value={form.mnemonic} onChange={(v) => setForm((p) => ({ ...p, mnemonic: v }))} />
          <InputField label="Analytes" value={form.analytes} onChange={(v) => setForm((p) => ({ ...p, analytes: v }))} />
          <InputField label="Values" value={form.values} onChange={(v) => setForm((p) => ({ ...p, values: v }))} />
          <InputField label="TC" value={form.tc} onChange={(v) => setForm((p) => ({ ...p, tc: v }))} />
          <InputField label="TC Date" value={form.tc_date} onChange={(v) => setForm((p) => ({ ...p, tc_date: v }))} />
          <InputField label="QAO" value={form.qao} onChange={(v) => setForm((p) => ({ ...p, qao: v }))} />
          <InputField label="QAO Date" value={form.qao_date} onChange={(v) => setForm((p) => ({ ...p, qao_date: v }))} />
          <InputField label="FUN" value={form.fun} onChange={(v) => setForm((p) => ({ ...p, fun: v }))} />
          <InputField label="FUN Date" value={form.fun_date} onChange={(v) => setForm((p) => ({ ...p, fun_date: v }))} />
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

const InputField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="text-xs text-gray-500">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
    />
  </div>
);

export const EndorsementToFollowUpTable: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewRecord, setViewRecord] = useState<LogbookEndorsementRecord | null>(null);
  const [editRecord, setEditRecord] = useState<LogbookEndorsementRecord | null>(null);

  const { data, isLoading } = useLogbookEndorsementList();

  const filtered = useMemo(() => {
    const records = data?.data || [];
    const q = search.toLowerCase();
    return records.filter((record) => {
      return Object.values(record).some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [data?.data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      {showAddModal && <LogbookModal onClose={() => setShowAddModal(false)} />}
      {editRecord && <EditModal record={editRecord} onClose={() => setEditRecord(null)} />}

      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewRecord(null)}>
          <div
            className="w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Endorsement Details</h3>
              <button onClick={() => setViewRecord(null)} className="p-1 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-500">Lab No:</span> {viewRecord.labno}</div>
              <div><span className="text-gray-500">Patient:</span> {viewRecord.patient_name}</div>
              <div><span className="text-gray-500">Facility:</span> {viewRecord.facility_code}</div>
              <div><span className="text-gray-500">Category:</span> {viewRecord.category}</div>
              <div><span className="text-gray-500">Mnemonic:</span> {viewRecord.mnemonic}</div>
              <div><span className="text-gray-500">Analytes:</span> {viewRecord.analytes}</div>
              <div><span className="text-gray-500">Values:</span> {viewRecord.values}</div>
              <div><span className="text-gray-500">Analyst:</span> {viewRecord.analyst}</div>
              <div><span className="text-gray-500">Analyst Date:</span> {formatDateTime(viewRecord.analyst_date)}</div>
              <div><span className="text-gray-500">TC:</span> {viewRecord.tc || '—'}</div>
              <div><span className="text-gray-500">QAO:</span> {viewRecord.qao || '—'}</div>
              <div><span className="text-gray-500">FUN:</span> {viewRecord.fun || '—'}</div>
              <div><span className="text-gray-500">Modified By:</span> {viewRecord.modified_by || '—'}</div>
              <div><span className="text-gray-500">Date Modified:</span> {formatDateTime(viewRecord.date_modified)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
              <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Endorsement to Follow-Up Records</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search records..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Endorsement
            </button>
          </div>
        </div>

        <div className="overflow-x-auto relative">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-2 text-left">Date Input</th>
                <th className="px-3 py-2 text-left">Lab No.</th>
                <th className="px-3 py-2 text-left">Patient</th>
                <th className="px-3 py-2 text-left">Facility</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Mnemonic</th>
                <th className="px-3 py-2 text-left">Analytes</th>
                <th className="px-3 py-2 text-left">Values</th>
                <th className="px-3 py-2 text-left">Analyst</th>
                <th className="px-3 py-2 text-left">Analyst Date</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-xs text-gray-500">Loading records...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-xs text-gray-500">No records found.</td></tr>
              ) : (
                paginated.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.date_input)}</td>
                    <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{row.labno}</td>
                    <td className="px-3 py-2">{row.patient_name}</td>
                    <td className="px-3 py-2">{row.facility_code}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">{row.mnemonic}</td>
                    <td className="px-3 py-2">{row.analytes}</td>
                    <td className="px-3 py-2">{row.values}</td>
                    <td className="px-3 py-2">{row.analyst}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.analyst_date)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => setViewRecord(row)} className="p-1 text-purple-600 hover:bg-purple-50 rounded">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditRecord(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-xs"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};