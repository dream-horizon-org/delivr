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
  TestRailSettings
} from '~/types/release-config';
import { CheckmateConfigFormEnhanced } from './CheckmateConfigFormEnhanced';
import { TEST_MANAGEMENT_PROVIDER_OPTIONS } from '../release-config-constants';

interface TestManagementSelectorProps {
  config: TestManagementConfig;
  onChange: (config: TestManagementConfig) => void;
  availableIntegrations: {
    checkmate: Array<{ id: string; name: string; workspaceId?: string }>;
  };
}

// Type guards for provider settings
const isCheckmateSettings = (settings: unknown): settings is CheckmateSettings => {
  return typeof settings === 'object' && settings !== null && 'type' in settings && settings.type === 'checkmate';
};

const isTestRailSettings = (settings: unknown): settings is TestRailSettings => {
  return typeof settings === 'object' && settings !== null && 'type' in settings && settings.type === 'testrail';
};

export function TestManagementSelector({
  config,
  onChange,
  availableIntegrations,
}: TestManagementSelectorProps) {
  const handleToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enabled,
      provider: enabled ? (config.provider === 'none' ? 'checkmate' : config.provider) : 'none',
    });
  };
  
  const handleProviderChange = (provider: TestManagementProvider) => {
    onChange({
      ...config,
      provider,
      enabled: provider !== 'none',
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
          Test Management Integration
        </Text>
        <Text size="sm" c="dimmed">
          Connect your test management tool to track test execution during releases
        </Text>
      </div>
      
      <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
        <Text size="sm">
          <strong>Optional:</strong> Test management integration allows you to automatically 
          create test runs, track test execution status, and link test results to your releases.
        </Text>
      </Alert>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <Switch
          label="Enable Test Management Integration"
          description="Connect a test management tool for automated test tracking"
          checked={config.enabled}
          onChange={(e) => handleToggle(e.currentTarget.checked)}
          size="md"
          className="mb-4"
        />
        
        {config.enabled && (
          <div className="mt-4">
            <Select
              label="Test Management Provider"
              placeholder="Select a provider"
              data={TEST_MANAGEMENT_PROVIDER_OPTIONS}
              value={config.provider}
              onChange={(val) => handleProviderChange(val as TestManagementProvider)}
              required
              className="mb-4"
            />
            
            {config.provider === 'checkmate' && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
                <Text fw={500} size="sm" className="mb-3">
                  Checkmate Configuration
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
                  />
                ) : (
                  <Alert color="yellow" variant="light">
                    <Text size="sm">
                      No Checkmate integration found. Please connect Checkmate in the 
                      Integrations page before configuring test management.
                    </Text>
                  </Alert>
                )}
              </div>
            )}
            
            {config.provider === 'testrail' && (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  TestRail integration coming soon. Stay tuned!
                </Text>
              </Alert>
            )}
            
            {config.provider === 'zephyr' && (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  Zephyr integration coming soon. Stay tuned!
                </Text>
              </Alert>
            )}
          </div>
        )}
      </div>
      
      {!config.enabled && (
        <Alert color="gray" variant="light">
          <Text size="sm" c="dimmed">
            Test management integration is disabled. You can still create releases 
            without automated test tracking.
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

