import React, { useState, useEffect, useRef, useCallback } from "react";
import { Upload, FileText, Trash2, Image, File, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { getFacilityByCode, getNextCaseNumber } from "../../../services/PDOServices/carListApi";
import type { AddCarFormData, CarRecord } from "../../../services/PDOServices/carListApi";

interface Props {
  show: boolean;
  onClose: () => void;
  onSave: (data: AddCarFormData) => Promise<void>;
  editData?: CarRecord | null;
  currentUser?: { name?: string } | null;
}

// Province code mapping
const PROVINCE_CODES: { [key: string]: string } = {
  'CAVITE': 'CAV',
  'LAGUNA': 'LAG',
  'BATANGAS': 'BAT',
  'RIZAL': 'RIZ',
  'QUEZON': 'QUE',
};

// ── Attachment constants ──────────────────────────────────────────────────────
const MAX_FILE_BYTES  = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

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

// ── Component ─────────────────────────────────────────────────────────────────
export const AddDocumentModal: React.FC<Props> = ({
  show,
  onClose,
  onSave,
  editData,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [isLoadingFacility, setIsLoadingFacility] = useState(false);
  const [facilityError, setFacilityError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCaseNo, setIsGeneratingCaseNo] = useState(false);

  // ── Attachment state ──────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFiles,    setNewFiles]    = useState<File[]>([]);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [isDragging,  setIsDragging]  = useState(false);

  const usedBytes  = newFiles.reduce((s, f) => s + f.size, 0);
  const usedPct    = Math.min((usedBytes / MAX_TOTAL_BYTES) * 100, 100);
  const meterColor =
    usedPct >= 90 ? 'bg-red-500' :
    usedPct >= 65 ? 'bg-amber-500' :
    'bg-blue-500';

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDateTimeLocal = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
      const normalized = dateString.toString().replace(" ", "T");
      const date = new Date(normalized);
      if (isNaN(date.getTime())) return "";
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    } catch {
      return "";
    }
  };

  // ── File validation ───────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: FileList | File[]) => {
    setFileWarning(null);
    const arr = Array.from(incoming);
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const f of arr) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        rejected.push(`"${f.name}" — unsupported type`); continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        rejected.push(`"${f.name}" — exceeds 10 MB per-file limit`); continue;
      }
      const projBytes = usedBytes + accepted.reduce((s, x) => s + x.size, 0) + f.size;
      if (projBytes > MAX_TOTAL_BYTES) {
        rejected.push(`"${f.name}" — would exceed 50 MB total`); continue;
      }
      if (newFiles.some(x => x.name === f.name && x.size === f.size)) continue;
      accepted.push(f);
    }

    if (accepted.length) {
      setNewFiles(prev => [...prev, ...accepted]);
      // keep first file in formData.attachment for backend compatibility
      setFormData((prev: any) => ({ ...prev, attachment: accepted[0] }));
    }
    if (rejected.length) setFileWarning(
      rejected.slice(0, 2).join(' · ') +
      (rejected.length > 2 ? ` +${rejected.length - 2} more skipped` : '')
    );
  }, [newFiles, usedBytes]);

  const removeNewFile = (index: number) => {
    setNewFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      setFormData((fd: any) => ({ ...fd, attachment: next[0] ?? undefined }));
      return next;
    });
    setFileWarning(null);
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (show) {
      if (editData) {
        setFormData({
          id:           editData.id,
          caseNo:       editData.case_no       || "",
          endorsedDate: formatDateTimeLocal(editData.date_endorsed),
          endorsedBy:   editData.endorsed_by   || "",
          facilityCode: editData.facility_code || "",
          facilityName: editData.facility_name || "",
          city:         editData.city          || "",
          province:     editData.province      || "",
          labNo:        editData.labno         || "",
          repeat:       editData.repeat_field  || "",
          status:       editData.status        || "",
          numSamples:   editData.number_sample !== null && editData.number_sample !== undefined
                          ? String(editData.number_sample)
                          : "",
          subCode1:     editData.sub_code1     || "",
          subCode2:     editData.sub_code2     || "",
          subCode3:     editData.sub_code3     || "",
          subCode4:     editData.sub_code4     || "",
          remarks:      editData.remarks       || "",
          caseCode:     editData.case_code     || "",
          frc:          editData.frc           || "",
          wrc:          editData.wrc           || "",
          preparedBy:   editData.prepared_by   || "",
          followupOn:   formatDateTimeLocal(editData.followup_on),
          reviewedOn:   formatDateTimeLocal(editData.reviewed_on),
          closedOn:     formatDateTimeLocal(editData.closed_on),
        });
        setNewFiles([]);
        setFileWarning(null);
      } else {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setFormData({ endorsedDate: localDateTime });
        setNewFiles([]);
        setFileWarning(null);
      }
    } else {
      setFormData({});
      setNewFiles([]);
      setFileWarning(null);
      setFacilityError("");
    }
  }, [show, editData]);

  // Facility code lookup (ADD mode only)
  useEffect(() => {
    if (!show || editData) return;

    const facilityCode = formData.facilityCode;
    if (!facilityCode || facilityCode.length < 2) {
      setFormData((prev: any) => ({
        ...prev,
        facilityName: "", city: "", province: "", caseNo: "",
      }));
      setFacilityError("");
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingFacility(true);
      setFacilityError("");
      try {
        const facility = await getFacilityByCode(facilityCode);
        if (facility) {
          const province     = facility.province?.toUpperCase().trim();
          const provinceCode = PROVINCE_CODES[province] || '';
          setFormData((prev: any) => ({
            ...prev,
            facilityName: facility.facilityname,
            city:         facility.city,
            province:     facility.province,
          }));
          if (provinceCode) {
            await generateCaseNumber(provinceCode);
          } else {
            setFacilityError(`Unknown province code for: ${facility.province}`);
            setFormData((prev: any) => ({ ...prev, caseNo: "" }));
          }
        } else {
          setFormData((prev: any) => ({
            ...prev,
            facilityName: "", city: "", province: "", caseNo: "",
          }));
          setFacilityError("Facility not found");
        }
      } catch {
        setFacilityError("Error loading facility details");
        setFormData((prev: any) => ({
          ...prev,
          facilityName: "", city: "", province: "", caseNo: "",
        }));
      } finally {
        setIsLoadingFacility(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [show, formData.facilityCode, editData]);

  const generateCaseNumber = async (provinceCode: string) => {
    setIsGeneratingCaseNo(true);
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const data = await getNextCaseNumber(provinceCode, year);
      if (data.success) {
        setFormData((prev: any) => ({ ...prev, caseNo: data.preview }));
      } else {
        setFacilityError("Failed to generate case number");
      }
    } catch {
      setFacilityError("Error generating case number");
    } finally {
      setIsGeneratingCaseNo(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      setFormData({});
      setNewFiles([]);
      onClose();
    } catch (error) {
      console.error("Error saving document:", error);
      alert("Failed to save document. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  if (!show) return null;

  const isEditMode = !!editData;
  const existingAttachmentName = isEditMode && editData?.attachment_path
    ? editData.attachment_path.split('/').pop()
    : null;

  const input  = "mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500";
  const select = input;
  const label  = "text-sm text-gray-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-6xl bg-white rounded shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h5 className="text-base font-medium">
            {isEditMode ? 'Edit Document' : 'Add Document'}
          </h5>
          <button onClick={onClose} className="text-gray-500 text-xl leading-none">
            ×
          </button>
        </div>

        {/* Body */}
        <form
          id="documentForm"
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="px-4 py-3 max-h-[70vh] overflow-y-auto text-sm"
        >
          <div className="grid grid-cols-12 gap-3">

            {/* ── Case No ── */}
            <div className="col-span-12 md:col-span-3">
              <label className={label}>
                Case No. <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="caseNo"
                  className={`${input} bg-gray-100 cursor-not-allowed`}
                  required
                  disabled
                  value={formData.caseNo || ""}
                  placeholder={isEditMode ? "" : "Auto-generated"}
                />
                {isGeneratingCaseNo && !isEditMode && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Date Endorsed ── */}
            <div className="col-span-12 md:col-span-3">
              <label className={label}>
                Date Endorsed <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="endorsedDate"
                className={input}
                required
                onChange={handleChange}
                value={formData.endorsedDate || ""}
              />
              {!isEditMode && (
                <p className="text-xs text-gray-500 mt-0.5">Auto-filled with current time</p>
              )}
            </div>

            {/* ── Endorsed By ── */}
            <div className="col-span-12 md:col-span-3">
              <label className={label}>Endorsed By</label>
              <select
                name="endorsedBy"
                className={select}
                onChange={handleChange}
                value={formData.endorsedBy || ""}
              >
                <option value=""> -- Select -- </option>
                <option value="Abigail Morfe">Abigail Morfe</option>
                <option value="Angelica B. Brutas">Angelica B. Brutas</option>
                <option value="Gretel E. Yedra">Gretel E. Yedra</option>
                <option value="Jay Arr M. Apelado">Jay Arr M. Apelado</option>
                <option value="Dra. Kresnerfe Sta. Rosa-Abueg">Dra. Kresnerfe Sta. Rosa-Abueg</option>
                <option value="Marc Kevin U. Estolas">Marc Kevin U. Estolas</option>
                <option value="Mary Rose R. Gomez">Mary Rose R. Gomez</option>
                <option value="Mia Carla Garcia, RN">Mia Carla Garcia, RN</option>
                <option value="Shirleen O. Micosa, RN, LPT">Shirleen O. Micosa, RN, LPT</option>
                <option value="Vivien Marie M. Wagan">Vivien Marie M. Wagan</option>
              </select>
            </div>

            {/* ── Facility Code ── */}
            <div className="col-span-12 md:col-span-3">
              <label className={label}>
                Facility Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="facilityCode"
                  className={`${input} ${isEditMode ? 'bg-gray-100' : ''}`}
                  required
                  onChange={handleChange}
                  value={formData.facilityCode || ""}
                  placeholder="Enter facility code"
                  readOnly={isEditMode}
                />
                {isLoadingFacility && !isEditMode && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {facilityError && !isEditMode && (
                <p className="text-xs text-red-500 mt-1">{facilityError}</p>
              )}
            </div>

            {/* ── Facility Name ── */}
            <div className="col-span-12 md:col-span-4">
              <label className={label}>Facility Name</label>
              <input
                name="facilityName"
                className={`${input} bg-gray-100`}
                readOnly
                value={formData.facilityName || ""}
              />
            </div>

            {/* ── City ── */}
            <div className="col-span-12 md:col-span-4">
              <label className={label}>City</label>
              <input
                name="city"
                className={`${input} bg-gray-100`}
                readOnly
                value={formData.city || ""}
              />
            </div>

            {/* ── Province ── */}
            <div className="col-span-12 md:col-span-4">
              <label className={label}>Province</label>
              <input
                name="province"
                className={`${input} bg-gray-100`}
                readOnly
                value={formData.province || ""}
              />
            </div>

            {/* ── Lab No ── */}
            <div className="col-span-12 md:col-span-3">
              <label className={label}>Laboratory Number</label>
              <input
                name="labNo"
                className={input}
                onChange={handleChange}
                value={formData.labNo || ""}
              />
            </div>

            {/* ── Repeat ── */}
            <div className="col-span-12 md:col-span-3">
              <label className={label}>Repeat</label>
              <input
                name="repeat"
                className={input}
                onChange={handleChange}
                value={formData.repeat || ""}
              />
            </div>

            {/* ── Status ── */}
            <div className="col-span-12 md:col-span-3">
              <label className={label}>Status</label>
              <select
                name="status"
                className={select}
                onChange={handleChange}
                value={formData.status || ""}
              >
                <option value=""> -- Select -- </option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* ── Number of Samples ── */}
            <div className="col-span-12 md:col-span-3">
              <label className={label}>Number of Samples</label>
              <select
                name="numSamples"
                className={select}
                onChange={handleChange}
                value={formData.numSamples || ""}
              >
                <option value=""> -- Select -- </option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            {/* ── Sub Codes 1–4 ── */}
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="col-span-12 md:col-span-3">
                <label className={label}>Sub Code {n}</label>
                <select
                  name={`subCode${n}`}
                  className={select}
                  onChange={handleChange}
                  value={formData[`subCode${n}`] || ""}
                >
                  <option value=""> -- Select -- </option>
                  <option value="BORROWING OF FILTER CARDS">BORROWING OF FILTER CARDS</option>
                  <option value="CONTAMINATED CLOTTED">CONTAMINATED CLOTTED</option>
                  <option value="CONTAMINATED FUNGAL GROWTH">CONTAMINATED FUNGAL GROWTH</option>
                  <option value="CONTAMINATED INSECT BITES">CONTAMINATED INSECT BITES</option>
                  <option value="CONTAMINATED LAYERING">CONTAMINATED LAYERING</option>
                  <option value="CONTAMINATED NO ELUATE">CONTAMINATED NO ELUATE</option>
                  <option value="INSUFFICIENT">INSUFFICIENT</option>
                  <option value="LATE SAMPLE">LATE SAMPLE</option>
                  <option value="MISSING SAMPLE">MISSING SAMPLE</option>
                  <option value="SERUM RINGS">SERUM RINGS</option>
                  <option value="NO DATA">NO DATA</option>
                  <option value="OTHERS (PLEASE SPECIFY AT REMARKS)">OTHERS (PLEASE SPECIFY AT REMARKS)</option>
                </select>
              </div>
            ))}

            {/* ── Remarks ── */}
            <div className="col-span-12 md:col-span-6">
              <label className={label}>Remarks</label>
              <textarea
                name="remarks"
                className={`${input} h-20`}
                onChange={handleChange}
                value={formData.remarks || ""}
              />
            </div>

            {/* ── Case Code ── */}
            <div className="col-span-12 md:col-span-6">
              <label className={label}>Case Code</label>
              <select
                name="caseCode"
                className={select}
                onChange={handleChange}
                value={formData.caseCode || ""}
              >
                <option value=""> -- Select -- </option>
                <option value="UNSAT">UNSAT</option>
                <option value="OTHERS">OTHERS</option>
              </select>
            </div>

            {/* ── FRC ── */}
            <div className="col-span-12 md:col-span-4">
              <label className={label}>FRC</label>
              <input
                name="frc"
                className={input}
                onChange={handleChange}
                value={formData.frc || ""}
              />
            </div>

            {/* ── WRC ── */}
            <div className="col-span-12 md:col-span-4">
              <label className={label}>WRC</label>
              <input
                name="wrc"
                className={input}
                onChange={handleChange}
                value={formData.wrc || ""}
              />
            </div>

            {/* ── Prepared By ── */}
            <div className="col-span-12 md:col-span-4">
              <label className={label}>Prepared By</label>
              <select
                name="preparedBy"
                className={select}
                onChange={handleChange}
                value={formData.preparedBy || ""}
              >
                <option value=""> -- Select -- </option>
                <option value="Erika Jane U. Tarray, RPM">Erika Jane U. Tarray, RPM</option>
                <option value="Mancy F. Barrago, RN">Mancy F. Barrago, RN</option>
                <option value="Marc Kevin U. Estolas, RMT">Marc Kevin U. Estolas, RMT</option>
                <option value="Patrick Charls O. Reyes">Patrick Charls O. Reyes</option>
                <option value="Shirleen O. Micosa, RN, LPT">Shirleen O. Micosa, RN, LPT</option>
              </select>
            </div>

            {/* ── Follow Up On ── */}
            <div className="col-span-12 md:col-span-2">
              <label className={label}>Follow Up On</label>
              <input
                type="datetime-local"
                name="followupOn"
                className={input}
                onChange={handleChange}
                value={formData.followupOn || ""}
              />
            </div>

            {/* ── Reviewed On ── */}
            <div className="col-span-12 md:col-span-2">
              <label className={label}>Reviewed On</label>
              <input
                type="datetime-local"
                name="reviewedOn"
                className={input}
                onChange={handleChange}
                value={formData.reviewedOn || ""}
              />
            </div>

            {/* ── Closed On ── */}
            <div className="col-span-12 md:col-span-2">
              <label className={label}>Closed On</label>
              <input
                type="datetime-local"
                name="closedOn"
                className={input}
                onChange={handleChange}
                value={formData.closedOn || ""}
              />
            </div>

            {/* ── Attachment ── */}
            <div className="col-span-12">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-gray-700 font-medium">Attachment</label>
                {newFiles.length > 0 && (
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {newFiles.length} file{newFiles.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-1.5 px-3 py-2 mb-2 rounded-md bg-blue-50 border border-blue-100">
                <Info size={12} className="text-blue-500 flex-shrink-0 mt-px" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Max <span className="font-semibold">10 MB</span> per file ·{' '}
                  <span className="font-semibold">50 MB</span> total.
                  {' '}Accepted: Images, PDF, Word, Excel, TXT.
                  {isEditMode && existingAttachmentName && (
                    <span className="ml-1">Leave empty to keep existing file.</span>
                  )}
                </p>
              </div>

              {/* Existing attachment (edit mode) */}
              {isEditMode && existingAttachmentName && newFiles.length === 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Current Attachment</p>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <FileIcon name={existingAttachmentName} />
                    <span className="text-xs text-gray-700 truncate flex-1">
                      {existingAttachmentName}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">Existing</span>
                  </div>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  flex justify-center px-4 py-5 border-2 border-dashed rounded-md cursor-pointer transition-colors
                  ${isDragging
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
                  }
                `}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-7 w-7 text-gray-400 mb-1" />
                  <div className="flex text-xs text-gray-600 justify-center gap-1">
                    <span className="font-medium text-teal-600 hover:text-teal-500">
                      {isEditMode ? 'Upload new file' : 'Upload file'}
                    </span>
                    <span>or drag and drop</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    PDF, Images, Word, Excel, TXT · max 10 MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => {
                    if (e.target.files) { addFiles(e.target.files); e.target.value = ''; }
                  }}
                />
              </div>

              {/* Size meter */}
              {newFiles.length > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                    <span>File size</span>
                    <span className={usedPct >= 90 ? 'text-red-500 font-medium' : ''}>
                      {fmt(usedBytes)} / 50 MB
                    </span>
                  </div>
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${meterColor}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* File warning */}
              {fileWarning && (
                <div className="mt-2 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700">{fileWarning}</p>
                </div>
              )}

              {/* New files list */}
              {newFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {newFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon name={file.name} />
                        <span className="text-xs text-gray-700 truncate">{file.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{fmt(file.size)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewFile(index)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="mt-2 flex items-center gap-1 text-[11px]">
                {newFiles.length > 0 ? (
                  <>
                    <CheckCircle2 size={12} className="text-green-500" />
                    <span className="text-gray-500">
                      {newFiles.length} file{newFiles.length !== 1 ? 's' : ''} ready to upload
                      {isEditMode && existingAttachmentName && (
                        <span className="text-amber-500 ml-1">· will replace existing</span>
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400">
                    {isEditMode && existingAttachmentName
                      ? 'Existing attachment will be kept'
                      : 'No file selected'}
                  </span>
                )}
              </div>
            </div>
            {/* ── END Attachment ── */}

          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="documentForm"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isSaving ? "Saving..." : isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};