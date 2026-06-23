import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface AlertBannersProps {
  success: string | null;
  error: string | null;
  onDismissSuccess: () => void;
  onDismissError: () => void;
}

export default function AlertBanners({
  success,
  error,
  onDismissSuccess,
  onDismissError,
}: AlertBannersProps) {
  return (
    <>
      {success && (
        <div className="border rounded-lg p-4 mb-6 flex items-center gap-3 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="flex-1 text-green-700 dark:text-green-300">{success}</span>
          <button onClick={onDismissSuccess} className="text-green-500 hover:text-green-700 ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="border rounded-lg p-4 mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="flex-1 whitespace-pre-line text-red-700 dark:text-red-300">{error}</span>
          <button onClick={onDismissError} className="text-red-500 hover:text-red-700 ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
