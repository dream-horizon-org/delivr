/**
 * Jira Project Configuration Step
 * Step in the Release Configuration wizard for Jira project management setup
 * Now supports platform-level configuration
 */

import { Stack, Text, Switch, Select, Alert, Checkbox } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { JiraProjectConfig, Platform, JiraPlatformConfig } from '~/types/release-config';
import type { JiraProjectStepProps } from '~/types/release-config-props';
import { PLATFORMS } from '~/types/release-config-constants';
import { JIRA_LABELS, ICON_SIZES } from '~/constants/release-config-ui';
import { JiraPlatformConfigCard } from './JiraPlatformConfigCard';
import { createDefaultPlatformConfigs } from '~/utils/jira-config-transformer';

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

  const handlePlatformConfigChange = (platform: Platform, platformConfig: JiraPlatformConfig) => {
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
          {JIRA_LABELS.SECTION_TITLE}
        </Text>
        <Text size="sm" c="dimmed">
          {JIRA_LABELS.SECTION_DESCRIPTION}
        </Text>
      </div>

      {/* Enable/Disable Switch */}
      <Switch
        label={JIRA_LABELS.ENABLE_INTEGRATION}
        description={JIRA_LABELS.ENABLE_DESCRIPTION}
        checked={isEnabled}
        onChange={(event) => handleToggle(event.currentTarget.checked)}
        size="md"
      />

      {isEnabled && (
        <>
          {/* No platforms selected warning */}
          {selectedPlatforms.length === 0 && (
            <Alert icon={<IconAlertCircle size={ICON_SIZES.SMALL} />} title="No platforms selected" color="yellow">
              {JIRA_LABELS.NO_PLATFORMS_WARNING}
            </Alert>
          )}

          {selectedPlatforms.length > 0 && (
            <>
              {/* JIRA Integration Selector */}
              <Select
                label={JIRA_LABELS.INTEGRATION_LABEL}
                placeholder={JIRA_LABELS.INTEGRATION_PLACEHOLDER}
                description={JIRA_LABELS.INTEGRATION_DESCRIPTION}
                data={integrationOptions}
                value={config.integrationId || null}
                onChange={handleIntegrationChange}
                required
                searchable
              />

              {/* No integrations available warning */}
              {integrationOptions.length === 0 && (
                <Alert icon={<IconAlertCircle size={ICON_SIZES.SMALL} />} title="No JIRA integrations" color="red">
                  {JIRA_LABELS.NO_INTEGRATIONS_WARNING}
                </Alert>
              )}

              {config.integrationId && (
                <>
                  {/* Platform Configurations */}
                  <div>
                    <Text fw={500} size="md" mb="md">
                      {JIRA_LABELS.PLATFORM_SETTINGS_TITLE}
                    </Text>
                    <Text size="sm" c="dimmed" mb="lg">
                      {JIRA_LABELS.PLATFORM_SETTINGS_DESCRIPTION}
                    </Text>

                    <Stack gap="lg">
                      {config.platformConfigurations
                        .filter(pc => selectedPlatforms.includes(pc.platform))
                        .map(platformConfig => (
                          <JiraPlatformConfigCard
                            key={platformConfig.platform}
                            platform={platformConfig.platform}
                            config={platformConfig}
                            onChange={(updatedConfig) =>
                              handlePlatformConfigChange(platformConfig.platform, updatedConfig)
                            }
                            integrationId={config.integrationId || ''}
                          />
                        ))}
                    </Stack>
                  </div>

                  {/* Global Settings */}
                  <div>
                    <Text fw={500} size="md" mb="md">
                      {JIRA_LABELS.GLOBAL_SETTINGS_TITLE}
                    </Text>
                    <Stack gap="sm">
                      <Checkbox
                        label={JIRA_LABELS.AUTO_CREATE_TICKETS}
                        description={JIRA_LABELS.AUTO_CREATE_DESCRIPTION}
                        checked={config.createReleaseTicket ?? true}
                        onChange={(event) =>
                          handleGlobalSettingChange('createReleaseTicket', event.currentTarget.checked)
                        }
                      />
                      <Checkbox
                        label={JIRA_LABELS.LINK_BUILDS}
                        description={JIRA_LABELS.LINK_BUILDS_DESCRIPTION}
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
