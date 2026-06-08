import React, { useState } from 'react';
import { AppearanceSettings } from './components/AppearanceSettings';
import { SystemSettings } from './components/SystemSettings';
import { Palette, Monitor } from 'lucide-react';

type Tab = 'appearance' | 'system';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'system',     label: 'System',     icon: <Monitor size={16} /> },
];

export const General: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">General Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your dashboard preferences and system configuration.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'system'     && <SystemSettings />}
      </div>
    </div>
  );
};