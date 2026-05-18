import React, { useState } from 'react';
import { X, Search as SearchIcon } from 'lucide-react';

interface NotebookSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (criteria: SearchCriteria) => void;
}

export interface SearchCriteria {
    labno?: string;
    labid?: string;
    fname?: string;
    lname?: string;
    submid?: string;
}

export const NotebookSearchModal: React.FC<NotebookSearchModalProps> = ({
    isOpen,
    onClose,
    onSearch
}) => {
    const [criteria, setCriteria] = useState<SearchCriteria>({
        labno: '',
        labid: '',
        fname: '',
        lname: '',
        submid: ''
    });

    const [hasInput, setHasInput] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCriteria = {
            ...criteria,
            [e.target.name]: e.target.value
        };
        setCriteria(newCriteria);

        // Check if any field has input
        const hasAnyInput = Object.values(newCriteria).some(value => value?.trim() !== '');
        setHasInput(hasAnyInput);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Filter out empty values
        const filteredCriteria: SearchCriteria = {};
        Object.entries(criteria).forEach(([key, value]) => {
            if (value?.trim() !== '') {
                filteredCriteria[key as keyof SearchCriteria] = value?.trim();
            }
        });

        onSearch(filteredCriteria);
    };

    const handleReset = () => {
        setCriteria({
            labno: '',
            labid: '',
            fname: '',
            lname: '',
            submid: ''
        });
        setHasInput(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}></div>

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Search Criteria
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X size={18} className="text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 mb-4">
                            <p className="text-xs text-blue-800 dark:text-blue-300">
                                Enter search criteria in one or more fields below.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* Lab Number */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Lab Number
                                </label>
                                <input
                                    type="text"
                                    name="labno"
                                    value={criteria.labno}
                                    onChange={handleInputChange}
                                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    autoComplete="on"
                                />
                            </div>

                            {/* Filter Card Number */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Filter Card Number
                                </label>
                                <input
                                    type="text"
                                    name="labid"
                                    value={criteria.labid}
                                    onChange={handleInputChange}
                                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    autoComplete="on"
                                />
                            </div>

                            {/* First Name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    name="fname"
                                    value={criteria.fname}
                                    onChange={handleInputChange}
                                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    autoComplete="on"
                                />
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    name="lname"
                                    value={criteria.lname}
                                    onChange={handleInputChange}
                                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    autoComplete="on"
                                />
                            </div>

                            {/* Facility Code */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Facility Code
                                </label>
                                <input
                                    type="text"
                                    name="submid"
                                    value={criteria.submid}
                                    onChange={handleInputChange}
                                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    autoComplete="on"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={!hasInput}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <SearchIcon size={16} />
                                    Search
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                >
                                    Reset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};