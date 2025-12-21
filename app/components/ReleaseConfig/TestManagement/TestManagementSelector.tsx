/**
 * Test Management Selector Component
 * Main component for selecting and configuring test management integration
 */

import {
  Stack,
  Text,
  Switch,
  Paper,
  Group,
  Box,
  ThemeIcon,
  useMantineTheme,
  Anchor,
} from '@mantine/core';
import {
  IconTestPipe,
  IconInfoCircle,
  IconCheck,
  IconAlertCircle,
  IconPlug,
} from '@tabler/icons-react';
import { Link, useParams } from '@remix-run/react';
import type { TestManagementConfig, CheckmateSettings } from '~/types/release-config';
import type { TestManagementSelectorProps } from '~/types/release-config-props';
import { CheckmateConfigFormEnhanced } from './CheckmateConfigFormEnhanced';

export function TestManagementSelector({
  config,
  onChange,
  availableIntegrations,
  selectedTargets,
}: TestManagementSelectorProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const tenantId = params.org || '';

  const isEnabled = config?.enabled ?? false;
  const hasConnection = availableIntegrations.checkmate.length > 0;
  const connection = hasConnection ? availableIntegrations.checkmate[0] : null;

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      const integrationId = connection?.id || '';

      onChange({
        enabled: true,
        provider: 'checkmate',
        integrationId: integrationId,
        projectId: '',
        providerConfig: {
          type: 'checkmate',
          integrationId: integrationId,
          projectId: 0,
          platformConfigurations: [],
          autoCreateRuns: false,
          passThresholdPercent: 100,
          filterType: 'AND',
        },
      });
    } else {
      onChange(undefined);
    }
  };

  const handleProviderConfigChange = (updatedProviderConfig: CheckmateSettings) => {
    if (!config) return;
    onChange({
      ...config,
      providerConfig: updatedProviderConfig,
      integrationId: updatedProviderConfig.integrationId,
    });
  };

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
            <IconInfoCircle size={18} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={600} c={theme.colors.blue[8]} mb={2}>
              Optional Integration
            </Text>
            <Text size="xs" c={theme.colors.blue[7]}>
              Test management integration allows you to automatically create test runs,
              track test execution status, and link test results to your releases.
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
              <IconTestPipe size={22} />
            </ThemeIcon>
            <Box>
              <Group gap="xs" mb={4}>
                <Text fw={600} size="md" c={theme.colors.slate[8]}>
                  Enable Test Management Integration
                </Text>
                {isEnabled && (
                  <ThemeIcon size={20} radius="xl" color="blue">
                    <IconCheck size={12} />
                  </ThemeIcon>
                )}
              </Group>
              <Text size="sm" c={theme.colors.slate[5]}>
                Connect a test management tool for automated test tracking
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

      {/* Configuration Section */}
      {isEnabled && config && (
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            {hasConnection && connection ? (
              <>
                {/* Connection Status */}
                <Paper
                  p="md"
                  radius="md"
                  style={{
                    backgroundColor: theme.colors.green[0],
                    border: `1px solid ${theme.colors.green[2]}`,
                  }}
                >
                  <Group gap="sm">
                    <ThemeIcon size={28} radius="md" variant="light" color="green">
                      <IconCheck size={16} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" fw={600} c={theme.colors.green[8]}>
                        Connected: {connection.name}
                      </Text>
                      <Text size="xs" c={theme.colors.green[6]}>
                        Using your Checkmate integration
                      </Text>
                    </Box>
                  </Group>
                </Paper>

                {/* Configuration Form */}
                <Box>
                  <Text fw={600} size="sm" c={theme.colors.slate[8]} mb="md">
                    Configuration
                  </Text>
                  <CheckmateConfigFormEnhanced
                    config={(config.providerConfig || {}) as Partial<CheckmateSettings>}
                    onChange={handleProviderConfigChange}
                    availableIntegrations={availableIntegrations.checkmate}
                    selectedTargets={selectedTargets}
                    integrationId={connection.id}
                  />
                </Box>
              </>
            ) : (
              /* No Connection Warning */
              <Paper
                p="md"
                radius="md"
                style={{
                  backgroundColor: theme.colors.yellow[0],
                  border: `1px solid ${theme.colors.yellow[2]}`,
                }}
              >
                <Group gap="sm" align="flex-start">
                  <ThemeIcon size={28} radius="md" variant="light" color="yellow">
                    <IconAlertCircle size={16} />
                  </ThemeIcon>
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={600} c={theme.colors.yellow[8]} mb={4}>
                      Checkmate Integration Required
                    </Text>
                    <Text size="xs" c={theme.colors.yellow[7]} mb="sm">
                      Connect a Checkmate integration to configure test management.
                    </Text>
                    <Anchor
                      component={Link}
                      to={`/dashboard/${tenantId}/integrations?tab=TEST_MANAGEMENT`}
                      size="xs"
                      c={theme.colors.yellow[8]}
                      fw={600}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <IconPlug size={14} />
                      Connect Checkmate
                    </Anchor>
                  </Box>
                </Group>
              </Paper>
            )}
          </Stack>
        </Paper>
      )}

      {/* Disabled State Message */}
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
              <IconInfoCircle size={16} />
            </ThemeIcon>
            <Text size="sm" c={theme.colors.slate[6]}>
              Test management integration is disabled. You can still create releases
              without automated test tracking.
            </Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
