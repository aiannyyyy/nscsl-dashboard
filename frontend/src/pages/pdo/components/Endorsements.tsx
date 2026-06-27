import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, FileText, Edit, Trash2, X, Eye, Filter, Calendar } from 'lucide-react';
import { DateRangeModal } from '../../laboratory/components/DateRangeModal';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermission';
import {
  useGetAllEndorsements,
  useDeleteEndorsement,
  useGetUniqueTestResults,
  type EndorsementData,
} from '../../../hooks/LaboratoryHooks';

export interface EndorsementRecord {
  id: number;
  labNumber: string;
  firstName: string;
  lastName: string;
  facilityCode: string;
  facilityName: string;
  testResult: string; // Changed to accept any string value
  remarks: string;
  attachmentPath?: string;
  dateTimeEndorsed: string;
  endorsedBy: string;
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
}

// Helper function to map API data to component format
const mapEndorsementData = (data: EndorsementData): EndorsementRecord => {
  console.log('Mapping endorsement data:', data); // Debug log
  return {
    id: data.id!,
    labNumber: data.labno,
    firstName: data.fname,
    lastName: data.lname,
    facilityCode: data.facility_code,
    facilityName: data.facility_name,
    testResult: data.test_result || 'Unknown', // Handle any string value
    remarks: data.remarks || '',
    attachmentPath: data.attachment_path,
    dateTimeEndorsed: data.date_endorsed || '',
    endorsedBy: data.endorsed_by || '',
    modifiedBy: data.modified_by,
    modifiedAt: data.date_modified,
  };
};

export const Endorsements: React.FC = () => {
  // API Hooks
  const { data: endorsementsData, isLoading, refetch } = useGetAllEndorsements();
  const deleteMutation = useDeleteEndorsement();
  const { data: uniqueTestResultsRaw } = useGetUniqueTestResults();
  const uniqueTestResults = Array.isArray(uniqueTestResultsRaw) ? uniqueTestResultsRaw : [];
  
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EndorsementRecord | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [editingRecord, setEditingRecord] = useState<EndorsementRecord | null>(null);
  const [viewingFile, setViewingFile] = useState<{ path: string; name: string; type: string } | null>(null);
  
  // Filter states
  const [searchLabNumber, setSearchLabNumber] = useState<string>('');
  const [selectedTestResult, setSelectedTestResult] = useState<string>('all');
  
  const { user } = useAuth();

  const { canExport } = usePermissions(['program', 'administrator']);

  // Map API data to component format
  const records = useMemo(() => {
    if (!endorsementsData) return [];
    return endorsementsData.map(mapEndorsementData);
  }, [endorsementsData]);

  // Filter records based on selected filters
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesLabNumber = searchLabNumber === '' || record.labNumber.toLowerCase().includes(searchLabNumber.toLowerCase());
      const matchesTestResult = selectedTestResult === 'all' || record.testResult === selectedTestResult;
      return matchesLabNumber && matchesTestResult;
    });
  }, [records, searchLabNumber, selectedTestResult]);

  const handleView = (record: EndorsementRecord) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleEdit = (record: EndorsementRecord) => {
    setEditingRecord(record);
  };


  const handleViewAttachments = (attachmentPath: string) => {
    const files = attachmentPath.split(',').map(f => f.trim());
    setSelectedAttachments(files);
    setShowAttachmentModal(true);
  };

  const handleDownloadFile = (filePath: string) => {
    const downloadUrl = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/${filePath}`;
    console.log('📂 Downloading file:', downloadUrl);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filePath.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewFile = (filePath: string) => {
    const fileName = filePath.split('/').pop() || 'Unknown file';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const downloadOnlyTypes = ['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx', 'csv', 'zip', 'rar'];
    
    if (downloadOnlyTypes.includes(fileExtension)) {
      if (!canExport) return;
      handleDownloadFile(filePath);
      return;
    }
    
    setViewingFile({
      path: filePath,
      name: fileName,
      type: fileExtension
    });
  };

  const handleModalClose = () => {
    setEditingRecord(null);
  };

  const handleModalSuccess = () => {
    console.log('🔄 Endorsement saved successfully');
    refetch(); // Refetch the data
  };

  const handleExport = (fromDate: string, toDate: string) => {
    console.log('📊 Exporting endorsements from', fromDate, 'to', toDate);
    
    // Filter records by date range
    const filteredData = records.filter(record => {
      if (!record.dateTimeEndorsed) return false;
      const recordDate = new Date(record.dateTimeEndorsed);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return recordDate >= from && recordDate <= to;
    });

    if (filteredData.length === 0) {
      alert('No records found in the selected date range');
      setShowDateRangeModal(false);
      return;
    }

    try {
      // Dynamically import xlsx
      import('xlsx').then((XLSX) => {
        // Prepare data for export
        const exportData = filteredData.map(record => ({
          'Lab Number': record.labNumber,
          'First Name': record.firstName,
          'Last Name': record.lastName,
          'Facility Code': record.facilityCode,
          'Facility Name': record.facilityName,
          'Test Result': record.testResult,
          'Remarks': record.remarks || 'No remarks',
          'Date Endorsed': formatDate(record.dateTimeEndorsed),
          'Endorsed By': record.endorsedBy,
          'Modified By': record.modifiedBy || '—',
          'Date Modified': record.modifiedAt ? formatDate(record.modifiedAt) : '—',
        }));

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths
        const columnWidths = [
          { wch: 15 }, // Lab Number
          { wch: 15 }, // First Name
          { wch: 15 }, // Last Name
          { wch: 12 }, // Facility Code
          { wch: 40 }, // Facility Name
          { wch: 20 }, // Test Result
          { wch: 50 }, // Remarks
          { wch: 20 }, // Date Endorsed
          { wch: 20 }, // Endorsed By
          { wch: 20 }, // Modified By
          { wch: 20 }, // Date Modified
        ];
        worksheet['!cols'] = columnWidths;

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Endorsements');

        // Generate filename with date range
        const fromFormatted = new Date(fromDate).toISOString().split('T')[0];
        const toFormatted = new Date(toDate).toISOString().split('T')[0];
        const filename = `Endorsements_${fromFormatted}_to_${toFormatted}.xlsx`;

        // Download file
        XLSX.writeFile(workbook, filename);
        
        setShowDateRangeModal(false);
        alert(`Successfully exported ${filteredData.length} records`);
      }).catch(error => {
        console.error('Error loading XLSX library:', error);
        alert('Export failed. Please make sure the xlsx library is installed.');
      });
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleClearFilters = () => {
    setSearchLabNumber('');
    setSelectedTestResult('all');
  };

  const getTestResultBadge = (result: string) => {
    if (!result || result === 'Unknown') {
      return <span className="text-gray-400 text-xs">Unknown</span>;
    }

    // Map actual results to display categories based on keywords
    const upperResult = result.toUpperCase();
    const positiveKeywords = ['PRESUMPTIVE', 'POSITIVE', 'ABNORMAL', 'ELEVATED', 'HIGH'];
    const negativeKeywords = ['NORMAL', 'NEGATIVE', 'WITHIN', 'WNL'];
    const pendingKeywords = ['PENDING', 'INCONCLUSIVE', 'RETEST', 'REPEAT'];
    
    if (positiveKeywords.some(keyword => upperResult.includes(keyword))) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {result}
        </span>
      );
    } else if (negativeKeywords.some(keyword => upperResult.includes(keyword))) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          {result}
        </span>
      );
    } else if (pendingKeywords.some(keyword => upperResult.includes(keyword))) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          {result}
        </span>
      );
    } else {
      // Default styling for other results
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {result}
        </span>
      );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCreatedModified = (name: string | null | undefined, date: string | null | undefined) => {
    if (!name && !date) return '—';
    if (!name) return formatDate(date!);
    if (!date) return name;
    
    return (
      <div className="text-xs">
        <div className="font-medium text-gray-900 dark:text-white">{name}</div>
        <div className="text-gray-500 dark:text-gray-400">{formatDate(date)}</div>
      </div>
    );
  };

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return 'No remarks';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderDetailsModal = () => {
    if (!selectedRecord) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Endorsement Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Lab Number: {selectedRecord.labNumber}
              </p>
            </div>
            <button
              onClick={() => setShowDetailsModal(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              {/* Patient Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Patient Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lab Number</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.labNumber}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Patient Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.firstName} {selectedRecord.lastName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Facility Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Facility Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Facility Code</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.facilityCode}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Facility Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.facilityName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Result */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Test Result
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  {getTestResultBadge(selectedRecord.testResult)}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Remarks
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedRecord.remarks || 'No remarks'}
                  </p>
                </div>
              </div>

              {/* Attachments */}
              {selectedRecord.attachmentPath && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded"></div>
                    Attachments ({selectedRecord.attachmentPath.split(',').length})
                  </h4>
                  <div className="space-y-2">
                    {selectedRecord.attachmentPath.split(',').map((filePath, index) => {
                      const fileName = filePath.trim().split('/').pop() || 'Unknown file';
                      const fileExtension = fileName.split('.').pop()?.toLowerCase();
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={18} className="text-blue-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {fileName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {fileExtension?.toUpperCase()} file
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => handleViewFile(filePath.trim())}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            {canExport && (
                              <button
                                onClick={() => handleDownloadFile(filePath.trim())}
                                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                              >
                                <Download size={14} />
                                Download
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Endorsement Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Endorsement Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Endorsed By</p>
                    {formatCreatedModified(selectedRecord.endorsedBy, selectedRecord.dateTimeEndorsed)}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Modified By</p>
                    {formatCreatedModified(selectedRecord.modifiedBy, selectedRecord.modifiedAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-end gap-2">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFileViewer = () => {
    if (!viewingFile) return null;

    const fileUrl = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/${viewingFile.path}`;
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const pdfTypes = ['pdf'];
    const downloadOnlyTypes = ['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx', 'csv', 'zip', 'rar'];
    
    const isImage = imageTypes.includes(viewingFile.type);
    const isPdf = pdfTypes.includes(viewingFile.type);
    const isDownloadOnly = downloadOnlyTypes.includes(viewingFile.type);

    if (isDownloadOnly) {
      handleDownloadFile(viewingFile.path);
      setViewingFile(null);
      return null;
    }

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-blue-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {viewingFile.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {viewingFile.type.toUpperCase()} file
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canExport && (
                <button
                  onClick={() => handleDownloadFile(viewingFile.path)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                >
                  <Download size={14} />
                  Download
                </button>
              )}
              <button
                onClick={() => setViewingFile(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-4">
            {isImage ? (
              <div className="flex items-center justify-center h-full">
                <img
                  src={fileUrl}
                  alt={viewingFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                className="w-full h-full min-h-[600px] rounded-lg shadow-lg bg-white"
                title={viewingFile.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText size={64} className="text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Preview not available for this file type
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  {viewingFile.name}
                </p>
                {canExport && (
                  <button
                    onClick={() => handleDownloadFile(viewingFile.path)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download File
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 h-[600px] max-h-[500px]">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  const hasActiveFilters = searchLabNumber !== '' || selectedTestResult !== 'all';

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors h-[500px] max-h-[500px] flex flex-col">
        {/* Header - Fixed */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex justify-between items-center gap-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              Endorsement from Unsat
              {hasActiveFilters && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({filteredRecords.length} of {records.length})
                </span>
              )}
            </h4>
            
            <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
              {/* Filters */}
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <Filter size={14} />
                <span className="font-medium">Filters:</span>
              </div>
              
              <input
                type="text"
                value={searchLabNumber}
                onChange={(e) => setSearchLabNumber(e.target.value)}
                placeholder="Search lab number..."
                className="h-8 px-3 text-xs rounded-lg border w-48
                  bg-white dark:bg-gray-800
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={selectedTestResult}
                onChange={(e) => setSelectedTestResult(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border
                  bg-white dark:bg-gray-800
                  border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Results</option>
                {uniqueTestResults.map((result) => (
                  <option key={result} value={result}>
                    {result}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="h-8 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  Clear filters
                </button>
              )}

              {/* Action Buttons */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

              {canExport && (
                <button
                  onClick={() => setShowDateRangeModal(true)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                >
                  <Download size={16} />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Container - Scrollable with frozen action column */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto h-full">
              <table className="w-full text-xs relative">
                <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-28">
                      Lab Number
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-40">
                      Patient Name
                    </th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-24">
                      Facility Code
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-48">
                      Facility Name
                    </th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-24">
                      Test Result
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-64">
                      Remarks
                    </th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-16">
                      File
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-36">
                      Endorsed
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap w-36">
                      Modified
                    </th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-gray-800/50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] w-28">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                        {hasActiveFilters ? 'No endorsements found matching the filters' : 'No endorsements found'}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`transition-colors ${
                          index % 2 === 0 
                            ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50' 
                            : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 whitespace-nowrap">
                          {record.labNumber}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-gray-900 dark:text-gray-300 whitespace-nowrap">
                          {record.firstName} {record.lastName}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-500 text-white">
                            {record.facilityCode}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 max-w-48 truncate">
                          {record.facilityName}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {getTestResultBadge(record.testResult)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 max-w-64">
                          <div className="truncate" title={record.remarks || 'No remarks'}>
                            {truncateText(record.remarks, 60)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {record.attachmentPath ? (
                            <button 
                              onClick={() => handleViewAttachments(record.attachmentPath!)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded transition-colors"
                              title="View attachments"
                            >
                              <FileText size={16} />
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatCreatedModified(record.endorsedBy, record.dateTimeEndorsed)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatCreatedModified(record.modifiedBy, record.modifiedAt)}
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap sticky right-0 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] ${
                          index % 2 === 0 
                            ? 'bg-white dark:bg-gray-900' 
                            : 'bg-gray-50/50 dark:bg-gray-800/30'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleView(record)}
                              className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <DateRangeModal
        open={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        onApply={handleExport}
      />

      {/* Details Modal */}
      {showDetailsModal && renderDetailsModal()}

      {/* Attachment List Modal */}
      {showAttachmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Attachments ({selectedAttachments.length})
              </h3>
              <button
                onClick={() => setShowAttachmentModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <div className="space-y-2">
                {selectedAttachments.map((filePath, index) => {
                  const fileName = filePath.split('/').pop() || 'Unknown file';
                  const fileExtension = fileName.split('.').pop()?.toLowerCase();
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText size={20} className="text-blue-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {fileName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {fileExtension?.toUpperCase()} file
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => handleViewFile(filePath)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs flex-shrink-0"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        {canExport && (
                          <button
                            onClick={() => handleDownloadFile(filePath)}
                            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs flex-shrink-0"
                          >
                            <Download size={14} />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {renderFileViewer()}
    </>
  );
};