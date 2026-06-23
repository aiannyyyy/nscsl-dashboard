import { useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';

export const FilePermissions = {
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  SHARE: 'share',
  RENAME: 'rename',
  DELETE: 'delete',
} as const;

export type FilePermission = (typeof FilePermissions)[keyof typeof FilePermissions];

const PERMISSION_ACTION_MAP: Record<FilePermission, 'read' | 'create' | 'update' | 'delete'> = {
  [FilePermissions.UPLOAD]: 'create',
  [FilePermissions.DOWNLOAD]: 'read',
  [FilePermissions.SHARE]: 'create',
  [FilePermissions.RENAME]: 'update',
  [FilePermissions.DELETE]: 'delete',
};

export function useFilePermissions() {
  const { hasPermission: authHasPermission, isAdmin, isSuperUser } = useAuth();

  const hasPermission = useCallback(
    (permission: FilePermission): boolean => {
      if (isAdmin() || isSuperUser()) return true;
      return authHasPermission(PERMISSION_ACTION_MAP[permission]);
    },
    [authHasPermission, isAdmin, isSuperUser],
  );

  return { hasPermission, FilePermissions };
}

export default useFilePermissions;
