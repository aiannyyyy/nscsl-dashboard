import React, { useState } from 'react';

interface NotifSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const defaultSettings: NotifSetting[] = [
  {
    id: 'sample_received',
    label: 'Sample Received',
    description: 'Notify when a new sample is received in PDO.',
    enabled: true,
  },
  {
    id: 'unsatisfactory',
    label: 'Unsatisfactory Results',
    description: 'Alert when a sample is marked unsatisfactory.',
    enabled: true,
  },
  {
    id: 'endorsement',
    label: 'Endorsement to Follow Up',
    description: 'Notify when a case is endorsed to the follow-up team.',
    enabled: false,
  },
  {
    id: 'cms_urgent',
    label: 'CMS Urgent',
    description: 'Alert for urgent CMS cases in the follow-up module.',
    enabled: true,
  },
  {
    id: 'job_order',
    label: 'IT Job Order Updates',
    description: 'Notify when an IT job order status changes.',
    enabled: false,
  },
];

export const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotifSetting[]>(defaultSettings);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSave = () => {
    // TODO: persist settings
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
          Notification Preferences
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Choose which events trigger notifications for your account.
        </p>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {settings.map((setting) => (
            <div key={setting.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {setting.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {setting.description}
                </p>
              </div>
              <button
                onClick={() => toggle(setting.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  setting.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    setting.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

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