// src/pages/PDO/components/NSFDetailModal.tsx
import React from 'react';
import { X } from 'lucide-react';
import type { NSFRecord } from './NSFTable';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateOnly = (d: string | null | undefined): string => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (d: string | null | undefined): string => {
    if (!d) return '—';
    const date = new Date(d.includes('T') ? d : d.replace(' ', 'T'));
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
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

// ─── Component ────────────────────────────────────────────────────────────────
export const NSFDetailModal: React.FC<{ record: NSFRecord | null; onClose: () => void }> = ({ record, onClose }) => {
    if (!record) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
                        <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                            Accreditation & PO
                        </h3>

                        <div className="grid grid-cols-3 gap-4">
                            <DetailRow
                                label="Date Accredited"
                                value={formatDateOnly(record.date_accredited)}
                            />

                            <DetailRow
                                label="Year Accredited"
                                value={record.year_accredited}
                            />

                            <DetailRow
                                label="Last PO Date"
                                value={formatDateOnly(record.last_po_date)}
                            />

                            <DetailRow
                                label="PO Number"
                                value={record.po_number}
                            />

                            {/* Empty middle cell */}
                            <div></div>

                            <DetailRow
                                label="Last Sample Sent"
                                value={formatDateOnly(record.last_sample_sent)}
                            />
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