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
} from '@mantine/core';
import {
  IconTestPipe,
  IconInfoCircle,
  IconCheck,
} from '@tabler/icons-react';
import { useParams } from '@remix-run/react';
import type { TestManagementConfig } from '~/types/release-config';
import type { TestManagementSelectorProps } from '~/types/release-config-props';
import { CheckmateConfigFormEnhanced } from './CheckmateConfigFormEnhanced';
import { IntegrationCategory } from '~/types/integrations';
import { TEST_PROVIDERS } from '~/types/release-config-constants';
import { NoIntegrationAlert } from '~/components/Common/NoIntegrationAlert';

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
        provider: TEST_PROVIDERS.CHECKMATE,
        integrationId: integrationId,
        platformConfigurations: [],
        autoCreateRuns: false,
        passThresholdPercent: 100,
        filterType: 'AND',
      });
    } else {
      onChange(undefined);
    }
  };

  const handleConfigChange = (updatedConfig: TestManagementConfig) => {
    if (!config) return;
    onChange(updatedConfig);
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
                    config={config}
                    onChange={handleConfigChange}
                    availableIntegrations={availableIntegrations.checkmate}
                    selectedTargets={selectedTargets}
                    integrationId={connection.id}
                    tenantId={tenantId}
                  />
                </Box>
              </>
            ) : (
              /* No Connection Warning */
              <NoIntegrationAlert
                category={IntegrationCategory.TEST_MANAGEMENT}
                tenantId={tenantId}
                color="yellow"
              />
            )}
          </Stack>
        </Paper>
      )}

      {/* Disabled State Message */}
    </Stack>
  );
}
