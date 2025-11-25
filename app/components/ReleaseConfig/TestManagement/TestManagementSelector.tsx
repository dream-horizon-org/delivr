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
  
  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      // Enable: Create default config
      onChange({
        enabled: true,
        provider: 'checkmate',
        integrationId: '',
        projectId: '',
        providerConfig: {
          type: 'checkmate',
          integrationId: '',
          projectId: 0,
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
      // Sync top-level fields from providerConfig
      integrationId: updatedProviderConfig.integrationId,
      projectId: updatedProviderConfig.projectId.toString(),
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
              
              {availableIntegrations.checkmate.length > 0 ? (
                <CheckmateConfigFormEnhanced
                  config={(config.providerConfig || {}) as Partial<CheckmateSettings>}
                  onChange={handleProviderConfigChange}
                  availableIntegrations={availableIntegrations.checkmate}
                  selectedTargets={selectedTargets}
                />
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

