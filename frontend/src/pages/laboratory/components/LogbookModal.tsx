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

export const LogbookModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [labno, setLabno] = useState('');
  const [testRows, setTestRows] = useState<DraftTestRow[]>([]);
  const [form, setForm] = useState({
    patient_name: '',
    facility_code: '',
    category: '',
    analyst: getCurrentUsername(),
    tc: '',
    tc_date: '',
    qao: '',
    qao_date: '',
    fun: '',
    fun_date: '',
  });

  const lookupQuery = useLogbookEndorsementLookup(labno, false);
  const createMutation = useCreateLogbookEndorsement();

  const handleLookup = async () => {
    const result = await lookupQuery.refetch();
    const payload = result.data?.data;
    if (!payload) return;

    setForm((prev) => ({
      ...prev,
      patient_name: `${payload.firstName} ${payload.lastName}`.trim(),
      facility_code: payload.submid || '',
    }));

    const rowsFromLookup = (payload.tests || []).slice(0, 10).map((test) => ({
      selected: true,
      mnemonic: String(test.mnemonic || ''),
      analytes: String(test.testName || '').slice(0, 20),
      values: String(test.value ?? '').slice(0, 20),
    }));

    setTestRows(rowsFromLookup);
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

    try {
      await Promise.all(
        selectedRows.map((row) =>
          createMutation.mutateAsync({
            labno: labno.trim(),
            patient_name: form.patient_name,
            facility_code: form.facility_code,
            category: form.category,
            mnemonic: row.mnemonic,
            analytes: row.analytes,
            values: row.values,
            analyst: form.analyst,
            tc: form.tc || undefined,
            tc_date: form.tc_date || null,
            qao: form.qao || undefined,
            qao_date: form.qao_date || null,
            fun: form.fun || undefined,
            fun_date: form.fun_date || null,
          })
        )
      );
      alert('Endorsement saved successfully.');
      onClose();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to save endorsement.';
      alert(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Add Endorsement</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">Lab No.</label>
              <input
                value={labno}
                onChange={(e) => setLabno(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleLookup}
                className="w-full px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Lookup Lab No.
              </button>
            </div>
          </div>

          {lookupQuery.error && <p className="text-xs text-red-600">No data found for this lab number.</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Patient Name</label>
              <input value={form.patient_name} className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" disabled required />
            </div>
            <div>
              <label className="text-xs text-gray-500">Facility Code</label>
              <input value={form.facility_code} className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" disabled required />
            </div>
            <div>
              <label className="text-xs text-gray-500">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                required
              >
                <option value="">Select category...</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Analyst</label>
              <input value={form.analyst} className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" disabled required />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Lookup Results (max 10 rows)</p>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-2 text-left">Use</th>
                    <th className="px-2 py-2 text-left">Mnemonic</th>
                    <th className="px-2 py-2 text-left">Analytes</th>
                    <th className="px-2 py-2 text-left">Values</th>
                  </tr>
                </thead>
                <tbody>
                  {testRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-3 text-center text-gray-500">
                        Lookup a lab number to load up to 10 analyte/value rows.
                      </td>
                    </tr>
                  ) : (
                    testRows.map((row, index) => (
                      <tr key={`${row.mnemonic}-${index}`} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-2 py-2">
                          <input type="checkbox" checked={row.selected} onChange={(e) => updateTestRow(index, 'selected', e.target.checked)} />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row.mnemonic}
                            readOnly
                            disabled
                            className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row.analytes}
                            readOnly
                            disabled
                            className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row.values}
                            readOnly
                            disabled
                            className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" />
            Save Endorsement
          </button>
        </div>
      </form>
    </div>
  );
};

