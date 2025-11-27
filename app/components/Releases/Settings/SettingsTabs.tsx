/**
 * Settings Tabs Component
 * Tab navigation for settings page
 */

import { memo } from 'react';

export type SettingsTab = 'integrations' | 'configurations' | 'cicd' | 'general';

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export const SettingsTabs = memo(function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'integrations', label: 'Integrations' },
    { id: 'configurations', label: 'Release Configurations' },
    { id: 'cicd', label: 'CI/CD Pipelines' },
    { id: 'general', label: 'General' },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
});

