/**
 * Release Configure Panel Component  
 * Simplified configuration with only 2 boolean toggles
 */

import { Stack, Text, Card, Switch, Alert, Group, Badge } from '@mantine/core';
import { IconSettings, IconTestPipe, IconInfoCircle } from '@tabler/icons-react';
import type { CronConfig } from '~/types/release-creation-backend';
import type { ReleaseConfiguration } from '~/types/release-config';
import { BUILD_ENVIRONMENTS } from '~/types/release-config-constants';

interface ReleaseConfigurePanelProps {
  config?: ReleaseConfiguration; // The selected configuration
  cronConfig: Partial<CronConfig>;
  onChange: (cronConfig: Partial<CronConfig>) => void;
}

export function ReleaseConfigurePanel({
  config,
  cronConfig,
  onChange,
}: ReleaseConfigurePanelProps) {
  // Check if config has pre-regression builds
  const hasPreRegressionBuilds = config
    ? (config.ciConfig?.workflows || []).some((p) => p.environment === BUILD_ENVIRONMENTS.PRE_REGRESSION)
    : false;

  // Check if config has Checkmate enabled
  const hasCheckmateEnabled = config
    ? config.testManagementConfig?.enabled &&
      config.testManagementConfig?.provider === 'checkmate'
    : false;

  // Manual mode - no configuration
  if (!config) {
    return (
      <Stack gap="lg">
        <div>
          <Text fw={600} size="lg" className="mb-2">
            Configure Release
          </Text>
          <Text size="sm" c="dimmed">
            Additional settings for your release
          </Text>
        </div>

        <Alert icon={<IconInfoCircle size={18} />} color="blue">
          <Text size="sm">
            <strong>Manual Mode:</strong> No configuration template selected. Advanced
            settings like build pipelines and test management can be configured after
            release creation.
          </Text>
        </Alert>
      </Stack>
    );
  }

  // If no toggles available, show info
  if (!hasPreRegressionBuilds && !hasCheckmateEnabled) {
    return (
      <Stack gap="lg">
        <div>
          <Text fw={600} size="lg" className="mb-2">
            Configure Release
          </Text>
          <Text size="sm" c="dimmed">
            Review configuration settings
          </Text>
        </div>

        <Alert icon={<IconInfoCircle size={18} />} color="blue">
          <Text size="sm">
            Your configuration is ready to use. No additional settings need to be
            configured for this release.
          </Text>
        </Alert>

        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text size="sm" c="dimmed">
            <strong>Configuration:</strong> {config.name}
            <br />
            <strong>Release Type:</strong> {config.releaseType}
            <br />
            <strong>Build Pipelines:</strong> {config.ciConfig?.workflows?.length || 0} configured
            <br />
            <strong>Test Management:</strong>{' '}
            {config.testManagementConfig?.enabled
              ? config.testManagementConfig.provider
              : 'Disabled'}
          </Text>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Configure Release
        </Text>
        <Text size="sm" c="dimmed">
          Enable or disable features for this release
        </Text>
      </div>

      <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
        <Text size="sm">
          Using configuration: <strong>{config.name}</strong>
        </Text>
      </Alert>

      {/* Pre-Regression Builds Toggle */}
      {hasPreRegressionBuilds && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconSettings size={20} className="text-purple-600" />
            <Text fw={600} size="sm">
              Pre-Regression Builds
            </Text>
            <Badge size="xs" variant="light">
              Available in Config
            </Badge>
          </Group>

          <Switch
            label="Enable Pre-Regression Builds"
            description="Run initial sanity builds before full regression testing. This helps catch critical issues early in the release cycle."
            checked={cronConfig.preRegressionBuilds ?? true}
            onChange={(e) =>
              onChange({
                ...cronConfig,
                preRegressionBuilds: e.currentTarget.checked,
              })
            }
            size="md"
          />

          {cronConfig.preRegressionBuilds === false && (
            <Alert color="orange" variant="light" className="mt-3">
              <Text size="xs">
                ⚠️ Pre-regression builds are disabled for this release. You will go
                directly to full regression testing.
              </Text>
            </Alert>
          )}

          {cronConfig.preRegressionBuilds !== false && (
            <Alert color="green" variant="light" className="mt-3">
              <Text size="xs">
                ✓ Pre-regression builds will run according to your configuration (
                {(config.ciConfig?.workflows || []).filter((p) => p.environment === BUILD_ENVIRONMENTS.PRE_REGRESSION).length}{' '}
                pipeline(s))
              </Text>
            </Alert>
          )}
        </Card>
      )}

      {/* Checkmate Toggle */}
      {hasCheckmateEnabled && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconTestPipe size={20} className="text-green-600" />
            <Text fw={600} size="sm">
              Test Management (Checkmate)
            </Text>
            <Badge size="xs" variant="light" color="green">
              Available in Config
            </Badge>
          </Group>

          <Switch
            label="Enable Automation Runs"
            description="Automatically trigger automation test runs for this release."
            checked={cronConfig.automationRuns ?? true}
            onChange={(e) =>
              onChange({
                ...cronConfig,
                automationRuns: e.currentTarget.checked,
              })
            }
            size="md"
          />

          {cronConfig.automationRuns === false && (
            <Alert color="orange" variant="light" className="mt-3">
              <Text size="xs">
                ⚠️ Automation runs are disabled for this release. Test runs
                will need to be triggered manually.
              </Text>
            </Alert>
          )}

          {cronConfig.automationRuns !== false && (
            <Alert color="green" variant="light" className="mt-3">
              <Text size="xs">
                ✓ Automation runs will be automatically triggered for this release.
                {config.testManagementConfig?.enabled && config.testManagementConfig.provider === 'checkmate' && (
                  <>
                    {' '}Project:{' '}
                    {config.testManagementConfig.providerConfig &&
                      'projectId' in config.testManagementConfig.providerConfig &&
                      config.testManagementConfig.providerConfig.projectId}
                  </>
                )}
              </Text>
            </Alert>
          )}
        </Card>
      )}
    </Stack>
  );
}

