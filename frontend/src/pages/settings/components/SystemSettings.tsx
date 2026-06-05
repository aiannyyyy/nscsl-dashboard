import React, { useState } from 'react';

export const SystemSettings: React.FC = () => {
  const [timezone, setTimezone] = useState('Asia/Manila');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: persist settings
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
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
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'fil', label: 'Filipino' },
            ]}
          />
          <SelectRow
            label="Timezone"
            value={timezone}
            onChange={setTimezone}
            options={[
              { value: 'Asia/Manila', label: 'Asia/Manila (PHT)' },
              { value: 'UTC', label: 'UTC' },
              { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
            ]}
          />
          <SelectRow
            label="Date Format"
            value={dateFormat}
            onChange={setDateFormat}
            options={[
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            ]}
          />
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          System Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Application', value: 'NSCSL Dashboard' },
            { label: 'Version', value: 'v1.0.0' },
            { label: 'Environment', value: 'Production' },
            { label: 'Database', value: 'MySQL' },
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
            saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
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
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}

const SelectRow: React.FC<SelectRowProps> = ({ label, value, onChange, options }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-200 shrink-0">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);