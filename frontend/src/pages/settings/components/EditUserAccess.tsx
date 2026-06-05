import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, LayoutDashboard, Package,
  FlaskConical, UserCheck, Briefcase, Settings, Loader2, AlertCircle,
} from 'lucide-react';
import { MENU_CONFIG, type MenuKey } from '../../../config/menuConfig';
import { useUserAccess, useSaveUserAccess } from '../../../hooks/AdminHooks/useAccess';
import type { AccessState } from '../../../services/AdminServices/accessService';
import type { User } from '../User';

// ─── Department → Module key mapping ─────────────────────────────────────────
// When a new user has no saved access yet, we auto-check their dept's module.

const DEPT_MODULE_MAP: Record<string, MenuKey> = {
  'Admin':      'admin',
  'Laboratory': 'laboratory',
  'Followup':   'followup',
  'Program':    'pdo',
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const ACCESS_ICONS: Record<MenuKey, React.ReactNode> = {
  'admin':        <LayoutDashboard size={16} />,
  'pdo':          <Package size={16} />,
  'laboratory':   <FlaskConical size={16} />,
  'followup':     <UserCheck size={16} />,
  'it-job-order': <Briefcase size={16} />,
  'settings':     <Settings size={16} />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildDefaultAccess = (): AccessState =>
  Object.fromEntries(
    MENU_CONFIG.map((m) => [
      m.key,
      {
        enabled:  false,
        subItems: Object.fromEntries(m.subItems.map((s) => [s.key, false])),
      },
    ])
  );

// Auto-check the module that matches the user's department + all its sub-items
const applyDeptDefaults = (state: AccessState, dept: string): AccessState => {
  const moduleKey = DEPT_MODULE_MAP[dept];
  if (!moduleKey || !state[moduleKey]) return state;

  return {
    ...state,
    [moduleKey]: {
      enabled:  true,
      subItems: Object.fromEntries(
        Object.keys(state[moduleKey].subItems).map((k) => [k, true])
      ),
    },
  };
};

// Merge saved DB state on top of defaults (preserves new sub-items as false)
const mergeAccess = (saved: AccessState): AccessState => {
  const base = buildDefaultAccess();
  for (const moduleKey of Object.keys(base)) {
    if (saved[moduleKey]) {
      for (const subKey of Object.keys(base[moduleKey].subItems)) {
        if (subKey in saved[moduleKey].subItems) {
          base[moduleKey].subItems[subKey] = saved[moduleKey].subItems[subKey];
        }
      }
      const subs = Object.values(base[moduleKey].subItems);
      base[moduleKey].enabled = subs.every(Boolean);
    }
  }
  return base;
};

const isSavedAccessEmpty = (saved: AccessState): boolean =>
  Object.values(saved).every(
    (m) => Object.values(m.subItems).every((v) => !v)
  );

const countEnabled = (state: AccessState, moduleKey: string) =>
  Object.values(state[moduleKey].subItems).filter(Boolean).length;

const totalPages = (state: AccessState) =>
  Object.values(state).reduce(
    (acc, m) => acc + Object.values(m.subItems).filter(Boolean).length,
    0
  );

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditUserAccessProps {
  user: User;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EditUserAccess: React.FC<EditUserAccessProps> = ({ user, onClose }) => {
  const [access, setAccess] = useState<AccessState>(buildDefaultAccess);

  const { data: savedAccess, isLoading, isError } = useUserAccess(user.user_id);
  const { mutate: saveAccess, isPending: isSaving } = useSaveUserAccess(user.user_id);

  useEffect(() => {
    if (!savedAccess) return;

    const merged = mergeAccess(savedAccess);

    // If this user has never had access configured yet, auto-apply dept defaults
    if (isSavedAccessEmpty(savedAccess)) {
      setAccess(applyDeptDefaults(merged, user.dept));
    } else {
      setAccess(merged);
    }
  }, [savedAccess, user.dept]);

  const toggleModule = (moduleKey: string) => {
    setAccess((prev) => {
      const nextEnabled = !prev[moduleKey].enabled;
      return {
        ...prev,
        [moduleKey]: {
          enabled:  nextEnabled,
          subItems: Object.fromEntries(
            Object.keys(prev[moduleKey].subItems).map((k) => [k, nextEnabled])
          ),
        },
      };
    });
  };

  const toggleSubItem = (moduleKey: string, subKey: string) => {
    setAccess((prev) => {
      const updatedSubs = {
        ...prev[moduleKey].subItems,
        [subKey]: !prev[moduleKey].subItems[subKey],
      };
      return {
        ...prev,
        [moduleKey]: {
          enabled:  Object.values(updatedSubs).every(Boolean),
          subItems: updatedSubs,
        },
      };
    });
  };

  const handleSave = () => {
    saveAccess(access, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {user.name}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                @{user.username} · {user.dept}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Sub-header ─────────────────────────────────────────────────── */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <ShieldCheck size={13} className="text-blue-500" />
              Select which modules and pages this user can access.
            </div>
            {/* Dept badge hint */}
            {DEPT_MODULE_MAP[user.dept] && (
              <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                Default: {user.dept}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading access settings…</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center justify-center gap-2 py-12 text-red-400">
              <AlertCircle size={18} />
              <span className="text-sm">Failed to load access. Please try again.</span>
            </div>
          )}

          {!isLoading && !isError && (
            <div className="space-y-3">
              {MENU_CONFIG.map((module) => {
                const moduleState  = access[module.key];
                const enabledCount = countEnabled(access, module.key);
                const totalCount   = module.subItems.length;
                const isPartial    = enabledCount > 0 && enabledCount < totalCount;
                const isDeptModule = DEPT_MODULE_MAP[user.dept] === module.key;

                return (
                  <div
                    key={module.key}
                    className={`border rounded-xl overflow-hidden transition-all duration-150 ${
                      moduleState.enabled
                        ? 'border-blue-200 dark:border-blue-800'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {/* Module header */}
                    <div
                      onClick={() => toggleModule(module.key)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors duration-150 ${
                        moduleState.enabled
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={moduleState.enabled}
                          ref={(el) => { if (el) el.indeterminate = isPartial; }}
                          onChange={() => toggleModule(module.key)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-blue-600 cursor-pointer"
                        />
                        <span className={moduleState.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>
                          {ACCESS_ICONS[module.key]}
                        </span>
                        <span className={`text-sm font-semibold ${
                          moduleState.enabled
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}>
                          {module.label}
                        </span>
                        {/* Badge shown on the dept's default module */}
                        {isDeptModule && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-500 dark:bg-blue-900/40 dark:text-blue-300">
                            dept default
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        enabledCount > 0
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                      }`}>
                        {enabledCount}/{totalCount}
                      </span>
                    </div>

                    {/* Sub-items */}
                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {module.subItems.map((sub) => (
                        <label key={sub.key} className="flex items-center gap-2.5 cursor-pointer group py-1">
                          <input
                            type="checkbox"
                            checked={moduleState.subItems[sub.key]}
                            onChange={() => toggleSubItem(module.key, sub.key)}
                            className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 accent-blue-600 cursor-pointer"
                          />
                          <span className={`text-xs transition-colors duration-150 ${
                            moduleState.subItems[sub.key]
                              ? 'text-gray-800 dark:text-gray-100 font-medium'
                              : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                          }`}>
                            {sub.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {totalPages(access)} pages enabled
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving ? 'Saving…' : 'Save Access'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};