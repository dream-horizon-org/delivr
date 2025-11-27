/**
 * Configuration Load Error Component
 * Displays error when configuration fails to load
 */

import { memo } from 'react';
import { useNavigate } from '@remix-run/react';
import { Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface ConfigurationLoadErrorProps {
  error: string;
  organizationId: string;
}

export const ConfigurationLoadError = memo(function ConfigurationLoadError({
  error,
  organizationId,
}: ConfigurationLoadErrorProps) {
  const navigate = useNavigate();

  const handleGoToConfigurations = () => {
    navigate(`/dashboard/${organizationId}/releases/settings?tab=configurations`);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <Alert 
          icon={<IconAlertCircle size={24} />} 
          title="Failed to Load Configuration" 
          color="red"
          variant="filled"
        >
          <div className="space-y-4">
            <p>{error}</p>
            <p className="text-sm opacity-90">
              The configuration could not be loaded from the server. This might be because:
            </p>
            <ul className="text-sm opacity-90 list-disc list-inside space-y-1">
              <li>The configuration was deleted</li>
              <li>You don't have permission to access it</li>
              <li>There was a network error</li>
            </ul>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleGoToConfigurations}
                className="px-4 py-2 bg-white text-red-600 rounded-md hover:bg-red-50 font-medium"
              >
                Go to Configurations
              </button>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </Alert>
      </div>
    </div>
  );
});

