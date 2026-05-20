import React, { useState, useMemo } from 'react';
import { Plus, Download, FileText, Edit, Trash2, X, Eye, Filter } from 'lucide-react';
import type { FacilityVisit } from '../../../services/PDOServices/facilityVisitsService';
import {
  useFacilityVisits,
  useDeleteFacilityVisit,
} from '../../../hooks/PDOHooks/useFacilityVisits';
import { FacilityVisitModal } from './FacilityVisitModal';
import { ExportModal } from './ExportModal';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermission';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface FacilityVisitsProps {
  selectedProvince: string;
  selectedMonth: string;
  selectedYear: string;
}

export const FacilityVisits: React.FC<FacilityVisitsProps> = ({
  selectedProvince,
  selectedMonth,
  selectedYear,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<FacilityVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<FacilityVisit | null>(null);
  const [viewingFile, setViewingFile] = useState<{ path: string; name: string; type: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { user } = useAuth();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions(['program', 'administrator']);

  // ─── Queries & Mutations ──────────────────────────────────────────────────────
  const { data: visits = [], isLoading, isError, error } = useFacilityVisits();
  const deleteMutation = useDeleteFacilityVisit();

  // ─── Filtering ────────────────────────────────────────────────────────────────
  const filteredVisits = useMemo(() => {
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const yearNum = parseInt(selectedYear);

    return visits.filter((visit) => {
      const matchesProvince =
        selectedProvince === 'All Provinces' ||
        visit.province?.trim().toUpperCase() === selectedProvince.trim().toUpperCase();

      const matchesDate = (() => {
        if (!visit.date_visited) return false;
        const visitDate = new Date(visit.date_visited);
        return (
          visitDate.getFullYear() === yearNum &&
          visitDate.getMonth() === monthIndex
        );
      })();

      const matchesStatus = selectedStatus === 'all' || visit.status === selectedStatus;

      return matchesProvince && matchesDate && matchesStatus;
    });
  }, [visits, selectedProvince, selectedMonth, selectedYear, selectedStatus]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleView = (visit: FacilityVisit) => {
    setSelectedVisit(visit);
    setShowDetailsModal(true);
  };

  const handleEdit = (visit: FacilityVisit) => {
    setEditingVisit(visit);
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this facility visit?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: any) {
      console.error('Error deleting visit:', err);
      alert('Failed to delete facility visit');
    }
  };

  const handleViewAttachments = (attachmentPath: string) => {
    const files = attachmentPath.split(',').map((f) => f.trim());
    setSelectedAttachments(files);
    setShowAttachmentModal(true);
  };

  const handleDownloadFile = (filePath: string) => {
    const downloadUrl = `http://localhost:5000/${filePath}`;
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
      handleDownloadFile(filePath);
      return;
    }
    setViewingFile({ path: filePath, name: fileName, type: fileExtension });
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingVisit(null);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case '1':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        );
      case '0':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Inactive
          </span>
        );
      case '2':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
            Closed
          </span>
        );
      default:
        return <span className="text-gray-400 text-xs">Unknown</span>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatCreatedModified = (name: string | null, date: string | null) => {
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

  const truncateText = (text: string | null, maxLength = 60) => {
    if (!text) return 'No remarks';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // ─── Modals ───────────────────────────────────────────────────────────────────
  const renderDetailsModal = () => {
    if (!selectedVisit) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Facility Visit Details</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedVisit.facility_name}</p>
            </div>
            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Facility Code', value: selectedVisit.facility_code },
                    { label: 'Province', value: selectedVisit.province },
                    { label: 'Date Visited', value: formatDate(selectedVisit.date_visited) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedVisit.status)}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Facility Name
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-white">{selectedVisit.facility_name}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Remarks
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedVisit.remarks || 'No remarks'}
                  </p>
                </div>
              </div>

              {selectedVisit.attachment_path && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded" />
                    Attachments ({selectedVisit.attachment_path.split(',').length})
                  </h4>
                  <div className="space-y-2">
                    {selectedVisit.attachment_path.split(',').map((filePath, index) => {
                      const fileName = filePath.trim().split('/').pop() || 'Unknown file';
                      const fileExtension = fileName.split('.').pop()?.toLowerCase();
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={18} className="text-blue-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fileName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{fileExtension?.toUpperCase()} file</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <button onClick={() => handleViewFile(filePath.trim())} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs">
                              <Eye size={14} /> View
                            </button>
                            {canExport && (
                              <button onClick={() => handleDownloadFile(filePath.trim())} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs">
                                <Download size={14} /> Download
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Audit Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Created By</p>
                    {formatCreatedModified(selectedVisit.created_by, selectedVisit.created_at)}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Modified By</p>
                    {formatCreatedModified(selectedVisit.modified_by, selectedVisit.modified_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-end gap-2">
            {canEdit && (
              <button onClick={() => { setShowDetailsModal(false); handleEdit(selectedVisit); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                <Edit size={16} /> Edit
              </button>
            )}
            <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFileViewer = () => {
    if (!viewingFile) return null;
    const fileUrl = `http://localhost:5000/${viewingFile.path}`;
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(viewingFile.type);
    const isPdf = viewingFile.type === 'pdf';

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-blue-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{viewingFile.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{viewingFile.type.toUpperCase()} file</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canExport && (
                <button onClick={() => handleDownloadFile(viewingFile.path)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs">
                  <Download size={14} /> Download
                </button>
              )}
              <button onClick={() => setViewingFile(null)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-4">
            {isImage ? (
              <div className="flex items-center justify-center h-full">
                <img src={fileUrl} alt={viewingFile.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
              </div>
            ) : isPdf ? (
              <iframe src={fileUrl} className="w-full h-full min-h-[600px] rounded-lg shadow-lg bg-white" title={viewingFile.name} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText size={64} className="text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">Preview not available for this file type</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">{viewingFile.name}</p>
                {canExport && (
                  <button onClick={() => handleDownloadFile(viewingFile.path)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2">
                    <Download size={16} /> Download File
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Loading / Error states ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 h-[600px] max-h-[600px]">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 h-[600px] max-h-[600px]">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-red-500">Error: {(error as any)?.message ?? 'Failed to fetch facility visits'}</div>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors h-[600px] max-h-[600px] flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">Facility Visits</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {selectedMonth} {selectedYear}
                {selectedProvince !== 'All Provinces' && ` · ${selectedProvince}`}
                {' · '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {filteredVisits.length} record{filteredVisits.length !== 1 ? 's' : ''}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <Filter size={14} />
                <span className="font-medium">Status:</span>
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
                <option value="2">Closed</option>
              </select>
              {selectedStatus !== 'all' && (
                <button onClick={() => setSelectedStatus('all')} className="h-8 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  Clear
                </button>
              )}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              {canCreate && (
                <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                  <Plus size={16} /> Add Visit
                </button>
              )}
              {canExport && (
                <button onClick={() => setShowExportModal(true)} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                  <Download size={16} /> Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto h-full">
              <table className="w-full text-xs relative">
                <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    {[
                      { label: 'Code', className: 'w-24' },
                      { label: 'Facility Name', className: 'w-48' },
                      { label: 'Date Visited', className: 'w-36' },
                      { label: 'Province', className: 'w-28' },
                      { label: 'Remarks', className: 'w-64' },
                      { label: 'File', className: 'w-16 text-center' },
                      { label: 'Status', className: 'w-20 text-center' },
                      { label: 'Created', className: 'w-32' },
                      { label: 'Modified', className: 'w-32' },
                    ].map(({ label, className }) => (
                      <th key={label} className={`px-3 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap ${className}`}>
                        {label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-gray-800/50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] w-28">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                        No facility visits found for {selectedMonth} {selectedYear}
                        {selectedProvince !== 'All Provinces' && ` in ${selectedProvince}`}
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((visit, index) => (
                      <tr key={visit.id} className={`transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60'}`}>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 whitespace-nowrap">{visit.facility_code}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 max-w-48 truncate">{visit.facility_name}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 whitespace-nowrap">
                          {visit.date_visited ? new Date(visit.date_visited).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 whitespace-nowrap">{visit.province}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-300 max-w-64">
                          <div className="truncate" title={visit.remarks || 'No remarks'}>{truncateText(visit.remarks, 60)}</div>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {visit.attachment_path ? (
                            <button onClick={() => handleViewAttachments(visit.attachment_path!)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded transition-colors" title="View attachments">
                              <FileText size={16} />
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">{getStatusBadge(visit.status)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatCreatedModified(visit.created_by, visit.created_at)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatCreatedModified(visit.modified_by, visit.modified_at)}</td>
                        <td className={`px-3 py-2 whitespace-nowrap sticky right-0 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleView(visit)} className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors" title="View Details">
                              <Eye size={14} />
                            </button>
                            {canEdit && (
                              <button onClick={() => handleEdit(visit)} className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit">
                                <Edit size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => visit.id && handleDelete(visit.id)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            )}
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

      {/* Modals */}
      <FacilityVisitModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSuccess={handleModalClose}
        visit={editingVisit}
      />

      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />

      {showDetailsModal && renderDetailsModal()}

      {showAttachmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attachments ({selectedAttachments.length})</h3>
              <button onClick={() => setShowAttachmentModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="space-y-2">
                {selectedAttachments.map((filePath, index) => {
                  const fileName = filePath.split('/').pop() || 'Unknown file';
                  const fileExtension = fileName.split('.').pop()?.toLowerCase();
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText size={20} className="text-blue-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fileName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{fileExtension?.toUpperCase()} file</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button onClick={() => handleViewFile(filePath)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs flex-shrink-0">
                          <Eye size={14} /> View
                        </button>
                        {canExport && (
                          <button onClick={() => handleDownloadFile(filePath)} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs flex-shrink-0">
                            <Download size={14} /> Download
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

      {renderFileViewer()}
    </>
  );
};