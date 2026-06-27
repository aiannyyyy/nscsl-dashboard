import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { GlobalJobOrderManager } from '../components/GlobalJobOrderManager';
import FloatingChat from '../pages/chat/FloatingChat';
import { MockModeBanner } from '../components/MockModeBanner';

const APPEARANCE_KEY = 'nscsl:appearance';
const SYSTEM_KEY     = 'nscsl:system';

type Theme    = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small:  '13px',
  medium: '15px',
  large:  '17px',
};

const restorePrefs = () => {
  try {
    // ── Theme ──────────────────────────────────────────────────────────────
    const appearanceRaw = localStorage.getItem(APPEARANCE_KEY);
    const theme = (appearanceRaw ? JSON.parse(appearanceRaw).theme : 'system') as Theme;
    const isDark =
      theme === 'dark'  ? true  :
      theme === 'light' ? false :
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);

    // ── Font size ──────────────────────────────────────────────────────────
    const systemRaw = localStorage.getItem(SYSTEM_KEY);
    const fontSize  = (systemRaw ? JSON.parse(systemRaw).fontSize : 'medium') as FontSize;
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize] ?? '15px';
  } catch {
    // Leave defaults if anything fails
  }
};

export const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem(APPEARANCE_KEY);
      return raw ? JSON.parse(raw).sidebarCollapsed ?? false : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Restore theme + font size on every mount
    restorePrefs();

    // Re-apply when system color scheme changes (handles 'system' mode)
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => restorePrefs();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 relative">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <Navbar  isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <main
        className={`mt-16 p-6 min-h-screen transition-all duration-300 ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Outlet />
      </main>

      <div className="relative z-[9999]">
        <GlobalJobOrderManager />
      </div>

      <FloatingChat />
      <MockModeBanner />
    </div>
  );
};