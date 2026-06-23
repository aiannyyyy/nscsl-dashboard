import { CheckCircle, Upload, X } from 'lucide-react';
import { formatFileSize, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from './utils';
import type { DocumentStatus, StampPlacement } from './types';

interface UploadModalProps {
  uploadFiles: FileList | null;
  isUploading: boolean;
  uploadDocumentStatus: DocumentStatus;
  uploadStampPlacement: StampPlacement;
  onClose: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDocumentStatusChange: (status: DocumentStatus) => void;
  onStampPlacementChange: (placement: StampPlacement) => void;
  onUpload: () => void;
}

const STATUS_OPTIONS = [
  { value: 'none' as const, label: 'None', desc: 'No stamp', dot: 'bg-gray-400', color: 'text-gray-500' },
  { value: 'controlled_copy' as const, label: 'Controlled Copy', desc: 'Blue watermark', dot: 'bg-blue-500', color: 'text-blue-500' },
  { value: 'master' as const, label: 'Master', desc: 'Green watermark', dot: 'bg-green-500', color: 'text-green-500' },
  { value: 'obsolete' as const, label: 'Obsolete', desc: 'Red watermark', dot: 'bg-red-500', color: 'text-red-500' },
];

export default function UploadModal({
  uploadFiles,
  isUploading,
  uploadDocumentStatus,
  uploadStampPlacement,
  onClose,
  onFileSelect,
  onDocumentStatusChange,
  onStampPlacementChange,
  onUpload,
}: UploadModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="rounded-lg p-6 w-full max-w-md bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Files</h3>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Files</label>
            <div className="mb-3 p-3 rounded-lg text-xs bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
              <div className="font-semibold mb-1 text-blue-900 dark:text-blue-300">📋 Upload Limits:</div>
              <ul className="space-y-0.5 text-blue-800 dark:text-blue-200">
                <li>
                  • Max file size: <span className="font-semibold">{formatFileSize(MAX_FILE_SIZE)}</span>
                </li>
                <li>
                  • Max total size: <span className="font-semibold">{formatFileSize(MAX_TOTAL_SIZE)}</span>
                </li>
                <li>• Supported: PDF, DOC, XLS, PPT, images, videos, audio, archives, code files, and more</li>
              </ul>
            </div>
            <input
              type="file"
              multiple
              onChange={onFileSelect}
              disabled={isUploading}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
            {uploadFiles && uploadFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {Array.from(uploadFiles).map((f, i) => (
                  <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                    {f.name} ({formatFileSize(f.size)})
                  </p>
                ))}
                <p className="text-sm font-medium mt-2 text-gray-700 dark:text-gray-300">
                  Total: {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Document Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onDocumentStatusChange(s.value)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all text-left ${
                    uploadDocumentStatus === s.value
                      ? s.value === 'none'
                        ? 'border-gray-400 bg-gray-100 dark:bg-gray-700'
                        : s.value === 'controlled_copy'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                          : s.value === 'master'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900'
                            : 'border-red-500 bg-red-50 dark:bg-red-900'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
                  </div>
                  {uploadDocumentStatus === s.value && (
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 ml-auto ${s.color}`} />
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
                      onClick={() => onStampPlacementChange(p.value)}
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

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 px-4 py-2 border rounded-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onUpload}
              disabled={!uploadFiles || uploadFiles.length === 0 || isUploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload{' '}
                  {uploadFiles && uploadFiles.length > 1 ? `${uploadFiles.length} Files` : 'File'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
