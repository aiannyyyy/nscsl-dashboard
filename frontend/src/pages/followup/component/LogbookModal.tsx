import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import {
  useCreateLogbookEndorsement,
  useLogbookEndorsementLookup,
} from '../../../hooks/LaboratoryHooks/useLogbookEndorsement';

const CATEGORY_OPTIONS = ['NFTR', 'METAB', 'HEMOG / GAL', 'ENDOCRINE', 'SPECIAL / MONITORING'] as const;

interface DraftTestRow {
  selected: boolean;
  mnemonic: string;
  analytes: string;
  values: string;
}

const getCurrentUsername = (): string => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      return parsed?.name || parsed?.username || parsed?.email || 'SYSTEM';
    }
  } catch {
    // ignore
  }
  try {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const parsed = JSON.parse(currentUser);
      return parsed?.username || parsed?.fullName || 'SYSTEM';
    }
  } catch {
    // ignore
  }
  return 'SYSTEM';
};

export const LogbookModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [labno, setLabno] = useState('');
  const [testRows, setTestRows] = useState<DraftTestRow[]>([]);
  const [form, setForm] = useState({
    patient_name: '',
    facility_code: '',
    category: '',
    analyst: getCurrentUsername(),
  });

  const lookupQuery = useLogbookEndorsementLookup(labno, false);
  const createMutation = useCreateLogbookEndorsement();

  const handleLookup = async () => {
    if (!labno.trim()) return;
    const result = await lookupQuery.refetch();
    const payload = result.data?.data;
    if (!payload) return;

    setForm((prev) => ({
      ...prev,
      patient_name: `${payload.firstName} ${payload.lastName}`.trim(),
      facility_code: payload.submid || '',
    }));

    setTestRows(
      (payload.tests || []).slice(0, 10).map((test) => ({
        selected: true,
        mnemonic: String(test.mnemonic || ''),
        analytes: String(test.testName || '').trim(),
        values: String(test.value ?? '').trim(),
      }))
    );
  };

  const updateTestRow = (index: number, key: keyof DraftTestRow, value: string | boolean) => {
    setTestRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRows = testRows
      .filter((row) => row.selected && row.mnemonic && row.analytes && row.values)
      .slice(0, 10);

    if (selectedRows.length === 0) {
      alert('Please select at least one row to save.');
      return;
    }

    const uniqueMnemonics = [...new Set(selectedRows.map((r) => r.mnemonic.trim()).filter(Boolean))];
    const mnemonicCombined = uniqueMnemonics.length === 0 ? selectedRows[0].mnemonic : uniqueMnemonics.join('+');
    const analytesCombined = selectedRows.map((r) => r.analytes.trim()).join(' | ');
    const valuesCombined = selectedRows.map((r) => r.values.trim()).join(' | ');

    try {
      await createMutation.mutateAsync({
        labno: labno.trim(),
        patient_name: form.patient_name,
        facility_code: form.facility_code,
        category: form.category,
        mnemonic: mnemonicCombined,
        analytes: analytesCombined,
        values: valuesCombined,
        analyst: form.analyst,
      });
      alert('Endorsement saved successfully.');
      onClose();
    } catch (error: unknown) {
      const message = (() => {
        if (typeof error === 'object' && error !== null) {
          const e = error as {
            response?: { data?: { message?: string; error?: string } };
            message?: string;
          };
          return e.response?.data?.message || e.response?.data?.error || e.message;
        }
        if (error instanceof Error) return error.message;
        return undefined;
      })();
      alert(message || 'Failed to save endorsement.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Add Endorsement</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Lab No. — inline search, Enter triggers lookup */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Lab No.</label>
            <div className="flex gap-2 mt-1">
              <input
                value={labno}
                onChange={(e) => setLabno(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                placeholder="Type lab number and press Enter…"
                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={!labno.trim() || lookupQuery.isFetching}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
              >
                {lookupQuery.isFetching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {lookupQuery.isError && (
              <p className="mt-1 text-xs text-red-500">No data found for this lab number.</p>
            )}
          </div>

          {/* Patient info — only shown after lookup */}
          {form.patient_name && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Patient Name</label>
                <input
                  value={form.patient_name}
                  disabled
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Facility Code</label>
                <input
                  value={form.facility_code}
                  disabled
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Category + Analyst */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select…</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Analyst</label>
              <input
                value={form.analyst}
                disabled
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Results table */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Results <span className="text-gray-400">(max 10)</span>
              </p>
              {testRows.length > 0 && (
                <span className="text-xs text-indigo-500 dark:text-indigo-400">
                  {testRows.filter((r) => r.selected).length} of {testRows.length} selected
                </span>
              )}
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-2 py-2 text-left w-8"></th>
                    <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-400 font-semibold">Mnemonic</th>
                    <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-400 font-semibold">Analyte</th>
                    <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-400 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {testRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                        Search a lab number to load analyte rows.
                      </td>
                    </tr>
                  ) : (
                    testRows.map((row, index) => (
                      <tr
                        key={`${row.mnemonic}-${index}`}
                        className={`transition-colors ${
                          row.selected
                            ? 'bg-white dark:bg-gray-900'
                            : 'bg-gray-50/60 dark:bg-gray-800/40 opacity-50'
                        }`}
                      >
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => updateTestRow(index, 'selected', e.target.checked)}
                            className="accent-indigo-600"
                          />
                        </td>
                        <td className="px-2 py-2 font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {row.mnemonic}
                        </td>
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                          {row.analytes}
                        </td>
                        <td className="px-2 py-2 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {row.values}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {createMutation.isPending ? 'Saving…' : 'Save Endorsement'}
          </button>
        </div>
      </form>
    </div>
  );
};