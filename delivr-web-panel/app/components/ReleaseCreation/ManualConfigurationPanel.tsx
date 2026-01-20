/**
 * Manual Configuration Panel Component
 * Configure release settings from scratch (no configuration template)
 */

import { Stack, Text, Card, Group, Switch, Alert } from '@mantine/core';
import { IconSettings, IconTestPipe, IconInfoCircle } from '@tabler/icons-react';
import type { ReleaseCustomizations } from '~/types/release-creation';

interface ManualConfigurationPanelProps {
  customizations: Partial<ReleaseCustomizations>;
  onChange: (customizations: Partial<ReleaseCustomizations>) => void;
}

export function ManualConfigurationPanel({
  customizations,
  onChange,
}: ManualConfigurationPanelProps) {
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Configure Release Options
        </Text>
        <Text size="sm" c="dimmed">
          Configure optional settings for this release
        </Text>
      </div>
      
      <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
        <Text size="sm">
          Manual mode: You're creating a release without a configuration template. 
          Core settings (version, dates, platforms) will be configured in the details form.
        </Text>
      </Alert>
      
      {/* Build Configuration */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconSettings size={20} className="text-purple-600" />
          <Text fw={600} size="sm">
            Build Configuration
          </Text>
        </Group>
        
        <Stack gap="sm">
          <Switch
            label="Enable Pre-Regression Builds"
            description="Run initial sanity builds before full regression testing"
            checked={customizations.enablePreRegressionBuilds ?? false}
            onChange={(e) =>
              onChange({
                ...customizations,
                enablePreRegressionBuilds: e.currentTarget.checked,
              })
            }
          />
          
          <Alert color="blue" variant="light">
            <Text size="xs">
              Build pipelines will need to be configured separately after release creation.
              You can set up Jenkins, GitHub Actions, or manual upload workflows in the release dashboard.
            </Text>
          </Alert>
        </Stack>
      </Card>
      
      {/* Test Management */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconTestPipe size={20} className="text-green-600" />
          <Text fw={600} size="sm">
            Test Management
          </Text>
        </Group>
        
        <Stack gap="sm">
          <Switch
            label="Enable Checkmate Integration"
            description="Integrate with Checkmate for test management and tracking"
            checked={customizations.enableCheckmate ?? false}
            onChange={(e) =>
              onChange({
                ...customizations,
                enableCheckmate: e.currentTarget.checked,
              })
            }
          />
          
          <Alert color="blue" variant="light">
            <Text size="xs">
              Test management provider and project will need to be configured in integrations.
            </Text>
          </Alert>
        </Stack>
      </Card>
      
      {/* Summary Info */}
      <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
        <Text size="xs" fw={500} className="mb-1">
          Manual Release Creation
        </Text>
        <Text size="xs">
          After creating this release, you'll need to:
        </Text>
        <ul className="text-xs mt-1 ml-4 space-y-1">
          <li>Configure build pipelines for selected platforms</li>
          <li>Set up regression schedules and slots</li>
          <li>Configure test management (if enabled)</li>
          <li>Set up notification channels</li>
        </ul>
        <Text size="xs" className="mt-2" c="dimmed">
          💡 Tip: Create a Release Configuration to streamline future releases!
        </Text>
      </Alert>
    </Stack>
  );
}

