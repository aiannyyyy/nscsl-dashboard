// src/pages/PDO/components/NSFTable.tsx
import React, { useState, useMemo } from 'react';
import { Eye, Edit, Trash2, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { usePermissions } from '../../../hooks/usePermission';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface NSFRecord {
  id:                  number | string;
  facility_code?:      string | null;
  facility_name?:      string | null;
  region?:             string | null;
  province?:           string | null;
  city?:               string | null;
  status?:             string | null;
  reactivate_status?:  string | null;
  owner?:              string | null;
  contact_no?:         string | null;
  email?:              string | null;
  license_no?:         string | null;
  license_expiry?:     string | null;
  accreditation_no?:   string | null;
  accreditation_expiry?: string | null;
  remarks?:            string | null;
  created_by?:         string | null;
  created_at?:         string | null;
  modified_by?:        string | null;
  modified_at?:        string | null;
  [key: string]:       any;
}

interface NSFTableProps {
  data:             NSFRecord[];
  isLoading?:       boolean;
  isError?:         boolean;
  filterLabel?:     string;
  searchPlaceholder?: string;
  /** Called when the user clicks the Eye icon */
  onView?:          (record: NSFRecord) => void;
  /** Called when the user clicks the Edit icon */
  onEdit?:          (record: NSFRecord) => void;
  /** Called when the user clicks the Trash icon */
  onDelete?:        (record: NSFRecord) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateOnly = (d: string | null | undefined): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const getStatusBadge = (status: string | null | undefined) => {
  if (!status)
    return (
      <span className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        —
      </span>
    );

  const colors: Record<string, string> = {
    active:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    inactive: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    closed:   'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded-full font-medium ${
        colors[status.toLowerCase()] ?? 'bg-gray-100 text-gray-800'
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export const NSFTable: React.FC<NSFTableProps> = ({
  data              = [],
  isLoading         = false,
  isError           = false,
  filterLabel       = '',
  searchPlaceholder = 'Search by Facility Name or Code...',
  onView,
  onEdit,
  onDelete,
}) => {
  const { canEdit, canDelete, canExport } = usePermissions([
    'program',
    'administrator',
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  // Client-side search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (r) =>
        (r.facility_name ?? '').toLowerCase().includes(q) ||
        (r.facility_code ?? '').toLowerCase().includes(q) ||
        (r.region        ?? '').toLowerCase().includes(q) ||
        (r.province      ?? '').toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Export
  const handleExport = () => {
    try {
      const exportData = filtered.map((r) => ({
        'Facility Code':        r.facility_code ?? '',
        'Facility Name':        r.facility_name ?? '',
        Region:                 r.region        ?? '',
        Province:               r.province      ?? '',
        City:                   r.city          ?? '',
        Status:                 r.status?.toUpperCase() ?? '',
        'Reactivation Status':  r.reactivate_status ?? '',
        Owner:                  r.owner         ?? '',
        'Contact No':           r.contact_no    ?? '',
        Email:                  r.email         ?? '',
        'License No':           r.license_no    ?? '',
        'License Expiry':       formatDateOnly(r.license_expiry),
        'Accreditation No':     r.accreditation_no ?? '',
        'Accreditation Expiry': formatDateOnly(r.accreditation_expiry),
        Remarks:                r.remarks       ?? '',
        'Created By':           r.created_by    ?? '',
        'Created At':           r.created_at    ?? '',
        'Modified By':          r.modified_by   ?? '',
        'Modified At':          r.modified_at   ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = Array(19).fill({ wch: 20 });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'NSF Data');
      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `NSF_Data_${timestamp}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export to Excel.');
    }
  };

  // ─── TH classes ──────────────────────────────────────────────────────────
  const TH =
    'px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs';
  const TH_RIGHT =
    'px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs sticky right-0 bg-gray-50 dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg">
      <div className="p-5">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div className="flex gap-2 items-center flex-wrap">
            {filterLabel && (
              <span className="h-9 px-3 flex items-center text-xs rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium gap-1.5">
                <span className="opacity-60">Filters:</span> {filterLabel}
              </span>
            )}
            {isLoading && (
              <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="min-w-[260px]">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Failed to load NSF records.
          </div>
        )}

        {/* Table */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl max-h-[600px] overflow-y-auto">
          {isLoading && data.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 py-20 text-center">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Loading records…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 py-20 text-center">
              <h5 className="text-gray-800 dark:text-gray-200 font-semibold text-lg mb-1">
                {searchQuery ? 'No matching records found' : 'No records found'}
              </h5>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery
                  ? `No records match "${searchQuery}"`
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className={TH}>Facility Code</th>
                    <th className={TH}>Facility Name</th>
                    <th className={TH}>Region</th>
                    <th className={TH}>Province</th>
                    <th className={TH}>City</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Reactivation Status</th>
                    <th className={TH}>License Expiry</th>
                    <th className={TH}>Accreditation Expiry</th>
                    <th className={TH_RIGHT}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`transition-colors ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                        {record.facility_code ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {record.facility_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {record.region ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {record.province ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {record.city ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate" title={record.reactivate_status ?? ''}>
                        {record.reactivate_status ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDateOnly(record.license_expiry)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDateOnly(record.accreditation_expiry)}
                      </td>

                      {/* Actions – sticky right col */}
                      <td
                        className={`px-4 py-3 whitespace-nowrap sticky right-0 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] ${
                          index % 2 === 0
                            ? 'bg-white dark:bg-gray-900'
                            : 'bg-gray-50/50 dark:bg-gray-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {onView && (
                            <button
                              onClick={() => onView(record)}
                              className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {canEdit && onEdit && (
                            <button
                              onClick={() => onEdit(record)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {canDelete && onDelete && (
                            <button
                              onClick={() => onDelete(record)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing{' '}
              <span className="font-medium">{filtered.length}</span> of{' '}
              <span className="font-medium">{data.length}</span> record
              {data.length !== 1 ? 's' : ''}
              {searchQuery && ` (filtered by "${searchQuery}")`}
            </div>
            {canExport && (
              <button
                onClick={handleExport}
                className="h-9 px-4 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium flex items-center gap-2 transition-colors"
              >
                <FileDown size={16} /> Export to Excel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};