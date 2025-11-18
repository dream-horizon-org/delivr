/**
 * Release Customization Panel Component
 * Override configuration settings for this specific release
 */

import { Stack, Text, Card, Switch, Group, Badge, Checkbox, Divider, Alert } from '@mantine/core';
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
  
  // Get pre-regression pipelines from config
  const preRegressionPipelines = config.buildPipelines.filter(
    p => p.environment === 'PRE_REGRESSION'
  );
  
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
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconSettings size={20} className="text-blue-600" />
          <Text fw={600} size="sm">
            Build Pipelines
          </Text>
          <Badge size="xs" variant="light">
            {config.buildPipelines.length} configured
          </Badge>
        </Group>
        
        <Stack gap="sm">
          {preRegressionPipelines.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <Switch
                label="Enable Pre-Regression Builds"
                description="Run initial sanity builds before full regression"
                checked={customizations.buildPipelines?.enablePreRegression ?? true}
                onChange={(e) =>
                  onChange({
                    ...customizations,
                    buildPipelines: {
                      ...customizations.buildPipelines,
                      enablePreRegression: e.currentTarget.checked,
                      enabledPipelineIds: customizations.buildPipelines?.enabledPipelineIds || [],
                    },
                  })
                }
              />
              
              {customizations.buildPipelines?.enablePreRegression === false && (
                <Text size="xs" c="orange" className="mt-2">
                  ⚠️ Pre-regression builds will be skipped for this release
                </Text>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-600">
            <Text size="xs" fw={500} className="mb-2">
              Configured Pipelines:
            </Text>
            {config.buildPipelines.map((pipeline) => (
              <div key={pipeline.id} className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>{pipeline.name}</span>
                {pipeline.environment === 'PRE_REGRESSION' && (
                  <Badge size="xs" variant="outline">
                    Pre-Regression
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Stack>
      </Card>
      
      {/* Test Management Customization */}
      {config.testManagement?.enabled && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconTestPipe size={20} className="text-purple-600" />
            <Text fw={600} size="sm">
              Test Management
            </Text>
            <Badge size="xs" variant="light" color="purple">
              {config.testManagement.provider}
            </Badge>
          </Group>
          
          <Stack gap="sm">
            <Switch
              label="Enable Test Management"
              description={`Integrate with ${config.testManagement.provider} for this release`}
              checked={customizations.testManagement?.enabled ?? true}
              onChange={(e) =>
                onChange({
                  ...customizations,
                  testManagement: {
                    ...customizations.testManagement,
                    enabled: e.currentTarget.checked,
                  },
                })
              }
            />
            
            {customizations.testManagement?.enabled !== false && (
              <div className="ml-6">
                <Checkbox
                  label="Auto-create test runs"
                  description="Automatically create test runs when builds are ready"
                  checked={customizations.testManagement?.createTestRuns ?? true}
                  onChange={(e) =>
                    onChange({
                      ...customizations,
                      testManagement: {
                        ...customizations.testManagement,
                        createTestRuns: e.currentTarget.checked,
                      },
                    })
                  }
                />
              </div>
            )}
            
            {customizations.testManagement?.enabled === false && (
              <Alert color="yellow" variant="light">
                <Text size="xs">
                  Test management will be disabled for this release. You'll need to manage tests manually.
                </Text>
              </Alert>
            )}
          </Stack>
        </Card>
      )}
      
      {/* Scheduling Information */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconCalendar size={20} className="text-green-600" />
          <Text fw={600} size="sm">
            Scheduling
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
                Default Release Time
              </Text>
              <Text size="sm" fw={500}>
                {config.scheduling.defaultReleaseTime}
              </Text>
            </div>
            
            <div>
              <Text size="xs" c="dimmed">
                Regression Slots
              </Text>
              <Text size="sm" fw={500}>
                {config.scheduling.regressionSlots.length} slots configured
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
      
      {/* Communication */}
      {(config.communication?.slack?.enabled || config.communication?.email?.enabled) && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text fw={600} size="sm" className="mb-3">
            Communication
          </Text>
          
          <Stack gap="sm">
            {config.communication.slack?.enabled && (
              <Switch
                label="Enable Slack Notifications"
                description="Send release updates to configured Slack channels"
                checked={customizations.communication?.enableSlack ?? true}
                onChange={(e) =>
                  onChange({
                    ...customizations,
                    communication: {
                      ...customizations.communication,
                      enableSlack: e.currentTarget.checked,
                      enableEmail: customizations.communication?.enableEmail ?? true,
                    },
                  })
                }
              />
            )}
            
            {config.communication.email?.enabled && (
              <Switch
                label="Enable Email Notifications"
                description="Send release updates via email"
                checked={customizations.communication?.enableEmail ?? true}
                onChange={(e) =>
                  onChange({
                    ...customizations,
                    communication: {
                      ...customizations.communication,
                      enableEmail: e.currentTarget.checked,
                      enableSlack: customizations.communication?.enableSlack ?? true,
                    },
                  })
                }
              />
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

