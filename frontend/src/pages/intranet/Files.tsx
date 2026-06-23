import { Loader } from 'lucide-react';

import AlertBanners from './components/files/AlertBanners';
import ConflictModal from './components/files/ConflictModal';
import CreateFolderModal from './components/files/CreateFolderModal';
import EmptyState from './components/files/EmptyState';
import FilesGridView from './components/files/FilesGridView';
import FilesHeader from './components/files/FilesHeader';
import FilesListView from './components/files/FilesListView';
import FilesToolbar from './components/files/FilesToolbar';
import MainPageNotice from './components/files/MainPageNotice';
import ManageSharesModal from './components/files/ManageSharesModal';
import MoveHistoryModal from './components/files/MoveHistoryModal';
import MoveModal from './components/files/MoveModal';
import PreviewModal from './components/files/PreviewModal';
import RenameModal from './components/files/RenameModal';
import SelectionBar from './components/files/SelectionBar';
import ShareModal from './components/files/ShareModal';
import UndoToast from './components/files/UndoToast';
import UploadConflictModal from './components/files/UploadConflictModal';
import UploadModal from './components/files/UploadModal';
import { useFilesPage } from './components/files/useFilesPage';

export function Files() {
  const page = useFilesPage();

  if (page.authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <FilesHeader
          folderPath={page.folderPath}
          onOpenHistory={page.openHistoryModal}
          onRefresh={page.refresh}
          onBreadcrumbClick={page.handleBreadcrumbClick}
        />

        <AlertBanners
          success={page.success}
          error={page.error}
          onDismissSuccess={() => page.setSuccess(null)}
          onDismissError={() => page.setError(null)}
        />

        <FilesToolbar
          searchQuery={page.searchQuery}
          viewMode={page.viewMode}
          showFilters={page.showFilters}
          filterType={page.filterType}
          filterTime={page.filterTime}
          filterSize={page.filterSize}
          isMainPage={page.isMainPage}
          isSelectMode={page.isSelectMode}
          onSearchChange={page.setSearchQuery}
          onToggleFilters={() => page.setShowFilters(!page.showFilters)}
          onViewModeChange={page.setViewMode}
          onFilterTypeChange={page.setFilterType}
          onFilterTimeChange={page.setFilterTime}
          onFilterSizeChange={page.setFilterSize}
          onOpenUpload={() => page.setShowUploadModal(true)}
          onToggleSelectMode={() => (page.isSelectMode ? page.exitSelectMode() : page.setIsSelectMode(true))}
          onOpenCreateFolder={() => page.setShowFolderModal(true)}
        />

        <SelectionBar
          isSelectMode={page.isSelectMode}
          selectedCount={page.selectedFiles.length}
          totalCount={page.filteredAndSortedFiles.length}
          isAllSelected={page.selectedFiles.length === page.filteredAndSortedFiles.length && page.filteredAndSortedFiles.length > 0}
          onSelectAll={() => page.setSelectedFiles(page.filteredAndSortedFiles.map(f => f.id))}
          onClearSelection={() => page.setSelectedFiles([])}
          onMoveSelected={page.openMoveModalForSelected}
          onBulkDownload={page.handleBulkDownload}
          onBulkDelete={page.handleBulkDelete}
          onExitSelectMode={page.exitSelectMode}
        />

        <MainPageNotice visible={page.isMainPage} />

        {page.loading ? (
          <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border p-12 text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading files…</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border overflow-hidden">
            {page.viewMode === 'list' ? (
              <FilesListView {...page.listViewProps} />
            ) : (
              <FilesGridView {...page.listViewProps} />
            )}
          </div>
        )}

        {!page.loading && page.filteredAndSortedFiles.length === 0 && (
          <EmptyState
            searchQuery={page.searchQuery}
            isMainPage={page.isMainPage}
            onCreateFolder={() => page.setShowFolderModal(true)}
            onUpload={() => page.setShowUploadModal(true)}
          />
        )}

        {page.showShareModal && (
          <ShareModal
            selectedUsers={page.selectedUsers}
            userSearchQuery={page.userSearchQuery}
            filteredUsers={page.filteredUsers}
            showUserDropdown={page.showUserDropdown}
            shareMessage={page.shareMessage}
            isSharing={page.isSharing}
            onClose={page.resetShareModal}
            onUserSearchChange={page.setUserSearchQuery}
            onSearchKeyDown={page.handleSearchKeyDown}
            onAddUser={page.addUser}
            onRemoveUser={page.removeUser}
            onShareMessageChange={page.setShareMessage}
            onShare={page.handleShare}
          />
        )}

        {page.showManageSharesModal && page.selectedFileForShares && (
          <ManageSharesModal
            file={page.selectedFileForShares}
            shares={page.currentFileShares}
            loading={page.loadingShares}
            onClose={() => {
              page.setShowManageSharesModal(false);
              page.setSelectedFileForShares(null);
              page.setCurrentFileShares([]);
            }}
            onRemoveShare={page.handleRemoveShare}
          />
        )}

        {page.showUploadModal && !page.isMainPage && (
          <UploadModal
            uploadFiles={page.uploadFiles}
            isUploading={page.isUploading}
            uploadDocumentStatus={page.uploadDocumentStatus}
            uploadStampPlacement={page.uploadStampPlacement}
            onClose={page.resetUploadModal}
            onFileSelect={page.handleFileSelect}
            onDocumentStatusChange={page.setUploadDocumentStatus}
            onStampPlacementChange={page.setUploadStampPlacement}
            onUpload={page.handleUpload}
          />
        )}

        {page.showFolderModal && (
          <CreateFolderModal
            folderName={page.newFolderName}
            isCreating={page.isCreatingFolder}
            onClose={() => {
              page.setShowFolderModal(false);
              page.setNewFolderName('');
            }}
            onNameChange={page.setNewFolderName}
            onCreate={page.handleCreateFolder}
          />
        )}

        {page.showRenameModal && page.itemToRename && (
          <RenameModal
            item={page.itemToRename}
            newName={page.newName}
            isRenaming={page.isRenaming}
            onClose={() => {
              page.setShowRenameModal(false);
              page.setItemToRename(null);
              page.setNewName('');
            }}
            onNameChange={page.setNewName}
            onRename={page.handleRename}
          />
        )}

        {page.showPreviewModal && page.previewFile && (
          <PreviewModal
            file={page.previewFile}
            previewLoading={page.previewLoading}
            previewBaseUrl={page.PREVIEW_BASE_URL}
            currentUserId={page.CURRENT_USER_ID}
            onClose={() => {
              page.setShowPreviewModal(false);
              page.setPreviewFile(null);
              page.setPreviewLoading(false);
            }}
            onPreviewLoad={() => page.setPreviewLoading(false)}
            onToggleStar={page.handleToggleStar}
            onShare={file => {
              page.setSelectedFileForShares(file);
              page.setShowShareModal(true);
            }}
            onDownload={page.handleDownload}
            onDelete={page.handleDelete}
          />
        )}

        {page.showUploadConflictModal && page.uploadConflict && (
          <UploadConflictModal
            conflict={page.uploadConflict}
            isUploading={page.isUploading}
            onClose={() => {
              page.setShowUploadConflictModal(false);
              page.setUploadConflict(null);
            }}
            onResolve={page.handleResolveUploadConflict}
          />
        )}

        {page.showMoveModal && (
          <MoveModal
            moveItems={page.moveItems}
            moveTargetFolderId={page.moveTargetFolderId}
            moveTargetFolderName={page.moveTargetFolderName}
            movePreview={page.movePreview}
            movePreviewLoading={page.movePreviewLoading}
            isMoving={page.isMoving}
            folderTree={page.folderTree}
            folderTreeLoading={page.folderTreeLoading}
            showInlineFolderCreate={page.showInlineFolderCreate}
            inlineFolderName={page.inlineFolderName}
            isCreatingInlineFolder={page.isCreatingInlineFolder}
            onClose={page.closeMoveModal}
            onSelectDestination={page.selectDestination}
            onToggleFolderInTree={page.toggleFolderInTree}
            onToggleInlineFolderCreate={() => {
              page.setShowInlineFolderCreate(v => !v);
              page.setInlineFolderName('');
            }}
            onInlineFolderNameChange={page.setInlineFolderName}
            onCreateInlineFolder={page.handleCreateInlineFolder}
            onCancelInlineFolderCreate={() => {
              page.setShowInlineFolderCreate(false);
              page.setInlineFolderName('');
            }}
            onExecuteMove={() => page.executeMove('ask')}
          />
        )}

        {page.showConflictModal && (
          <ConflictModal
            pendingConflicts={page.pendingConflicts}
            conflictDecisions={page.conflictDecisions}
            onClose={page.closeConflictModal}
            onApplyAll={page.applyAllConflicts}
            onApplyDecision={page.applyConflictDecision}
            onConfirm={page.confirmConflicts}
          />
        )}

        <UndoToast
          toast={page.undoToast}
          onUndo={page.handleUndoMove}
          onDismiss={() => page.setUndoToast(null)}
        />

        {page.showHistoryModal && (
          <MoveHistoryModal
            history={page.moveHistory}
            loading={page.historyLoading}
            expandedBatch={page.expandedBatch}
            onClose={() => page.setShowHistoryModal(false)}
            onToggleBatch={batchId => page.setExpandedBatch(prev => (prev === batchId ? null : batchId))}
            onUndo={page.handleUndoMove}
          />
        )}
      </div>
    </div>
  );
}
