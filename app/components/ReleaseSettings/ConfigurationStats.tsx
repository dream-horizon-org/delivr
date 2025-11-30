/**
 * Configuration Stats Component
 * Displays statistics for release configurations
 */

import { memo } from 'react';

interface ConfigurationStatsProps {
  stats: {
    total: number;
    active: number;
    draft: number;
    archived: number;
  };
}

export const ConfigurationStats = memo(function ConfigurationStats({
  stats,
}: ConfigurationStatsProps) {
  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          <div className="text-sm text-gray-600">Draft</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
          <div className="text-sm text-gray-600">Archived</div>
        </div>
      </div>
    </div>
  );
});

