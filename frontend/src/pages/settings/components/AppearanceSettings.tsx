import React, { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'nscsl:appearance';

interface AppearancePrefs {
  theme:            Theme;
  sidebarCollapsed: boolean;
  compactMode:      boolean;
}

const DEFAULT_PREFS: AppearancePrefs = {
  theme:            'system',
  sidebarCollapsed: false,
  compactMode:      false,
};

const loadPrefs = (): AppearancePrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

const applyTheme = (theme: Theme) => {
  const isDark =
    theme === 'dark'  ? true  :
    theme === 'light' ? false :
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark);
};

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light',  label: 'Light',  icon: <Sun size={18} /> },
  { value: 'dark',   label: 'Dark',   icon: <Moon size={18} /> },
  { value: 'system', label: 'System', icon: <Monitor size={18} /> },
];

export const AppearanceSettings: React.FC = () => {
  const [prefs, setPrefs] = useState<AppearancePrefs>(loadPrefs);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppearancePrefs>(key: K, value: AppearancePrefs[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setSaved(false);

    // Only apply theme instantly for immediate visual feedback — no other side effects
    if (key === 'theme') applyTheme(value as Theme);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Theme</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Choose how the dashboard looks. Previews instantly, saved on click.
        </p>
        <div className="flex gap-3">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update('theme', opt.value)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                prefs.theme === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Layout</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Control how content is displayed across the dashboard.
        </p>
        <div className="space-y-4">
          <ToggleRow
            label="Collapse sidebar by default"
            description="Sidebar starts collapsed when you open the dashboard."
            checked={prefs.sidebarCollapsed}
            onChange={v => update('sidebarCollapsed', v)}
          />
          <ToggleRow
            label="Compact mode"
            description="Reduce spacing and padding for denser information display."
            checked={prefs.compactMode}
            onChange={v => update('compactMode', v)}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// ─── Reusable toggle row ──────────────────────────────────────────────────────
interface ToggleRowProps {
  label:       string;
  description: string;
  checked:     boolean;
  onChange:    (val: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);