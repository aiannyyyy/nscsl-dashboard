export interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_by: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name?: string;
  parent_folder_id?: number;
  path: string;
  is_active: boolean;
  created_by: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  id: number;
  name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  formatted_size: string;
  mime_type: string;
  file_path: string;
  category_id: number;
  category_name?: string;
  folder_id?: number;
  folder_name?: string;
  is_starred: boolean;
  is_active: boolean;
  download_count: number;
  last_accessed: string;
  created_by: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  document_status?: 'none' | 'controlled_copy' | 'master' | 'obsolete';
  stamp_placement?: 'every_page' | 'first_page';
}

export interface ShareUser {
  id?: string | number;
  name: string;
  user_name: string;
  email: string;
  department?: string;
  role: string;
}

export interface FileManagementProps {
  currentUser: ShareUser;
}

export type ViewType = 'categories' | 'files-folders';
export type ItemType = 'category' | 'folder' | 'file';
export type ViewMode = 'grid' | 'list';
export type ModalMode = 'add' | 'edit' | 'delete';
export type UploadMode = 'single' | 'multiple' | 'bulk';
export type DocumentStatus = 'none' | 'controlled_copy' | 'master' | 'obsolete';
export type StampPlacement = 'every_page' | 'first_page';
export type ConflictStrategy = 'overwrite' | 'version' | 'skip';

export interface BreadcrumbItem {
  id: number | null;
  name: string;
  type: 'category' | 'folder';
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface MoveItem {
  id: number;
  name: string;
  type: 'file' | 'folder';
}

export interface FolderNode {
  id: number;
  name: string;
  category_id: number;
  parent_folder_id: number | null;
  children?: FolderNode[];
}

export interface ConflictItem {
  id: number;
  name: string;
  type: string;
  conflicting_id: number;
}

export interface MoveHistoryBatch {
  batch_id: string;
  moved_at: string;
  item_count: number;
  items: MoveHistoryItem[];
  can_undo: boolean;
  undone: boolean;
  undone_at: string | null;
  expires_in: string;
}

export interface MoveHistoryItem {
  id: number;
  item_type: 'file' | 'folder';
  item_name: string;
  from_folder: string;
  to_folder: string;
}

export interface FileShare {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface UploadConflict {
  uploaded_file: {
    temp_path: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    file_type: string;
  };
  existing_file: {
    id: number;
    file_size: number;
  };
  context: {
    category_id: number;
    folder_id: number | null;
    created_by: string;
  };
}

export interface UndoToastState {
  batchId: string;
  message: string;
  visible: boolean;
}

export interface CategoryFormState {
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
}

export interface FolderFormState {
  name: string;
  description: string;
  category_id: number;
  parent_folder_id: number | null;
}

export interface FileVersion {
  id: number;
  version_number: number;
  file_name: string;
  saved_at: string;
  saved_by: string;
  notes?: string;
}

export interface FilteredFilesFolders {
  folders: Folder[];
  files: FileItem[];
}
