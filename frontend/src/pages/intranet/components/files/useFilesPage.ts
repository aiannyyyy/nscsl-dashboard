import { useState, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent, MouseEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import fileService from '../../../../services/IntranetServices/fileService';
import moveService from '../../../../services/IntranetServices/moveService';
import shareService from '../../../../services/IntranetServices/shareService';
import { saveDownloadResponse, downloadSuccessMessage, parseAxiosDownloadError } from '../../../../services/IntranetServices/downloadHelper';
import { invalidateIntranetDashboard } from '../../../../services/IntranetServices/intranetQuerySync';
import api, { getAxiosErrorMessage } from '../../../../services/api';
import axios from 'axios';
import { isFileOwner, validateFiles } from './utils';
import type {
  ApiResponse, BreadcrumbItem, ConflictItem, FileItem, FolderItem, FolderNode,
  MoveHistoryBatch, MoveItem, MovePreview, ShareUser, UploadConflict,
} from './types';

function mapApiFile(
  file: import('../../../../services/IntranetServices/fileService').IntranetFile,
  starredIds: Set<string>,
): FileItem {
  return {
    id: String(file.id),
    folder_id: file.folder_id != null ? String(file.folder_id) : undefined,
    file_name: file.file_name,
    name: file.file_name,
    file_path: file.file_path,
    file_type: file.file_type,
    file_size: file.file_size,
    created_at: file.created_at,
    updated_at: file.updated_at,
    created_by: String(file.created_by),
    created_by_name: file.created_by_name,
    updated_by_name: file.updated_by_name,
    type: 'file',
    size: file.file_size,
    fileType: file.file_type,
    modifiedAt: new Date(file.updated_at || file.created_at),
    modifiedBy: file.updated_by_name || file.created_by_name || 'Unknown',
    isStarred: starredIds.has(String(file.id)),
    document_status: file.document_status as FileItem['document_status'],
    stamp_placement: file.stamp_placement as FileItem['stamp_placement'],
  };
}

function mapApiFolder(folder: import('../../../../services/IntranetServices/fileService').IntranetFolder): FolderItem {
  return {
    id: String(folder.id),
    name: folder.name,
    parent_id: folder.parent_id != null ? String(folder.parent_id) : undefined,
    created_at: folder.created_at,
    updated_at: folder.updated_at,
    created_by: String(folder.created_by),
    created_by_name: folder.created_by_name,
    type: 'folder',
  };
}

export function useFilesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userIdNum = user ? Number(user.id) : 0;
  const CURRENT_USER_ID = userIdNum ? String(userIdNum) : '1';
  const userName = user?.name ?? (user as { user_name?: string })?.user_name ?? 'User';
  const PREVIEW_BASE_URL = `${api.defaults.baseURL}/intranet/files/preview`;
  const refreshDashboard = () => invalidateIntranetDashboard(queryClient, userIdNum || undefined);

  // View and UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  // File and Folder State
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderPath, setFolderPath] = useState<BreadcrumbItem[]>([{ name: 'Home', path: '/', id: null }]);

  // Manage Shares State
  const [showManageSharesModal, setShowManageSharesModal] = useState(false);
  const [currentFileShares, setCurrentFileShares] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [selectedFileForShares, setSelectedFileForShares] = useState<FileItem | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Loading and Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Upload State
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDocumentStatus, setUploadDocumentStatus] = useState<'none' | 'controlled_copy' | 'master' | 'obsolete'>('none');
  const [uploadStampPlacement, setUploadStampPlacement] = useState<'every_page' | 'first_page'>('every_page');

  // Folder Creation State
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Rename State
  const [itemToRename, setItemToRename] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Share State
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<ShareUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ShareUser[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<ShareUser[]>([]);

  // Preview State
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Filter State
  const [filterType, setFilterType] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [filterSize, setFilterSize] = useState('all');

  // â†“â†“â†“ NEW STATE FOR MOVE FEATURE â†“â†“â†“
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveItems, setMoveItems] = useState<MoveItem[]>([]);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [moveTargetFolderName, setMoveTargetFolderName] = useState<string>('Home (root)');
  const [movePreview, setMovePreview] = useState<MovePreview | null>(null);
  const [movePreviewLoading, setMovePreviewLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [folderTreeLoading, setFolderTreeLoading] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictItem[]>([]);
  const [conflictDecisions, setConflictDecisions] = useState<Record<string, 'overwrite' | 'version' | 'skip'>>({});
  const [undoToast, setUndoToast] = useState<{ batchId: string; message: string; visible: boolean } | null>(null);
  const undoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<MoveItem | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showInlineFolderCreate, setShowInlineFolderCreate] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState('');
  const [isCreatingInlineFolder, setIsCreatingInlineFolder] = useState(false);
  const [uploadConflict, setUploadConflict] = useState<UploadConflict | null>(null);
  const [showUploadConflictModal, setShowUploadConflictModal] = useState(false);
  // â†‘â†‘â†‘ END NEW STATE â†‘â†‘â†‘

    const isMainPage = currentFolder === null;

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
  }, [error]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  useEffect(() => { if (showShareModal) fetchUsers(); }, [showShareModal]);

  useEffect(() => {
    if (userSearchQuery.trim()) {
      const filtered = availableUsers
        .filter(u =>
          u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.user_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.department?.toLowerCase().includes(userSearchQuery.toLowerCase())
        )
        .filter(u => !selectedUsers.find(s => s.id === u.id));
      setFilteredUsers(filtered);
      setShowUserDropdown(filtered.length > 0);
    } else {
      setFilteredUsers([]);
      setShowUserDropdown(false);
    }
  }, [userSearchQuery, selectedUsers, availableUsers]);

  useEffect(() => { loadFilesAndFolders(); }, [currentFolder]);

  useEffect(() => {
    if (currentFolder) loadFolderPath();
    else setFolderPath([{ name: 'Home', path: '/', id: null }]);
  }, [currentFolder]);

  const loadFilesAndFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const listRes = currentFolder
        ? await fileService.getFolderContents(Number(currentFolder))
        : await fileService.getRootList();
      const data = listRes.data;

      const starredRes = userIdNum
        ? await fileService.getStarredFiles(userIdNum)
        : { data: { starredFiles: [] as { id: number }[] } };
      const starredIds = new Set<string>(
        ((starredRes.data as { starredFiles?: { id: number }[] }).starredFiles || []).map(f => String(f.id)),
      );

      setFiles((data.files || []).map(f => mapApiFile(f, starredIds)));
      setFolders((data.folders || []).map(mapApiFolder));
    } catch (err) {
      console.error('Error loading files:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading files');
    } finally {
      setLoading(false);
    }
  };

  const loadFolderPath = async () => {
    if (!currentFolder) return;
    try {
      const response = await fileService.getFolderPath(Number(currentFolder));
      const data = response.data as { path: { id: number; name: string }[] };
      setFolderPath([
        { name: 'Home', path: '/', id: null },
        ...data.path.map(f => ({ name: f.name, path: String(f.id), id: String(f.id) })),
      ]);
    } catch (err) {
      console.error('Error loading folder path:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await shareService.getAllUsersForShare();
      setAvailableUsers((response.data.data || []).map(u => ({
        ...u,
        id: u.id,
        email: (u as ShareUser & { email?: string }).email ?? '',
      })));
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users for sharing');
    }
  };

  const allItems = useMemo(() => {
    const folderItems: FileItem[] = folders.map(folder => ({
      ...folder,
      type: 'folder' as const,
      modifiedAt: new Date(folder.updated_at || folder.created_at),
      modifiedBy: folder.updated_by_name || folder.created_by_name || 'Unknown',
      isStarred: false,
    }));
    return [...folderItems, ...files];
  }, [files, folders]);

  const filteredAndSortedFiles = useMemo(() => {
    let filtered = allItems.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterType !== 'all') {
      filtered = filtered.filter(file => {
        if (filterType === 'folders') return file.type === 'folder';
        const ext = file.fileType?.toLowerCase() || '';
        if (filterType === 'documents') return file.type === 'file' && ['doc','docx','pdf','txt','csv','xlsx','xls','ppt','pptx'].some(t => ext.includes(t));
        if (filterType === 'images') return file.type === 'file' && ['jpg','jpeg','png','gif','webp','bmp','svg'].some(t => ext.includes(t));
        if (filterType === 'pdfs') return file.type === 'file' && (ext.includes('pdf') || file.name.toLowerCase().endsWith('.pdf'));
        return true;
      });
    }

    if (filterTime !== 'all') {
      const now = new Date();
      filtered = filtered.filter(file => {
        const days = (now.getTime() - file.modifiedAt.getTime()) / (1000 * 3600 * 24);
        if (filterTime === '7days') return days <= 7;
        if (filterTime === '30days') return days <= 30;
        if (filterTime === '90days') return days <= 90;
        return true;
      });
    }

    if (filterSize !== 'all') {
      filtered = filtered.filter(file => {
        const mb = (file.size || 0) / (1024 * 1024);
        if (filterSize === 'under1mb') return mb < 1;
        if (filterSize === '1to10mb') return mb >= 1 && mb <= 10;
        if (filterSize === 'over10mb') return mb > 10;
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'date') cmp = a.modifiedAt.getTime() - b.modifiedAt.getTime();
      else if (sortBy === 'size') cmp = (a.size || 0) - (b.size || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [allItems, searchQuery, sortBy, sortOrder, filterType, filterTime, filterSize]);

  // â”€â”€ Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const fs = event.target.files;
    if (fs && fs.length > 0) {
      const v = validateFiles(Array.from(fs));
      if (!v.valid) { setError(v.errors.join('\n')); event.target.value = ''; return; }
      setUploadFiles(fs);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0) { setError('Please select files to upload'); return; }
    if (!userIdNum) { setError('Please log in to upload files'); return; }
    setIsUploading(true); setError(null);
    try {
      if (uploadFiles.length === 1) {
        const file = uploadFiles[0];
        try {
          await fileService.uploadFile(file, currentFolder ? Number(currentFolder) : null, userIdNum, {
            document_status: uploadDocumentStatus,
            stamp_placement: uploadStampPlacement,
          });
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            setIsUploading(false);
            setShowUploadModal(false);
            setUploadFiles(null);
            setUploadConflict(err.response.data as UploadConflict);
            setShowUploadConflictModal(true);
            return;
          }
          throw err;
        }
        setSuccess(`âœ… "${file.name}" uploaded successfully!`);
      } else {
        const res = await fileService.uploadMultipleFiles(
          Array.from(uploadFiles),
          currentFolder ? Number(currentFolder) : null,
          userIdNum,
          {
            document_status: uploadDocumentStatus,
            stamp_placement: uploadStampPlacement,
          },
        );
        if (!res.data) throw new Error('Upload failed');
        const result = res.data as { totalUploaded?: number; totalErrors?: number };
        const ok = result.totalUploaded || 0;
        const fail = result.totalErrors || 0;
        if (ok > 0) setSuccess(`âœ… ${ok} file${ok > 1 ? 's' : ''} uploaded successfully!`);
        if (fail > 0) setError(`âš ï¸ ${fail} file${fail > 1 ? 's' : ''} failed to upload.`);
      }
      setShowUploadModal(false); setUploadFiles(null); loadFilesAndFolders();
      refreshDashboard();
    } catch (err) { setError(getAxiosErrorMessage(err, 'Upload failed')); }
    finally { setIsUploading(false); }
  };

  const handleResolveUploadConflict = async (strategy: 'overwrite' | 'version' | 'skip') => {
    if (!uploadConflict) return;
    setIsUploading(true);
    try {
      const res = await fileService.resolveUploadConflict({
        conflict_strategy: strategy,
        temp_path: uploadConflict.uploaded_file.temp_path,
        file_name: uploadConflict.uploaded_file.file_name,
        file_size: uploadConflict.uploaded_file.file_size,
        file_type: uploadConflict.uploaded_file.file_type,
        folder_id: currentFolder ? Number(currentFolder) : null,
        created_by: userIdNum,
        existing_file_id: uploadConflict.existing_file.id,
        document_status: uploadDocumentStatus,
        stamp_placement: uploadStampPlacement,
      });
      const data = res.data as { fileName?: string; versionNumber?: number; error?: string };
      setShowUploadConflictModal(false);
      setUploadConflict(null);
      loadFilesAndFolders();
      refreshDashboard();
      setSuccess(
        strategy === 'skip' ? 'â­ï¸ Upload skipped.' :
        strategy === 'overwrite' ? `âœ… "${data.fileName}" overwritten successfully!` :
        `âœ… Saved as "${data.fileName}" (version ${data.versionNumber})!`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setIsUploading(false);
    }
  };

  // â”€â”€ Create Folder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) { setError('Folder name cannot be empty'); return; }
    if (folders.find(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase())) {
      setError(`A folder named "${newFolderName.trim()}" already exists here.`); return;
    }
    setIsCreatingFolder(true); setError(null);
    try {
      await fileService.createFolder(newFolderName.trim(), currentFolder ? Number(currentFolder) : null, userIdNum);
      setSuccess(`✅ Folder "${newFolderName.trim()}" created successfully!`);
      setShowFolderModal(false); setNewFolderName(''); loadFilesAndFolders();
      refreshDashboard();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create folder'); }
    finally { setIsCreatingFolder(false); }
  };

  // â”€â”€ Rename â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRename = async () => {
    if (!itemToRename || !newName.trim()) { setError('New name cannot be empty'); return; }
    if (allItems.find(i => i.name.toLowerCase() === newName.trim().toLowerCase() && i.id !== itemToRename.id && i.type === itemToRename.type)) {
      setError(`A ${itemToRename.type === 'folder' ? 'folder' : 'file'} named "${newName.trim()}" already exists here.`); return;
    }
    setIsRenaming(true); setError(null);
    try {
      await fileService.renameItem(Number(itemToRename.id), newName.trim(), userIdNum);
      setSuccess(`âœ… "${itemToRename.name}" renamed to "${newName.trim()}" successfully!`);
      setShowRenameModal(false); setItemToRename(null); setNewName(''); loadFilesAndFolders();
      refreshDashboard();
    } catch (err) { setError(getAxiosErrorMessage(err, 'Failed to rename')); }
    finally { setIsRenaming(false); }
  };

  // â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const item = allItems.find(i => i.id === itemId);
    try {
      await fileService.deleteItem(Number(itemId), userIdNum);
      setSuccess(`🗑️ "${item?.name || 'Item'}" deleted successfully!`);
      setSelectedFiles(prev => prev.filter(id => id !== itemId));
      loadFilesAndFolders();
      refreshDashboard();
    } catch (err) { setError(getAxiosErrorMessage(err, 'Failed to delete item')); }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedFiles.length} selected item(s)?`)) return;
    try {
      await fileService.bulkDelete(selectedFiles.map(Number), userIdNum);
      setSuccess(`🗑️ ${selectedFiles.length} item(s) deleted successfully!`);
      setSelectedFiles([]); loadFilesAndFolders();
      refreshDashboard();
    } catch (err) { setError(getAxiosErrorMessage(err, 'Failed to delete items')); }
  };

  // â”€â”€ Download â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDownload = async (file: FileItem) => {
    if (file.type === 'folder') return handleFolderDownload(file.id, file.name);
    if (!userIdNum) { setError('Please log in to download files'); return; }
    try {
      setSuccess(`⏳ Preparing download for "${file.name}"…`);
      const response = await fileService.downloadFileBlob(Number(file.id), userIdNum);
      const { isProtected } = await saveDownloadResponse(response, file.name);
      setSuccess(downloadSuccessMessage(file.name, isProtected));
    } catch (err) {
      setError(err instanceof Error ? err.message : await parseAxiosDownloadError(err));
    }
  };

  const handleFolderDownload = async (folderId: string, folderName: string) => {
    try {
      setSuccess('⏳ Preparing folder download…');
      const response = await fileService.downloadFolderBlob(Number(folderId));
      await saveDownloadResponse(response, `${folderName}.zip`);
      setSuccess(`📥 Folder "${folderName}" downloaded as ZIP successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : await parseAxiosDownloadError(err));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.length === 0) return;
    if (selectedFiles.length === 1) { const item = allItems.find(i => i.id === selectedFiles[0]); if (item) await handleDownload(item); return; }
    try {
      setSuccess('⏳ Preparing bulk download…');
      const res = await fileService.bulkDownload(selectedFiles.map(Number));
      await saveDownloadResponse(res, `selected_files_${new Date().toISOString().split('T')[0]}.zip`);
      setSuccess(`📥 ${selectedFiles.length} items downloaded as ZIP!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : await parseAxiosDownloadError(err));
    }
  };

  // â”€â”€ Star â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleToggleStar = async (e: MouseEvent, file: FileItem) => {
    e.stopPropagation();
    try {
      const res = await fileService.toggleStar(Number(file.id), userIdNum);
      const result = res.data as { starred: boolean };

      // âœ… Update the files list
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isStarred: result.starred } : f));

      // âœ… Update previewFile if it's the same file (so the star icon updates immediately in the modal)
      setPreviewFile(prev => prev?.id === file.id ? { ...prev, isStarred: result.starred } : prev);

      setSuccess(result.starred
        ? `⭐ "${file.name}" added to Starred Files`
        : `"${file.name}" removed from Starred Files`
      );
      refreshDashboard();
    } catch (err) { setError(getAxiosErrorMessage(err, 'Failed to update star status')); }
  };

  // â”€â”€ Share â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addUser = (user: ShareUser) => { setSelectedUsers(prev => [...prev, user]); setUserSearchQuery(''); setShowUserDropdown(false); };
  const removeUser = (userId: string | number) => setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  const handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Backspace' && userSearchQuery === '' && selectedUsers.length > 0)
      removeUser(selectedUsers[selectedUsers.length - 1].id!);
  };

  const generateMailtoLink = () => {
    const emails = selectedUsers.map(u => u.email).join(',');
    const subject = encodeURIComponent(`Shared files from ${userName}`);
    const fileNames = selectedFiles.map(id => allItems.find(i => i.id === id)?.name || 'file').join(', ');
    const body = encodeURIComponent(`${shareMessage || `${userName} has shared the following files with you:`}\n\nFiles: ${fileNames}\n\nPlease check your file sharing system for access.\n\nBest regards,\n${userName}`);
    return `mailto:${emails}?subject=${subject}&body=${body}`;
  };

  const handleShare = async (useOutlook = false) => {
    if (selectedUsers.length === 0)    { setError('Please select at least one user to share with'); return; }
    if (!selectedFileForShares)        { setError('No file selected for sharing'); return; }
    if (selectedFileForShares.created_by.toString() !== CURRENT_USER_ID) {
      setError('Only the file owner can share this file');
      return;
    }

    if (useOutlook) {
      const emails  = selectedUsers.map(u => u.email).join(',');
      const subject = encodeURIComponent(`Shared files from ${userName}`);
      const body    = encodeURIComponent(`${shareMessage || `${userName} has shared the following file with you:`}\n\nFile: ${selectedFileForShares.name}\n\nPlease check your file sharing system for access.\n\nBest regards,\n${userName}`);
      window.location.href = `mailto:${emails}?subject=${subject}&body=${body}`;
      setShowShareModal(false);
      setSelectedUsers([]);
      setShareMessage('');
      setSelectedFileForShares(null);
      setUserSearchQuery('');
      setSuccess(`ðŸ“§ Outlook opened â€” email drafted for ${selectedUsers.length} recipient${selectedUsers.length > 1 ? 's' : ''}!`);
      return;
    }

    setIsSharing(true);
    try {
      await shareService.shareFile(Number(selectedFileForShares.id), selectedUsers.map(u => Number(u.id)));

      const names = selectedUsers.map(u => u.name).join(', ');
      setSuccess(`âœ… "${selectedFileForShares.name}" shared successfully with: ${names}`);
      setShowShareModal(false);
      setSelectedUsers([]);
      setShareMessage('');
      setSelectedFileForShares(null);
      setUserSearchQuery('');
    } catch (err) {
      setError('Failed to share file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setIsSharing(false); }
  };

  // â”€â”€ Manage Shares â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadFileShares = async (fileId: string) => {
    setLoadingShares(true);
    try {
      const res = await shareService.getFileShares(Number(fileId));
      setCurrentFileShares(res.data.data || []);
    } catch (err) { setError('Failed to load file shares'); }
    finally { setLoadingShares(false); }
  };

  const handleRemoveShare = async (shareId: number) => {
    if (!confirm('Remove access for this user?')) return;
    try {
      await shareService.removeShare(shareId);
      setSuccess('✅ Access removed successfully!');
      if (selectedFileForShares) await loadFileShares(selectedFileForShares.id);
    } catch (err) { setError('Failed to remove access'); }
  };

  const openManageSharesModal = (file: FileItem) => { setSelectedFileForShares(file); setShowManageSharesModal(true); loadFileShares(file.id); };

  // â”€â”€ Navigation helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFolderClick = (folder: FileItem) => {
    if (folder.type === 'folder') {
      exitSelectMode();
      setCurrentFolder(folder.id);
    }
  };
  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (isSelectMode) return;
    setCurrentFolder(item.id || null);
  };
  const handleSort = (col: 'name' | 'date' | 'size') => {
    if (sortBy === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('asc'); }
  };
  const handleItemClick = (item: FileItem) => {
    if (isSelectMode) {
      toggleFileSelection(item.id);
      return; // â† block ALL navigation and preview in select mode
    }
    if (item.type === 'folder') handleFolderClick(item);
    else handleFilePreview(item);
  };
  const openRenameModal = (item: FileItem) => {
    if (!isFileOwner(item, CURRENT_USER_ID)) {
      setError('You can only rename files you own.');
      return;
    }
    setItemToRename(item); setNewName(item.name); setShowRenameModal(true);
  };
  const refresh = () => { loadFilesAndFolders(); setSuccess('ðŸ”„ Files refreshed!'); };
  const handleFilePreview = (file: FileItem) => { setPreviewFile(file); setShowPreviewModal(true); };
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const next = prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId];
      return next;
    });
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedFiles([]);
  };

  // â†“â†“â†“ NEW MOVE FEATURE HANDLERS â†“â†“â†“

  const openMoveModal = (items: MoveItem[]) => {
    setMoveItems(items);
    setMoveTargetFolderId(null);
    setMoveTargetFolderName('Home (root)');
    setMovePreview(null);
    setShowMoveModal(true);
    loadFolderTree();
  };

  const openMoveModalForSelected = () => {
    const items = selectedFiles
      .map(id => {
        const item = allItems.find(i => i.id === id);
        return item && isFileOwner(item, CURRENT_USER_ID) ? { id: item.id, name: item.name, type: item.type } : null;
      })
      .filter(Boolean) as MoveItem[];
    if (items.length === 0) {
      setError('You can only move files you own. None of the selected items belong to you.');
      return;
    }
    const skipped = selectedFiles.length - items.length;
    if (skipped > 0) setError(`${skipped} item(s) skipped â€” you can only move files you own.`);
    openMoveModal(items);
  };

  const openMoveModalForItem = (item: FileItem) => {
    openMoveModal([{ id: item.id, name: item.name, type: item.type }]);
  };

  const loadFolderTree = async () => {
    setFolderTreeLoading(true);
    try {
      const res = await fileService.getRootList();
      const data = res.data;
      const rootFolders: FolderNode[] = (data.folders || []).map(f => ({
        id: String(f.id), name: f.name, parent_id: null, children: [], isLoaded: false, isOpen: false,
      }));
      setFolderTree(rootFolders);
    } catch (err) {
      console.error('Error loading folder tree:', err);
    } finally {
      setFolderTreeLoading(false);
    }
  };

  const loadFolderChildren = async (folderId: string) => {
    try {
      const res = await fileService.getFolderContents(Number(folderId));
      const data = res.data;
      const children: FolderNode[] = (data.folders || []).map(f => ({
        id: String(f.id), name: f.name, parent_id: folderId, children: [], isLoaded: false, isOpen: false,
      }));
      setFolderTree(prev => updateNodeInTree(prev, folderId, node => ({ ...node, children, isLoaded: true, isOpen: true })));
    } catch (err) {
      console.error('Error loading folder children:', err);
    }
  };

  const updateNodeInTree = (
    nodes: FolderNode[],
    targetId: string,
    updater: (n: FolderNode) => FolderNode
  ): FolderNode[] =>
    nodes.map(n =>
      n.id === targetId
        ? updater(n)
        : { ...n, children: n.children ? updateNodeInTree(n.children, targetId, updater) : [] }
    );

  const toggleFolderInTree = (folderId: string, folderName: string, isOpen: boolean) => {
    if (!isOpen) {
      loadFolderChildren(folderId);
    } else {
      setFolderTree(prev => updateNodeInTree(prev, folderId, n => ({ ...n, isOpen: false })));
    }
  };

  const selectDestination = async (folderId: string | null, folderName: string) => {
    setMoveTargetFolderId(folderId);
    setMoveTargetFolderName(folderName);
    setMovePreview(null);
    if (moveItems.length === 0) return;
    setMovePreviewLoading(true);
    try {
      const fileIds = moveItems.filter(i => i.type === 'file').map(i => Number(i.id));
      const folderIds = moveItems.filter(i => i.type === 'folder').map(i => Number(i.id));
      const res = await moveService.getMovePreview(fileIds, folderIds, folderId ? Number(folderId) : null);
      const data = res.data as { preview: MovePreview };
      setMovePreview(data.preview);
    } catch (err) {
      console.error('Error getting move preview:', err);
    } finally {
      setMovePreviewLoading(false);
    }
  };

  const executeMove = async (conflictStrategy: string = 'ask') => {
    if (moveItems.length === 0) return;
    setIsMoving(true);
    try {
      const fileIds = moveItems.filter(i => i.type === 'file').map(i => Number(i.id));
      const folderIds = moveItems.filter(i => i.type === 'folder').map(i => Number(i.id));
      const targetId = moveTargetFolderId ? Number(moveTargetFolderId) : null;
      let res;
      if (moveItems.length === 1 && moveItems[0].type === 'folder' && fileIds.length === 0) {
        res = await moveService.moveFolderWithContents(folderIds[0], targetId, userIdNum, conflictStrategy as 'ask');
      } else {
        res = await moveService.moveBulk(fileIds, folderIds, targetId, userIdNum, conflictStrategy as 'ask');
      }
      const data = res.data as { results?: { moved_files?: unknown[]; moved_folders?: unknown[] }; batch_id?: string; error?: string };
      const movedCount = (data.results?.moved_files?.length || 0) + (data.results?.moved_folders?.length || 0);
      setShowMoveModal(false);
      setSelectedFiles([]);
      loadFilesAndFolders();
      refreshDashboard();
      if (data.batch_id) {
        showUndoToast(data.batch_id, `Moved ${movedCount} item${movedCount !== 1 ? 's' : ''} to "${moveTargetFolderName}"`);
      } else {
        setSuccess(`✅ Moved ${movedCount} item${movedCount !== 1 ? 's' : ''} to "${moveTargetFolderName}"`);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const data = err.response.data as { conflict?: boolean; conflicts?: ConflictItem[] };
        if (data.conflict) {
          setPendingConflicts(data.conflicts || []);
          setShowMoveModal(false);
          setShowConflictModal(true);
          return;
        }
      }
      setError(getAxiosErrorMessage(err, 'Move failed'));
    } finally {
      setIsMoving(false);
    }
  };

  const applyConflictDecision = (itemId: string, strategy: 'overwrite' | 'version' | 'skip') => {
    setConflictDecisions(prev => ({ ...prev, [itemId]: strategy }));
  };

  const applyAllConflicts = (strategy: 'overwrite' | 'version' | 'skip') => {
    const decisions: Record<string, 'overwrite' | 'version' | 'skip'> = {};
    pendingConflicts.forEach(c => { decisions[c.id] = strategy; });
    setConflictDecisions(decisions);
  };

  const confirmConflicts = async () => {
    const undecided = pendingConflicts.filter(c => !conflictDecisions[c.id]);
    if (undecided.length > 0) { setError(`Please choose a strategy for all ${undecided.length} remaining conflict(s)`); return; }
    const allStrategies = new Set(Object.values(conflictDecisions));
    if (allStrategies.size === 1) {
      const strategy = [...allStrategies][0];
      setShowConflictModal(false);
      setConflictDecisions({});
      await executeMove(strategy);
    } else {
      setShowConflictModal(false);
      setIsMoving(true);
      try {
        let totalMoved = 0;
        let lastBatchId = '';
        for (const [itemId, strategy] of Object.entries(conflictDecisions)) {
          const item = moveItems.find(i => i.id === itemId);
          if (!item) continue;
          const fileIds = item.type === 'file' ? [Number(itemId)] : [];
          const folderIds = item.type === 'folder' ? [Number(itemId)] : [];
          const res = await moveService.moveBulk(
            fileIds,
            folderIds,
            moveTargetFolderId ? Number(moveTargetFolderId) : null,
            userIdNum,
            strategy,
          );
          const data = res.data as { results?: { moved_files?: unknown[]; moved_folders?: unknown[] }; batch_id?: string };
          if (res.status < 400) {
            totalMoved += (data.results?.moved_files?.length || 0) + (data.results?.moved_folders?.length || 0);
            if (data.batch_id) lastBatchId = data.batch_id;
          }
        }
        setSelectedFiles([]);
        loadFilesAndFolders();
        if (lastBatchId) showUndoToast(lastBatchId, `Moved ${totalMoved} item${totalMoved !== 1 ? 's' : ''} to "${moveTargetFolderName}"`);
        else setSuccess(`âœ… Moved ${totalMoved} item${totalMoved !== 1 ? 's' : ''} to "${moveTargetFolderName}"`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Move failed');
      } finally {
        setIsMoving(false);
        setConflictDecisions({});
      }
    }
  };

  const showUndoToast = (batchId: string, message: string) => {
    if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
    setUndoToast({ batchId, message, visible: true });
    undoToastTimer.current = setTimeout(() => setUndoToast(null), 8000);
  };

  const handleUndoMove = async (batchId: string) => {
    try {
      const res = await moveService.undoBatch(batchId, userIdNum);
      const data = res.data as { error?: string; summary?: { total_undone?: number } };
      if (res.status >= 400) throw new Error(data.error || 'Undo failed');
      setUndoToast(null);
      loadFilesAndFolders();
      setSuccess(`â†©ï¸ Move undone â€” ${data.summary?.total_undone || 0} item(s) restored`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Undo failed');
    }
  };

  const loadMoveHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await moveService.getMoveHistory(userIdNum);
      const data = res.data as { history?: MoveHistoryBatch[] };
      setMoveHistory(data.history || []);
    } catch (err) {
      setError('Failed to load move history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryModal = () => { setShowHistoryModal(true); loadMoveHistory(); };

  const handleCreateInlineFolder = async () => {
    if (!inlineFolderName.trim()) return;
    setIsCreatingInlineFolder(true);
    try {
      const res = await fileService.createFolder(
        inlineFolderName.trim(),
        moveTargetFolderId ? Number(moveTargetFolderId) : null,
        userIdNum,
      );
      const data = res.data as { folder?: { id: number }; id?: number };
      const newFolderId = String(data.folder?.id || data.id);
      const newFolderName = inlineFolderName.trim();
      // Refresh the folder tree and auto-select the new folder
      await loadFolderTree();
      await selectDestination(newFolderId, newFolderName);
      setInlineFolderName('');
      setShowInlineFolderCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsCreatingInlineFolder(false);
    }
  };

  const handleDragStart = (e: DragEvent, item: MoveItem) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
  };

  const handleDragOver = (e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => setDragOverFolderId(null);

  const handleDrop = async (e: DragEvent, targetFolderId: string, targetFolderName: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    if (!draggedItem) return;
    if (draggedItem.type === 'folder' && draggedItem.id === targetFolderId) return;
    setDraggedItem(null);
    try {
      const previewRes = await moveService.getMovePreview(
        draggedItem.type === 'file' ? [Number(draggedItem.id)] : [],
        draggedItem.type === 'folder' ? [Number(draggedItem.id)] : [],
        Number(targetFolderId),
      );
      const previewData = previewRes.data as { preview?: MovePreview };
      if (previewData.preview?.conflicts?.length > 0) {
        setMoveItems([draggedItem]);
        setMoveTargetFolderId(targetFolderId);
        setMoveTargetFolderName(targetFolderName);
        setMovePreview(previewData.preview);
        setShowMoveModal(true);
        loadFolderTree();
      } else if (previewData.preview?.errors?.length > 0) {
        setError(previewData.preview.errors.map((e: any) => e.reason).join(', '));
      } else {
        const moveRes = await moveService.moveBulk(
          draggedItem.type === 'file' ? [Number(draggedItem.id)] : [],
          draggedItem.type === 'folder' ? [Number(draggedItem.id)] : [],
          Number(targetFolderId),
          userIdNum,
          'skip',
        );
        const moveData = moveRes.data as { batch_id?: string; error?: string };
        if (moveRes.status >= 400) throw new Error(moveData.error || 'Move failed');
        loadFilesAndFolders();
        if (moveData.batch_id) showUndoToast(moveData.batch_id, `Moved "${draggedItem.name}" to "${targetFolderName}"`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed');
    }
  };
  // â†‘â†‘â†‘ END NEW MOVE FEATURE HANDLERS â†‘â†‘â†‘

  const resetShareModal = () => {
    setShowShareModal(false);
    setSelectedUsers([]);
    setShareMessage('');
    setUserSearchQuery('');
    setSelectedFileForShares(null);
  };

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setUploadFiles(null);
    setUploadDocumentStatus('none');
    setUploadStampPlacement('every_page');
  };

  const closeMoveModal = () => {
    setShowMoveModal(false);
    setMovePreview(null);
    setShowInlineFolderCreate(false);
    setInlineFolderName('');
  };

  const closeConflictModal = () => {
    setShowConflictModal(false);
    setPendingConflicts([]);
    setConflictDecisions({});
  };

  const listViewProps = {
    items: filteredAndSortedFiles,
    currentUserId: CURRENT_USER_ID,
    isSelectMode,
    selectedFiles,
    dragOverFolderId,
    onItemClick: handleItemClick,
    onSort: handleSort,
    onToggleSelection: toggleFileSelection,
    onSelectAll: () => setSelectedFiles(filteredAndSortedFiles.map(f => f.id)),
    onClearSelection: () => setSelectedFiles([]),
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onRename: openRenameModal,
    onMove: openMoveModalForItem,
    onToggleStar: handleToggleStar,
    onShare: (file: FileItem) => {
      setSelectedFileForShares(file);
      setShowShareModal(true);
    },
    onDownload: handleDownload,
    onDelete: handleDelete,
  };
  return {
    authLoading,
    loading,
    error,
    success,
    setError,
    setSuccess,
    viewMode,
    setViewMode,
    sortBy,
    sortOrder,
    showFilters,
    setShowFilters,
    selectedFiles,
    setSelectedFiles,
    currentFolder,
    files,
    folders,
    folderPath,
    showManageSharesModal,
    setShowManageSharesModal,
    currentFileShares,
    loadingShares,
    selectedFileForShares,
    setSelectedFileForShares,
    searchQuery,
    setSearchQuery,
    showUploadModal,
    setShowUploadModal,
    showFolderModal,
    setShowFolderModal,
    showRenameModal,
    setShowRenameModal,
    showShareModal,
    setShowShareModal,
    showPreviewModal,
    setShowPreviewModal,
    uploadFiles,
    setUploadFiles,
    isUploading,
    uploadDocumentStatus,
    setUploadDocumentStatus,
    uploadStampPlacement,
    setUploadStampPlacement,
    newFolderName,
    setNewFolderName,
    isCreatingFolder,
    itemToRename,
    setItemToRename,
    newName,
    setNewName,
    isRenaming,
    shareMessage,
    setShareMessage,
    isSharing,
    userSearchQuery,
    setUserSearchQuery,
    filteredUsers,
    selectedUsers,
    showUserDropdown,
    previewFile,
    setPreviewFile,
    previewLoading,
    setPreviewLoading,
    filterType,
    setFilterType,
    filterTime,
    setFilterTime,
    filterSize,
    setFilterSize,
    showMoveModal,
    setShowMoveModal,
    moveItems,
    moveTargetFolderId,
    moveTargetFolderName,
    movePreview,
    movePreviewLoading,
    isMoving,
    folderTree,
    folderTreeLoading,
    showConflictModal,
    setShowConflictModal,
    pendingConflicts,
    conflictDecisions,
    setConflictDecisions,
    undoToast,
    setUndoToast,
    showHistoryModal,
    setShowHistoryModal,
    moveHistory,
    historyLoading,
    expandedBatch,
    setExpandedBatch,
    dragOverFolderId,
    isSelectMode,
    setIsSelectMode,
    showInlineFolderCreate,
    setShowInlineFolderCreate,
    inlineFolderName,
    setInlineFolderName,
    isCreatingInlineFolder,
    uploadConflict,
    setUploadConflict,
    showUploadConflictModal,
    setShowUploadConflictModal,
    CURRENT_USER_ID,
    PREVIEW_BASE_URL,
    isMainPage,
    filteredAndSortedFiles,
    listViewProps,
    handleBreadcrumbClick,
    openHistoryModal,
    refresh,
    handleFileSelect,
    handleUpload,
    handleResolveUploadConflict,
    handleCreateFolder,
    handleRename,
    handleDelete,
    handleBulkDelete,
    handleBulkDownload,
    handleToggleStar,
    addUser,
    removeUser,
    handleSearchKeyDown,
    handleShare,
    handleRemoveShare,
    resetShareModal,
    resetUploadModal,
    exitSelectMode,
    openMoveModalForSelected,
    closeMoveModal,
    closeConflictModal,
    selectDestination,
    toggleFolderInTree,
    executeMove,
    applyConflictDecision,
    applyAllConflicts,
    confirmConflicts,
    handleUndoMove,
    handleCreateInlineFolder,
    setCurrentFileShares,
  };
}
