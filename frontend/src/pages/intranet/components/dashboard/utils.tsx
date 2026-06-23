import {
  FileText,
  Image,
  File,
  FolderPlus,
  Upload,
  Edit3,
  Trash2,
  Download,
  Copy,
  Move,
  Share2,
  Folder,
} from 'lucide-react';

export const getFileIcon = (fileType: string) => {
  if (fileType === 'pdf') return <FileText className="w-4 h-4 text-red-600" />;
  if (['doc', 'docx', 'txt'].includes(fileType)) return <FileText className="w-4 h-4 text-blue-600" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) return <Image className="w-4 h-4 text-purple-600" />;
  if (['xls', 'xlsx', 'csv'].includes(fileType)) return <FileText className="w-4 h-4 text-green-600" />;
  return <File className="w-4 h-4 text-gray-600" />;
};

export const getFileTypeColor = (fileType: string) => {
  if (fileType === 'pdf') return 'bg-red-100 text-red-700';
  if (['doc', 'docx', 'txt'].includes(fileType)) return 'bg-blue-100 text-blue-700';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) return 'bg-purple-100 text-purple-700';
  if (['xls', 'xlsx', 'csv'].includes(fileType)) return 'bg-green-100 text-green-700';
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700';
};

export const canPreviewFile = (fileType: string) => {
  if (!fileType) return false;
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf', 'txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(fileType.toLowerCase());
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export const getActivityIcon = (action: string, targetType: 'FILE' | 'FOLDER') => {
  switch (action) {
    case 'CREATE': case 'CREATED':
      return targetType === 'FOLDER' ? <FolderPlus className="w-4 h-4" /> : <Upload className="w-4 h-4" />;
    case 'UPDATE': case 'RENAME': return <Edit3 className="w-4 h-4" />;
    case 'DELETE': case 'DELETED': return <Trash2 className="w-4 h-4" />;
    case 'DOWNLOAD': case 'DOWNLOADED': return <Download className="w-4 h-4" />;
    case 'UPLOAD': case 'UPLOADED': return <Upload className="w-4 h-4" />;
    case 'COPY': return <Copy className="w-4 h-4" />;
    case 'MOVE': return <Move className="w-4 h-4" />;
    case 'SHARED': return <Share2 className="w-4 h-4" />;
    default:
      return targetType === 'FOLDER' ? <Folder className="w-4 h-4" /> : <File className="w-4 h-4" />;
  }
};

export const getActionDescription = (action: string, targetType: 'FILE' | 'FOLDER', targetName: string) => {
  const itemType = targetType.toLowerCase();
  switch (action) {
    case 'CREATE': case 'CREATED': return `created ${itemType} "${targetName}"`;
    case 'UPDATE': return `updated ${itemType} "${targetName}"`;
    case 'RENAME': return `renamed ${itemType} "${targetName}"`;
    case 'DELETE': case 'DELETED': return `deleted ${itemType} "${targetName}"`;
    case 'DOWNLOAD': case 'DOWNLOADED': return `downloaded file "${targetName}"`;
    case 'UPLOAD': case 'UPLOADED': return `uploaded file "${targetName}"`;
    case 'COPY': return `copied ${itemType} "${targetName}"`;
    case 'MOVE': return `moved ${itemType} "${targetName}"`;
    case 'SHARED': return `shared file "${targetName}"`;
    default: return `performed action on ${itemType} "${targetName}"`;
  }
};

export const getActionBadgeColor = (action: string) => {
  switch (action) {
    case 'DELETE': case 'DELETED': return 'bg-red-100 text-red-700';
    case 'CREATE': case 'CREATED': case 'UPLOAD': case 'UPLOADED': return 'bg-green-100 text-green-700';
    case 'DOWNLOAD': case 'DOWNLOADED': return 'bg-blue-100 text-blue-700';
    case 'UPDATE': case 'RENAME': return 'bg-orange-100 text-orange-700';
    case 'COPY': return 'bg-indigo-100 text-indigo-700';
    case 'MOVE': return 'bg-teal-100 text-teal-700';
    case 'SHARED': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700';
  }
};

export const getActionBubbleColor = (action: string) => {
  switch (action) {
    case 'DELETE': case 'DELETED': return 'bg-red-100';
    case 'CREATE': case 'CREATED': case 'UPLOAD': case 'UPLOADED': return 'bg-green-100';
    case 'DOWNLOAD': case 'DOWNLOADED': return 'bg-blue-100';
    case 'UPDATE': case 'RENAME': return 'bg-orange-100';
    case 'COPY': return 'bg-indigo-100';
    case 'MOVE': return 'bg-teal-100';
    case 'SHARED': return 'bg-blue-100';
    default: return 'bg-gray-100';
  }
};

export const normalizeAction = (action: string): string => {
  if (action === 'UPLOADED' || action === 'UPLOAD') return 'UPLOAD';
  if (action === 'DOWNLOADED' || action === 'DOWNLOAD') return 'DOWNLOAD';
  if (action === 'CREATED' || action === 'CREATE') return 'CREATE';
  if (action === 'DELETED' || action === 'DELETE') return 'DELETE';
  return action;
};

export const getActionLabel = (action: string): string => {
  switch (action) {
    case 'DELETE': case 'DELETED': return 'Deleted';
    case 'UPLOAD': case 'UPLOADED': return 'Uploaded';
    case 'CREATE': case 'CREATED': return 'Created';
    case 'DOWNLOAD': case 'DOWNLOADED': return 'Downloaded';
    case 'UPDATE': return 'Updated';
    case 'RENAME': return 'Renamed';
    case 'COPY': return 'Copied';
    case 'MOVE': return 'Moved';
    case 'SHARED': return 'Shared';
    default: return action;
  }
};