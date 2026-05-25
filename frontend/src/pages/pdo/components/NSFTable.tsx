// src/pages/PDO/components/NSFTable.tsx
import React, { useState, useMemo } from 'react';
import { Eye, Edit, FileDown, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { usePermissions } from '../../../hooks/usePermission';
import { useNSFFacilities, useDeleteNSFFacility } from '../../../hooks/PDOHooks/useNSFFacilities';
import { AddNSFFacilityModal } from './AddNSFFacilityModal';
import type { NSFFacility, NSFFilterParams } from '../../../services/PDOServices/nsfFacilitesServices';

// ─── Types ────────────────────────────────────────────────────────────────────
export type NSFRecord = NSFFacility & { [key: string]: any };

interface NSFTableProps {
  filterParams?:      NSFFilterParams;
  filterLabel?:       string;
  searchPlaceholder?: string;
  deletedBy?:         string;
  provinces?:         string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateOnly = (d: string | null | undefined): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getStatusBadge = (status: string | null | undefined) => {
  if (!status)
    return <span className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">—</span>;

  const colors: Record<string, string> = {
    active:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    inactive: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    closed:   'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    partner:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[status.toLowerCase()] ?? 'bg-gray-100 text-gray-800'}`}>
      {status.toUpperCase()}
    </span>
  );
};

// ─── Detail Row ───────────────────────────────────────────────────────────────
const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm text-gray-800 dark:text-gray-100">{value || '—'}</span>
  </div>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const NSFDetailModal: React.FC<{ record: NSFRecord | null; onClose: () => void }> = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{record.facility_name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Facility Code: {record.facility_code}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailRow label="Facility Code" value={record.facility_code} />
              <DetailRow label="Facility Name" value={record.facility_name} />
              <DetailRow label="Category"      value={record.category} />
              <DetailRow label="Type 1"        value={record.type1} />
              <DetailRow label="Type 2"        value={record.type2} />
              <DetailRow label="Region"        value={record.region} />
              <DetailRow label="Status"        value={getStatusBadge(record.status)} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Location</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailRow label="Province" value={record.province} />
              <DetailRow label="City"     value={record.city} />
              <DetailRow label="Address"  value={record.address} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Contact Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailRow label="Medical Director" value={record.medical_director} />
              <DetailRow label="Contact Person"   value={record.contact_person} />
              <DetailRow label="Designation"      value={record.designation} />
              <DetailRow label="Tel / Cell"       value={record.tel_cell} />
              <DetailRow label="Fax"              value={record.fax} />
              <DetailRow label="Email"            value={record.email} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Accreditation & PO</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailRow label="Date Accredited" value={formatDateOnly(record.date_accredited)} />
              <DetailRow label="Year Accredited" value={record.year_accredited} />
              <DetailRow label="Last PO Date"    value={formatDateOnly(record.last_po_date)} />
              <DetailRow label="PO Number"       value={record.po_number} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Audit Trail</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailRow label="Created By"    value={record.created_by} />
              <DetailRow label="Created Date"  value={formatDateOnly(record.created_date)} />
              <DetailRow label="Modified By"   value={record.modified_by} />
              <DetailRow label="Modified Date" value={formatDateOnly(record.modified_date)} />
              <DetailRow label="Remarks"       value={record.remarks} />
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button onClick={onClose} className="h-9 px-5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Table Component ──────────────────────────────────────────────────────────
const PAGE_SIZES = [10, 20, 50];

export const NSFTable: React.FC<NSFTableProps> = ({
  filterParams,
  filterLabel       = '',
  searchPlaceholder = 'Search by facility name or code…',
  deletedBy         = 'admin',
  provinces         = [],
}) => {
  const { canEdit, canExport } = usePermissions(['program', 'administrator']);

  const [page,         setPage]         = useState(1);
  const [limit,        setLimit]        = useState(20);
  const [search,       setSearch]       = useState('');
  const [detailRecord, setDetailRecord] = useState<NSFRecord | null>(null);
  const [editRecord,   setEditRecord]   = useState<NSFFacility | null>(null);
  const [editOpen,     setEditOpen]     = useState(false);
  const [addOpen,      setAddOpen]      = useState(false);  // ← Add Facility modal

  // search is always the source of truth — never mixed with filterParams.search
  const params: NSFFilterParams = useMemo(() => ({
    ...filterParams,
    search: search.trim() || undefined,   // ← send only when non-empty
    page,
    limit,
  }), [filterParams, search, page, limit]);

  const {
    data: resp,
    isLoading,
    isFetching,
    isError,
  } = useNSFFacilities(params);

  const records = resp?.data ?? [];
  const total   = resp?.total ?? 0;

  // Keep last known totalPages so pagination doesn't flicker while fetching
  const [lastTotalPages, setLastTotalPages] = useState(1);
  React.useEffect(() => {
    if (resp?.total_pages !== undefined) setLastTotalPages(resp.total_pages);
  }, [resp?.total_pages]);
  const totalPages = isFetching ? lastTotalPages : (resp?.total_pages ?? lastTotalPages);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleLimit  = (v: number) => { setLimit(v);  setPage(1); };

  // Reset to page 1 when external filterParams change
  const filterParamsKey = JSON.stringify(filterParams);
  React.useEffect(() => { setPage(1); }, [filterParamsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditClick = (record: NSFRecord) => {
    setEditRecord(record as NSFFacility);
    setEditOpen(true);
  };

  const handleExport = () => {
    try {
      const exportData = records.map(r => ({
        'Facility Code':    r.facility_code         ?? '',
        'Facility Name':    r.facility_name         ?? '',
        Category:           r.category              ?? '',
        'Type 1':           r.type1                 ?? '',
        'Type 2':           r.type2                 ?? '',
        Region:             r.region                ?? '',
        Province:           r.province              ?? '',
        City:               r.city                  ?? '',
        Status:             r.status?.toUpperCase() ?? '',
        'Medical Director': r.medical_director      ?? '',
        'Contact Person':   r.contact_person        ?? '',
        'Tel / Cell':       r.tel_cell              ?? '',
        Email:              r.email                 ?? '',
        'Date Accredited':  formatDateOnly(r.date_accredited),
        'Last PO Date':     formatDateOnly(r.last_po_date),
        'PO Number':        r.po_number             ?? '',
        Remarks:            r.remarks               ?? '',
        'Created By':       r.created_by            ?? '',
        'Created Date':     formatDateOnly(r.created_date),
        'Modified By':      r.modified_by           ?? '',
        'Modified Date':    formatDateOnly(r.modified_date),
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = Array(21).fill({ wch: 20 });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'NSF Data');
      XLSX.writeFile(wb, `NSF_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export to Excel.');
    }
  };

  const TH       = 'px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs';
  const TH_RIGHT = 'px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs sticky right-0 bg-gray-50 dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]';

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg">
        <div className="p-5">

          {/* Toolbar */}
          <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">

            {/* Left side: page size + filter label + spinners */}
            <div className="flex gap-2 items-center flex-wrap">
              {filterLabel && (
                <span className="h-9 px-3 flex items-center text-xs rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium gap-1.5">
                  <span className="opacity-60">Filters:</span> {filterLabel}
                </span>
              )}
              <select
                value={limit}
                onChange={e => handleLimit(Number(e.target.value))}
                className="h-9 px-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>Show {s}</option>)}
              </select>
              {isLoading && (
                <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              )}
              {!isLoading && isFetching && (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-400 rounded-full animate-spin opacity-60" />
              )}
            </div>

            {/* Right side: search + Add Facility button */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[260px]"
              />
              {canEdit && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="h-9 px-4 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                >
                  <Plus size={15} /> Add Facility
                </button>
              )}
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
            {isLoading && records.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 py-20 text-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Loading records…</p>
              </div>
            ) : !isLoading && records.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 py-20 text-center">
                <h5 className="text-gray-800 dark:text-gray-200 font-semibold text-lg mb-1">
                  {search ? 'No matching records found' : 'No records found'}
                </h5>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {search ? `No records match "${search}"` : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className={TH}>Facility Code</th>
                      <th className={TH}>Facility Name</th>
                      <th className={TH}>Category</th>
                      <th className={TH}>Type 1</th>
                      <th className={TH}>Province</th>
                      <th className={TH}>Status</th>
                      <th className={TH_RIGHT}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {records.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`transition-colors ${
                          index % 2 === 0
                            ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">{record.facility_code ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate" title={record.facility_name ?? ''}>{record.facility_name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.category ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.type1    ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.province ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(record.status)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap sticky right-0 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDetailRecord(record as NSFRecord)}
                              className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => handleEditClick(record as NSFRecord)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
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

          {/* Footer / Pagination */}
          {records.length > 0 || isFetching ? (
            <div className="mt-4 flex flex-wrap justify-between items-center gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {total > 0 && (
                  <>
                    Showing{' '}
                    <span className="font-medium">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span>
                    {' '}of{' '}
                    <span className="font-medium">{total.toLocaleString()}</span> records
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px] text-center">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isFetching}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
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
          ) : null}
        </div>
      </div>

      {/* Detail Modal */}
      <NSFDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />

      {/* Edit Modal */}
      <AddNSFFacilityModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditRecord(null); }}
        editing={editRecord}
        provinces={provinces}
      />

      {/* Add Facility Modal */}
      <AddNSFFacilityModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        provinces={provinces}
      />
    </>
  );
};