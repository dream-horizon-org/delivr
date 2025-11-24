/**
 * Test Management Selector Component
 * Main component for selecting and configuring test management integration
 */

import { Stack, Text, Switch, Select, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { 
  TestManagementConfig, 
  TestManagementProvider,
  CheckmateSettings,
  TestRailSettings,
} from '~/types/release-config';
import type { TestManagementSelectorProps } from '~/types/release-config-props';
import { CheckmateConfigFormEnhanced } from './CheckmateConfigFormEnhanced';
import { TEST_MANAGEMENT_PROVIDER_OPTIONS } from '~/constants/release-config';
import { TEST_PROVIDERS } from '~/types/release-config-constants';
import { TEST_MANAGEMENT_LABELS, ICON_SIZES } from '~/constants/release-config-ui';

// Type guards for provider settings
const isCheckmateSettings = (settings: unknown): settings is CheckmateSettings => {
  return typeof settings === 'object' && settings !== null && 'type' in settings && settings.type === TEST_PROVIDERS.CHECKMATE;
};

export function TestManagementSelector({
  config,
  onChange,
  availableIntegrations,
  selectedTargets,
}: TestManagementSelectorProps) {
  // ✅ Safe access with default values
  const isEnabled = config?.enabled ?? false;
  const provider = config?.provider ?? TEST_PROVIDERS.NONE;
  
  const handleToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enabled,
      provider: enabled ? (provider === TEST_PROVIDERS.NONE ? TEST_PROVIDERS.CHECKMATE : provider) : TEST_PROVIDERS.NONE,
    });
  };
  
  const handleProviderChange = (provider: TestManagementProvider) => {
    onChange({
      ...config,
      provider,
      enabled: provider !== TEST_PROVIDERS.NONE,
      providerConfig: undefined,
    });
  };
  
  const handleProviderSettingsChange = (settings: CheckmateSettings | TestRailSettings) => {
    onChange({
      ...config,
      providerConfig: settings,
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
        
        {isEnabled && (
          <div className="mt-4">
            <Select
              label={TEST_MANAGEMENT_LABELS.PROVIDER_LABEL}
              placeholder={TEST_MANAGEMENT_LABELS.PROVIDER_PLACEHOLDER}
              data={TEST_MANAGEMENT_PROVIDER_OPTIONS}
              value={provider}
              onChange={(val) => handleProviderChange(val as TestManagementProvider)}
              required
              className="mb-4"
            />
            
            {provider === TEST_PROVIDERS.CHECKMATE && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
                <Text fw={500} size="sm" className="mb-3">
                  {TEST_MANAGEMENT_LABELS.CHECKMATE_CONFIG_TITLE}
                </Text>
                
                {availableIntegrations.checkmate.length > 0 ? (
                  <CheckmateConfigFormEnhanced
                    config={
                      (config.providerConfig && isCheckmateSettings(config.providerConfig))
                        ? config.providerConfig
                        : {}
                    }
                    onChange={handleProviderSettingsChange}
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
            )}
            
            {config.provider === TEST_PROVIDERS.TESTRAIL && (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  {TEST_MANAGEMENT_LABELS.TESTRAIL_COMING_SOON}
                </Text>
              </Alert>
            )}
            
            {config.provider === TEST_PROVIDERS.ZEPHYR && (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  {TEST_MANAGEMENT_LABELS.ZEPHYR_COMING_SOON}
                </Text>
              </Alert>
            )}
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

