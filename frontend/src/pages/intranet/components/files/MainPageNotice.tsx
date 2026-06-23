import { Info } from 'lucide-react';

interface MainPageNoticeProps {
  visible: boolean;
}

export default function MainPageNotice({ visible }: MainPageNoticeProps) {
  if (!visible) return null;

  return (
    <div className="border rounded-lg p-4 mb-6 flex items-center gap-3 bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      <div>
        <p className="font-medium text-blue-700 dark:text-blue-300">Main Directory</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          You can only create folders in the main directory. To upload files, navigate into a folder first.
        </p>
      </div>
    </div>
  );
}
