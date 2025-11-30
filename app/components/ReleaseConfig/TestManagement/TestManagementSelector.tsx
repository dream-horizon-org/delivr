/**
 * Test Management Selector Component
 * Main component for selecting and configuring test management integration
 * 
 * ALIGNED WITH BACKEND: Uses TestManagementConfig structure directly
 * - undefined config = disabled
 * - defined config = enabled
 */

import { Stack, Text, Switch, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { TestManagementConfig, CheckmateSettings } from '~/types/release-config';
import type { TestManagementSelectorProps } from '~/types/release-config-props';
import { CheckmateConfigFormEnhanced } from './CheckmateConfigFormEnhanced';
import { TEST_MANAGEMENT_LABELS, ICON_SIZES } from '~/constants/release-config-ui';

export function TestManagementSelector({
  config,
  onChange,
  availableIntegrations,
  selectedTargets,
}: TestManagementSelectorProps) {
  // Check if test management is actually enabled (not just if config exists)
  const isEnabled = config?.enabled ?? false;
  
  // Check if connection exists (one-to-one mapping - only one checkmate connection)
  const hasConnection = availableIntegrations.checkmate.length > 0;
  const connection = hasConnection ? availableIntegrations.checkmate[0] : null;
  
  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      // If connection exists, auto-select it
      const integrationId = connection?.id || '';
      
      // Enable: Create default config with connection if available
      onChange({
        enabled: true,
        provider: 'checkmate',
        integrationId: integrationId,
        projectId: '', // No global projectId - platform-specific now
        providerConfig: {
          type: 'checkmate',
          integrationId: integrationId,
          projectId: 0, // No global projectId - platform-specific now
          platformConfigurations: [],
          autoCreateRuns: false,
          passThresholdPercent: 100,
          filterType: 'AND',
        },
      });
    } else {
      // Disable: Set to undefined
      onChange(undefined);
    }
  };
  
  const handleProviderConfigChange = (updatedProviderConfig: CheckmateSettings) => {
    if (!config) return;
    onChange({
      ...config,
      providerConfig: updatedProviderConfig,
      // Sync integrationId (projectId is now platform-specific, not top-level)
      integrationId: updatedProviderConfig.integrationId,// No global projectId - platform-specific now
    });
  };
  
  return (
    <Stack gap="md">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          {TEST_MANAGEMENT_LABELS.SECTION_TITLE}
        </Text>
        <Text size="sm" c="dimmed">
          {TEST_MANAGEMENT_LABELS.SECTION_DESCRIPTION}
        </Text>
      </div>
      
      <Alert icon={<IconInfoCircle size={ICON_SIZES.SMALL} />} color="blue" variant="light">
        <Text size="sm">
          <strong>Optional:</strong> {TEST_MANAGEMENT_LABELS.OPTIONAL_INFO}
        </Text>
      </Alert>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <Switch
          label={TEST_MANAGEMENT_LABELS.ENABLE_INTEGRATION}
          description={TEST_MANAGEMENT_LABELS.ENABLE_DESCRIPTION}
          checked={isEnabled}
          onChange={(e) => handleToggle(e.currentTarget.checked)}
          size="md"
          className="mb-4"
        />
        
        {isEnabled && config && (
          <div className="mt-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <Text fw={500} size="sm" className="mb-3">
                {TEST_MANAGEMENT_LABELS.CHECKMATE_CONFIG_TITLE}
              </Text>
              
              {hasConnection && connection ? (
                <>
                  {/* Show connection info instead of dropdown */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Text size="sm" fw={500} className="mb-1">
                      Connected: {connection.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Using your Checkmate integration
                    </Text>
                  </div>
                  
                  <CheckmateConfigFormEnhanced
                    config={(config.providerConfig || {}) as Partial<CheckmateSettings>}
                    onChange={handleProviderConfigChange}
                    availableIntegrations={availableIntegrations.checkmate}
                    selectedTargets={selectedTargets}
                    integrationId={connection.id} // Pass integration ID directly
                  />
                </>
              ) : (
                <Alert color="yellow" variant="light">
                  <Text size="sm">
                    {TEST_MANAGEMENT_LABELS.NO_CHECKMATE_MESSAGE}
                  </Text>
                </Alert>
              )}
            </div>
          </div>
        )}
      </div>
      
      {!isEnabled && (
        <Alert color="gray" variant="light">
          <Text size="sm" c="dimmed">
            {TEST_MANAGEMENT_LABELS.DISABLED_MESSAGE}
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

