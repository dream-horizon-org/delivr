/**
 * Settings Header Component
 * Header for Release Management Settings page
 */

import { memo } from 'react';
import { Link } from '@remix-run/react';
import { IconArrowLeft } from '@tabler/icons-react';

interface SettingsHeaderProps {
  org: string;
}

export const SettingsHeader = memo(function SettingsHeader({ org }: SettingsHeaderProps) {
  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <Link
                to={`/dashboard/${org}/releases`}
                className="text-gray-400 hover:text-gray-600"
              >
                <IconArrowLeft size={24} />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Release Management Settings</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Manage integrations and configuration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

