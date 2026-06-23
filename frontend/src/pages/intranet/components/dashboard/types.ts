export interface User {
  id?: string | number;
  name: string;
  user_name: string;
  department?: string;
  role: string;
}

export interface DashboardStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  totalSizeFormatted: string;
  fileTypes: Array<{
    file_type: string;
    count: number;
    total_size: number;
  }>;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DOWNLOAD' | 'COPY' | 'MOVE' | 'RENAME' | 'SHARED';
  target_type: 'FILE' | 'FOLDER';
  target_id: number | null;
  target_name: string;
  additional_info: string | null;
  created_at: string;
}

export interface SharedFile {
  id: number;
  file_name: string;
  original_name?: string;
  file_size: number;
  file_type: string;
  owner_name: string;
  owner_email: string;
  shared_at: string;
  source_type: 'regular' | 'category';
  category_name?: string;
  department_name?: string;
  shared_by?: string;
  shared_by_name?: string;
}

export interface StarredFile {
  id: number;
  file_id?: number;
  name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  category_name?: string;
  folder_name?: string;
  created_by_name?: string;
  created_at: string;
  starred_at?: string;
  source_type?: 'regular' | 'category';
}