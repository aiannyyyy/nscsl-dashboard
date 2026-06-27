import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FlaskConical,
  UserCheck,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Settings,
  Folders,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAllowedMenu } from '../hooks/useAllowedMenu';
import { type MenuKey } from '../config/menuConfig';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const SIDEBAR_ICONS: Record<MenuKey, React.ReactNode> = {
  'admin':        <LayoutDashboard size={20} />,
  'pdo':          <Package size={20} />,
  'laboratory':   <FlaskConical size={20} />,
  'followup':     <UserCheck size={20} />,
  'it-job-order': <Briefcase size={20} />,
  'intranet-file-management': <Folders size={20} />,
  'settings':     <Settings size={20} />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getMenuFromPath = (path: string, menuItems: typeof import('../config/menuConfig').MENU_CONFIG): string => {
  for (const module of menuItems) {
    if (module.subItems.some((s) => path === s.path || path.startsWith(s.path + '/'))) {
      return module.label;
    }
  }
  return '';
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const location                    = useLocation();
  const { user }                    = useAuth();
  const [expandedMenu, setExpandedMenu] = useState<string>('');

  // ── Swap: use allowed menu instead of raw MENU_CONFIG ─────────────────────
  const { menu, isLoading } = useAllowedMenu(user?.id ?? null);

  // Auto-expand the active module based on current path or first menu item
  useEffect(() => {
    if (!menu.length) return;

    const menuFromPath = getMenuFromPath(location.pathname, menu);
    if (menuFromPath) {
      setExpandedMenu(menuFromPath);
      return;
    }

    // Default: expand the first allowed module
    if (!expandedMenu) {
      setExpandedMenu(menu[0].label);
    }
  }, [location.pathname, menu]);

  const toggleMenu = (label: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedMenu(label);
    } else {
      setExpandedMenu((prev) => (prev === label ? '' : label));
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        {isCollapsed ? (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">CO</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CO</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              CORPORATE
            </h1>
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="p-3">

        {/* Loading skeleton */}
        {isLoading && (
          <ul className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <li key={i} className="h-11 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </ul>
        )}

        {/* Menu — only allowed modules + sub-items */}
        {!isLoading && (
          <ul className="space-y-2">
            {menu.map((module) => {
              const isExpanded = expandedMenu === module.label;
              const icon       = SIDEBAR_ICONS[module.key as MenuKey];

              return (
                <li key={module.key}>
                  <button
                    onClick={() => toggleMenu(module.label)}
                    title={isCollapsed ? module.label : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center' : 'justify-between'
                    } px-3 py-3 text-left text-sm font-medium rounded-lg transition-all duration-200 group ${
                      isExpanded
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                      <div
                        className={`${
                          isExpanded
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400'
                        } group-hover:scale-110 transition-transform duration-200`}
                      >
                        {icon}
                      </div>
                      {!isCollapsed && <span>{module.label}</span>}
                    </div>

                    {!isCollapsed && (
                      isExpanded
                        ? <ChevronDown size={16} className="text-blue-600 dark:text-blue-400" />
                        : <ChevronRight size={16} className="text-gray-400" />
                    )}
                  </button>

                  {/* Submenu — only allowed sub-items */}
                  {!isCollapsed && isExpanded && (
                    <ul className="ml-11 mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                      {module.subItems.map((subItem) => (
                        <li key={subItem.key}>
                          <Link
                            to={subItem.path}
                            className={`block px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                              location.pathname === subItem.path
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
};