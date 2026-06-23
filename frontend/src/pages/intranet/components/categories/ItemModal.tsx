import React, { RefObject } from 'react';
import {
  AlertCircle, CheckCircle, File, Loader, Upload, X,
} from 'lucide-react';
import {
  formatFileSize, iconOptions, MAX_FILE_SIZE, MAX_TOTAL_SIZE,
} from './utils';
import type {
  CategoryFormState, DocumentStatus, FolderFormState, ItemType,
  ModalMode, StampPlacement, UploadMode, UploadProgress,
} from './types';

interface ItemModalProps {
  modalMode: ModalMode;
  modalType: ItemType;
  selectedItemName?: string;
  modalError: string;
  submitting: boolean;
  categoryForm: CategoryFormState;
  folderForm: FolderFormState;
  uploadFiles: File[];
  uploadProgress: UploadProgress[];
  uploadMode: UploadMode;
  dragOver: boolean;
  uploadDocumentStatus: DocumentStatus;
  uploadStampPlacement: StampPlacement;
  currentCategoryId: number | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onClearError: () => void;
  onCategoryFormChange: (form: CategoryFormState) => void;
  onFolderFormChange: (form: FolderFormState) => void;
  onUploadModeChange: (mode: UploadMode) => void;
  onUploadDocumentStatusChange: (status: DocumentStatus) => void;
  onUploadStampPlacementChange: (placement: StampPlacement) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveFile: (index: number) => void;
  onSubmit: () => void;
  onDelete: () => void;
  onFileUpload: () => void;
}

export default function ItemModal({
  modalMode,
  modalType,
  selectedItemName,
  modalError,
  submitting,
  categoryForm,
  folderForm,
  uploadFiles,
  uploadMode,
  dragOver,
  uploadDocumentStatus,
  uploadStampPlacement,
  currentCategoryId,
  fileInputRef,
  onClose,
  onClearError,
  onCategoryFormChange,
  onFolderFormChange,
  onUploadModeChange,
  onUploadDocumentStatusChange,
  onUploadStampPlacementChange,
  onFileInputChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  onSubmit,
  onDelete,
  onFileUpload,
}: ItemModalProps) {
  const title = (() => {
    if (modalMode === 'add' && modalType === 'category') return 'Add New Category';
    if (modalMode === 'edit' && modalType === 'category') return 'Edit Category';
    if (modalMode === 'delete' && modalType === 'category') return 'Delete Category';
    if (modalMode === 'add' && modalType === 'folder') return 'Create New Folder';
    if (modalMode === 'edit' && modalType === 'folder') return 'Edit Folder';
    if (modalMode === 'delete' && modalType === 'folder') return 'Delete Folder';
    if (modalMode === 'add' && modalType === 'file') return 'Upload Files';
    if (modalMode === 'delete' && modalType === 'file') return 'Delete File';
    return '';
  })();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>

        {modalError && (
          <div className="mb-4 p-3 border rounded-lg flex items-start gap-2 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span className="text-sm flex-1 whitespace-pre-line text-red-700 dark:text-red-300">{modalError}</span>
            <button onClick={onClearError} className="text-red-400 hover:text-red-600 ml-auto flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {modalMode === 'delete' ? (
          <div>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Are you sure you want to delete &quot;{selectedItemName}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg disabled:opacity-50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader className="w-4 h-4 animate-spin" />} Delete
              </button>
            </div>
          </div>
        ) : modalType === 'file' && modalMode === 'add' ? (
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Upload Mode</label>
                <div className="flex items-center gap-4">
                  {(['single', 'multiple', 'bulk'] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="uploadMode"
                        value={m}
                        checked={uploadMode === m}
                        onChange={() => onUploadModeChange(m)}
                      />
                      <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                        {m === 'single' ? 'Single File' : m === 'multiple' ? 'Multiple Files' : 'Bulk Upload'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Files</label>
                <div className="mb-3 p-3 rounded-lg text-xs bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
                  <div className="font-semibold mb-1 text-blue-900 dark:text-blue-300">📋 Upload Limits:</div>
                  <ul className="space-y-0.5 text-blue-800 dark:text-blue-200">
                    <li>• Max file size: <span className="font-semibold">{formatFileSize(MAX_FILE_SIZE)}</span></li>
                    <li>• Max total size: <span className="font-semibold">{formatFileSize(MAX_TOTAL_SIZE)}</span></li>
                    <li>• Supports PDF, DOC, XLS, images, videos, audio, archives, code, and more</li>
                  </ul>
                </div>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
                    {uploadMode === 'single' ? 'Drop a file here' : 'Drop files here'}
                  </p>
                  <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">or click to browse</p>
                  <input
                    type="file"
                    multiple={uploadMode !== 'single'}
                    ref={fileInputRef}
                    onChange={onFileInputChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Choose Files
                  </button>
                </div>
                {uploadFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Selected ({uploadFiles.length})
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                      {uploadFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 border-b last:border-b-0 border-gray-100 dark:border-gray-600"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <File className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate text-gray-900 dark:text-white">{f.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{(f.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveFile(i)}
                            disabled={submitting}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Document Status</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'none' as const, label: 'None', desc: 'No stamp', selectedBorder: 'border-gray-400 bg-gray-100 dark:bg-gray-700', dot: 'bg-gray-400' },
                  { value: 'controlled_copy' as const, label: 'Controlled Copy', desc: 'Blue watermark', selectedBorder: 'border-blue-500 bg-blue-50 dark:bg-blue-900', dot: 'bg-blue-500' },
                  { value: 'master' as const, label: 'Master', desc: 'Green watermark', selectedBorder: 'border-green-500 bg-green-50 dark:bg-green-900', dot: 'bg-green-500' },
                  { value: 'obsolete' as const, label: 'Obsolete', desc: 'Red watermark', selectedBorder: 'border-red-500 bg-red-50 dark:bg-red-900', dot: 'bg-red-500' },
                ]).map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onUploadDocumentStatusChange(s.value)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all text-left ${
                      uploadDocumentStatus === s.value
                        ? s.selectedBorder
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
                    </div>
                    {uploadDocumentStatus === s.value && (
                      <CheckCircle className="w-4 h-4 flex-shrink-0 ml-auto text-gray-500" />
                    )}
                  </button>
                ))}
              </div>

              {uploadDocumentStatus !== 'none' && (
                <div className="mt-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">Stamp placement</p>
                  <div className="flex gap-2">
                    {([
                      { value: 'every_page' as const, label: 'Every page', desc: 'Stamp on all pages' },
                      { value: 'first_page' as const, label: 'First page only', desc: 'Stamp on page 1 only' },
                    ]).map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => onUploadStampPlacementChange(p.value)}
                        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left ${
                          uploadStampPlacement === p.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 border-2 ${
                            uploadStampPlacement === p.value
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}
                        />
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">{p.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    ℹ️ Stamp appears on preview and download.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg disabled:opacity-50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={onFileUpload}
                disabled={submitting || uploadFiles.length === 0 || !currentCategoryId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader className="w-4 h-4 animate-spin" />} Upload
              </button>
            </div>
          </div>
        ) : modalType === 'category' ? (
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={e => onCategoryFormChange({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={e => onCategoryFormChange({ ...categoryForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Enter category description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Color</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      ['#007bff', 'Blue'], ['#28a745', 'Green'], ['#dc3545', 'Red'], ['#ffc107', 'Yellow'],
                      ['#6f42c1', 'Purple'], ['#fd7e14', 'Orange'], ['#20c997', 'Teal'], ['#e83e8c', 'Pink'], ['#6c757d', 'Gray'],
                    ].map(([hex, name]) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => onCategoryFormChange({ ...categoryForm, color: hex })}
                        className={`h-10 rounded-lg border-2 transition-all ${
                          categoryForm.color === hex
                            ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ backgroundColor: hex }}
                        title={name}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Icon</label>
                  <select
                    value={categoryForm.icon}
                    onChange={e => onCategoryFormChange({ ...categoryForm, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    {Object.keys(iconOptions).map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg disabled:opacity-50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader className="w-4 h-4 animate-spin" />} {modalMode === 'add' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Folder Name *</label>
                <input
                  type="text"
                  value={folderForm.name}
                  onChange={e => onFolderFormChange({ ...folderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Enter folder name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={folderForm.description}
                  onChange={e => onFolderFormChange({ ...folderForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Enter folder description"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg disabled:opacity-50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader className="w-4 h-4 animate-spin" />} {modalMode === 'add' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
