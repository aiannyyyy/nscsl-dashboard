import { useMemo } from 'react';
import { MENU_CONFIG } from '../config/menuConfig';
import { useUserAccess } from './AdminHooks/useAccess';
import { useAuth } from '../context/AuthContext';

// ─── Always-allowed sub-items ─────────────────────────────────────────────────
// These are granted to EVERY user regardless of their saved access record.
// Use this for truly universal pages (e.g. change-password).
//
// Format: { [moduleKey]: ['subItemKey'] }

const ALWAYS_ALLOWED: Partial<Record<string, string[]>> = {
  settings: ['change-password'],
};

// ─── Auto-grant to admins ─────────────────────────────────────────────────────
// When a sub-item key is NEW (not present in the user's saved DB record),
// it is automatically granted to admins and super-users only.
// Regular users must be manually granted access via EditUserAccess.
//
// This means: every time you add a new sub-item to MENU_CONFIG, admins
// will see it immediately — no DB migration or manual grant needed.

const ADMIN_ROLES = ['admin', 'super-user'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildDefaultAccess = () =>
  Object.fromEntries(
    MENU_CONFIG.map((m) => [
      m.key,
      {
        enabled:  false,
        subItems: Object.fromEntries(m.subItems.map((s) => [s.key, false])),
      },
    ])
  );

type AccessBase = ReturnType<typeof buildDefaultAccess>;

const mergeAccess = (saved: AccessBase, isAdmin: boolean): AccessBase => {
  const base = buildDefaultAccess();

  for (const moduleKey of Object.keys(base)) {
    if (saved[moduleKey]) {
      for (const subKey of Object.keys(base[moduleKey].subItems)) {

        if (subKey in saved[moduleKey].subItems) {
          // Key exists in DB → use whatever was saved
          base[moduleKey].subItems[subKey] = saved[moduleKey].subItems[subKey];
        } else {
          // Key is NEW (not in DB yet) → auto-grant to admins only
          base[moduleKey].subItems[subKey] = isAdmin;
        }
      }
    } else if (isAdmin) {
      // Entire module is new (not in DB at all) → auto-grant all its sub-items to admins
      for (const subKey of Object.keys(base[moduleKey].subItems)) {
        base[moduleKey].subItems[subKey] = true;
      }
    }

    // Apply ALWAYS_ALLOWED overrides on top (for everyone)
    for (const subKey of ALWAYS_ALLOWED[moduleKey] ?? []) {
      if (subKey in base[moduleKey].subItems) {
        base[moduleKey].subItems[subKey] = true;
      }
    }

    // Module enabled = all sub-items enabled
    const subs = Object.values(base[moduleKey].subItems);
    base[moduleKey].enabled = subs.every(Boolean);
  }

  return base;
};

const isSavedAccessEmpty = (saved: AccessBase): boolean =>
  Object.values(saved).every(
    (m) => Object.values(m.subItems).every((v) => !v)
  );

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAllowedMenu = (userId: string | null | undefined) => {
  const numericId = userId ? Number(userId) : null;
  const { data: access, isLoading, isError } = useUserAccess(numericId);
  const { user } = useAuth();

  const isAdmin = ADMIN_ROLES.includes(user?.role as typeof ADMIN_ROLES[number]);

  const menu = useMemo(() => {
    if (!access) return [];

    // Empty access record → fall back to full menu (first-time user)
    if (Object.keys(access).length === 0 || isSavedAccessEmpty(access)) {
      return [...MENU_CONFIG];
    }

    const merged = mergeAccess(access, isAdmin);

    return MENU_CONFIG
      .map((module) => {
        const moduleAccess = merged[module.key];
        if (!moduleAccess) return null;

        const allowedSubItems = module.subItems.filter(
          (sub) => moduleAccess.subItems[sub.key] === true
        );

        if (allowedSubItems.length === 0) return null;

        return { ...module, subItems: allowedSubItems };
      })
      .filter(Boolean) as typeof MENU_CONFIG;
  }, [access, isAdmin]);

  return { menu, isLoading, isError };
};