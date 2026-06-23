import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useFileStats, useActivityLogs, useStarredFiles } from '../../hooks/IntranetHooks/useFiles';
import { useSharedWithMe } from '../../hooks/IntranetHooks/useShare';
import { useCategoryStarredFiles } from '../../hooks/IntranetHooks/useCategories';
import fileService from '../../services/IntranetServices/fileService';
import categoryService from '../../services/IntranetServices/categoryService';
import { downloadFromApiUrl, downloadSuccessMessage } from '../../services/IntranetServices/downloadHelper';

import DashboardHeader from './components/dashboard/DashboardHeader';
import StatsGrid from './components/dashboard/StatsGrid';
import StarredFiles from './components/dashboard/StarredFiles';
import SharedWithMe from './components/dashboard/SharedWithMe';
import QuickActions from './components/dashboard/QuickActions';
import RecentActivity from './components/dashboard/RecentActivity';
import AnalyticsInsights from './components/dashboard/AnalyticsInsights';
import FilePreviewModal from './components/dashboard/FilePreviewModal';
import AllSharedFilesModal from './components/dashboard/AllSharedFilesModal';
import type { DashboardStats, ActivityLog, SharedFile, StarredFile } from './components/dashboard/types';

export function Overview() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user ? Number(user.id) : 0;

  const statsQuery = useFileStats();
  const activityQuery = useActivityLogs({ limit: 10, offset: 0 });
  const sharedQuery = useSharedWithMe();
  const regularStarredQuery = useStarredFiles(userId);
  const categoryStarredQuery = useCategoryStarredFiles(userId);

  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size'>('recent');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'doc' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSharedModal, setShowAllSharedModal] = useState(false);
  const [previewSharedFile, setPreviewSharedFile] = useState<SharedFile | null>(null);
  const [sharedPreviewLoading, setSharedPreviewLoading] = useState(false);
  const [previewStarredFile, setPreviewStarredFile] = useState<StarredFile | null>(null);
  const [starredPreviewLoading, setStarredPreviewLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      sharedQuery.refetch();
      statsQuery.refetch();
      activityQuery.refetch();
      if (userId > 0) {
        regularStarredQuery.refetch();
        categoryStarredQuery.refetch();
      }
    }, 60_000);
    const handleFocus = () => {
      sharedQuery.refetch();
      statsQuery.refetch();
      activityQuery.refetch();
      if (userId > 0) {
        regularStarredQuery.refetch();
        categoryStarredQuery.refetch();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sharedQuery, statsQuery, activityQuery, regularStarredQuery, categoryStarredQuery, userId]);

  useEffect(() => {
    if (!sharedPreviewLoading || !previewSharedFile) return;
    const t = setTimeout(() => setSharedPreviewLoading(false), 8000);
    return () => clearTimeout(t);
  }, [sharedPreviewLoading, previewSharedFile]);

  useEffect(() => {
    if (!starredPreviewLoading || !previewStarredFile) return;
    const t = setTimeout(() => setStarredPreviewLoading(false), 8000);
    return () => clearTimeout(t);
  }, [starredPreviewLoading, previewStarredFile]);

  const stats = (statsQuery.data as DashboardStats | undefined) ?? null;
  const recentActivities = (activityQuery.data as { logs?: ActivityLog[] } | undefined)?.logs ?? [];
  const sharedFiles: SharedFile[] = (sharedQuery.data as { data?: SharedFile[] } | undefined)?.data ?? [];

  const starredFiles = useMemo(() => {
    const catData = categoryStarredQuery.data as { starredFiles?: Record<string, unknown>[] } | undefined;
    const regData = regularStarredQuery.data as { starredFiles?: Record<string, unknown>[] } | undefined;

    let combined: StarredFile[] = [];

    if (catData?.starredFiles) {
      combined = [
        ...combined,
        ...catData.starredFiles.map((f) => ({
          ...(f as unknown as StarredFile),
          starred_at: (f.starred_at as string) || (f.created_at as string),
          source_type: 'category' as const,
        })),
      ];
    }

    if (regData?.starredFiles) {
      combined = [
        ...combined,
        ...regData.starredFiles.map((f) => ({
          ...(f as unknown as StarredFile),
          starred_at: (f.starred_at as string) || (f.created_at as string),
          id: f.id as number,
          file_id: f.file_id as number | undefined,
          name: (f.name || f.file_name || f.original_name) as string,
          original_name: (f.original_name || f.file_name || f.name) as string,
          file_size: (f.file_size || f.size || 0) as number,
          file_type: (f.file_type || f.type || '') as string,
          category_name: (f.category_name || f.folder_name || 'My Files') as string,
          folder_name: (f.folder_name as string | undefined) || undefined,
          created_by_name: (f.created_by_name || f.owner_name || 'Unknown') as string,
          source_type: 'regular' as const,
        })),
      ];
    }

    return combined.sort(
      (a, b) =>
        new Date(b.starred_at || b.created_at).getTime() -
        new Date(a.starred_at || a.created_at).getTime()
    );
  }, [categoryStarredQuery.data, regularStarredQuery.data]);

  const loading =
    authLoading ||
    (statsQuery.isLoading && !statsQuery.data) ||
    (activityQuery.isLoading && !activityQuery.data) ||
    (sharedQuery.isLoading && !sharedQuery.data) ||
    (userId > 0 && regularStarredQuery.isLoading && !regularStarredQuery.data) ||
    (userId > 0 && categoryStarredQuery.isLoading && !categoryStarredQuery.data);

  const activityLoading = activityQuery.isFetching;
  const sharedLoading = sharedQuery.isFetching;
  const starredLoading = regularStarredQuery.isFetching || categoryStarredQuery.isFetching;

  const error =
    (statsQuery.error as Error | null)?.message ||
    (activityQuery.error as Error | null)?.message ||
    (sharedQuery.error as Error | null)?.message ||
    null;

  const getProcessedSharedFiles = (): SharedFile[] => {
    let result = [...sharedFiles];
    if (searchQuery.trim()) {
      result = result.filter(
        (f) =>
          (f.file_name || f.original_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterType !== 'all') {
      const map = { pdf: ['pdf'], doc: ['doc', 'docx', 'txt'], image: ['jpg', 'jpeg', 'png', 'gif', 'webp'] };
      result = result.filter((f) => map[filterType].includes(f.file_type));
    }
    result.sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime();
      if (sortBy === 'name') return (a.file_name || '').localeCompare(b.file_name || '');
      if (sortBy === 'size') return b.file_size - a.file_size;
      return 0;
    });
    return result;
  };

  const getSharedPreviewUrl = (file: SharedFile) =>
    file.source_type === 'category'
      ? categoryService.getPreviewUrl(file.id, userId)
      : fileService.getPreviewUrl(file.id);

  const getSharedDownloadUrl = (file: SharedFile) =>
    file.source_type === 'category'
      ? categoryService.getDownloadUrl(file.id, userId)
      : fileService.getDownloadUrl(file.id, userId);

  const handleDownloadSharedFile = async (file: SharedFile) => {
    const fileName = file.file_name || file.original_name || 'download';
    try {
      const { isProtected } = await downloadFromApiUrl(getSharedDownloadUrl(file), fileName);
      alert(downloadSuccessMessage(fileName, isProtected));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download file. You may not have access.');
    }
  };

  const getStarredFileId = (file: StarredFile) =>
    file.source_type === 'regular' ? (file.file_id || file.id) : file.id;

  const getStarredPreviewUrl = (file: StarredFile) =>
    file.source_type === 'category'
      ? categoryService.getPreviewUrl(getStarredFileId(file), userId)
      : fileService.getPreviewUrl(getStarredFileId(file));

  const getStarredDownloadUrl = (file: StarredFile) =>
    file.source_type === 'category'
      ? categoryService.getDownloadUrl(getStarredFileId(file), userId)
      : fileService.getDownloadUrl(getStarredFileId(file), userId);

  const handleDownloadStarredFile = async (file: StarredFile) => {
    const fileName = file.name || file.original_name || 'download';
    try {
      const { isProtected } = await downloadFromApiUrl(getStarredDownloadUrl(file), fileName);
      alert(downloadSuccessMessage(fileName, isProtected));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download file.');
    }
  };

  const handleQuickAction = (action: string) => {
    if (['upload', 'folder', 'share'].includes(action)) {
      navigate('/dashboard/intranet-file-management/files');
    }
    if (action === 'reports') console.log('Reports feature coming soon');
  };

  const loadActivityLogs = () => { activityQuery.refetch(); };
  const loadSharedFiles = () => { sharedQuery.refetch(); };
  const loadStarredFiles = () => {
    regularStarredQuery.refetch();
    categoryStarredQuery.refetch();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2 dark:text-white">Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold mb-2 dark:text-white">Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400">Please log in to view the dashboard.</p>
      </div>
    );
  }

  const processedSharedFiles = getProcessedSharedFiles();

  return (
    <div className="space-y-6">
      <DashboardHeader userName={user.name} error={error} />

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StarredFiles
          files={starredFiles}
          loading={starredLoading}
          onRefresh={loadStarredFiles}
          onPreview={(file) => { setPreviewStarredFile(file); setStarredPreviewLoading(true); }}
          onDownload={handleDownloadStarredFile}
        />

        <SharedWithMe
          files={sharedFiles}
          processedFiles={processedSharedFiles}
          loading={sharedLoading}
          searchQuery={searchQuery}
          sortBy={sortBy}
          filterType={filterType}
          onRefresh={loadSharedFiles}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          onFilterChange={setFilterType}
          onPreview={(file) => { setPreviewSharedFile(file); setSharedPreviewLoading(true); }}
          onDownload={handleDownloadSharedFile}
          onViewAll={() => setShowAllSharedModal(true)}
        />

        <QuickActions onAction={handleQuickAction} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RecentActivity
          activities={recentActivities}
          loading={activityLoading}
          onRefresh={loadActivityLogs}
          onViewAll={() => navigate('/dashboard/intranet-file-management/files')}
        />

        <AnalyticsInsights
          activities={recentActivities}
          stats={stats}
          onViewDetails={() => handleQuickAction('reports')}
        />
      </div>

      {previewStarredFile && (
        <FilePreviewModal
          variant="starred"
          fileName={previewStarredFile.name || previewStarredFile.original_name}
          fileType={previewStarredFile.file_type}
          fileSize={previewStarredFile.file_size}
          previewUrl={getStarredPreviewUrl(previewStarredFile)}
          metaLabel="Category"
          metaValue={previewStarredFile.category_name || 'Uncategorized'}
          metaDate={previewStarredFile.starred_at || previewStarredFile.created_at}
          subtitle={`By ${previewStarredFile.created_by_name || 'Unknown'}`}
          loading={starredPreviewLoading}
          onClose={() => { setPreviewStarredFile(null); setStarredPreviewLoading(false); }}
          onDownload={() => handleDownloadStarredFile(previewStarredFile)}
          onLoadEnd={() => setStarredPreviewLoading(false)}
        />
      )}

      {previewSharedFile && (
        <FilePreviewModal
          variant="shared"
          fileName={previewSharedFile.file_name || previewSharedFile.original_name || ''}
          fileType={previewSharedFile.file_type}
          fileSize={previewSharedFile.file_size}
          previewUrl={getSharedPreviewUrl(previewSharedFile)}
          metaLabel="Owner"
          metaValue={previewSharedFile.owner_name}
          metaDate={previewSharedFile.shared_at}
          loading={sharedPreviewLoading}
          onClose={() => { setPreviewSharedFile(null); setSharedPreviewLoading(false); }}
          onDownload={() => handleDownloadSharedFile(previewSharedFile)}
          onLoadEnd={() => setSharedPreviewLoading(false)}
        />
      )}

      {showAllSharedModal && (
        <AllSharedFilesModal
          files={processedSharedFiles}
          totalCount={sharedFiles.length}
          onClose={() => setShowAllSharedModal(false)}
          onPreview={(file) => { setPreviewSharedFile(file); setSharedPreviewLoading(true); }}
          onDownload={handleDownloadSharedFile}
        />
      )}
    </div>
  );
}
