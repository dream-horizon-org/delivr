/**
 * Jira Project Configuration Step
 * Step in the Release Configuration wizard for Jira project management setup
 * Now supports platform-level configuration
 */

import { Stack, Text, Switch, Select, Alert, Checkbox } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { JiraProjectConfig, Platform, JiraPlatformConfig } from '~/types/release-config';
import type { JiraProjectStepProps } from '~/types/release-config-props';
import { PLATFORMS, JIRA_PLATFORMS } from '~/types/release-config-constants';
import { JiraPlatformConfigCard } from './JiraPlatformConfigCard';
import { createDefaultPlatformConfigs } from '~/utils/jira-config-transformer';

// Map frontend Platform to backend Platform
function mapPlatform(platform: Platform): typeof JIRA_PLATFORMS.WEB | typeof JIRA_PLATFORMS.IOS | typeof JIRA_PLATFORMS.ANDROID {
  if (platform === PLATFORMS.ANDROID) return JIRA_PLATFORMS.ANDROID;
  if (platform === PLATFORMS.IOS) return JIRA_PLATFORMS.IOS;
  return JIRA_PLATFORMS.WEB;
}

export function JiraProjectStep({
  config,
  onChange,
  availableIntegrations,
  selectedPlatforms = [],
}: JiraProjectStepProps) {
  // ✅ Safe access with default values
  const isEnabled = config?.enabled ?? false;
  const platformConfigurations = config?.platformConfigurations ?? [];
  
  // Initialize platform configurations if they don't exist
  if (isEnabled && platformConfigurations.length === 0) {
    const defaultConfigs = createDefaultPlatformConfigs(selectedPlatforms);
    onChange({
      ...config,
      platformConfigurations: defaultConfigs,
    });
  }

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      // When enabling, create default platform configs
      const defaultConfigs = createDefaultPlatformConfigs(selectedPlatforms);
      onChange({
        ...config,
        enabled: true,
        platformConfigurations: defaultConfigs,
      });
    } else {
      // When disabling, keep existing config but mark as disabled
      onChange({
        ...config,
        enabled: false,
      });
    }
  };

  const handleIntegrationChange = (integrationId: string | null) => {
    onChange({
      ...config,
      integrationId: integrationId || '',
    });
  };

  const handlePlatformConfigChange = (platform: 'WEB' | 'IOS' | 'ANDROID', platformConfig: JiraPlatformConfig) => {
    const updatedConfigs = platformConfigurations.map(pc =>
      pc.platform === platform ? platformConfig : pc
    );
    onChange({
      ...config,
      platformConfigurations: updatedConfigs,
    });
  };

  const handleGlobalSettingChange = (field: 'createReleaseTicket' | 'linkBuildsToIssues', value: boolean) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  // Filter available integrations to show only active ones
  const integrationOptions = availableIntegrations.map(int => ({
    value: int.id,
    label: int.name,
  }));

  return (
    <Stack gap="xl">
      {/* Header */}
      <div>
        <Text fw={600} size="lg" className="mb-1">
          JIRA Project Management
        </Text>
        <Text size="sm" c="dimmed">
          Configure JIRA project tracking for each platform. Each platform can have different project settings.
        </Text>
      </div>

      {/* Enable/Disable Switch */}
      <Switch
        label="Enable JIRA Integration"
        description="Link releases and builds to JIRA issues"
        checked={isEnabled}
        onChange={(event) => handleToggle(event.currentTarget.checked)}
        size="md"
      />

      {isEnabled && (
        <>
          {/* No platforms selected warning */}
          {selectedPlatforms.length === 0 && (
            <Alert icon={<IconAlertCircle size={16} />} title="No platforms selected" color="yellow">
              Please select at least one platform in the "Target Platforms" step before configuring JIRA.
            </Alert>
          )}

          {selectedPlatforms.length > 0 && (
            <>
              {/* JIRA Integration Selector */}
              <Select
                label="JIRA Integration"
                placeholder="Select a connected JIRA integration"
                description="Choose which JIRA instance to use"
                data={integrationOptions}
                value={config.integrationId || null}
                onChange={handleIntegrationChange}
                required
                searchable
              />

              {/* No integrations available warning */}
              {integrationOptions.length === 0 && (
                <Alert icon={<IconAlertCircle size={16} />} title="No JIRA integrations" color="red">
                  Please connect a JIRA integration first in the Integrations page.
                </Alert>
              )}

              {config.integrationId && (
                <>
                  {/* Platform Configurations */}
                  <div>
                    <Text fw={500} size="md" mb="md">
                      Platform-Specific Settings
                    </Text>
                    <Text size="sm" c="dimmed" mb="lg">
                      Configure JIRA project settings for each platform. Different platforms can use different projects, issue types, and completion statuses.
                    </Text>

                    <Stack gap="lg">
                      {config.platformConfigurations
                        .filter(pc => selectedPlatforms.map(mapPlatform).includes(pc.platform))
                        .map(platformConfig => (
                          <JiraPlatformConfigCard
                            key={platformConfig.platform}
                            platform={platformConfig.platform}
                            config={platformConfig}
                            onChange={(updatedConfig) =>
                              handlePlatformConfigChange(platformConfig.platform, updatedConfig)
                            }
                          />
                        ))}
                    </Stack>
                  </div>

                  {/* Global Settings */}
                  <div>
                    <Text fw={500} size="md" mb="md">
                      Global Settings
                    </Text>
                    <Stack gap="sm">
                      <Checkbox
                        label="Auto-create release tickets"
                        description="Automatically create JIRA tickets for each release"
                        checked={config.createReleaseTicket ?? true}
                        onChange={(event) =>
                          handleGlobalSettingChange('createReleaseTicket', event.currentTarget.checked)
                        }
                      />
                      <Checkbox
                        label="Link builds to JIRA issues"
                        description="Automatically link build information to relevant JIRA issues"
                        checked={config.linkBuildsToIssues ?? true}
                        onChange={(event) =>
                          handleGlobalSettingChange('linkBuildsToIssues', event.currentTarget.checked)
                        }
                      />
                    </Stack>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </Stack>
  );
}
