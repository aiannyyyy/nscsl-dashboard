import { useState, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import categoryService from '../../../../services/IntranetServices/categoryService';
import categoryMoveService from '../../../../services/IntranetServices/categoryMoveService';
import shareService from '../../../../services/IntranetServices/shareService';
import { saveDownloadResponse, downloadSuccessMessage, parseAxiosDownloadError } from '../../../../services/IntranetServices/downloadHelper';
import { invalidateIntranetDashboard } from '../../../../services/IntranetServices/intranetQuerySync';
import api, { getAxiosErrorMessage } from '../../../../services/api';
import axios from 'axios';
import { validateFiles, formatFileSize } from './utils';
import type {
  BreadcrumbItem, Category, ConflictItem, FileItem, FileShare, FileVersion, Folder,
  FolderNode, ItemType, MoveHistoryBatch, MoveItem, ShareUser, UploadConflict, UploadProgress, ViewType,
} from './types';

function mapCategory(c: {
  id: number; name: string; description?: string; color: string; icon: string;
  is_active: number | boolean; created_by: number; created_by_name?: string;
  created_at: string; updated_at: string;
}): Category {
  return { ...c, description: c.description ?? '', is_active: Boolean(c.is_active) };
}

function mapFolder(f: {
  id: number; name: string; description?: string; category_id: number;
  parent_folder_id?: number | null; path: string; is_active: number | boolean;
  created_by: number; created_at: string; updated_at?: string;
}): Folder {
  return {
    ...f,
    description: f.description ?? '',
    parent_folder_id: f.parent_folder_id ?? undefined,
    is_active: Boolean(f.is_active),
    updated_at: f.updated_at ?? f.created_at,
  };
}

function mapFile(
  f: import('../../../../services/IntranetServices/categoryService').CategoryFile,
  starredIds: Set<number>,
): FileItem {
  return {
    id: f.id,
    name: f.name,
    original_name: f.original_name,
    file_type: f.file_type,
    file_size: f.file_size,
    formatted_size: formatFileSize(f.file_size),
    mime_type: f.mime_type,
    file_path: f.file_path,
    category_id: f.category_id,
    folder_id: f.folder_id ?? undefined,
    is_starred: starredIds.has(f.id) || Boolean(f.is_starred),
    is_active: Boolean(f.is_active),
    download_count: f.download_count,
    last_accessed: '',
    created_by: f.created_by,
    created_by_name: f.created_by_name,
    created_at: f.created_at,
    updated_at: f.created_at,
    document_status: f.document_status as FileItem['document_status'],
    stamp_placement: f.stamp_placement as FileItem['stamp_placement'],
  };
}

async function downloadCategoryFile(fileId: number, userId: number, fileName: string) {
  const response = await categoryService.downloadFileBlob(fileId, userId);
  return saveDownloadResponse(response, fileName);
}

export function useCategoriesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userIdNum = user ? Number(user.id) : 0;
  const CURRENT_USER_ID = userIdNum ? String(userIdNum) : '1';
  const userName = user?.name ?? (user as { user_name?: string })?.user_name ?? 'User';
  const PREVIEW_BASE_URL = `${api.defaults.baseURL}/intranet/categories/files`;



  const [viewMode, setViewMode]       = useState<'grid' | 'list'>('grid');
  const [currentView, setCurrentView] = useState<ViewType>('categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Banner state
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders]       = useState<Folder[]>([]);
  const [files, setFiles]           = useState<FileItem[]>([]);

  // Navigation
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);
  const [currentFolderId, setCurrentFolderId]     = useState<number | null>(null);
  const [breadcrumb, setBreadcrumb]               = useState<BreadcrumbItem[]>([]);

  // UI
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [modalMode, setModalMode]   = useState<'add' | 'edit' | 'delete'>('add');
  const [modalType, setModalType]   = useState<ItemType>('category');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // File viewer
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewingFile, setViewingFile]       = useState<FileItem | null>(null);

  // Share
  const [showShareModal, setShowShareModal]               = useState(false);
  const [selectedFileForShares, setSelectedFileForShares] = useState<FileItem | null>(null);
  const [showManageSharesModal, setShowManageSharesModal] = useState(false);
  const [currentFileShares, setCurrentFileShares]         = useState<FileShare[]>([]);
  const [loadingShares, setLoadingShares]                 = useState(false);
  const [userSearchQuery, setUserSearchQuery]             = useState('');
  const [filteredUsers, setFilteredUsers]                 = useState<ShareUser[]>([]);
  const [selectedUsers, setSelectedUsers]                 = useState<ShareUser[]>([]);
  const [showUserDropdown, setShowUserDropdown]           = useState(false);
  const [availableUsers, setAvailableUsers]               = useState<ShareUser[]>([]);
  const [shareMessage, setShareMessage]                   = useState('');
  const [isSharing, setIsSharing]                         = useState(false);

  // Rename
  const [renameMode, setRenameMode]     = useState(false);
  const [renameFileId, setRenameFileId] = useState<number | null>(null);
  const [newFileName, setNewFileName]   = useState('');

  // Forms
  const [categoryForm, setCategoryForm] = useState({
    name: '', description: '', color: '#007bff', icon: 'FolderOpen', is_active: true
  });
  const [folderForm, setFolderForm] = useState({
    name: '', description: '', category_id: 0, parent_folder_id: null as number | null
  });

  // Upload
  const [uploadFiles, setUploadFiles]       = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadMode, setUploadMode]         = useState<'single' | 'multiple' | 'bulk'>('multiple');
  const [dragOver, setDragOver]             = useState(false);
  const [uploadDocumentStatus, setUploadDocumentStatus] = useState<'none' | 'controlled_copy' | 'master' | 'obsolete'>('none');
  const [uploadStampPlacement, setUploadStampPlacement] = useState<'every_page' | 'first_page'>('every_page');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload conflict state
  const [uploadConflict, setUploadConflict] = useState<UploadConflict | null>(null);
  const [showUploadConflictModal, setShowUploadConflictModal] = useState(false);

  // Select mode
  const [isSelectMode, setIsSelectMode]       = useState(false);
  const [selectedFiles, setSelectedFiles]     = useState<number[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<number[]>([]);

  // Move modal
  const [showMoveModal, setShowMoveModal]               = useState(false);
  const [moveItems, setMoveItems]                       = useState<MoveItem[]>([]);
  const [moveTargetFolderId, setMoveTargetFolderId]     = useState<string | null>(null);
  const [moveTargetFolderName, setMoveTargetFolderName] = useState('Home (root)');
  const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<number | null>(null);
  const [folderTree, setFolderTree]                     = useState<FolderNode[]>([]);
  const [allCategories, setAllCategories]               = useState<Category[]>([]);
  const [movePreviewConflicts, setMovePreviewConflicts] = useState<ConflictItem[]>([]);
  const [moveLoading, setMoveLoading]                   = useState(false);
  const [showInlineFolderCreate, setShowInlineFolderCreate] = useState(false);
  const [inlineFolderName, setInlineFolderName]             = useState('');

  // Conflict modal
  const [showConflictModal, setShowConflictModal]   = useState(false);
  const [pendingConflicts, setPendingConflicts]     = useState<ConflictItem[]>([]);
  const [conflictDecisions, setConflictDecisions]   = useState<Record<number, 'overwrite' | 'version' | 'skip'>>({});

  // Undo toast
  const [undoToast, setUndoToast] = useState<{ batchId: string; message: string; visible: boolean } | null>(null);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [moveHistory, setMoveHistory]           = useState<MoveHistoryBatch[]>([]);
  const [historyLoading, setHistoryLoading]     = useState(false);
  const [expandedBatch, setExpandedBatch]       = useState<string | null>(null);

  // Version modal
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionFile, setVersionFile]           = useState<FileItem | null>(null);
  const [versions, setVersions]                 = useState<FileVersion[]>([]);
  const [versionsLoading, setVersionsLoading]   = useState(false);

    // ── Auto-hide banners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
  }, [error]);

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    if (currentView === 'categories') fetchCategories();
    else fetchFilesAndFolders();
  }, [currentView, currentCategoryId, currentFolderId]);

  useEffect(() => {
    if (showShareModal) fetchUsers();
  }, [showShareModal]);

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

  // ============================================================
  // FETCH
  // ============================================================

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await categoryService.getCategories();
      setCategories((res.data.categories || []).map(mapCategory));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilesAndFolders = async () => {
    if (!currentCategoryId) return;
    try {
      setLoading(true);
      const parentId = currentFolderId === null ? 'null' : currentFolderId;
      const [folderRes, fileRes, starredRes] = await Promise.all([
        categoryService.getFolders({ category_id: currentCategoryId, parent_folder_id: parentId }),
        categoryService.getFiles({ category_id: currentCategoryId, folder_id: parentId }),
        userIdNum ? categoryService.getStarredFiles(userIdNum) : Promise.resolve({ data: { starredFiles: [] as { id: number }[] } }),
      ]);

      const starredIds = new Set<number>(
        ((starredRes.data as { starredFiles?: { id: number }[] }).starredFiles || []).map(f => Number(f.id)),
      );

      setFolders((folderRes.data.folders || []).map(mapFolder));
      setFiles((fileRes.data.files || []).map(f => mapFile(f, starredIds)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await shareService.getAllUsersForShare();
      const users = (res.data.data || []).map(u => ({
        ...u,
        email: (u as ShareUser & { email?: string }).email ?? '',
      }));
      setAvailableUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users for sharing');
    }
  };

  // ============================================================
  // RENAME
  // ============================================================

  const handleRenameFile = async (file: FileItem) => {
    if (!newFileName.trim()) { setModalError('File name cannot be empty'); return; }
    setSubmitting(true);
    setModalError('');
    try {
      await categoryService.updateFile(file.id, { name: newFileName, updated_by: userIdNum });
      setSuccess(`✅ "${file.name}" renamed to "${newFileName}" successfully!`);
      setRenameMode(false); setRenameFileId(null); setNewFileName('');
      await fetchFilesAndFolders();
      refreshDashboard();
    } catch (err) {
      setModalError(getAxiosErrorMessage(err, 'Failed to rename file'));
      setError(err instanceof Error ? err.message : 'Failed to rename file');
    } finally { setSubmitting(false); }
  };

  const openRenameModal = (file: FileItem) => { setRenameFileId(file.id); setNewFileName(file.name); setRenameMode(true); setModalError(''); };
  const closeRenameModal = () => { setRenameMode(false); setRenameFileId(null); setNewFileName(''); setModalError(''); };

  // ============================================================
  // SELECT MODE
  // ============================================================

  const exitSelectMode = () => { setIsSelectMode(false); setSelectedFiles([]); setSelectedFolders([]); };

  const toggleFileSelection = (id: number) =>
    setSelectedFiles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleFolderSelection = (id: number) =>
    setSelectedFolders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectAllVisible = () => {
    const fd = filteredData() as any;
    setSelectedFiles((fd.files || []).map((f: FileItem) => f.id));
    setSelectedFolders((fd.folders || []).map((f: Folder) => f.id));
  };

  const isAllSelected = () => {
    const fd = filteredData() as any;
    const allFiles = fd.files || [];
    const allFolders = fd.folders || [];
    if (allFiles.length === 0 && allFolders.length === 0) return false;
    return allFiles.every((f: FileItem) => selectedFiles.includes(f.id)) &&
           allFolders.every((f: Folder) => selectedFolders.includes(f.id));
  };

  // ============================================================
  // MOVE
  // ============================================================

  const openMoveModalForSelected = () => {
    const items: MoveItem[] = [
      ...selectedFiles
        .filter(id => { const f = files.find(x => x.id === id); return f && String(f.created_by) === String(CURRENT_USER_ID); })
        .map(id => { const f = files.find(x => x.id === id)!; return { id, name: f.name, type: 'file' as const }; }),
      ...selectedFolders
        .filter(id => { const f = folders.find(x => x.id === id); return f && String(f.created_by) === String(CURRENT_USER_ID); })
        .map(id => { const f = folders.find(x => x.id === id)!; return { id, name: f.name, type: 'folder' as const }; })
    ];
    if (items.length === 0) { setError('You can only move items you own.'); return; }
    openMoveModal(items);
  };

  const openMoveModalForItem = (item: MoveItem) => openMoveModal([item]);

  const openMoveModal = async (items: MoveItem[]) => {
    setMoveItems(items);
    setMoveTargetFolderId(null);
    setMoveTargetFolderName('Home (root)');
    setMoveTargetCategoryId(currentCategoryId);
    setMovePreviewConflicts([]);
    setShowInlineFolderCreate(false);
    setInlineFolderName('');
    await loadAllCategories();
    if (currentCategoryId) {
      const roots = await loadFolderTree(currentCategoryId, null);
      setFolderTree(roots);
    }
    setShowMoveModal(true);
  };

  const loadAllCategories = async () => {
    try {
      const res = await categoryMoveService.getCategoriesForMove();
      setAllCategories((res.data.categories || []).map(c => mapCategory({ ...c, description: '', is_active: 1, created_by: 0, created_at: '', updated_at: '' })));
    } catch {}
  };

  const loadFolderTree = async (categoryId: number, parentFolderId: number | null = null): Promise<FolderNode[]> => {
    try {
      const res = await categoryMoveService.getFoldersForTree(categoryId, parentFolderId);
      return (res.data.folders || []) as FolderNode[];
    } catch {
      return [];
    }
  };

  const selectMoveDestination = async (folderId: string | null, folderName: string, categoryId: number) => {
    setMoveTargetFolderId(folderId);
    setMoveTargetFolderName(folderName);
    setMoveTargetCategoryId(categoryId);
    setMovePreviewConflicts([]);
    try {
      const fileIds = moveItems.filter(i => i.type === 'file').map(i => i.id);
      if (fileIds.length === 0) return;
      const res = await categoryMoveService.getMovePreview(
        fileIds,
        [],
        folderId ? Number(folderId) : null,
        categoryId,
      );
      const data = res.data as { preview?: { conflicts?: ConflictItem[] } };
      setMovePreviewConflicts(data.preview?.conflicts || []);
    } catch {}
  };

  const refreshDashboard = () => invalidateIntranetDashboard(queryClient, userIdNum || undefined);

  const executeMove = async (conflictStrategy: 'overwrite' | 'version' | 'skip') => {
    if (!userIdNum) { setError('Please log in to move files'); return; }
    setMoveLoading(true);
    try {
      const fileIds = moveItems.filter(i => i.type === 'file').map(i => i.id);
      const folderIds = moveItems.filter(i => i.type === 'folder').map(i => i.id);
      const res = await categoryMoveService.moveBulk(
        fileIds,
        folderIds,
        moveTargetFolderId ? Number(moveTargetFolderId) : null,
        moveTargetCategoryId!,
        userIdNum,
        conflictStrategy,
      );
      const data = res.data as { batch_id?: string; summary?: { total_moved?: number }; error?: string; message?: string };
      setShowMoveModal(false);
      setShowConflictModal(false);
      exitSelectMode();
      await fetchFilesAndFolders();
      refreshDashboard();
      showUndoToastMsg(data.batch_id ?? '', `Moved ${data.summary?.total_moved || moveItems.length} item(s) to "${moveTargetFolderName}"`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const conflictData = err.response.data as { conflict?: boolean; conflicts?: ConflictItem[] };
        if (conflictData.conflict) {
          setPendingConflicts(conflictData.conflicts || []);
          setShowMoveModal(false);
          setShowConflictModal(true);
          return;
        }
      }
      setError(getAxiosErrorMessage(err, 'Move failed'));
    } finally { setMoveLoading(false); }
  };

  const handleMoveConfirm = () => {
    if (movePreviewConflicts.length > 0) {
      setPendingConflicts(movePreviewConflicts);
      const decisions: Record<number, 'overwrite' | 'version' | 'skip'> = {};
      movePreviewConflicts.forEach(c => { decisions[c.id] = 'version'; });
      setConflictDecisions(decisions);
      setShowMoveModal(false);
      setShowConflictModal(true);
    } else {
      executeMove('version');
    }
  };

  const applyAllConflicts = (strategy: 'overwrite' | 'version' | 'skip') => {
    const decisions: Record<number, 'overwrite' | 'version' | 'skip'> = {};
    pendingConflicts.forEach(c => { decisions[c.id] = strategy; });
    setConflictDecisions(decisions);
  };

  const createInlineFolder = async () => {
    if (!inlineFolderName.trim() || !moveTargetCategoryId) return;
    const nameToCreate = inlineFolderName.trim();
    try {
      const res = await categoryService.createFolder({
        name: nameToCreate,
        category_id: moveTargetCategoryId,
        parent_folder_id: moveTargetFolderId ? Number(moveTargetFolderId) : null,
        created_by: userIdNum,
      });
      const result = res.data as { folder?: { id: number } };
      const newFolder = result.folder ?? (result as { id: number });
      setInlineFolderName('');
      setShowInlineFolderCreate(false);
      // Refresh root tree and auto-select the new folder
      const roots = await loadFolderTree(moveTargetCategoryId, null);
      setFolderTree(roots);
      selectMoveDestination(String(newFolder.id), nameToCreate, moveTargetCategoryId);
      setSuccess(`✅ Folder "${nameToCreate}" created`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  // ============================================================
  // UNDO TOAST
  // ============================================================

  const showUndoToastMsg = (batchId: string, message: string) => {
    setUndoToast({ batchId, message, visible: true });
    setTimeout(() => setUndoToast(null), 8000);
  };

  const handleUndoMove = async (batchId: string) => {
    try {
      await categoryMoveService.undoBatch(batchId, userIdNum);
      setUndoToast(null);
      await fetchFilesAndFolders();
      setSuccess('↩️ Move undone successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Undo failed');
    }
  };

  // ============================================================
  // HISTORY
  // ============================================================

  const loadMoveHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await categoryMoveService.getMoveHistory(userIdNum);
      const data = res.data as { history?: MoveHistoryBatch[] };
      setMoveHistory(data.history || []);
    } catch {} finally { setHistoryLoading(false); }
  };

  // ============================================================
  // VERSION HISTORY
  // ============================================================

  const openVersionModal = async (file: FileItem) => {
    setVersionFile(file);
    setVersionsLoading(true);
    setShowVersionModal(true);
    try {
      const res = await categoryService.getFileVersions(file.id);
      const data = res.data as { versions?: FileVersion[] };
      setVersions(data.versions || []);
    } catch {} finally { setVersionsLoading(false); }
  };

  const handleRestoreVersion = async (fileId: number, versionId: number) => {
    if (!confirm('Restore this version? Current file will be saved as a new version.')) return;
    try {
      await categoryService.restoreFileVersion(fileId, versionId, userIdNum);
      setSuccess('✅ Version restored successfully');
      if (versionFile) await openVersionModal(versionFile);
      await fetchFilesAndFolders();
    } catch (err) { setError(err instanceof Error ? err.message : 'Restore failed'); }
  };

  const handleDeleteVersion = async (fileId: number, versionId: number) => {
    if (!confirm('Delete this version permanently?')) return;
    try {
      await categoryService.deleteFileVersion(fileId, versionId, userIdNum);
      setSuccess('🗑️ Version deleted');
      if (versionFile) await openVersionModal(versionFile);
    } catch (err) { setError(err instanceof Error ? err.message : 'Delete version failed'); }
  };

  // ============================================================
  // SHARE
  // ============================================================

  const addUser    = (user: ShareUser) => { setSelectedUsers(prev => [...prev, user]); setUserSearchQuery(''); setShowUserDropdown(false); };
  const removeUser = (userId: string | number) => setSelectedUsers(prev => prev.filter(u => u.id !== userId));

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && userSearchQuery === '' && selectedUsers.length > 0)
      removeUser(selectedUsers[selectedUsers.length - 1].id!);
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
      setShowShareModal(false); setSelectedUsers([]); setShareMessage(''); setSelectedFileForShares(null); setUserSearchQuery('');
      setSuccess(`📧 Outlook opened — email drafted for ${selectedUsers.length} recipient${selectedUsers.length > 1 ? 's' : ''}!`);
      return;
    }

    setIsSharing(true);
    try {
      await shareService.shareCategoryFile(
        selectedFileForShares.id,
        selectedUsers.map(u => Number(u.id)),
      );

      const names = selectedUsers.map(u => u.name).join(', ');
      setSuccess(`✅ "${selectedFileForShares.name}" shared successfully with: ${names}`);
      setShowShareModal(false); setSelectedUsers([]); setShareMessage(''); setSelectedFileForShares(null); setUserSearchQuery('');
    } catch (err) {
      setError('Failed to share file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setIsSharing(false); }
  };

  const loadFileShares = async (fileId: number) => {
    setLoadingShares(true);
    try {
      const res = await shareService.getCategoryFileShares(fileId);
      setCurrentFileShares(res.data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file shares');
    } finally { setLoadingShares(false); }
  };

  const handleRemoveShare = async (shareId: number) => {
    if (!confirm('Remove access for this user?')) return;
    try {
      await shareService.removeShare(shareId);
      setSuccess('✅ Access removed successfully!');
      if (selectedFileForShares) await loadFileShares(selectedFileForShares.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove access');
    }
  };

  const openManageSharesModal = (file: FileItem) => {
    setSelectedFileForShares(file); setShowManageSharesModal(true); loadFileShares(file.id);
  };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleCategoryClick = (category: Category) => {
    setCurrentCategoryId(category.id); setCurrentFolderId(null);
    setBreadcrumb([{ id: category.id, name: category.name, type: 'category' }]);
    setCurrentView('files-folders');
  };

  const handleFolderClick = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name, type: 'folder' }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const clicked = breadcrumb[index];
    setBreadcrumb(breadcrumb.slice(0, index + 1));
    if (clicked.type === 'category') setCurrentFolderId(null);
    else setCurrentFolderId(clicked.id);
  };

  const handleBackToCategories = () => {
    setCurrentView('categories'); setCurrentCategoryId(null); setCurrentFolderId(null); setBreadcrumb([]);
    exitSelectMode();
  };

  // ============================================================
  // MODAL
  // ============================================================

  const openModal = (mode: 'add' | 'edit' | 'delete', type: ItemType, item?: any) => {
    setModalMode(mode); setModalType(type); setSelectedItem(item || null);
    if (mode === 'add') {
      if (type === 'category') setCategoryForm({ name: '', description: '', color: '#007bff', icon: 'FolderOpen', is_active: true });
      else if (type === 'folder') setFolderForm({ name: '', description: '', category_id: currentCategoryId || 0, parent_folder_id: currentFolderId });
      else if (type === 'file') { setUploadFiles([]); setUploadProgress([]); setUploadMode('multiple'); }
    } else if (mode === 'edit' && item) {
      if (type === 'category') setCategoryForm({ name: item.name, description: item.description, color: item.color, icon: item.icon, is_active: item.is_active });
      else if (type === 'folder') setFolderForm({ name: item.name, description: item.description, category_id: item.category_id, parent_folder_id: item.parent_folder_id });
    }
    setShowModal(true); setModalError('');
  };

  const closeModal = () => { setShowModal(false); setSelectedItem(null); setModalError(''); setUploadFiles([]); setUploadProgress([]); setUploadDocumentStatus('none'); setUploadStampPlacement('every_page'); };

  const handleSubmit = async () => {
    setSubmitting(true); setModalError('');
    try {
      let response;
      if (modalType === 'category') {
        if (!categoryForm.name.trim()) { setModalError('Category name is required'); return; }
        const dup = categories.find(c => c.name.toLowerCase() === categoryForm.name.trim().toLowerCase() && (modalMode === 'add' || c.id !== selectedItem?.id));
        if (dup) { setModalError(`Category "${categoryForm.name.trim()}" already exists.`); return; }

        if (modalMode === 'add') {
          response = await categoryService.createCategory({ ...categoryForm, created_by: userIdNum });
        } else {
          response = await categoryService.updateCategory(selectedItem.id, { ...categoryForm, updated_by: userIdNum });
        }
      } else if (modalType === 'folder') {
        if (!folderForm.name.trim()) { setModalError('Folder name is required'); return; }
        const dup = folders.find(f =>
          f.name.toLowerCase() === folderForm.name.trim().toLowerCase() &&
          f.category_id === folderForm.category_id &&
          f.parent_folder_id === folderForm.parent_folder_id &&
          (modalMode === 'add' || f.id !== selectedItem?.id)
        );
        if (dup) { setModalError(`Folder "${folderForm.name.trim()}" already exists here.`); return; }

        if (modalMode === 'add') {
          response = await categoryService.createFolder({ ...folderForm, created_by: userIdNum });
        } else {
          response = await categoryService.updateFolder(selectedItem.id, { ...folderForm, updated_by: userIdNum });
        }
      }

      if (currentView === 'categories') await fetchCategories();
      else await fetchFilesAndFolders();
      refreshDashboard();

      if (modalType === 'category') {
        if (modalMode === 'add') setSuccess(`✅ Category "${categoryForm.name}" created successfully!`);
        else setSuccess(`✅ Category "${categoryForm.name}" updated successfully!`);
      } else {
        if (modalMode === 'add') setSuccess(`✅ Folder "${folderForm.name}" created successfully!`);
        else setSuccess(`✅ Folder "${folderForm.name}" updated successfully!`);
      }

      closeModal();
    } catch (err) {
      const msg = getAxiosErrorMessage(err, 'Operation failed');
      setModalError(msg);
      setError(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setSubmitting(true); setModalError('');
    const itemName = selectedItem.name;
    const label = modalType === 'category' ? 'Category' : modalType === 'folder' ? 'Folder' : 'File';
    try {
      if (!userIdNum) throw new Error('Invalid user ID. Please make sure you are logged in.');

      if (modalType === 'category') {
        await categoryService.deleteCategory(selectedItem.id, userIdNum);
      } else if (modalType === 'folder') {
        await categoryService.deleteFolder(selectedItem.id, userIdNum);
      } else if (modalType === 'file') {
        await categoryService.deleteFile(selectedItem.id, userIdNum);
      }

      setSuccess(`🗑️ ${label} "${itemName}" deleted successfully!`);
      closeModal();
      refreshDashboard();

      try {
        if (currentView === 'categories') await fetchCategories();
        else await fetchFilesAndFolders();
      } catch {
        // Delete succeeded even if list refresh failed
      }
    } catch (err) {
      const msg = getAxiosErrorMessage(err, 'Failed to delete');
      setModalError(msg);
      setError(msg);
    } finally { setSubmitting(false); }
  };

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const handleFileUpload = async () => {
    if (uploadFiles.length === 0) { setModalError('Please select files to upload'); return; }
    if (!currentCategoryId)       { setModalError('A category is required for file upload'); return; }
    if (!userIdNum)               { setModalError('Please log in to upload files'); return; }

    setSubmitting(true); setModalError('');
    setUploadProgress(uploadFiles.map(f => ({ fileName: f.name, progress: 0, status: 'uploading' })));

    try {
      const uploadMeta = {
        document_status: uploadDocumentStatus,
        stamp_placement: uploadStampPlacement,
      };

      let response;
      if (uploadMode === 'single') {
        try {
          response = await categoryService.uploadSingleFile(
            uploadFiles[0],
            currentCategoryId,
            currentFolderId,
            userIdNum,
            uploadMeta,
          );
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            setUploadConflict(err.response.data as UploadConflict);
            setShowUploadConflictModal(true);
            setSubmitting(false);
            return;
          }
          throw err;
        }
      } else if (uploadMode === 'bulk') {
        const formData = new FormData();
        uploadFiles.forEach(f => formData.append('files', f));
        formData.append('category_id', currentCategoryId.toString());
        formData.append('created_by', CURRENT_USER_ID);
        if (currentFolderId) formData.append('folder_id', currentFolderId.toString());
        formData.append('document_status', uploadDocumentStatus);
        formData.append('stamp_placement', uploadStampPlacement);
        response = await api.post('/intranet/categories/files/bulk-upload', formData);
      } else {
        response = await categoryService.uploadMultipleFiles(
          uploadFiles,
          currentCategoryId,
          currentFolderId,
          userIdNum,
          uploadMeta,
        );
      }

      setUploadProgress(prev => prev.map(i => ({ ...i, progress: 100, status: 'completed' })));
      await fetchFilesAndFolders();
      refreshDashboard();

      const count = uploadFiles.length;
      setSuccess(
        count === 1
          ? `✅ "${uploadFiles[0].name}" uploaded successfully!`
          : `✅ ${count} files uploaded successfully!`
      );

      setTimeout(() => closeModal(), 800);
    } catch (err) {
      const msg = getAxiosErrorMessage(err, 'Upload failed');
      setModalError(msg);
      setError(msg);
      setUploadProgress(prev => prev.map(i => ({ ...i, status: 'error', error: msg })));
    } finally { setSubmitting(false); }
  };

  const handleResolveUploadConflict = async (strategy: 'overwrite' | 'version' | 'skip') => {
    if (!uploadConflict) return;
    setSubmitting(true);
    try {
      const response = await categoryService.resolveUploadConflict({
        strategy,
        temp_path: uploadConflict.uploaded_file.temp_path,
        original_name: uploadConflict.uploaded_file.original_name,
        file_size: uploadConflict.uploaded_file.file_size,
        mime_type: uploadConflict.uploaded_file.mime_type,
        file_type: uploadConflict.uploaded_file.file_type,
        existing_file_id: uploadConflict.existing_file.id,
        category_id: uploadConflict.context.category_id,
        folder_id: uploadConflict.context.folder_id,
        created_by: uploadConflict.context.created_by,
        document_status: uploadDocumentStatus,
        stamp_placement: uploadStampPlacement,
      });
      const result = response.data as { file?: { name?: string; previous_version_saved?: number } };
      setShowUploadConflictModal(false);
      setUploadConflict(null);
      await fetchFilesAndFolders();
      closeModal();
      refreshDashboard();
      if (strategy === 'skip') setSuccess(`⏭️ Upload skipped — existing file kept.`);
      else if (strategy === 'overwrite') setSuccess(`✅ File overwritten. Previous version saved as v${result.file?.previous_version_saved}.`);
      else setSuccess(`✅ Saved as "${result.file?.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally { setSubmitting(false); }
  };

  // ============================================================
  // FILE OPS
  // ============================================================

  const handleDownloadFile = async (file: FileItem) => {
    if (!userIdNum) { setError('Please log in to download files'); return; }
    setSuccess(`⏳ Preparing download for "${file.name}"…`);
    try {
      const { isProtected } = await downloadCategoryFile(file.id, userIdNum, file.original_name);
      setSuccess(downloadSuccessMessage(file.name, isProtected));
    } catch (err) {
      setError(err instanceof Error ? err.message : await parseAxiosDownloadError(err));
    }
  };

  const handlePreviewFile = async (file: FileItem) => {
    setViewingFile(file);
    setShowFileViewer(true);
  };

  const handleStarFile = async (e: MouseEvent, file: FileItem) => {
    e.stopPropagation();
    try {
      const res = await categoryService.toggleStar(file.id, userIdNum);
      const result = res.data as { starred: boolean };

      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, is_starred: result.starred } : f));
      if (viewingFile?.id === file.id) setViewingFile({ ...viewingFile, is_starred: result.starred });

      setSuccess(result.starred
        ? `⭐ "${file.name}" added to Starred Files`
        : `"${file.name}" removed from Starred Files`
      );
      refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update star status');
    }
  };

  const handleViewFile = (file: FileItem) => { setViewingFile(file); setShowFileViewer(true); };
  const closeFileViewer = () => { setShowFileViewer(false); setViewingFile(null); };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const fileList = Array.from(e.target.files);
    const v = validateFiles(fileList);
    if (!v.valid) { setModalError(v.errors.join('\n')); if (e.target) e.target.value = ''; return; }
    setUploadFiles(fileList); setModalError('');
    setUploadMode(fileList.length === 1 ? 'single' : fileList.length <= 5 ? 'multiple' : 'bulk');
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const fileList = Array.from(e.dataTransfer.files);
    const v = validateFiles(fileList);
    if (!v.valid) { setModalError(v.errors.join('\n')); return; }
    setUploadFiles(fileList); setModalError('');
    setUploadMode(fileList.length === 1 ? 'single' : fileList.length <= 5 ? 'multiple' : 'bulk');
  };

  const removeFile = (i: number) => setUploadFiles(prev => prev.filter((_, idx) => idx !== i));

  const filteredData = () => {
    if (currentView === 'categories') {
      return categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return {
      folders: folders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
      files: files.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.original_name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    };
  };

  const filteredCategories = filteredData() as Category[];
  const filteredFilesFolders = currentView === 'files-folders'
    ? (filteredData() as { folders: Folder[]; files: FileItem[] })
    : { folders: [] as Folder[], files: [] as FileItem[] };

  const isEmpty = currentView === 'categories'
    ? filteredCategories.length === 0
    : filteredFilesFolders.folders.length === 0 && filteredFilesFolders.files.length === 0;

  const canDeleteSelected = selectedFiles.length > 0 && selectedFiles.every(id => {
    const f = files.find(x => x.id === id);
    return f && String(f.created_by) === String(CURRENT_USER_ID);
  });

  const handleDeleteSelected = () => {
    if (!confirm(`Delete ${selectedFiles.length} file(s)? This cannot be undone.`)) return;
    Promise.all(
      selectedFiles.map(id => categoryService.deleteFile(id, userIdNum)),
    ).then(() => {
      setSuccess(`🗑️ ${selectedFiles.length} file(s) deleted successfully`);
      exitSelectMode();
      fetchFilesAndFolders();
      refreshDashboard();
    }).catch(() => setError('Failed to delete some files'));
  };

  const handleDownloadSelected = async () => {
    for (const id of selectedFiles) {
      const f = files.find(x => x.id === id);
      if (f) await handleDownloadFile(f);
    }
    exitSelectMode();
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setSelectedUsers([]);
    setShareMessage('');
    setUserSearchQuery('');
    setSelectedFileForShares(null);
  };

  const closeManageSharesModal = () => {
    setShowManageSharesModal(false);
    setSelectedFileForShares(null);
    setCurrentFileShares([]);
  };

  return {
    authLoading,
    loading,
    success,
    error,
    setSuccess,
    setError,
    viewMode,
    setViewMode,
    currentView,
    searchQuery,
    setSearchQuery,
    categories,
    folders,
    files,
    breadcrumb,
    currentCategoryId,
    isSelectMode,
    selectedFiles,
    selectedFolders,
    showModal,
    modalMode,
    modalType,
    selectedItem,
    modalError,
    submitting,
    categoryForm,
    setCategoryForm,
    folderForm,
    setFolderForm,
    uploadFiles,
    uploadProgress,
    uploadMode,
    dragOver,
    uploadDocumentStatus,
    uploadStampPlacement,
    fileInputRef,
    showFileViewer,
    viewingFile,
    showShareModal,
    selectedFileForShares,
    showManageSharesModal,
    currentFileShares,
    loadingShares,
    userSearchQuery,
    setUserSearchQuery,
    filteredUsers,
    selectedUsers,
    showUserDropdown,
    shareMessage,
    setShareMessage,
    isSharing,
    renameMode,
    renameFileId,
    newFileName,
    setNewFileName,
    showUploadConflictModal,
    uploadConflict,
    showMoveModal,
    moveItems,
    moveTargetCategoryId,
    moveTargetFolderId,
    moveTargetFolderName,
    allCategories,
    folderTree,
    movePreviewConflicts,
    moveLoading,
    showInlineFolderCreate,
    inlineFolderName,
    setInlineFolderName,
    showConflictModal,
    pendingConflicts,
    conflictDecisions,
    undoToast,
    setUndoToast,
    showHistoryModal,
    moveHistory,
    historyLoading,
    expandedBatch,
    setExpandedBatch,
    showVersionModal,
    versionFile,
    versions,
    versionsLoading,
    CURRENT_USER_ID,
    PREVIEW_BASE_URL,
    filteredCategories,
    filteredFilesFolders,
    isEmpty,
    canDeleteSelected,
    handleBackToCategories,
    handleBreadcrumbClick,
    handleCategoryClick,
    handleFolderClick,
    openModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleFileUpload,
    handleResolveUploadConflict,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    handleDownloadFile,
    handlePreviewFile,
    handleStarFile,
    handleViewFile,
    closeFileViewer,
    openRenameModal,
    closeRenameModal,
    handleRenameFile,
    exitSelectMode,
    toggleFileSelection,
    toggleFolderSelection,
    selectAllVisible,
    isAllSelected,
    openMoveModalForSelected,
    openMoveModalForItem,
    handleMoveConfirm,
    executeMove,
    selectMoveDestination,
    createInlineFolder,
    applyAllConflicts,
    handleUndoMove,
    loadMoveHistory,
    openVersionModal,
    handleRestoreVersion,
    handleDeleteVersion,
    addUser,
    removeUser,
    handleSearchKeyDown,
    handleShare,
    handleRemoveShare,
    openManageSharesModal,
    closeShareModal,
    closeManageSharesModal,
    handleDeleteSelected,
    handleDownloadSelected,
    setShowHistoryModal,
    setShowMoveModal,
    setShowConflictModal,
    setConflictDecisions,
    setShowInlineFolderCreate,
    setMoveTargetCategoryId,
    setMoveTargetFolderId,
    setMoveTargetFolderName,
    setFolderTree,
    loadFolderTree,
    setShowShareModal,
    setSelectedFileForShares,
    setShowManageSharesModal,
    setShowUploadConflictModal,
    setUploadConflict,
    setUploadMode,
    setModalError,
    setShowVersionModal,
    setUploadDocumentStatus,
    setUploadStampPlacement,
    setIsSelectMode,
  };
}
