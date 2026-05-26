import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, FileText, Trash2, Loader2, Image, File, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { useCreateFacilityVisit, useUpdateFacilityVisit } from '../../../hooks/PDOHooks/useFacilityVisits';
import facilityVisitsService from '../../../services/PDOServices/facilityVisitsService';
import type { FacilityVisit } from '../../../services/PDOServices/facilityVisitsService';
import { useAuth } from '../../../hooks/useAuth';

interface FacilityVisitModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onSuccess: () => void;
  visit?:    FacilityVisit | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILES       = 50;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_FILE_BYTES  = 10 * 1024 * 1024;
const ALLOWED_TYPES   = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (bytes: number) => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileIcon: React.FC<{ name: string }> = ({ name }) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return <Image size={14} className="text-purple-500 flex-shrink-0" />;
  if (ext === 'pdf')
    return <FileText size={14} className="text-red-500 flex-shrink-0" />;
  if (['doc', 'docx'].includes(ext))
    return <FileText size={14} className="text-blue-500 flex-shrink-0" />;
  if (['xls', 'xlsx'].includes(ext))
    return <FileText size={14} className="text-green-500 flex-shrink-0" />;
  return <File size={14} className="text-gray-400 flex-shrink-0" />;
};

// ─── Component ────────────────────────────────────────────────────────────────
export const FacilityVisitModal: React.FC<FacilityVisitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  visit,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateFacilityVisit();
  const updateMutation = useUpdateFacilityVisit();

  const [formData, setFormData] = useState({
    facility_code: '',
    facility_name: '',
    date_visited:  '',
    province:      '',
    status:        '1',
    remarks:       '',
    mark:          '',
  });

  const [newFiles,      setNewFiles]      = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
  const [fileWarning,   setFileWarning]   = useState<string | null>(null);
  const [isDragging,    setIsDragging]    = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);
  const [lookupLoading, setLookupLoading] = useState(false);

  const loading = createMutation.isPending || updateMutation.isPending;

  // derived
  const totalCount = newFiles.length + existingFiles.length;
  const usedBytes  = newFiles.reduce((s, f) => s + f.size, 0);
  const usedPct    = Math.min((usedBytes / MAX_TOTAL_BYTES) * 100, 100);
  const meterColor =
    usedPct >= 90 ? 'bg-red-500' :
    usedPct >= 65 ? 'bg-amber-500' :
    'bg-blue-500';

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (visit) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const d   = new Date(visit.date_visited ?? '');
      const dt  = isNaN(d.getTime()) ? '' :
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

      setFormData({
        facility_code: visit.facility_code ?? '',
        facility_name: visit.facility_name ?? '',
        date_visited:  dt,
        province:      visit.province      ?? '',
        status:        visit.status        ?? '1',
        remarks:       visit.remarks       ?? '',
        mark:          visit.mark          ?? '',
      });
      setExistingFiles(
        visit.attachment_path
          ? visit.attachment_path.split(',').filter(Boolean)
          : []
      );
    } else {
      resetForm();
    }
  }, [visit, isOpen]);

  const resetForm = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setFormData({
      facility_code: '',
      facility_name: '',
      date_visited: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      province: '',
      status:   '1',
      remarks:  '',
      mark:     '',
    });
    setNewFiles([]);
    setExistingFiles([]);
    setFilesToDelete([]);
    setFileWarning(null);
    setUploadPct(0);
  };

  // ── File validation ────────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: FileList | File[]) => {
    setFileWarning(null);
    const arr      = Array.from(incoming);
    const accepted: File[]   = [];
    const rejected: string[] = [];

    for (const f of arr) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        rejected.push(`"${f.name}" — unsupported type`); continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        rejected.push(`"${f.name}" — exceeds 10 MB per-file limit`); continue;
      }
      const projCount = totalCount + accepted.length + 1;
      const projBytes = usedBytes + accepted.reduce((s, x) => s + x.size, 0) + f.size;
      if (projCount > MAX_FILES) {
        rejected.push(`"${f.name}" — max ${MAX_FILES} files reached`); continue;
      }
      if (projBytes > MAX_TOTAL_BYTES) {
        rejected.push(`"${f.name}" — would exceed 50 MB total`); continue;
      }
      if (newFiles.some(x => x.name === f.name && x.size === f.size)) continue;
      accepted.push(f);
    }

    if (accepted.length) setNewFiles(prev => [...prev, ...accepted]);
    if (rejected.length) setFileWarning(
      rejected.slice(0, 2).join(' · ') +
      (rejected.length > 2 ? ` +${rejected.length - 2} more skipped` : '')
    );
  }, [newFiles, totalCount, usedBytes]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFacilityCodeKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const facilityCode = formData.facility_code.trim();
    if (!facilityCode) { alert('Please enter a facility code'); return; }

    setLookupLoading(true);
    try {
      const result = await facilityVisitsService.lookupFacility(facilityCode);
      if (result) {
        setFormData(prev => ({
          ...prev,
          facility_name: result.facilityname,
          province:      result.province,
        }));
      } else {
        alert('Facility not found. Please check the facility code.');
      }
    } catch {
      alert('Failed to lookup facility. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadPct(0);

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) =>
        submitData.append(key, value)
      );
      submitData.append('userName', user?.name || 'Unknown User');
      newFiles.forEach(file => submitData.append('attachments', file));

      if (visit?.id) {
        const filesToKeep = existingFiles.filter(f => !filesToDelete.includes(f));
        submitData.append('files_to_keep',   JSON.stringify(filesToKeep));
        submitData.append('files_to_delete', JSON.stringify(filesToDelete));
        await updateMutation.mutateAsync({ id: visit.id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error?.response?.data?.message || error.message || 'Failed to save facility visit');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {visit ? 'Edit Facility Visit' : 'Add Facility Visit'}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Upload progress */}
        {loading && uploadPct > 0 && (
          <div className="px-5 pt-2.5 flex-shrink-0">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Uploading…</span><span>{uploadPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-3">

            {/* Facility Code */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Facility Code <span className="text-red-500">*</span>
                <span className="text-[10px] text-gray-500 ml-1">(Press Enter to lookup)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="facility_code"
                  value={formData.facility_code}
                  onChange={handleChange}
                  onKeyPress={handleFacilityCodeKeyPress}
                  disabled={!!visit}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                  required
                />
                {lookupLoading && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Facility Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Facility Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="facility_name"
                value={formData.facility_name}
                onChange={handleChange}
                required
                disabled
                readOnly
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Province & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  required
                  disabled
                  readOnly
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                  <option value="2">Closed</option>
                </select>
              </div>
            </div>

            {/* Date & Mark */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date & Time Visited <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="date_visited"
                  value={formData.date_visited}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mark
                </label>
                <input
                  type="text"
                  name="mark"
                  value={formData.mark}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
              />
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Attachments
                </label>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                  {totalCount} / {MAX_FILES} files
                </span>
              </div>

              <div className="flex items-start gap-1.5 px-3 py-2 mb-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <Info size={12} className="text-blue-500 flex-shrink-0 mt-px" />
                <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                  Max <span className="font-semibold">50 files</span> ·{' '}
                  <span className="font-semibold">10 MB</span> per file ·{' '}
                  <span className="font-semibold">50 MB</span> total.
                  {' '}Accepted: Images, PDF, Word, Excel, TXT.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex justify-center px-4 py-4 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-500'
                }`}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="mt-1 flex text-xs text-gray-600 dark:text-gray-400 justify-center">
                    <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                      Upload files
                    </span>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    50 files · 50 MB total · 10 MB per file
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={e => {
                    if (e.target.files) {
                      addFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Size meter */}
              {newFiles.length > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                    <span>New files size</span>
                    <span className={usedPct >= 90 ? 'text-red-500 font-medium' : ''}>
                      {fmt(usedBytes)} / 50 MB
                    </span>
                  </div>
                  <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${meterColor}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* File warning */}
              {fileWarning && (
                <div className="mt-2 flex items-start gap-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">{fileWarning}</p>
                </div>
              )}

              {/* Existing files */}
              {existingFiles.length > 0 && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Current Attachments
                  </label>
                  <div className="space-y-1.5">
                    {existingFiles.map((filePath, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon name={filePath} />
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                            {filePath.split('/').pop()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFilesToDelete(p => [...p, filePath]);
                            setExistingFiles(p => p.filter(f => f !== filePath));
                          }}
                          className="text-red-400 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New files */}
              {newFiles.length > 0 && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    New Files ({newFiles.length})
                  </label>
                  <div className="space-y-1.5">
                    {newFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon name={file.name} />
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {fmt(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewFiles(p => p.filter((_, i) => i !== index));
                            setFileWarning(null);
                          }}
                          className="text-red-400 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-1 text-[11px]">
              {totalCount > 0 ? (
                <>
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span className="text-gray-500 dark:text-gray-400">
                    {totalCount} file{totalCount !== 1 ? 's' : ''} attached
                    {newFiles.length > 0 && (
                      <span className="text-blue-500 ml-1">· {newFiles.length} new</span>
                    )}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">No attachments</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || lookupLoading}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Saving…' : visit ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};