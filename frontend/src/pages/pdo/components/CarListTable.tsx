// src/pages/PDO/components/CarListTable.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, FileDown, Eye, Edit, FileText, X, Download } from "lucide-react";
import { AddDocumentModal } from "./AddDocumentModal";
import { StatusChangeModal } from "./StatusChangeModal";
import { FileViewerModal } from "./FileViewerModal";
import { useAuth } from "../../../hooks/useAuth";
import { usePermissions } from "../../../hooks/usePermission";
import {
  useCarList,
  useAddCar,
  useUpdateCar,
  useUpdateCarStatus,
  useDeleteCar,
} from "../../../hooks/PDOHooks/useCarList";
import { getErrorMessage } from "../../../services/PDOServices/carListApi";
import type { CarRecord, AddCarFormData } from "../../../services/PDOServices/carListApi";
import * as XLSX from 'xlsx';

interface CarListTableProps {
  onProvincesLoaded?:  (provinces: string[]) => void;
  selectedProvince:    string;
  selectedStatus:      string;
  month:               string;
  year:                string;
}

export const CarListTable: React.FC<CarListTableProps> = ({
  onProvincesLoaded,
  selectedProvince,
  selectedStatus,
  month,
  year,
}) => {
  const { user }                                     = useAuth();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions(['program', 'administrator']);

  const [showAddModal,     setShowAddModal]     = useState(false);
  const [showStatusModal,  setShowStatusModal]  = useState(false);
  const [showFileModal,    setShowFileModal]    = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord,   setSelectedRecord]   = useState<CarRecord | null>(null);
  const [editingRecord,    setEditingRecord]    = useState<CarRecord | null>(null);
  const [selectedFileUrl,  setSelectedFileUrl]  = useState<string>("");
  const [viewingFile,      setViewingFile]      = useState<{ path: string; name: string; type: string } | null>(null);
  const [searchQuery,      setSearchQuery]      = useState("");

  // ─── Query & Mutations ────────────────────────────────────────────────────
  const { data: carList = [], isLoading, isError, error } = useCarList(month, year);
  const addCarMutation       = useAddCar();
  const updateCarMutation    = useUpdateCar();
  const updateStatusMutation = useUpdateCarStatus();
  const deleteCarMutation    = useDeleteCar();

  // ─── Notify parent of unique provinces only when the list actually changes ─
  const prevProvincesRef = useRef<string[]>([]);

  useEffect(() => {
    const uniqueProvinces = Array.from(
      new Set(
        carList
          .map(r => r.province)
          .filter((p): p is string => !!p && p.trim() !== '')
      )
    ).sort();

    const prev    = prevProvincesRef.current;
    const changed =
      prev.length !== uniqueProvinces.length ||
      uniqueProvinces.some((p, i) => p !== prev[i]);

    if (changed) {
      prevProvincesRef.current = uniqueProvinces;
      if (onProvincesLoaded) onProvincesLoaded(uniqueProvinces);
    }
  }, [carList, onProvincesLoaded]);

  // ─── Client-side filtering ────────────────────────────────────────────────
  const filteredCarList = useMemo(() => {
    let filtered = carList;

    if (selectedProvince !== "all") {
      filtered = filtered.filter(
        r => (r.province ?? '').toLowerCase() === selectedProvince.toLowerCase()
      );
    }
    if (selectedStatus) {
      filtered = filtered.filter(
        r => (r.status ?? '').toLowerCase() === selectedStatus.toLowerCase()
      );
    }
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(r =>
        (r.case_no ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [carList, selectedProvince, selectedStatus, searchQuery]);

  // ─── Body scroll lock ─────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow =
      showAddModal || showStatusModal || showFileModal || showDetailsModal
        ? "hidden"
        : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [showAddModal, showStatusModal, showFileModal, showDetailsModal]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveDocument = async (formData: AddCarFormData) => {
    try {
      const dataWithUser = { ...formData, userName: user?.name || 'Unknown User' };
      if (editingRecord?.id) {
        await updateCarMutation.mutateAsync({ id: editingRecord.id, formData: dataWithUser });
        alert("Document updated successfully!");
      } else {
        await addCarMutation.mutateAsync(dataWithUser);
        alert("Document added successfully!");
      }
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const handleStatusChange = async (status: "open" | "closed" | "pending") => {
    if (!selectedRecord) return;
    try {
      await updateStatusMutation.mutateAsync({
        id:       selectedRecord.id,
        status,
        userName: user?.name || 'Unknown User',
      });
      alert(`Status updated to ${status} successfully!`);
    } catch (err) {
      alert(`Failed to update status: ${getErrorMessage(err)}`);
    }
  };

  const handleDelete = async (record: CarRecord) => {
    if (!window.confirm(
      `Are you sure you want to delete case "${record.case_no}"? This action cannot be undone.`
    )) return;
    try {
      await deleteCarMutation.mutateAsync(record.id);
      alert("Record deleted successfully!");
    } catch (err) {
      alert(`Failed to delete record: ${getErrorMessage(err)}`);
    }
  };

  const handleExportToExcel = () => {
    try {
      const exportData = filteredCarList.map(record => ({
        'Case No':       record.case_no,
        'Date Endorsed': formatDateOnly(record.date_endorsed),
        'Endorsed By':   record.endorsed_by || '',
        'Facility Code': record.facility_code,
        'Facility Name': record.facility_name,
        'City':          record.city,
        'Province':      record.province,
        'Status':        record.status?.toUpperCase() || '',
        'Lab No':        record.labno || '',
        'Repeat':        record.repeat_field || '',
        'Number Sample': record.number_sample || '',
        'Case Code':     record.case_code || '',
        'Sub Code 1':    record.sub_code1 || '',
        'Sub Code 2':    record.sub_code2 || '',
        'Sub Code 3':    record.sub_code3 || '',
        'Sub Code 4':    record.sub_code4 || '',
        'Remarks':       record.remarks || '',
        'Prepared By':   record.prepared_by || '',
        'Follow Up On':  formatDateOnly(record.followup_on),
        'Closed On':     formatDateOnly(record.closed_on),
        'Created By':    record.created_by || '',
        'Created At':    formatDateForExcel(record.created_at),
        'Modified By':   record.modified_by || '',
        'Modified At':   formatDateForExcel(record.modified_at),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 30 },
        { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
        { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 18 },
        { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CAR List');

      const timestamp    = new Date().toISOString().slice(0, 10);
      const provincePart = selectedProvince !== 'all' ? `_${selectedProvince}` : '';
      const statusPart   = selectedStatus ? `_${selectedStatus}` : '';
      const searchPart   = searchQuery ? `_search` : '';
      XLSX.writeFile(wb, `CAR_List_${timestamp}${provincePart}${statusPart}${searchPart}.xlsx`);
      alert(`Exported ${filteredCarList.length} records.`);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  const handleViewFile = (filePath: string) => {
    const fileName      = filePath.split('/').pop() || 'Unknown file';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const downloadOnly  = ['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx', 'csv', 'zip', 'rar'];
    if (downloadOnly.includes(fileExtension)) { handleDownloadFile(filePath); return; }
    setViewingFile({ path: filePath, name: fileName, type: fileExtension });
  };

  const handleDownloadFile = (filePath: string) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
    const link = document.createElement('a');
    link.href     = `${base}${filePath}`;
    link.download = filePath.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Formatters ───────────────────────────────────────────────────────────
  const formatDateOnly = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatDateForExcel = (d: string | null | undefined) => {
    if (!d) return "";
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatCreatedModified = (
    name: string | null | undefined,
    date: string | null | undefined
  ) => {
    if (!name && !date) return '—';
    if (!name) return formatDate(date);
    if (!date) return name;
    return (
      <div className="text-xs">
        <div className="font-medium text-gray-900 dark:text-gray-100">{name}</div>
        <div className="text-gray-500 dark:text-gray-400">{formatDate(date)}</div>
      </div>
    );
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return (
      <span className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">—</span>
    );
    const colors: Record<string, string> = {
      open:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
      closed:  "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
        colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const activeFilterParts: string[] = [];
  if (selectedProvince !== "all") activeFilterParts.push(`Province: ${selectedProvince}`);
  if (selectedStatus)             activeFilterParts.push(`Status: ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}`);
  activeFilterParts.push(`${month} ${year}`);
  const activeFilterLabel = activeFilterParts.join(" · ");

  // Shared class for hidden columns
  const H = "hidden"; // hidden
  const V = "px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs"; // visible th
  const VH = `${H} px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs`; // hidden th

  // ─── Details Modal ────────────────────────────────────────────────────────
  const renderDetailsModal = () => {
    if (!selectedRecord) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CAR Details</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Case No: {selectedRecord.case_no}</p>
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

              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Case No',       selectedRecord.case_no],
                    ['Date Endorsed', formatDateOnly(selectedRecord.date_endorsed)],
                    ['Endorsed By',   selectedRecord.endorsed_by || '—'],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{val}</p>
                    </div>
                  ))}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
                  </div>
                </div>
              </div>

              {/* Facility */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Facility Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Facility Code', selectedRecord.facility_code],
                    ['Facility Name', selectedRecord.facility_name],
                    ['City',          selectedRecord.city],
                    ['Province',      selectedRecord.province],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab & Sample */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Lab & Sample Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    ['Lab No',        selectedRecord.labno || '—'],
                    ['Repeat',        selectedRecord.repeat_field || '—'],
                    ['Number Sample', selectedRecord.number_sample?.toString() || '—'],
                    ['Case Code',     selectedRecord.case_code || '—'],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub Codes */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Sub Codes
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Sub Code 1', selectedRecord.sub_code1 || '—'],
                    ['Sub Code 2', selectedRecord.sub_code2 || '—'],
                    ['Sub Code 3', selectedRecord.sub_code3 || '—'],
                    ['Sub Code 4', selectedRecord.sub_code4 || '—'],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Additional Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {[['Prepared By', selectedRecord.prepared_by || '—']].map(([lbl, val]) => (
                    <div key={lbl} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Remarks
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedRecord.remarks || 'No remarks'}
                  </p>
                </div>
              </div>

              {/* Important Dates */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Important Dates
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    ['Follow Up On', formatDateOnly(selectedRecord.followup_on)],
                    ['Closed On',    formatDateOnly(selectedRecord.closed_on)],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachment */}
              {selectedRecord.attachment_path && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded" /> Attachment
                  </h4>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={18} className="text-blue-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {selectedRecord.attachment_path.split('/').pop()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => handleViewFile(selectedRecord.attachment_path!)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                      >
                        <Eye size={14} /> View
                      </button>
                      {canExport && (
                        <button
                          onClick={() => handleDownloadFile(selectedRecord.attachment_path!)}
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                        >
                          <Download size={14} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Audit */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded" /> Audit Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Created By</p>
                    {formatCreatedModified(selectedRecord.created_by, selectedRecord.created_at)}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Modified By</p>
                    {formatCreatedModified(selectedRecord.modified_by, selectedRecord.modified_at)}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-end gap-2">
            {canEdit && (
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setEditingRecord(selectedRecord);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Edit size={16} /> Edit
              </button>
            )}
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

  // ─── File Viewer ──────────────────────────────────────────────────────────
  const renderFileViewer = () => {
    if (!viewingFile) return null;
    const base    = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
    const fileUrl = `${base}${viewingFile.path}`;
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(viewingFile.type);
    const isPdf   = viewingFile.type === 'pdf';

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
                <button
                  onClick={() => handleDownloadFile(viewingFile.path)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                >
                  <Download size={14} /> Download
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
                <p className="text-gray-600 dark:text-gray-400 mb-2">Preview not available for this file type</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">{viewingFile.name}</p>
                {canExport && (
                  <button
                    onClick={() => handleDownloadFile(viewingFile.path)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg">
        <div className="p-5">

          <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
            <div className="flex gap-2 items-center flex-wrap">
              {canCreate && (
                <button
                  className="h-9 px-4 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium"
                  onClick={() => setShowAddModal(true)}
                >
                  Add Document
                </button>
              )}
              <span className="h-9 px-3 flex items-center text-xs rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium gap-1.5">
                <span className="opacity-60">Filters:</span> {activeFilterLabel}
              </span>
              {isLoading && (
                <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="min-w-[250px]">
              <input
                type="text"
                placeholder="Search by Case No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {isError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {(error as any)?.message ?? 'Failed to fetch CAR records'}
            </div>
          )}

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl max-h-[600px] overflow-y-auto">
            {isLoading && carList.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 py-20 text-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Loading records...</p>
              </div>
            ) : filteredCarList.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 py-20 text-center">
                <h5 className="text-gray-800 dark:text-gray-200 font-semibold text-lg mb-1">
                  {searchQuery || selectedProvince !== 'all' || selectedStatus
                    ? "No matching records found"
                    : "No records found"}
                </h5>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchQuery
                    ? `No records match "${searchQuery}"`
                    : "Try adjusting your filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                    <tr>
                      {/* ✅ Visible columns */}
                      <th className={V}>Case No</th>
                      <th className={V}>Date Endorsed</th>
                      <th className={V}>Endorsed By</th>
                      <th className={V}>Facility Code</th>
                      <th className={V}>Facility Name</th>
                      <th className={V}>Status</th>
                      {/* ✅ Hidden columns — all data still exported to Excel */}
                      <th className={VH}>City</th>
                      <th className={VH}>Province</th>
                      <th className={VH}>Lab No</th>
                      <th className={VH}>Repeat</th>
                      <th className={VH}>Number Sample</th>
                      <th className={VH}>Case Code</th>
                      <th className={VH}>Sub Code 1</th>
                      <th className={VH}>Sub Code 2</th>
                      <th className={VH}>Sub Code 3</th>
                      <th className={VH}>Sub Code 4</th>
                      <th className={VH}>Remarks</th>
                      <th className={VH}>Prepared By</th>
                      <th className={VH}>Follow Up On</th>
                      <th className={VH}>Closed On</th>
                      <th className={VH}>Created</th>
                      <th className={VH}>Modified</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs sticky right-0 bg-gray-50 dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredCarList.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`transition-colors ${
                          index % 2 === 0
                            ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        {/* ✅ Visible cells */}
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">{record.case_no ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDateOnly(record.date_endorsed)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.endorsed_by || '-'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.facility_code ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.facility_name ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(record.status)}</td>
                        {/* ✅ Hidden cells — must match hidden th order exactly */}
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.city ?? '—'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.province ?? '—'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.labno || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.repeat_field || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.number_sample || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.case_code || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.sub_code1 || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.sub_code2 || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.sub_code3 || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.sub_code4 || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-xs truncate" title={record.remarks ?? ''}>{record.remarks || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{record.prepared_by || '-'}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDateOnly(record.followup_on)}</td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDateOnly(record.closed_on)}</td>
                        <td className="hidden px-4 py-3 whitespace-nowrap">{formatCreatedModified(record.created_by, record.created_at)}</td>
                        <td className="hidden px-4 py-3 whitespace-nowrap">{formatCreatedModified(record.modified_by, record.modified_at)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap sticky right-0 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] ${
                          index % 2 === 0
                            ? 'bg-white dark:bg-gray-900'
                            : 'bg-gray-50/50 dark:bg-gray-800/30'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setSelectedRecord(record); setShowDetailsModal(true); }}
                              className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => { setEditingRecord(record); setShowAddModal(true); }}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => { setSelectedRecord(record); setShowStatusModal(true); }}
                                className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                title="Change Status"
                              >
                                <FileText size={16} />
                              </button>
                            )}
                            {record.attachment_path && (
                              <button
                                onClick={() => handleViewFile(record.attachment_path!)}
                                className="p-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                                title="View File"
                              >
                                <FileText size={16} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(record)}
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

          {!isLoading && filteredCarList.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredCarList.length} of {carList.length} record{carList.length !== 1 ? 's' : ''}
                {selectedProvince !== 'all' && ` in ${selectedProvince}`}
                {selectedStatus && ` · ${selectedStatus}`}
                {searchQuery && ` (filtered by "${searchQuery}")`}
              </div>
              {canExport && (
                <button
                  onClick={handleExportToExcel}
                  className="h-9 px-4 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium flex items-center gap-2 transition-colors"
                >
                  <FileDown size={16} /> Export to Excel
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      <AddDocumentModal
        show={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingRecord(null); }}
        onSave={handleSaveDocument}
        editData={editingRecord}
        currentUser={user}
      />
      <StatusChangeModal
        show={showStatusModal}
        caseNo={selectedRecord?.case_no || ""}
        onClose={() => setShowStatusModal(false)}
        onStatusChange={handleStatusChange}
      />
      <FileViewerModal
        show={showFileModal}
        fileUrl={selectedFileUrl}
        caseNo={selectedRecord?.case_no || ""}
        onClose={() => {
          setShowFileModal(false);
          setSelectedFileUrl("");
          setSelectedRecord(null);
        }}
      />
      {showDetailsModal && renderDetailsModal()}
      {renderFileViewer()}
    </>
  );
};