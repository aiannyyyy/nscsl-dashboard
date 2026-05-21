import React, { useState } from 'react';
import { X, Download, Search, Eye } from 'lucide-react';
import type { PatientDetails } from '../../../services/PDOServices/patientDetailsTypes';
import {
    getSpecimenType,
    getTechName,
    formatSex,
    formatYesNo,
    formatDateTime,
    calculateSpecimenAge,
} from '../../../services/PDOServices/patientDetailsTypes';
import type { NotebookEntry } from '../../../services/PDOServices/notebooksApi';
import { useNotebookEntries } from '../../../hooks/PDOHooks/useNotebook';
import { AddNotebookModal } from './AddNotebookModal';
import { ViewImageModal } from './ViewImageModal';
import { usePermissions } from '../../../hooks/usePermission';

interface NotebookDetailsModalProps {
    isOpen:           boolean;
    onClose:          () => void;
    onBackToResults:  () => void;
    onBackToSearch:   () => void;
    patient:          PatientDetails | null;
    loading:          boolean;
  
}

interface GroupedEntry {
    specimenNo:          string;
    notes:               string;
    createdDate:         string;
    createdTime:         string;
    modifiedDateTime:    string;
    techName:            string;
    attachments:         string[];
    isMySQL:             boolean;
    createTimestamp:     number;
}

const TECH_ID_MAPPING: Record<string, string> = {
    "222": "AAMORFE",
    "202": "ABBRUTAS",
    "223": "ATDELEON",
    "148": "GEYEDRA",
    "87":  "MCDIMAILIG",
    "145": "KGSTAROSA",
    "210": "MRGOMEZ",
    "86":  "VMWAGAN",
    "129": "JMAPELADO",
};

export const NotebookDetailsModal: React.FC<NotebookDetailsModalProps> = ({
    isOpen,
    onClose,
    onBackToResults,
    onBackToSearch,
    patient,
    loading,
}) => {
    const { canCreate } = usePermissions(['program', 'administrator']);
    const [showAddNotebookModal,  setShowAddNotebookModal]  = useState(false);
    const [showViewImageModal,    setShowViewImageModal]    = useState(false);
    const [showAttachmentModal,   setShowAttachmentModal]   = useState(false);
    const [selectedAttachment,    setSelectedAttachment]    = useState<string | null>(null);

    const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    // ─── Query — re-fetches when patient changes or after mutation invalidates ─
    const {
        data:      notebookEntries = [],
        isLoading: notebooksLoading,
        isError:   notebooksError,
    } = useNotebookEntries(
        patient?.labno  ?? '',
        patient?.labid  ?? '',
        patient?.fname  ?? '',
        patient?.lname  ?? '',
        isOpen && !!patient, // only fetch when modal is open and patient is set
    );

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const handleDownloadAttachment = (filename: string) => {
        if (!filename) return;
        window.open(`${API_BASE_URL}/uploads/${filename}`, '_blank');
    };

    const handleViewAttachment = (filename: string) => {
        setSelectedAttachment(filename);
        setShowAttachmentModal(true);
    };

    const getFileIcon = (filename: string) => {
        if (!filename) return '📄';
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
        if (ext === 'pdf')                                                return '📕';
        if (['doc', 'docx'].includes(ext || ''))                         return '📘';
        if (ext === 'txt')                                                return '📝';
        return '📎';
    };

    const isImageFile = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
    };

    const isPdfFile = (filename: string) =>
        filename.split('.').pop()?.toLowerCase() === 'pdf';

    const groupNotebookEntries = (entries: NotebookEntry[]): GroupedEntry[] => {
        const groupMap = new Map<string, GroupedEntry>();

        entries.forEach((entry) => {
            const isOracleEntry = 'CREATE_DT' in entry;
            const isMySQLEntry  = 'createDate' in entry;

            let createdDate = "N/A", createdTime = "N/A", modifiedDateTime = "N/A";
            let techName = "N/A", specimenNo = "", notes = "";
            let attachmentPath: string | undefined;
            let createTimestamp = 0, groupKey = "";

            if (isOracleEntry) {
                specimenNo = entry.LABNO;
                notes      = entry.NOTES;
                if (entry.CREATE_DT) {
                    const dt = new Date(entry.CREATE_DT);
                    createTimestamp = dt.getTime();
                    createdDate = dt.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                    createdTime = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
                if (entry.LASTMOD) {
                    const mod = new Date(entry.LASTMOD);
                    modifiedDateTime = mod.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                        + ' ' + mod.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
                techName = TECH_ID_MAPPING[entry.USER_ID] || entry.USER_ID || 'N/A';
                groupKey = `oracle_${entry.LABNO}_${entry.CREATE_DT}_${entry.USER_ID}_${Math.random()}`;
            } else if (isMySQLEntry) {
                specimenNo    = entry.labno;
                notes         = entry.notes;
                attachmentPath = entry.attachment_path;
                if (entry.createDate) {
                    const dt = new Date(entry.createDate);
                    createTimestamp = dt.getTime();
                    createdDate = dt.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                    createdTime = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
                if (entry.modDate) {
                    const mod = new Date(entry.modDate);
                    modifiedDateTime = mod.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                        + ' ' + mod.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
                techName = entry.techCreate || 'N/A';
                const dateKey = Math.floor(createTimestamp / 1000);
                groupKey = `mysql_${specimenNo}_${techName}_${dateKey}_${notes.substring(0, 50)}`;
            }

            if (groupMap.has(groupKey)) {
                const existing = groupMap.get(groupKey)!;
                if (attachmentPath && !existing.attachments.includes(attachmentPath)) {
                    existing.attachments.push(attachmentPath);
                }
            } else {
                groupMap.set(groupKey, {
                    specimenNo, notes, createdDate, createdTime, modifiedDateTime,
                    techName,
                    attachments:    attachmentPath ? [attachmentPath] : [],
                    isMySQL:        isMySQLEntry,
                    createTimestamp,
                });
            }
        });

        return Array.from(groupMap.values()).sort((a, b) => a.createTimestamp - b.createTimestamp);
    };

    if (!isOpen) return null;

    const groupedEntries = groupNotebookEntries(notebookEntries);

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-[85%] max-w-[1100px] max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-blue-700 dark:bg-blue-800 rounded-t-lg flex-shrink-0">
                        <h3 className="text-base font-semibold text-white">Patient and Notebook Details</h3>
                        <button onClick={onClose} className="p-1 hover:bg-blue-600 dark:hover:bg-blue-700 rounded transition-colors">
                            <X size={20} className="text-white" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-auto p-2">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading patient details...</p>
                                </div>
                            </div>
                        ) : patient ? (
                            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-2 h-full">
                                {/* LEFT — Patient Info */}
                                <div className="space-y-2">
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                                        <h4 className="text-sm font-semibold px-3 py-1.5 text-center bg-gray-200 dark:bg-gray-700 rounded-t text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600">
                                            Patient Information
                                        </h4>
                                        <div className="text-xs">
                                            {[
                                                ['Lab No',           patient.labno || 'N/A'],
                                                ['Form No',          patient.labid || 'N/A'],
                                                ['Last Name',        patient.lname || 'N/A'],
                                                ['First Name',       patient.fname || 'N/A'],
                                                ['Birth',            formatDateTime(patient.birthdt, patient.birthtm)],
                                                ['Collection',       formatDateTime(patient.dtcoll, patient.tmcoll)],
                                                ['Specimen Type',    getSpecimenType(patient.spectype)],
                                                ['Milk Type',        patient.milktype || 'N/A'],
                                                ['Sex',              formatSex(patient.sex)],
                                                ['Birth Weight',     patient.birthwt || 'N/A'],
                                                ['Birth Order',      patient.birthorder || 'N/A'],
                                                ['Blood Transfused', formatYesNo(patient.transfus)],
                                                ['Transfused Date',  patient.transfusdt ? formatDateTime(patient.transfusdt) : 'N/A'],
                                                ['Gestation Age',    patient.gestage || 'N/A'],
                                                ['Specimen Age',     calculateSpecimenAge(patient.dtrecv, patient.dtcoll)],
                                                ['Age at Collection',patient.agecoll || 'N/A'],
                                                ['Date Received',    patient.dtrecv ? formatDateTime(patient.dtrecv) : 'N/A'],
                                                ['Date Reported',    patient.dtrptd ? formatDateTime(patient.dtrptd) : 'N/A'],
                                                ['Clinical Status',  patient.clinstat || 'N/A'],
                                                ['Physician ID',     getTechName(patient.physid)],
                                                ['Birth Hospital ID',patient.birthhosp || 'N/A'],
                                                ['Facility Code',    patient.submid || 'N/A'],
                                            ].map(([label, value], i, arr) => (
                                                <div
                                                    key={label}
                                                    className={`grid grid-cols-[120px_1fr] gap-x-2 px-2 py-1.5 ${i < arr.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                                                >
                                                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                                                    <span className={`text-gray-900 dark:text-white ${label === 'Birth Hospital' ? 'text-[11px]' : ''}`}>{value}</span>
                                                </div>
                                            ))}
                                            <div className="grid grid-cols-[120px_1fr] gap-x-2 px-2 py-1.5 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-700 dark:text-gray-300">Birth Hospital</span>
                                                <span className="text-gray-900 dark:text-white text-[11px]">{patient.provider_descr1 || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT — Results + Notebooks */}
                                <div className="space-y-2">
                                    {/* Results Details */}
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                                        <h4 className="text-sm font-semibold px-3 py-1.5 text-center bg-gray-200 dark:bg-gray-700 rounded-t text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600">
                                            Results Details
                                        </h4>
                                        <div className="p-2 overflow-auto max-h-[350px]">
                                            {patient.disorderResults && patient.disorderResults.length > 0 ? (
                                                <div className="border border-gray-300 dark:border-gray-600 rounded">
                                                    <table className="w-full text-[11px]">
                                                        <thead className="sticky top-0 bg-white dark:bg-gray-700">
                                                            <tr className="border-b border-gray-300 dark:border-gray-600">
                                                                {['Group', 'Disorder', 'Mnemonic', 'Result', 'Text'].map(h => (
                                                                    <th key={h} className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 last:border-r-0">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {patient.disorderResults.map((result, idx) => (
                                                                <tr key={idx} className="border-b border-gray-300 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                    <td className="px-2 py-1 text-gray-900 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">{result.GROUP_NAME || 'N/A'}</td>
                                                                    <td className="px-2 py-1 text-gray-900 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">{result.DISORDER_NAME || 'N/A'}</td>
                                                                    <td className="px-2 py-1 text-gray-900 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">{result.MNEMONIC || 'N/A'}</td>
                                                                    <td className="px-2 py-1 text-gray-900 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">{result.DESCR1 || 'N/A'}</td>
                                                                    <td className="px-2 py-1 text-gray-900 dark:text-gray-300">{result.DISORDERRESULTTEXT || 'N/A'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                                    <p className="text-sm">No test results available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notebook Details */}
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                                        <div className="flex justify-between items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-t border-b border-gray-300 dark:border-gray-600">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                Notebook Details ({groupedEntries.length})
                                                {notebooksLoading && (
                                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                )}
                                            </h4>
                                            <div className="flex gap-1.5">
                                                {canCreate && (
                                                    <button
                                                        onClick={() => setShowAddNotebookModal(true)}
                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] rounded flex items-center gap-1"
                                                    >
                                                        <span>📝</span> Add Notebook
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowViewImageModal(true)}
                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] rounded flex items-center gap-1"
                                                >
                                                    <Search size={13} /> View Filter Card
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-2 overflow-auto max-h-[300px]">
                                            {notebooksLoading && notebookEntries.length === 0 ? (
                                                <div className="text-center py-4">
                                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Loading notebooks...</p>
                                                </div>
                                            ) : notebooksError ? (
                                                <div className="text-center py-4">
                                                    <p className="text-xs text-red-600 dark:text-red-400">Failed to load notebook entries</p>
                                                </div>
                                            ) : groupedEntries.length > 0 ? (
                                                <div className="space-y-3">
                                                    {groupedEntries.map((entry, idx) => {
                                                        const prevEntry   = idx > 0 ? groupedEntries[idx - 1] : null;
                                                        const showSeparator = prevEntry && !prevEntry.isMySQL && entry.isMySQL;
                                                        return (
                                                            <React.Fragment key={idx}>
                                                                {showSeparator && (
                                                                    <div className="py-3">
                                                                        <div className="relative">
                                                                            <div className="absolute inset-0 flex items-center">
                                                                                <div className="w-full border-t-2 border-gray-300 dark:border-gray-600" />
                                                                            </div>
                                                                            <div className="relative flex justify-center">
                                                                                <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 rounded">
                                                                                    New Entries Added Below
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 p-3 shadow-sm">
                                                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                                                                        <span className="text-gray-500 dark:text-gray-400 text-xs">📋</span>
                                                                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                                            Specimen No.: {entry.specimenNo || 'N/A'}
                                                                        </span>
                                                                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${entry.isMySQL ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                                                            {entry.isMySQL ? 'Added' : 'Legacy'}
                                                                        </span>
                                                                    </div>
                                                                    {[
                                                                        ['🕒', 'Date Created', `${entry.createdDate} - ${entry.createdTime}`],
                                                                        ['👤', 'Tech',         entry.techName],
                                                                        ['✏️', 'Last Modified', entry.modifiedDateTime],
                                                                    ].map(([icon, label, value]) => (
                                                                        <div key={label} className="flex items-center gap-2 mb-1.5">
                                                                            <span className="text-gray-500 dark:text-gray-400 text-xs">{icon}</span>
                                                                            <span className="text-xs text-gray-700 dark:text-gray-300">
                                                                                <span className="font-medium">{label}:</span> {value}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">💬</span>
                                                                            <div className="flex-1">
                                                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Remarks:</span>
                                                                                <p className="text-xs text-gray-900 dark:text-gray-100 mt-1 leading-relaxed whitespace-pre-line">
                                                                                    {entry.notes || 'No remarks'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {entry.attachments.length > 0 && (
                                                                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                                <span className="text-gray-500 dark:text-gray-400 text-xs">📎</span>
                                                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                                                    Attachments ({entry.attachments.length})
                                                                                </span>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                {entry.attachments.map((attachment, attIdx) => (
                                                                                    <div key={attIdx} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                            <span className="text-base flex-shrink-0">{getFileIcon(attachment)}</span>
                                                                                            <div className="min-w-0 flex-1">
                                                                                                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{attachment}</p>
                                                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Attachment {attIdx + 1}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex gap-1 flex-shrink-0 ml-2">
                                                                                            <button onClick={() => handleViewAttachment(attachment)} className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] rounded flex items-center gap-1 transition-colors">
                                                                                                <Eye size={13} /> View
                                                                                            </button>
                                                                                            {canCreate && (
                                                                                                <button onClick={() => handleDownloadAttachment(attachment)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded flex items-center gap-1 transition-colors">
                                                                                                    <Download size={13} /> Download
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                                    <p className="text-xs">No notebook entries found for {patient.fname} {patient.lname}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-gray-500 dark:text-gray-400">No patient selected</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex justify-between flex-shrink-0">
                        <button onClick={onBackToResults} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors text-sm font-medium">
                            Back to Table
                        </button>
                        <button onClick={onBackToSearch} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors text-sm font-medium">
                            Back to Search
                        </button>
                    </div>
                </div>
            </div>

            {/* View Attachment Modal */}
            {showAttachmentModal && selectedAttachment && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => setShowAttachmentModal(false)} />
                    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">View Attachment</h3>
                                <button onClick={() => setShowAttachmentModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                                    <X size={20} className="text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                <div className="flex flex-col items-center justify-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{selectedAttachment}</p>
                                    {isImageFile(selectedAttachment) ? (
                                        <img
                                            src={`${API_BASE_URL}/uploads/${selectedAttachment}`}
                                            alt={selectedAttachment}
                                            className="max-w-full max-h-[70vh] object-contain rounded border border-gray-300 dark:border-gray-700"
                                        />
                                    ) : isPdfFile(selectedAttachment) ? (
                                        <iframe
                                            src={`${API_BASE_URL}/uploads/${selectedAttachment}`}
                                            className="w-full h-[70vh] border border-gray-300 dark:border-gray-700 rounded"
                                            title={selectedAttachment}
                                        />
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-gray-600 dark:text-gray-400 mb-4">Preview not available for this file type.</p>
                                            <button onClick={() => handleDownloadAttachment(selectedAttachment)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2 mx-auto">
                                                <Download size={16} /> Download File
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                                {canCreate && (
                                    <button onClick={() => handleDownloadAttachment(selectedAttachment)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2">
                                        <Download size={16} /> Download
                                    </button>
                                )}
                                <button onClick={() => setShowAttachmentModal(false)} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {patient && (
                <ViewImageModal
                    isOpen={showViewImageModal}
                    onClose={() => setShowViewImageModal(false)}
                    labno={patient.labno}
                />
            )}

            {/* AddNotebookModal — mutation inside handles cache invalidation */}
            <AddNotebookModal
                isOpen={showAddNotebookModal}
                onClose={() => setShowAddNotebookModal(false)}
                onSuccess={() => setShowAddNotebookModal(false)}
                patient={patient}
            />
        </>
    );
};