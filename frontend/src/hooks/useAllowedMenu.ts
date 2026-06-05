import { useMemo } from 'react';
import { MENU_CONFIG } from '../config/menuConfig';
import { useUserAccess } from './AdminHooks/useAccess';

export const useAllowedMenu = (userId: string | null | undefined) => {
  const numericId = userId ? Number(userId) : null;
  const { data: access, isLoading, isError } = useUserAccess(numericId);

  const menu = useMemo(() => {
    // No access data yet — return empty (sidebar shows skeleton)
    if (!access) return [];

    // If access object is empty {}, it means no record saved yet —
    // fall back to full menu so the sidebar isn't blank
    if (Object.keys(access).length === 0) return [...MENU_CONFIG];

    return MENU_CONFIG
      .map((module) => {
        const moduleAccess = access[module.key];

        // Module not in access record, or explicitly disabled
        if (!moduleAccess || !moduleAccess.enabled) return null;

        const allowedSubItems = module.subItems.filter(
          (sub) => moduleAccess.subItems[sub.key] === true
        );

        // No allowed sub-items → hide the whole module
        if (allowedSubItems.length === 0) return null;

        return { ...module, subItems: allowedSubItems };
      })
      .filter(Boolean) as typeof MENU_CONFIG;
  }, [access]);

  return { menu, isLoading, isError };
};