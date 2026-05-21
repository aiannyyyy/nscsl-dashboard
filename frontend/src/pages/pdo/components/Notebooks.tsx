import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { NotebookSearchModal } from './NotebookSearchModal';
import { NotebookResultsModal } from './NotebookResultsModal';
import { NotebookDetailsModal } from './NotebookDetailsModal';
import type { SearchCriteria } from './NotebookSearchModal';
import * as notebooksApi from '../../../services/PDOServices/notebooksApi';
import type { PatientSearchResult } from '../../../services/PDOServices/notebooksApi';
import { useRecentNotebooks } from '../../../hooks/PDOHooks/useNotebook';
import { usePermissions } from '../../../hooks/usePermission';

interface PatientResult {
    labno:    string;
    labid:    string;
    fname:    string;
    lname:    string;
    sex:      string;
    dob:      string;
    birthwt:  string;
    submid:   string;
    descr1?:  string;
    notes?:   string;
}

interface DisorderResult {
    LABNO:                string;
    DISORDER_NAME:        string;
    MNEMONIC:             string;
    DESCR1:               string;
    DISORDERRESULTTEXT:   string;
    GROUP_NAME:           string;
}

interface PatientDetails {
    labno:           string;
    labid:           string;
    fname:           string;
    lname:           string;
    birthdt?:        string;
    birthtm?:        string;
    dtcoll?:         string;
    tmcoll?:         string;
    spectype?:       string;
    milktype?:       string;
    sex:             string;
    birthwt:         string;
    birthorder?:     string;
    transfus?:       string;
    transfusdt?:     string;
    gestage?:        string;
    agecoll?:        string;
    dtrecv?:         string;
    dtrptd?:         string;
    releasedt?:      string;
    clinstat?:       string;
    physid?:         string;
    birthhosp?:      string;
    birthhospname?:  string;
    submid:          string;
    provider_descr1?: string;
    notes?:          string;
    disorderResults?: DisorderResult[];
    [key: string]: any;
}

export const Notebooks: React.FC = () => {
    const [showSearchModal,  setShowSearchModal]  = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [searchResults,    setSearchResults]    = useState<PatientResult[]>([]);
    const [selectedPatient,  setSelectedPatient]  = useState<PatientDetails | null>(null);
    const [loading,          setLoading]          = useState(false);
    const [detailsLoading,   setDetailsLoading]   = useState(false);
    const [error,            setError]            = useState<string | null>(null);

    const { canCreate } = usePermissions(['program', 'administrator']);

    // ─── Query — auto-refreshes every 30s, no manual refresh needed ──────────
    const {
        data:      recentNotebookEntries = [],
        isLoading: notebooksLoading,
        isError,
        error:     fetchError,
    } = useRecentNotebooks();

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const mapPatientResult = (patient: PatientSearchResult): PatientResult => ({
        labno:   patient.LABNO  || '',
        labid:   patient.LABID  || '',
        fname:   patient.FNAME  || '',
        lname:   patient.LNAME  || '',
        sex:     patient.SEX    || '',
        dob:     patient.BIRTHDT || '',
        birthwt: patient.BIRTHWT || '',
        submid:  patient.SUBMID  || '',
        descr1:  patient.DESCR1,
        notes:   patient.NOTES,
    });

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleString('en-US', {
                timeZone:  'Asia/Manila',
                year:      'numeric',
                month:     'short',
                day:       'numeric',
                hour:      '2-digit',
                minute:    '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleSearch = async (criteria: SearchCriteria) => {
        setLoading(true);
        setError(null);
        setShowSearchModal(false);
        setShowResultsModal(true);
        try {
            const results = await notebooksApi.searchPatients(criteria);
            setSearchResults(results.map(mapPatientResult));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to search patients');
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (patient: PatientResult) => {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        setDetailsLoading(true);
        setShowResultsModal(false);
        setShowDetailsModal(true);
        try {
            const url = patient.labid
                ? `${API_BASE_URL}/notebooks/complete-details?labno=${patient.labno}&labid=${patient.labid}`
                : `${API_BASE_URL}/notebooks/complete-details?labno=${patient.labno}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch patient details: ${response.status}`);
            const data = await response.json();

            setSelectedPatient({
                labno:           data.LABNO  || patient.labno,
                labid:           data.LABID  || patient.labid,
                fname:           data.FNAME  || patient.fname,
                lname:           data.LNAME  || patient.lname,
                sex:             data.SEX    || patient.sex,
                birthdt:         data.BIRTHDT,
                birthtm:         data.BIRTHTM,
                birthwt:         data.BIRTHWT || patient.birthwt,
                birthhosp:       data.BIRTHHOSP,
                dtcoll:          data.DTCOLL,
                tmcoll:          data.TMCOLL,
                dtrecv:          data.DTRECV,
                dtrptd:          data.DTRPTD,
                releasedt:       data.RELEASEDT,
                spectype:        data.SPECTYPE,
                milktype:        data.MILKTYPE,
                gestage:         data.GESTAGE,
                agecoll:         data.AGECOLL,
                transfus:        data.TRANSFUS,
                clinstat:        data.CLINSTAT,
                physid:          data.PHYSID,
                submid:          data.SUBMID  || patient.submid,
                provider_descr1: data.PROVIDER_DESCR1,
                notes:           data.NOTES,
                disorderResults: Array.isArray(data.disorderResults) ? data.disorderResults : [],
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch patient details');
            setSelectedPatient({
                labno:   patient.labno,
                labid:   patient.labid,
                fname:   patient.fname,
                lname:   patient.lname,
                sex:     patient.sex,
                birthwt: patient.birthwt,
                submid:  patient.submid,
                birthdt: patient.dob,
                disorderResults: [],
            });
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleBackToSearch = () => {
        setShowResultsModal(false);
        setShowDetailsModal(false);
        setShowSearchModal(true);
        setSearchResults([]);
        setSelectedPatient(null);
        setError(null);
    };

    const handleBackToResults = () => {
        setShowDetailsModal(false);
        setShowResultsModal(true);
        setError(null);
    };

    const handleCloseAll = () => {
        setShowSearchModal(false);
        setShowResultsModal(false);
        setShowDetailsModal(false);
        setSearchResults([]);
        setSelectedPatient(null);
        setError(null);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors min-h-[500px] flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            Recent Notebooks
                            {/* Subtle background refresh indicator */}
                            {notebooksLoading && recentNotebookEntries.length > 0 && (
                                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            )}
                        </h4>
                        <div className="flex gap-2">
                            {/* Refresh button removed — React Query auto-refreshes every 30s */}
                            {canCreate && (
                                <button
                                    onClick={() => setShowSearchModal(true)}
                                    className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-medium flex items-center gap-1.5"
                                >
                                    <Search size={14} />
                                    Online Search
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {isError && (
                        <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-xs text-red-800 dark:text-red-300">
                                {(fetchError as any)?.message ?? 'Failed to load recent notebooks'}
                            </p>
                        </div>
                    )}

                    <table className="w-full">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                {['Labno', 'Name', 'Added By', 'Date Added', 'Actions'].map(h => (
                                    <th
                                        key={h}
                                        className={`px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider ${h === 'Actions' ? 'text-center' : 'text-left'}`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {notebooksLoading && recentNotebookEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-xs">Loading notebooks...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : recentNotebookEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={28} className="opacity-50" />
                                            <p className="text-xs">No notebook entries found</p>
                                            <p className="text-xs text-gray-400">Click "Online Search" to find patients and add notebooks</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                recentNotebookEntries.map((entry, idx) => (
                                    <tr
                                        key={`${entry.labno}-${entry.createDate}-${idx}`}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">{entry.labno}</td>
                                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">{`${entry.fname} ${entry.lname}`.trim()}</td>
                                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{entry.techCreate || '-'}</td>
                                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{formatDate(entry.createDate)}</td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => handleViewDetails({
                                                    labno:   entry.labno,
                                                    labid:   entry.labid || '',
                                                    fname:   entry.fname,
                                                    lname:   entry.lname,
                                                    sex:     '',
                                                    dob:     '',
                                                    birthwt: '',
                                                    submid:  '',
                                                })}
                                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <NotebookSearchModal
                isOpen={showSearchModal}
                onClose={handleCloseAll}
                onSearch={handleSearch}
            />
            <NotebookResultsModal
                isOpen={showResultsModal}
                onClose={handleCloseAll}
                onBack={handleBackToSearch}
                onViewDetails={handleViewDetails}
                results={searchResults}
                loading={loading}
            />
            <NotebookDetailsModal
                isOpen={showDetailsModal}
                onClose={handleCloseAll}
                onBackToResults={handleBackToResults}
                onBackToSearch={handleBackToSearch}
                patient={selectedPatient}
                loading={detailsLoading}
            />
        </>
    );
};