/**
 * Jira Project Configuration Step
 * Step in the Release Configuration wizard for Jira project management setup
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Text,
  Switch,
  Select,
  Paper,
  Checkbox,
  Group,
  Box,
  ThemeIcon,
  useMantineTheme,
  Center,
  Loader,
} from '@mantine/core';
import {
  IconTicket,
  IconCheck,
  IconAlertCircle,
  IconPlug,
} from '@tabler/icons-react';
import { Link, useParams } from '@remix-run/react';
import type { JiraProjectConfig, Platform, JiraPlatformConfig } from '~/types/release-config';
import type { JiraProjectStepProps } from '~/types/release-config-props';
import { PLATFORMS } from '~/types/release-config-constants';
import { IntegrationCategory } from '~/types/integrations';
import { DEFAULT_PROJECT_MANAGEMENT_CONFIG } from '~/constants/release-config';
import { JiraPlatformConfigCard } from './JiraPlatformConfigCard';
import { createDefaultPlatformConfigs } from '~/utils/jira-config-transformer';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';

export function JiraProjectStep({
  config = DEFAULT_PROJECT_MANAGEMENT_CONFIG as JiraProjectConfig,
  onChange,
  availableIntegrations,
  selectedPlatforms = [],
  tenantId,
}: JiraProjectStepProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const orgId = params.org || tenantId || '';

  const isEnabled = config.enabled ?? false;
  const platformConfigurations = config.platformConfigurations ?? [];

  const [projects, setProjects] = useState<Array<{ key: string; name: string }>>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

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
      const defaultConfigs = createDefaultPlatformConfigs(selectedPlatforms);
      onChange({
        ...config,
        enabled: true,
        platformConfigurations: defaultConfigs,
      });
    } else {
      onChange({
        ...config,
        enabled: false,
        platformConfigurations: [],
      });
    }
  };

  const fetchProjects = useCallback(async (integrationId: string) => {
    if (!tenantId || !integrationId) return;

    setIsLoadingProjects(true);
    setProjectsError(null);
    setProjectsLoaded(false);

    try {
      const result = await apiGet<{ success: boolean; data: Array<{ key: string; name: string }> }>(
        `/api/v1/tenants/${tenantId}/integrations/project-management/${integrationId}/jira/metadata/projects`
      );

      if (result.success && result.data) {
        const projectsData = Array.isArray(result.data) ? result.data : [];
        setProjects(projectsData);
        setProjectsLoaded(true);
        setProjectsError(null);
      } else {
        throw new Error('Failed to fetch projects');
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to fetch Jira projects');
      setProjectsError(errorMessage);
      setProjects([]);
      setProjectsLoaded(false);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (config.integrationId && !projectsLoaded && !isLoadingProjects) {
      fetchProjects(config.integrationId);
    }
  }, [config.integrationId, fetchProjects, projectsLoaded, isLoadingProjects]);

  const handleIntegrationChange = (integrationId: string | null) => {
    setProjects([]);
    setProjectsLoaded(false);
    setProjectsError(null);

    onChange({
      ...config,
      integrationId: integrationId || '',
    });
  };

  const handlePlatformConfigChange = (platform: Platform, platformConfig: JiraPlatformConfig) => {
    const updatedConfigs = platformConfigurations.map((pc) =>
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

  const integrationOptions = availableIntegrations.map((int) => ({
    value: int.id,
    label: int.displayName || int.name,
  }));

  return (
    <Stack gap="lg">
      {/* Info Header */}
      <Paper
        p="md"
        radius="md"
        style={{
          backgroundColor: theme.colors.blue[0],
          border: `1px solid ${theme.colors.blue[2]}`,
        }}
      >
        <Group gap="sm">
          <ThemeIcon size={32} radius="md" variant="light" color="blue">
            <IconTicket size={18} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={600} c={theme.colors.blue[8]} mb={2}>
              JIRA Project Management
            </Text>
            <Text size="xs" c={theme.colors.blue[7]}>
              Optional: Link releases to JIRA issues and track project progress
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* Enable Toggle */}
      <Paper p="lg" radius="md" withBorder>
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <ThemeIcon
              size={40}
              radius="md"
              variant={isEnabled ? 'filled' : 'light'}
              color={isEnabled ? 'blue' : 'gray'}
            >
              <IconTicket size={22} />
            </ThemeIcon>
            <Box>
              <Group gap="xs" mb={4}>
                <Text fw={600} size="md" c={theme.colors.slate[8]}>
                  Enable JIRA Integration
                </Text>
                {isEnabled && (
                  <ThemeIcon size={20} radius="xl" color="blue">
                    <IconCheck size={12} />
                  </ThemeIcon>
                )}
              </Group>
              <Text size="sm" c={theme.colors.slate[5]}>
                Connect JIRA to track releases and link builds to issues
              </Text>
            </Box>
          </Group>
          <Switch
            checked={isEnabled}
            onChange={(e) => handleToggle(e.currentTarget.checked)}
            size="md"
            color="blue"
          />
        </Group>
      </Paper>

      {isEnabled && (
        <Stack gap="lg">
          {/* No platforms warning */}
          {selectedPlatforms.length === 0 && (
            <Paper
              p="md"
              radius="md"
              style={{
                backgroundColor: theme.colors.yellow[0],
                border: `1px solid ${theme.colors.yellow[2]}`,
              }}
            >
              <Group gap="sm">
                <ThemeIcon size={28} radius="md" variant="light" color="yellow">
                  <IconAlertCircle size={16} />
                </ThemeIcon>
                <Text size="sm" c={theme.colors.yellow[8]}>
                  No platforms selected. Select platforms in the Target Platforms step first.
                </Text>
              </Group>
            </Paper>
          )}

          {selectedPlatforms.length > 0 && (
            <>
              {/* Integration Selector */}
              <Paper p="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Select
                    label="JIRA Integration"
                    placeholder="Select a JIRA integration"
                    description="Choose the JIRA integration to use for this configuration"
                    data={integrationOptions}
                    value={config.integrationId || null}
                    onChange={handleIntegrationChange}
                    required
                    searchable
                    size="sm"
                  />

                  {/* No integrations warning */}
                  {integrationOptions.length === 0 && (
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        backgroundColor: theme.colors.red[0],
                        border: `1px solid ${theme.colors.red[2]}`,
                      }}
                    >
                      <Group gap="sm" align="flex-start">
                        <ThemeIcon size={28} radius="md" variant="light" color="red">
                          <IconAlertCircle size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1 }}>
                          <Text size="sm" fw={600} c={theme.colors.red[8]} mb={4}>
                            No JIRA Integrations Available
                          </Text>
                          <Text size="xs" c={theme.colors.red[7]} mb="sm">
                            Connect a JIRA integration to use project management features.
                          </Text>
                          <Text
                            component={Link}
                            to={`/dashboard/${orgId}/integrations?tab=${IntegrationCategory.PROJECT_MANAGEMENT}`}
                            size="xs"
                            c={theme.colors.red[8]}
                            fw={600}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <IconPlug size={14} />
                            Connect JIRA
                          </Text>
                        </Box>
                      </Group>
                    </Paper>
                  )}

                  {config.integrationId && (
                    <>
                      {/* Loading Projects */}
                      {isLoadingProjects && (
                        <Center py="xl">
                          <Group gap="sm">
                            <Loader size="sm" />
                            <Text size="sm" c={theme.colors.slate[5]}>
                              Fetching Jira projects...
                            </Text>
                          </Group>
                        </Center>
                      )}

                      {/* Projects Fetch Error */}
                      {!isLoadingProjects && projectsError && (
                        <Paper
                          p="md"
                          radius="md"
                          style={{
                            backgroundColor: theme.colors.yellow[0],
                            border: `1px solid ${theme.colors.yellow[2]}`,
                          }}
                        >
                          <Group gap="sm" align="flex-start">
                            <ThemeIcon size={24} radius="md" variant="light" color="yellow">
                              <IconAlertCircle size={14} />
                            </ThemeIcon>
                            <Box style={{ flex: 1 }}>
                              <Text size="sm" fw={500} c={theme.colors.yellow[8]} mb={4}>
                                Failed to fetch projects
                              </Text>
                              <Text size="xs" c={theme.colors.yellow[7]}>
                                {projectsError}
                              </Text>
                              <Text size="xs" c={theme.colors.yellow[7]} mt="xs">
                                You can still manually enter project keys below.
                              </Text>
                            </Box>
                          </Group>
                        </Paper>
                      )}

                      {/* No Projects Available */}
                      {!isLoadingProjects && !projectsError && projectsLoaded && projects.length === 0 && (
                        <Paper
                          p="md"
                          radius="md"
                          style={{
                            backgroundColor: theme.colors.blue[0],
                            border: `1px solid ${theme.colors.blue[2]}`,
                          }}
                        >
                          <Text size="sm" c={theme.colors.blue[7]}>
                            No Jira projects found. You can manually enter project keys below.
                          </Text>
                        </Paper>
                      )}
                    </>
                  )}
                </Stack>
              </Paper>

              {/* Platform Configurations */}
              {config.integrationId && (
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="lg">
                    <Box>
                      <Text fw={600} size="sm" c={theme.colors.slate[8]} mb={4}>
                        Platform Settings
                      </Text>
                      <Text size="xs" c={theme.colors.slate[5]}>
                        Configure JIRA project settings for each platform
                      </Text>
                    </Box>

                    <Stack gap="md">
                      {config.platformConfigurations
                        .filter((pc) => selectedPlatforms.includes(pc.platform))
                        .map((platformConfig) => (
                          <JiraPlatformConfigCard
                            key={platformConfig.platform}
                            platform={platformConfig.platform}
                            config={platformConfig}
                            onChange={(updatedConfig) =>
                              handlePlatformConfigChange(platformConfig.platform, updatedConfig)
                            }
                            integrationId={config.integrationId || ''}
                            projects={projects}
                          />
                        ))}
                    </Stack>
                  </Stack>
                </Paper>
              )}

              {/* Global Settings */}
              {config.integrationId && (
                <Paper p="lg" radius="md" withBorder>
                  <Stack gap="md">
                    <Text fw={600} size="sm" c={theme.colors.slate[8]} mb={4}>
                      Global Settings
                    </Text>
                    <Stack gap="sm">
                      <Checkbox
                        label="Automatically Create Release Tickets"
                        description="Create a JIRA ticket for each new release"
                        checked={config.createReleaseTicket ?? true}
                        onChange={(event) =>
                          handleGlobalSettingChange('createReleaseTicket', event.currentTarget.checked)
                        }
                        size="sm"
                      />
                      <Checkbox
                        label="Link Builds to Issues"
                        description="Automatically link build artifacts to related JIRA issues"
                        checked={config.linkBuildsToIssues ?? true}
                        onChange={(event) =>
                          handleGlobalSettingChange('linkBuildsToIssues', event.currentTarget.checked)
                        }
                        size="sm"
                      />
                    </Stack>
                  </Stack>
                </Paper>
              )}
            </>
          )}
        </Stack>
      )}

      {/* Disabled State */}
      {!isEnabled && (
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.slate[0],
            border: `1px solid ${theme.colors.slate[2]}`,
          }}
        >
          <Group gap="sm">
            <ThemeIcon size={28} radius="md" variant="light" color="gray">
              <IconAlertCircle size={16} />
            </ThemeIcon>
            <Text size="sm" c={theme.colors.slate[6]}>
              JIRA integration is disabled. You can still create releases without JIRA tracking.
            </Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
