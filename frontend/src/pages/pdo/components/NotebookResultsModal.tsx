import React from 'react';
import { X, Eye, ArrowLeft } from 'lucide-react';
import { usePermissions } from '../../../hooks/usePermission';

interface PatientResult {
    labno: string;
    labid: string;
    fname: string;
    lname: string;
    sex: string;
    dob: string;
    birthwt: string;
    submid: string;
}

interface NotebookResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
    onViewDetails: (patient: PatientResult) => void;
    results: PatientResult[];
    loading?: boolean;
}

export const NotebookResultsModal: React.FC<NotebookResultsModalProps> = ({
    isOpen,
    onClose,
    onBack,
    onViewDetails,
    results,
    loading = false
}) => {
    const { canCreate } = usePermissions(['program', 'administrator']);

    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}></div>

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Search Results
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onBack}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-medium flex items-center gap-1.5"
                            >
                                <ArrowLeft size={14} />
                                Back to Search
                            </button>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading results...</p>
                                </div>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">No results found</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Try adjusting your search criteria</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                                Lab No
                                            </th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                                Filter Card No
                                            </th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                                First Name
                                            </th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                                Last Name
                                            </th>
                                            <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                                                Gender
                                            </th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                                DOB
                                            </th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                                Birth Weight
                                            </th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                                Facility Code
                                            </th>
                                            <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {results.map((patient, index) => (
                                            <tr
                                                key={index}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                            >
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-300">
                                                    {patient.labno}
                                                </td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-300">
                                                    {patient.labid}
                                                </td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-300">
                                                    {patient.fname}
                                                </td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-300">
                                                    {patient.lname}
                                                </td>
                                                <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-300">
                                                    {patient.sex}
                                                </td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-300">
                                                    {formatDate(patient.dob)}
                                                </td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-300">
                                                    {patient.birthwt}
                                                </td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-300">
                                                    {patient.submid}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                {/* ✅ Only show View button if user has permission */}
                                                {canCreate ? (
                                                    <button
                                                        onClick={() => onViewDetails(patient)}
                                                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {!loading && results.length > 0 && (
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                                Found {results.length} result{results.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};