export interface FileItem {
  id: string;
  folder_id?: string;
  file_name?: string;
  name?: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  created_by_name?: string;
  updated_by_name?: string;
  type: 'file' | 'folder';
  size?: number;
  fileType?: string;
  modifiedAt: Date;
  modifiedBy: string;
  isStarred: boolean;
  thumbnail?: string;
  document_status?: 'none' | 'controlled_copy' | 'master' | 'obsolete';
  stamp_placement?: 'every_page' | 'first_page';
  download_count?: number;
}

export interface FolderItem {
  id: string;
  name: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name?: string;
  updated_by_name?: string;
  type: 'folder';
}

export interface BreadcrumbItem {
  name: string;
  path: string;
  id?: string | null;
}

export interface ApiResponse {
  folders: FolderItem[];
  files: FileItem[];
  currentFolder?: FolderItem;
  location?: string;
}

export interface ShareUser {
  id?: string | number;
  name: string;
  user_name: string;
  email: string;
  department?: string;
  role: string;
}

export interface FilesProps {
  currentUser: ShareUser;
}

export interface MoveItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
}

export interface ConflictItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  conflicting_id: string;
  conflicting_name?: string;
}

export interface MovePreview {
  can_move: MoveItem[];
  conflicts: ConflictItem[];
  errors: Array<{ id: string; name?: string; type: string; reason: string }>;
  warnings: Array<{ id: string; name?: string; type: string; reason: string }>;
}

export interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  children?: FolderNode[];
  isLoaded?: boolean;
  isOpen?: boolean;
}

export interface MoveHistoryBatch {
  batch_id: string;
  moved_at: string;
  item_count: number;
  can_undo: boolean;
  undone: boolean;
  undone_at: string | null;
  expires_in: string;
  items: Array<{
    id: number;
    item_type: string;
    item_id: string;
    item_name: string;
    from_folder: string;
    to_folder: string;
    from_folder_id: string | null;
    to_folder_id: string | null;
  }>;
}

export type ViewMode = 'grid' | 'list';
export type SortColumn = 'name' | 'date' | 'size';
export type SortOrder = 'asc' | 'desc';
export type DocumentStatus = 'none' | 'controlled_copy' | 'master' | 'obsolete';
export type StampPlacement = 'every_page' | 'first_page';
export type ConflictStrategy = 'overwrite' | 'version' | 'skip';

export interface FileShare {
  id: number;
  username?: string;
  email?: string;
  created_at: string;
}

export interface UploadConflict {
  message?: string;
  uploaded_file: {
    temp_path: string;
    file_name: string;
    file_size: number;
    file_type: string;
  };
  existing_file: {
    id: string;
    file_name?: string;
  };
}

export interface UndoToastState {
  batchId: string;
  message: string;
  visible: boolean;
}
