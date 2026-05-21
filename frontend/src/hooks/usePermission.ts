// src/hooks/usePermissions.ts
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { Department } from '../context/AuthContext';

interface PermissionConfig {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canView: boolean;
  isReadOnly: boolean;
}

export const usePermissions = (
  targetDepartment: Department | Department[]
): PermissionConfig => {
  const { user } = useAuth();

  // Serialize to a stable string — prevents re-runs when caller passes
  // a new inline array literal on every render (e.g. ['program', 'administrator'])
  const deptKey = useMemo(() => {
    return Array.isArray(targetDepartment)
      ? [...targetDepartment].sort().join(',')
      : targetDepartment.toLowerCase();
  }, [targetDepartment]);

  const permissions = useMemo(() => {
    if (!user) {
      return {
        canCreate:  false,
        canEdit:    false,
        canDelete:  false,
        canExport:  false,
        canView:    true,
        isReadOnly: true,
      };
    }

    const userDept           = user.department?.toLowerCase() ?? '';
    const allowedDepartments = deptKey.split(',');
    const isAllowedDepartment = allowedDepartments.includes(userDept);

    if (isAllowedDepartment) {
      return {
        canCreate:  true,
        canEdit:    true,
        canDelete:  true,
        canExport:  true,
        canView:    true,
        isReadOnly: false,
      };
    }

    return {
      canCreate:  false,
      canEdit:    false,
      canDelete:  false,
      canExport:  false,
      canView:    true,
      isReadOnly: true,
    };
  }, [user, deptKey]);

  return permissions;
};