import React, { useState, useRef, useEffect } from "react";
import { Trash2, ChevronDown, FileDown, Eye, Edit, FileText, X, Download } from "lucide-react";
import { AddDocumentModal } from "./AddDocumentModal";
import { StatusChangeModal } from "./StatusChangeModal";
import { FileViewerModal } from "./FileViewerModal";
import { useAuth } from "../../../hooks/useAuth";
import { usePermissions } from "../../../hooks/usePermission";
import { 
  getAllCarList, 
  addCar,
  updateCar,
  updateCarStatus,
  deleteCarRecord,
  getErrorMessage
} from "../../../services/PDOServices/carListApi";
import type { CarRecord } from "../../../services/PDOServices/carListApi";
import type { AddCarFormData } from "../../../services/PDOServices/carListApi";
import * as XLSX from 'xlsx';

interface CarListTableProps {
  onDataChange?: () => void;
}

export const CarListTable: React.FC<CarListTableProps> = ({ onDataChange }) => {
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions(['program', 'administrator']);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CarRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<CarRecord | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string>("");
  const [viewingFile, setViewingFile] = useState<{ path: string; name: string; type: string } | null>(null);
  const [carList, setCarList] = useState<CarRecord[]>([]);
  const [filteredCarList, setFilteredCarList] = useState<CarRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get unique provinces from car list
  const provinces = React.useMemo(() => {
    const uniqueProvinces = new Set(
      carList
        .map(record => record.province)
        .filter(province => province && province.trim() !== '')
    );
    return Array.from(uniqueProvinces).sort();
  }, [carList]);

  useEffect(() => {
    fetchCarList();
  }, []);

  // Apply both search and province filters
  useEffect(() => {
    let filtered = carList;

    // Filter by province
    if (selectedProvince !== "all") {
      filtered = filtered.filter(
        record => record.province?.toLowerCase() === selectedProvince.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((record) =>
        record.case_no.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCarList(filtered);
  }, [searchQuery, selectedProvince, carList]);

  const fetchCarList = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getAllCarList();
      setCarList(data);
      setFilteredCarList(data);
      
      if (onDataChange) {
        onDataChange();
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      console.error("Error fetching car list:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    document.body.style.overflow =
      showAddModal || showStatusModal || showFileModal || showDetailsModal ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAddModal, showStatusModal, showFileModal, showDetailsModal]);

  const handleSaveDocument = async (formData: AddCarFormData) => {
    try {
      const dataWithUser = {
        ...formData,
        userName: user?.name || 'Unknown User'
      };
      
      let result;
      
      if (editingRecord?.id) {
        result = await updateCar(editingRecord.id, dataWithUser);
        console.log("Document updated successfully:", result);
        alert("Document updated successfully!");
      } else {
        result = await addCar(dataWithUser);
        console.log("Document saved successfully:", result);
        alert("Document added successfully!");
      }
      
      await fetchCarList();
      
      if (onDataChange) {
        onDataChange();
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error("Error saving document:", err);
      throw new Error(errorMsg);
    }
  };

  const handleStatusChange = async (status: "open" | "closed" | "pending") => {
    if (!selectedRecord) return;

    try {
      const result = await updateCarStatus(
        selectedRecord.id, 
        status, 
        user?.name || 'Unknown User'
      );
      console.log("Status updated successfully:", result);
      
      await fetchCarList();
      
      if (onDataChange) {
        onDataChange();
      }
      
      alert(`Status updated to ${status} successfully!`);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error("Error updating status:", err);
      alert(`Failed to update status: ${errorMsg}`);
    }
  };

  const handleDelete = async (record: CarRecord) => {
    if (!window.confirm(`Are you sure you want to delete case "${record.case_no}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteCarRecord(record.id);
      console.log("Record deleted successfully:", result);
      
      await fetchCarList();
      
      if (onDataChange) {
        onDataChange();
      }
      
      alert("Record deleted successfully!");
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error("Error deleting record:", err);
      alert(`Failed to delete record: ${errorMsg}`);
    }
  };

  const handleExportToExcel = () => {
    try {
      const exportData = filteredCarList.map(record => ({
        'Case No': record.case_no,
        'Date Endorsed': formatDateForExcel(record.date_endorsed),
        'Endorsed By': record.endorsed_by || '',
        'Facility Code': record.facility_code,
        'Facility Name': record.facility_name,
        'City': record.city,
        'Province': record.province,
        'Status': record.status?.toUpperCase() || '',
        'Lab No': record.labno || '',
        'Repeat': record.repeat_field || '',
        'Number Sample': record.number_sample || '',
        'Case Code': record.case_code || '',
        'Sub Code 1': record.sub_code1 || '',
        'Sub Code 2': record.sub_code2 || '',
        'Sub Code 3': record.sub_code3 || '',
        'Sub Code 4': record.sub_code4 || '',
        'Remarks': record.remarks || '',
        'FRC': record.frc || '',
        'WRC': record.wrc || '',
        'Prepared By': record.prepared_by || '',
        'Follow Up On': formatDateForExcel(record.followup_on),
        'Reviewed On': formatDateForExcel(record.reviewed_on),
        'Closed On': formatDateForExcel(record.closed_on),
        'Created By': record.created_by || '',
        'Created At': formatDateForExcel(record.created_at),
        'Modified By': record.modified_by || '',
        'Modified At': formatDateForExcel(record.modified_at),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      const colWidths = [
        { wch: 20 }, // Case No
        { wch: 18 }, // Date Endorsed
        { wch: 20 }, // Endorsed By
        { wch: 12 }, // Facility Code
        { wch: 30 }, // Facility Name
        { wch: 15 }, // City
        { wch: 15 }, // Province
        { wch: 10 }, // Status
        { wch: 15 }, // Lab No
        { wch: 15 }, // Repeat
        { wch: 12 }, // Number Sample
        { wch: 12 }, // Case Code
        { wch: 25 }, // Sub Code 1
        { wch: 25 }, // Sub Code 2
        { wch: 25 }, // Sub Code 3
        { wch: 25 }, // Sub Code 4
        { wch: 30 }, // Remarks
        { wch: 10 }, // FRC
        { wch: 10 }, // WRC
        { wch: 20 }, // Prepared By
        { wch: 18 }, // Follow Up On
        { wch: 18 }, // Reviewed On
        { wch: 18 }, // Closed On
        { wch: 20 }, // Created By
        { wch: 18 }, // Created At
        { wch: 20 }, // Modified By
        { wch: 18 }, // Modified At
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CAR List');

      const timestamp = new Date().toISOString().slice(0, 10);
      const provinceFilter = selectedProvince !== 'all' ? `_${selectedProvince}` : '';
      const searchFilter = searchQuery ? `_search` : '';
      const filename = `CAR_List_${timestamp}${provinceFilter}${searchFilter}.xlsx`;

      XLSX.writeFile(wb, filename);

      alert(`Exported ${filteredCarList.length} records to ${filename}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  const formatDateForExcel = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleView = (record: CarRecord) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleEdit = (record: CarRecord) => {
    setEditingRecord(record);
    setShowAddModal(true);
  };

  const openStatusModal = (record: CarRecord) => {
    setSelectedRecord(record);
    setShowStatusModal(true);
  };

  const openFileModal = (record: CarRecord) => {
    if (record.attachment_path) {
      const fileUrl = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '')}${record.attachment_path}`;
      setSelectedFileUrl(fileUrl);
      setSelectedRecord(record);
      setShowFileModal(true);
    }
  };

  const handleViewFile = (filePath: string) => {
    const fileName = filePath.split('/').pop() || 'Unknown file';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const downloadOnlyTypes = ['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx', 'csv', 'zip', 'rar'];
    
    if (downloadOnlyTypes.includes(fileExtension)) {
      handleDownloadFile(filePath);
      return;
    }
    
    setViewingFile({
      path: filePath,
      name: fileName,
      type: fileExtension
    });
  };

  const handleDownloadFile = (filePath: string) => {
    const downloadUrl = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '')}${filePath}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filePath.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingRecord(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCreatedModified = (name: string | null, date: string | null) => {
    if (!name && !date) return '—';
    if (!name) return formatDate(date!);
    if (!date) return name;
    
    return (
      <div className="text-xs">
        <div className="font-medium text-gray-900 dark:text-gray-100">{name}</div>
        <div className="text-gray-500 dark:text-gray-400">{formatDate(date)}</div>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      open: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
      closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Details Modal
  const renderDetailsModal = () => {
    if (!selectedRecord) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                CAR Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Case No: {selectedRecord.case_no}
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
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Case No</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.case_no}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date Endorsed</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedRecord.date_endorsed)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Endorsed By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.endorsed_by || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(selectedRecord.status)}
                    </div>
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
                      {selectedRecord.facility_code}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg col-span-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Facility Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.facility_name}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">City</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.city}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Province</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.province}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lab & Sample Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Lab & Sample Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lab No</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.labno || '—'}
                    </p>
                  </div>
                  {/* ✅ ADDED: Repeat field in details modal */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Repeat</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.repeat_field || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Number Sample</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.number_sample || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Case Code</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.case_code || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub Codes */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Sub Codes
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sub Code 1</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.sub_code1 || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sub Code 2</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.sub_code2 || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sub Code 3</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.sub_code3 || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sub Code 4</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.sub_code4 || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Additional Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">FRC</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.frc || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">WRC</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.wrc || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prepared By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRecord.prepared_by || '—'}
                    </p>
                  </div>
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

              {/* Dates */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Important Dates
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Follow Up On</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedRecord.followup_on)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reviewed On</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedRecord.reviewed_on)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Closed On</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedRecord.closed_on)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachment */}
              {selectedRecord.attachment_path && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded"></div>
                    Attachment
                  </h4>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={18} className="text-blue-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {selectedRecord.attachment_path.split('/').pop()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => handleViewFile(selectedRecord.attachment_path!)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      {canExport && (
                        <button
                          onClick={() => handleDownloadFile(selectedRecord.attachment_path!)}
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  Audit Information
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
                  handleEdit(selectedRecord);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Edit size={16} />
                Edit
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

  // File Viewer Modal
  const renderFileViewer = () => {
    if (!viewingFile) return null;

    const fileUrl = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '')}${viewingFile.path}`;
    
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

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg">
        <div className="p-5">
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="flex gap-2">
              {canCreate && (
                <button
                  className="h-9 px-4 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium"
                  onClick={() => setShowAddModal(true)}
                >
                  Add Document
                </button>
              )}

              <button
                onClick={fetchCarList}
                className="h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                Refresh
              </button>
            </div>

            {/* Search and Province Filter */}
            <div className="flex gap-2 items-center">
              {/* Province Filter Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2 min-w-[150px] justify-between"
                >
                  <span className="truncate">
                    {selectedProvince === 'all' ? 'All Provinces' : selectedProvince}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setSelectedProvince('all');
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedProvince === 'all'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        All Provinces
                        {selectedProvince === 'all' && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">✓</span>
                        )}
                      </button>
                      
                      {provinces.length > 0 && (
                        <>
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          {provinces.map(province => (
                            <button
                              key={province}
                              onClick={() => {
                                setSelectedProvince(province);
                                setIsFilterOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                selectedProvince === province
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                                  : 'text-gray-700 dark:text-gray-200'
                              }`}
                            >
                              {province}
                              {selectedProvince === province && (
                                <span className="ml-2 text-blue-600 dark:text-blue-400">✓</span>
                              )}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Search Input */}
              <div className="flex-1 min-w-[250px]">
                <input
                  type="text"
                  placeholder="Search by Case No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ✅ TABLE WRAPPER: max-h-[600px] with vertical scroll, horizontal scroll inside */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="bg-gray-50 dark:bg-gray-800 py-20 text-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading records...</p>
              </div>
            ) : filteredCarList.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 py-20 text-center">
                <h5 className="text-gray-800 dark:text-gray-200 font-semibold text-lg mb-1">
                  {searchQuery || selectedProvince !== 'all' ? "No matching records found" : "No records found"}
                </h5>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchQuery 
                    ? `No records match "${searchQuery}"`
                    : selectedProvince !== 'all'
                    ? `No records found for ${selectedProvince}`
                    : 'Click "Add Document" to create your first record'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {/* ✅ STICKY HEADER so it stays visible while scrolling vertically */}
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Case No</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Date Endorsed</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Endorsed By</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Facility Code</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Facility Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">City</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Province</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Lab No</th>
                      {/* ✅ ADDED: Repeat column after Lab No */}
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Repeat</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Number Sample</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Case Code</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Sub Code 1</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Sub Code 2</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Sub Code 3</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Sub Code 4</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Remarks</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">FRC</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">WRC</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Prepared By</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Follow Up On</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Reviewed On</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Closed On</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Created</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">Modified</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs sticky right-0 bg-gray-50 dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">Actions</th>
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
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                          {record.case_no}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(record.date_endorsed)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.endorsed_by || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.facility_code}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.facility_name}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.city}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.province}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.labno || '-'}
                        </td>
                        {/* ✅ ADDED: Repeat cell after Lab No */}
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.repeat_field || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.number_sample || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.case_code || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.sub_code1 || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.sub_code2 || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.sub_code3 || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.sub_code4 || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-xs truncate" title={record.remarks}>
                          {record.remarks || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.frc || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.wrc || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {record.prepared_by || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(record.followup_on)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(record.reviewed_on)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(record.closed_on)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatCreatedModified(record.created_by, record.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatCreatedModified(record.modified_by, record.modified_at)}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap sticky right-0 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] ${
                          index % 2 === 0 
                            ? 'bg-white dark:bg-gray-900' 
                            : 'bg-gray-50/50 dark:bg-gray-800/30'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleView(record)}
                              className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            
                            {canEdit && (
                              <button
                                onClick={() => handleEdit(record)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            
                            {canEdit && (
                              <button
                                onClick={() => openStatusModal(record)}
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

          {/* Stats and Export Button */}
          {!isLoading && filteredCarList.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredCarList.length} of {carList.length} record{carList.length !== 1 ? 's' : ''}
                {selectedProvince !== 'all' && ` in ${selectedProvince}`}
                {searchQuery && ` (filtered by "${searchQuery}")`}
              </div>
              
              {canExport && (
                <button
                  onClick={handleExportToExcel}
                  className="h-9 px-4 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium flex items-center gap-2 transition-colors"
                >
                  <FileDown size={16} />
                  Export to Excel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <AddDocumentModal
        show={showAddModal}
        onClose={handleModalClose}
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