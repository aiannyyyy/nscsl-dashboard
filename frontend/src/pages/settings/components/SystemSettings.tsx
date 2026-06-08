import React, { useState } from 'react';

const STORAGE_KEY = 'nscsl:system';

type FontSize = 'small' | 'medium' | 'large';

interface SystemPrefs {
  timezone:   string;
  dateFormat: string;
  language:   string;
  fontSize:   FontSize;
}

const DEFAULT_PREFS: SystemPrefs = {
  timezone:   'Asia/Manila',
  dateFormat: 'MM/DD/YYYY',
  language:   'en',
  fontSize:   'medium',
};

const loadPrefs = (): SystemPrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small:  '13px',
  medium: '15px',
  large:  '17px',
};

const applyFontSize = (size: FontSize) => {
  document.documentElement.style.fontSize = FONT_SIZE_MAP[size];
};

// Export so other parts of the app can read saved prefs (e.g. date formatting)
export const getSystemPrefs = loadPrefs;

const fontSizeOptions: { value: FontSize; label: string; preview: string }[] = [
  { value: 'small',  label: 'Small',  preview: 'Aa' },
  { value: 'medium', label: 'Medium', preview: 'Aa' },
  { value: 'large',  label: 'Large',  preview: 'Aa' },
];

export const SystemSettings: React.FC = () => {
  const [prefs, setPrefs] = useState<SystemPrefs>(loadPrefs);
  const [saved, setSaved]  = useState(false);

  const update = <K extends keyof SystemPrefs>(key: K, value: SystemPrefs[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    // Preview font size instantly
    if (key === 'fontSize') applyFontSize(value as FontSize);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">

      {/* Font Size */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Font Size</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Adjust the text size across the dashboard. Previews instantly.
        </p>
        <div className="flex gap-3">
          {fontSizeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update('fontSize', opt.value)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-lg border-2 font-medium transition-all duration-200 ${
                prefs.fontSize === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span style={{
                fontSize:
                  opt.value === 'small'  ? '14px' :
                  opt.value === 'medium' ? '18px' : '22px',
              }}>
                {opt.preview}
              </span>
              <span className="text-xs">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Locale */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
          Locale & Time
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Configure how dates, times, and language are displayed.
        </p>
        <div className="space-y-4">
          <SelectRow
            label="Language"
            value={prefs.language}
            onChange={v => update('language', v)}
            options={[
              { value: 'en',  label: 'English' },
              { value: 'fil', label: 'Filipino' },
            ]}
          />
          <SelectRow
            label="Timezone"
            value={prefs.timezone}
            onChange={v => update('timezone', v)}
            options={[
              { value: 'Asia/Manila',    label: 'Asia/Manila (PHT)' },
              { value: 'UTC',            label: 'UTC' },
              { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
            ]}
          />
          <SelectRow
            label="Date Format"
            value={prefs.dateFormat}
            onChange={v => update('dateFormat', v)}
            options={[
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            ]}
          />
        </div>
      </div>

      {/* System Info — read only */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          System Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Application', value: 'NSCSL Dashboard' },
            { label: 'Version',     value: 'v1.0.0' },
            { label: 'Environment', value: 'Production' },
            { label: 'Database',    value: 'MySQL' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-0.5">
                {item.value}
              </p>
            </div>
          ))}
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

// ─── Reusable select row ──────────────────────────────────────────────────────
interface SelectRowProps {
  label:    string;
  value:    string;
  onChange: (val: string) => void;
  options:  { value: string; label: string }[];
}

const SelectRow: React.FC<SelectRowProps> = ({ label, value, onChange, options }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-200 shrink-0">
      {label}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);