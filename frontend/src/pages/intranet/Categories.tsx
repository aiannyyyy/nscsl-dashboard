import { Loader } from 'lucide-react';

import AlertBanners from './components/categories/AlertBanners';
import CategoriesHeader from './components/categories/CategoriesHeader';
import CategoriesToolbar from './components/categories/CategoriesToolbar';
import CategoryGridView from './components/categories/CategoryGridView';
import CategoryListView from './components/categories/CategoryListView';
import ConflictModal from './components/categories/ConflictModal';
import EmptyState from './components/categories/EmptyState';
import FileViewerModal from './components/categories/FileViewerModal';
import FilesFoldersGridView from './components/categories/FilesFoldersGridView';
import FilesFoldersListView from './components/categories/FilesFoldersListView';
import ItemModal from './components/categories/ItemModal';
import ManageSharesModal from './components/categories/ManageSharesModal';
import MoveHistoryModal from './components/categories/MoveHistoryModal';
import MoveModal from './components/categories/MoveModal';
import RenameModal from './components/categories/RenameModal';
import SelectionBar from './components/categories/SelectionBar';
import ShareModal from './components/categories/ShareModal';
import StatsCards from './components/categories/StatsCards';
import UndoToast from './components/categories/UndoToast';
import UploadConflictModal from './components/categories/UploadConflictModal';
import VersionHistoryModal from './components/categories/VersionHistoryModal';
import { useCategoriesPage } from './components/categories/useCategoriesPage';

export function Categories() {
  const page = useCategoriesPage();

  if (page.authLoading || page.loading) {
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
        <CategoriesHeader
          currentView={page.currentView}
          breadcrumb={page.breadcrumb}
          onBackToCategories={page.handleBackToCategories}
          onBreadcrumbClick={page.handleBreadcrumbClick}
          onOpenHistory={() => { page.setShowHistoryModal(true); page.loadMoveHistory(); }}
        />

        <AlertBanners
          success={page.success}
          error={page.error}
          onDismissSuccess={() => page.setSuccess(null)}
          onDismissError={() => page.setError(null)}
        />

        <CategoriesToolbar
          currentView={page.currentView}
          searchQuery={page.searchQuery}
          viewMode={page.viewMode}
          isSelectMode={page.isSelectMode}
          onSearchChange={page.setSearchQuery}
          onViewModeChange={page.setViewMode}
          onAddCategory={() => page.openModal('add', 'category')}
          onAddFolder={() => page.openModal('add', 'folder')}
          onUploadFiles={() => page.openModal('add', 'file')}
          onEnterSelectMode={() => page.setIsSelectMode(true)}
        />

        <SelectionBar
          isSelectMode={page.isSelectMode}
          currentView={page.currentView}
          selectedFileCount={page.selectedFiles.length}
          selectedFolderCount={page.selectedFolders.length}
          isAllSelected={page.isAllSelected()}
          canDeleteSelected={page.canDeleteSelected}
          onSelectAll={page.selectAllVisible}
          onClearSelection={page.exitSelectMode}
          onMoveSelected={page.openMoveModalForSelected}
          onDownloadSelected={page.handleDownloadSelected}
          onDeleteSelected={page.handleDeleteSelected}
          onExitSelectMode={page.exitSelectMode}
        />

        <StatsCards
          currentView={page.currentView}
          categories={page.categories}
          folders={page.folders}
          files={page.files}
        />

        <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border overflow-hidden">
          {page.currentView === 'categories' ? (
            page.viewMode === 'grid' ? (
              <CategoryGridView
                categories={page.filteredCategories}
                onCategoryClick={page.handleCategoryClick}
                onEditCategory={c => page.openModal('edit', 'category', c)}
                onDeleteCategory={c => page.openModal('delete', 'category', c)}
              />
            ) : (
              <CategoryListView
                categories={page.filteredCategories}
                onCategoryClick={page.handleCategoryClick}
                onEditCategory={c => page.openModal('edit', 'category', c)}
                onDeleteCategory={c => page.openModal('delete', 'category', c)}
              />
            )
          ) : page.viewMode === 'grid' ? (
            <FilesFoldersGridView
              folders={page.filteredFilesFolders.folders}
              files={page.filteredFilesFolders.files}
              currentUserId={page.CURRENT_USER_ID}
              isSelectMode={page.isSelectMode}
              selectedFiles={page.selectedFiles}
              selectedFolders={page.selectedFolders}
              onFolderClick={page.handleFolderClick}
              onFileClick={page.handleViewFile}
              onToggleFolderSelection={page.toggleFolderSelection}
              onToggleFileSelection={page.toggleFileSelection}
              onEditFolder={f => page.openModal('edit', 'folder', f)}
              onDeleteFolder={f => page.openModal('delete', 'folder', f)}
              onMoveItem={page.openMoveModalForItem}
              onRenameFile={page.openRenameModal}
              onStarFile={page.handleStarFile}
              onShareFile={f => { page.setSelectedFileForShares(f); page.setShowShareModal(true); }}
              onDownloadFile={page.handleDownloadFile}
              onDeleteFile={f => page.openModal('delete', 'file', f)}
            />
          ) : (
            <FilesFoldersListView
              folders={page.filteredFilesFolders.folders}
              files={page.filteredFilesFolders.files}
              currentUserId={page.CURRENT_USER_ID}
              isSelectMode={page.isSelectMode}
              selectedFiles={page.selectedFiles}
              selectedFolders={page.selectedFolders}
              onFolderClick={page.handleFolderClick}
              onFileClick={page.handleViewFile}
              onToggleFolderSelection={page.toggleFolderSelection}
              onToggleFileSelection={page.toggleFileSelection}
              onEditFolder={f => page.openModal('edit', 'folder', f)}
              onDeleteFolder={f => page.openModal('delete', 'folder', f)}
              onMoveItem={page.openMoveModalForItem}
              onStarFile={page.handleStarFile}
              onShareFile={f => { page.setSelectedFileForShares(f); page.setShowShareModal(true); }}
              onDownloadFile={page.handleDownloadFile}
              onDeleteFile={f => page.openModal('delete', 'file', f)}
              onOpenVersionHistory={page.openVersionModal}
            />
          )}
        </div>

        {page.isEmpty && !page.loading && (
          <EmptyState
            currentView={page.currentView}
            searchQuery={page.searchQuery}
            onAddCategory={() => page.openModal('add', 'category')}
            onAddFolder={() => page.openModal('add', 'folder')}
            onUploadFiles={() => page.openModal('add', 'file')}
          />
        )}

        {page.showModal && (
          <ItemModal
            modalMode={page.modalMode}
            modalType={page.modalType}
            selectedItemName={page.selectedItem?.name}
            modalError={page.modalError}
            submitting={page.submitting}
            categoryForm={page.categoryForm}
            folderForm={page.folderForm}
            uploadFiles={page.uploadFiles}
            uploadProgress={page.uploadProgress}
            uploadMode={page.uploadMode}
            dragOver={page.dragOver}
            uploadDocumentStatus={page.uploadDocumentStatus}
            uploadStampPlacement={page.uploadStampPlacement}
            currentCategoryId={page.currentCategoryId}
            fileInputRef={page.fileInputRef}
            onClose={page.closeModal}
            onClearError={() => page.setModalError('')}
            onCategoryFormChange={page.setCategoryForm}
            onFolderFormChange={page.setFolderForm}
            onUploadModeChange={page.setUploadMode}
            onUploadDocumentStatusChange={page.setUploadDocumentStatus}
            onUploadStampPlacementChange={page.setUploadStampPlacement}
            onFileInputChange={page.handleFileInputChange}
            onDragOver={page.handleDragOver}
            onDragLeave={page.handleDragLeave}
            onDrop={page.handleDrop}
            onRemoveFile={page.removeFile}
            onSubmit={page.handleSubmit}
            onDelete={page.handleDelete}
            onFileUpload={page.handleFileUpload}
          />
        )}

        {page.showShareModal && page.selectedFileForShares && (
          <ShareModal
            file={page.selectedFileForShares}
            selectedUsers={page.selectedUsers}
            userSearchQuery={page.userSearchQuery}
            filteredUsers={page.filteredUsers}
            showUserDropdown={page.showUserDropdown}
            shareMessage={page.shareMessage}
            isSharing={page.isSharing}
            onClose={page.closeShareModal}
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
            onClose={page.closeManageSharesModal}
            onRemoveShare={page.handleRemoveShare}
            onShareWithMore={() => { page.setShowManageSharesModal(false); page.setShowShareModal(true); }}
          />
        )}

        {page.showFileViewer && page.viewingFile && (
          <FileViewerModal
            file={page.viewingFile}
            currentUserId={page.CURRENT_USER_ID}
            previewBaseUrl={page.PREVIEW_BASE_URL}
            onClose={page.closeFileViewer}
            onStarFile={page.handleStarFile}
            onShareFile={f => { page.setSelectedFileForShares(f); page.setShowShareModal(true); }}
            onDownloadFile={page.handleDownloadFile}
            onDeleteFile={f => page.openModal('delete', 'file', f)}
          />
        )}

        {page.showUploadConflictModal && page.uploadConflict && (
          <UploadConflictModal
            conflict={page.uploadConflict}
            submitting={page.submitting}
            onClose={() => { page.setShowUploadConflictModal(false); page.setUploadConflict(null); }}
            onResolve={page.handleResolveUploadConflict}
          />
        )}

        {page.renameMode && (
          <RenameModal
            fileName={page.newFileName}
            modalError={page.modalError}
            submitting={page.submitting}
            onFileNameChange={page.setNewFileName}
            onClose={page.closeRenameModal}
            onRename={() => {
              const f = page.files.find(x => x.id === page.renameFileId);
              if (f) page.handleRenameFile(f);
            }}
            onEnterKey={() => {
              const f = page.files.find(x => x.id === page.renameFileId);
              if (f) page.handleRenameFile(f);
            }}
          />
        )}

        {page.showMoveModal && (
          <MoveModal
            moveItems={page.moveItems}
            moveTargetCategoryId={page.moveTargetCategoryId}
            moveTargetFolderId={page.moveTargetFolderId}
            moveTargetFolderName={page.moveTargetFolderName}
            allCategories={page.allCategories}
            folderTree={page.folderTree}
            movePreviewConflicts={page.movePreviewConflicts}
            moveLoading={page.moveLoading}
            showInlineFolderCreate={page.showInlineFolderCreate}
            inlineFolderName={page.inlineFolderName}
            onClose={() => page.setShowMoveModal(false)}
            onCategoryChange={async id => {
              page.setMoveTargetCategoryId(id);
              page.setMoveTargetFolderId(null);
              page.setMoveTargetFolderName('Home (root)');
              const roots = await page.loadFolderTree(id, null);
              page.setFolderTree(roots);
            }}
            onSelectDestination={page.selectMoveDestination}
            onToggleInlineFolderCreate={() => page.setShowInlineFolderCreate(v => !v)}
            onInlineFolderNameChange={page.setInlineFolderName}
            onCreateInlineFolder={page.createInlineFolder}
            onCancelInlineFolderCreate={() => { page.setShowInlineFolderCreate(false); page.setInlineFolderName(''); }}
            onConfirmMove={page.handleMoveConfirm}
          />
        )}

        {page.showConflictModal && (
          <ConflictModal
            pendingConflicts={page.pendingConflicts}
            conflictDecisions={page.conflictDecisions}
            moveLoading={page.moveLoading}
            onClose={() => page.setShowConflictModal(false)}
            onBack={() => { page.setShowConflictModal(false); page.setShowMoveModal(true); }}
            onApplyAll={page.applyAllConflicts}
            onSetDecision={(conflictId, strategy) =>
              page.setConflictDecisions(prev => ({ ...prev, [conflictId]: strategy }))
            }
            onConfirmMove={() => page.executeMove('version')}
          />
        )}

        {page.showHistoryModal && (
          <MoveHistoryModal
            history={page.moveHistory}
            loading={page.historyLoading}
            expandedBatch={page.expandedBatch}
            onClose={() => page.setShowHistoryModal(false)}
            onToggleBatch={batchId => page.setExpandedBatch(page.expandedBatch === batchId ? null : batchId)}
            onUndo={page.handleUndoMove}
          />
        )}

        {page.showVersionModal && page.versionFile && (
          <VersionHistoryModal
            file={page.versionFile}
            versions={page.versions}
            loading={page.versionsLoading}
            onClose={() => page.setShowVersionModal(false)}
            onRestoreVersion={page.handleRestoreVersion}
            onDeleteVersion={page.handleDeleteVersion}
          />
        )}

        <UndoToast
          toast={page.undoToast}
          onUndo={page.handleUndoMove}
          onDismiss={() => page.setUndoToast(null)}
        />
      </div>
    </div>
  );
}
