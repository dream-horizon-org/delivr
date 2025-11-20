/**
 * Test Management Selector Component
 * Main component for selecting and configuring test management integration
 */

import { Stack, Text, Switch, Select, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { TestManagementConfig, TestManagementProvider } from '~/types/release-config';
import { CheckmateConfigFormEnhanced } from './CheckmateConfigFormEnhanced';

interface TestManagementSelectorProps {
  config: TestManagementConfig;
  onChange: (config: TestManagementConfig) => void;
  availableIntegrations: {
    checkmate: Array<{ id: string; name: string; workspaceId?: string }>;
  };
}

const providerOptions = [
  { value: 'NONE', label: 'No Test Management', disabled: false },
  { value: 'CHECKMATE', label: 'Checkmate', disabled: false },
  { value: 'TESTRAIL', label: 'TestRail (Coming Soon)', disabled: true },
  { value: 'ZEPHYR', label: 'Zephyr (Coming Soon)', disabled: true },
];

export function TestManagementSelector({
  config,
  onChange,
  availableIntegrations,
}: TestManagementSelectorProps) {
  const handleToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enabled,
      provider: enabled ? (config.provider === 'NONE' ? 'CHECKMATE' : config.provider) : 'NONE',
    });
  };
  
  const handleProviderChange = (provider: TestManagementProvider) => {
    onChange({
      ...config,
      provider,
      enabled: provider !== 'NONE',
      providerSettings: undefined,
    });
  };
  
  const handleProviderSettingsChange = (settings: any) => {
    onChange({
      ...config,
      providerSettings: settings,
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
              data={providerOptions}
              value={config.provider}
              onChange={(val) => handleProviderChange(val as TestManagementProvider)}
              required
              className="mb-4"
            />
            
            {config.provider === 'CHECKMATE' && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
                <Text fw={500} size="sm" className="mb-3">
                  Checkmate Configuration
                </Text>
                
                {availableIntegrations.checkmate.length > 0 ? (
                  <CheckmateConfigFormEnhanced
                    config={config.providerSettings as any || {}}
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
            
            {config.provider === 'TESTRAIL' && (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  TestRail integration coming soon. Stay tuned!
                </Text>
              </Alert>
            )}
            
            {config.provider === 'ZEPHYR' && (
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

