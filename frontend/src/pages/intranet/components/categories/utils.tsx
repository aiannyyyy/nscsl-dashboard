import React from 'react';
import {
  BookOpen,
  ClipboardList,
  BarChart3,
  Settings,
  Shield,
  Briefcase,
  GraduationCap,
  Users,
  Heart,
  FolderOpen,
  FileText,
  File,
} from 'lucide-react';

export const iconOptions = {
  BookOpen,
  ClipboardList,
  BarChart3,
  Settings,
  Shield,
  Briefcase,
  GraduationCap,
  Users,
  Heart,
  FolderOpen,
  FileText,
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 200 * 1024 * 1024;

export const ALLOWED_FILE_TYPES = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'odt',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico',
  'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v',
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma',
  'zip', 'rar', '7z', 'tar', 'gz',
  'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'swift',
  'md', 'log', 'yaml', 'yml', 'sql',
];

export const getFileExtension = (name: string) => name.split('.').pop()?.toLowerCase() || '';

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const validateFile = (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (${formatFileSize(file.size)}). Max: ${formatFileSize(MAX_FILE_SIZE)}` };
  }
  const ext = getFileExtension(file.name);
  if (!ext) return { valid: false, error: 'File has no extension' };
  if (!ALLOWED_FILE_TYPES.includes(ext)) return { valid: false, error: `.${ext} is not supported` };
  return { valid: true };
};

export const validateFiles = (files: File[]) => {
  const errors: string[] = [];
  for (const f of files) {
    const v = validateFile(f);
    if (!v.valid && v.error) errors.push(`"${f.name}": ${v.error}`);
  }
  if (files.length > 1) {
    const total = files.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL_SIZE) {
      errors.push(`Total size (${formatFileSize(total)}) exceeds max (${formatFileSize(MAX_TOTAL_SIZE)})`);
    }
  }
  return { valid: errors.length === 0, errors };
};

export const isImageFile = (t: string) => ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(t.toLowerCase());
export const isPDFFile = (t: string) => t.toLowerCase() === 'pdf';
export const isTextFile = (t: string) => ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(t.toLowerCase());
export const isVideoFile = (t: string) => ['mp4', 'webm', 'ogg', 'mov'].includes(t.toLowerCase());
export const isAudioFile = (t: string) => ['mp3', 'wav', 'ogg', 'm4a'].includes(t.toLowerCase());

export const getIconComponent = (name: string) =>
  iconOptions[name as keyof typeof iconOptions] || FolderOpen;

export const getColorClasses = (color: string) =>
  ({
    '#007bff': { text: 'text-blue-600', bg: 'bg-blue-50' },
    '#28a745': { text: 'text-green-600', bg: 'bg-green-50' },
    '#dc3545': { text: 'text-red-600', bg: 'bg-red-50' },
    '#ffc107': { text: 'text-yellow-600', bg: 'bg-yellow-50' },
    '#6f42c1': { text: 'text-purple-600', bg: 'bg-purple-50' },
    '#fd7e14': { text: 'text-orange-600', bg: 'bg-orange-50' },
    '#20c997': { text: 'text-teal-600', bg: 'bg-teal-50' },
    '#e83e8c': { text: 'text-pink-600', bg: 'bg-pink-50' },
    '#6c757d': { text: 'text-gray-600', bg: 'bg-gray-50' },
  }[color] || { text: 'text-blue-600', bg: 'bg-blue-50' });

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const getFileTypeIcon = (fileType: string) => {
  const t = fileType.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(t)) {
    return <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center text-green-600 text-xs font-bold">IMG</div>;
  }
  if (t === 'pdf') {
    return <div className="w-5 h-5 bg-red-100 rounded flex items-center justify-center text-red-600 text-xs font-bold">PDF</div>;
  }
  if (['doc', 'docx'].includes(t)) {
    return <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center text-blue-600 text-xs font-bold">DOC</div>;
  }
  if (['xls', 'xlsx', 'csv'].includes(t)) {
    return <div className="w-5 h-5 bg-emerald-100 rounded flex items-center justify-center text-emerald-600 text-xs font-bold">XLS</div>;
  }
  if (['ppt', 'pptx'].includes(t)) {
    return <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center text-orange-600 text-xs font-bold">PPT</div>;
  }
  if (['txt', 'md', 'log'].includes(t)) {
    return <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-xs font-bold">TXT</div>;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml'].includes(t)) {
    return <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center text-purple-600 text-xs font-bold">CODE</div>;
  }
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(t)) {
    return <div className="w-5 h-5 bg-pink-100 rounded flex items-center justify-center text-pink-600 text-xs font-bold">VID</div>;
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(t)) {
    return <div className="w-5 h-5 bg-indigo-100 rounded flex items-center justify-center text-indigo-600 text-xs font-bold">AUD</div>;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(t)) {
    return <div className="w-5 h-5 bg-yellow-100 rounded flex items-center justify-center text-yellow-600 text-xs font-bold">ZIP</div>;
  }
  return <File className="w-5 h-5 text-gray-600" />;
};

export const isFileOwner = (file: { created_by: number }, uid: string) =>
  String(file.created_by) === String(uid);
