/**
 * Release Customization Panel Component
 * Override configuration settings for this specific release
 */

import { Stack, Text, Card, Switch, Group, Badge, Alert } from '@mantine/core';
import { IconInfoCircle, IconSettings, IconTestPipe, IconCalendar } from '@tabler/icons-react';
import type { ReleaseCustomizations } from '~/types/release-creation';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ReleaseCustomizationPanelProps {
  config?: ReleaseConfiguration; // The selected configuration
  customizations: Partial<ReleaseCustomizations>;
  onChange: (customizations: Partial<ReleaseCustomizations>) => void;
}

export function ReleaseCustomizationPanel({
  config,
  customizations,
  onChange,
}: ReleaseCustomizationPanelProps) {
  if (!config) {
    return (
      <Alert icon={<IconInfoCircle size={18} />} color="blue">
        <Text size="sm">
          Manual mode selected. All settings will be configured in the next steps.
        </Text>
      </Alert>
    );
  }
  
  // Check if config has pre-regression builds configured
  const hasPreRegressionBuilds = config.workflows?.some(
    p => p.environment === 'PRE_REGRESSION'
  ) ?? false;
  
  // Check if config has test management (Checkmate) enabled
  const hasCheckmate = config.testManagement?.enabled ?? false;
  
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Customize Release
        </Text>
        <Text size="sm" c="dimmed">
          Override configuration settings for this specific release
        </Text>
      </div>
      
      {/* Build Pipelines Customization */}
      {hasPreRegressionBuilds && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconSettings size={20} className="text-blue-600" />
            <Text fw={600} size="sm">
              Pre-Regression Builds
            </Text>
          </Group>
          
          <Stack gap="sm">
            <Switch
              label="Enable Pre-Regression Builds"
              description="Run initial sanity builds before full regression testing"
              checked={customizations.enablePreRegressionBuilds ?? true}
              onChange={(e) =>
                onChange({
                  ...customizations,
                  enablePreRegressionBuilds: e.currentTarget.checked,
                })
              }
            />
            
            {customizations.enablePreRegressionBuilds === false && (
              <Alert color="yellow" variant="light">
                <Text size="xs">
                  ⚠️ Pre-regression builds will be skipped for this release
                </Text>
              </Alert>
            )}
          </Stack>
        </Card>
      )}
      
      {/* Test Management Customization */}
      {hasCheckmate && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconTestPipe size={20} className="text-purple-600" />
            <Text fw={600} size="sm">
              Test Management
            </Text>
            <Badge size="xs" variant="light" color="purple">
              {config.testManagement?.provider || 'Checkmate'}
            </Badge>
          </Group>
          
          <Stack gap="sm">
            <Switch
              label="Enable Checkmate Integration"
              description={`Integrate with ${config.testManagement?.provider || 'Checkmate'} for this release`}
              checked={customizations.enableCheckmate ?? true}
              onChange={(e) =>
                onChange({
                  ...customizations,
                  enableCheckmate: e.currentTarget.checked,
                })
              }
            />
            
            {customizations.enableCheckmate === false && (
              <Alert color="yellow" variant="light">
                <Text size="xs">
                  Test management will be disabled for this release. You'll need to manage tests manually.
                </Text>
              </Alert>
            )}
          </Stack>
        </Card>
      )}
      
      {/* Scheduling Information (Read-only display) */}
      {config.scheduling && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconCalendar size={20} className="text-green-600" />
            <Text fw={600} size="sm">
              Scheduling Configuration
            </Text>
          </Group>
          
          <div className="text-sm text-gray-700">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Text size="xs" c="dimmed">
                  Release Frequency
                </Text>
                <Text size="sm" fw={500}>
                  {config.scheduling.releaseFrequency}
                  {config.scheduling.customFrequencyDays && ` (${config.scheduling.customFrequencyDays} days)`}
                </Text>
              </div>
              
              <div>
                <Text size="xs" c="dimmed">
                  Timezone
                </Text>
                <Text size="sm" fw={500}>
                  {config.scheduling.timezone}
                </Text>
              </div>
              
              <div>
                <Text size="xs" c="dimmed">
                  Target Release Time
                </Text>
                <Text size="sm" fw={500}>
                  {config.scheduling.targetReleaseTime}
                </Text>
              </div>
              
              <div>
                <Text size="xs" c="dimmed">
                  Regression Slots
                </Text>
                <Text size="sm" fw={500}>
                  {config.scheduling.regressionSlots?.length || 0} slots configured
                </Text>
              </div>
            </div>
            
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="xs">
                Dates can be adjusted in the release details above. Scheduling configuration will be applied from the selected configuration.
              </Text>
            </Alert>
          </div>
        </Card>
      )}
      
      {/* Info message if no customizations available */}
      {!hasPreRegressionBuilds && !hasCheckmate && (
        <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
          <Text size="sm" fw={500} className="mb-1">
            No Customizations Available
          </Text>
          <Text size="xs">
            This configuration doesn't have optional features that can be toggled for individual releases.
            All settings will be applied as configured in the template.
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

