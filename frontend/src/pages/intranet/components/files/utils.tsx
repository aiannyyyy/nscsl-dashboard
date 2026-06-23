import React from 'react';
import { File, Folder, Image, FileText } from 'lucide-react';
import type { FileItem } from './types';

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

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const getFileExtension = (filename: string): string =>
  filename.split('.').pop()?.toLowerCase() || '';

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large (${formatFileSize(file.size)}). Max is ${formatFileSize(MAX_FILE_SIZE)}.`,
    };
  }
  const ext = getFileExtension(file.name);
  if (!ext) return { valid: false, error: 'File has no extension.' };
  if (!ALLOWED_FILE_TYPES.includes(ext)) {
    return { valid: false, error: `File type .${ext} is not supported.` };
  }
  return { valid: true };
};

export const validateFiles = (files: File[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  for (const f of files) {
    const v = validateFile(f);
    if (!v.valid && v.error) errors.push(`"${f.name}": ${v.error}`);
  }
  if (files.length > 1) {
    const total = files.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL_SIZE) {
      errors.push(`Total size (${formatFileSize(total)}) exceeds the ${formatFileSize(MAX_TOTAL_SIZE)} limit.`);
    }
  }
  return { valid: errors.length === 0, errors };
};

export const getFileIcon = (file: FileItem): React.ReactNode => {
  if (file.type === 'folder') return <Folder className="w-5 h-5 text-blue-500" />;
  switch (file.fileType?.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'bmp':
    case 'svg':
      return <Image className="w-5 h-5 text-green-500" />;
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-5 h-5 text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileText className="w-5 h-5 text-green-600" />;
    case 'ppt':
    case 'pptx':
      return <FileText className="w-5 h-5 text-orange-500" />;
    case 'txt':
    case 'csv':
      return <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    default:
      return <File className="w-5 h-5 text-gray-500" />;
  }
};

export const canPreviewFile = (file: FileItem): boolean => {
  if (!file.fileType) return false;
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf', 'txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(
    file.fileType.toLowerCase(),
  );
};

export const isFileOwner = (file: FileItem, currentUserId: string): boolean =>
  String(file.created_by) === String(currentUserId);
