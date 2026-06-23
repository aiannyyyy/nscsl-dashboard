import { useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';

export const CategoryPermissions = {
  ADD: 'add',
  EDIT: 'edit',
  DELETE: 'delete',
  CREATE_FOLDER: 'create_folder',
  EDIT_FOLDER: 'edit_folder',
  DELETE_FOLDER: 'delete_folder',
  UPLOAD_FILES: 'upload_files',
  DOWNLOAD_FILES: 'download_files',
  SHARE_FILES: 'share_files',
  DELETE_FILE: 'delete_file',
} as const;

export type CategoryPermission = (typeof CategoryPermissions)[keyof typeof CategoryPermissions];

const PERMISSION_ACTION_MAP: Record<CategoryPermission, 'read' | 'create' | 'update' | 'delete'> = {
  [CategoryPermissions.ADD]: 'create',
  [CategoryPermissions.EDIT]: 'update',
  [CategoryPermissions.DELETE]: 'delete',
  [CategoryPermissions.CREATE_FOLDER]: 'create',
  [CategoryPermissions.EDIT_FOLDER]: 'update',
  [CategoryPermissions.DELETE_FOLDER]: 'delete',
  [CategoryPermissions.UPLOAD_FILES]: 'create',
  [CategoryPermissions.DOWNLOAD_FILES]: 'read',
  [CategoryPermissions.SHARE_FILES]: 'create',
  [CategoryPermissions.DELETE_FILE]: 'delete',
};

export function useCategoryPermissions() {
  const { hasPermission: authHasPermission, isAdmin, isSuperUser } = useAuth();

  const hasPermission = useCallback(
    (permission: CategoryPermission): boolean => {
      if (isAdmin() || isSuperUser()) return true;
      return authHasPermission(PERMISSION_ACTION_MAP[permission]);
    },
    [authHasPermission, isAdmin, isSuperUser],
  );

  return { hasPermission, CategoryPermissions };
}

export default useCategoryPermissions;
