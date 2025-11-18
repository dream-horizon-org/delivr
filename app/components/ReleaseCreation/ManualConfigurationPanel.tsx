/**
 * Manual Configuration Panel Component
 * Configure release settings from scratch (no configuration template)
 */

import { Stack, Text, Card, Group, Checkbox, Textarea, Switch, Alert } from '@mantine/core';
import { IconTarget, IconSettings, IconTestPipe, IconBell, IconInfoCircle } from '@tabler/icons-react';
import type { ReleaseCustomizations } from '~/types/release-creation';

interface ManualConfigurationPanelProps {
  customizations: Partial<ReleaseCustomizations>;
  onChange: (customizations: Partial<ReleaseCustomizations>) => void;
}

export function ManualConfigurationPanel({
  customizations,
  onChange,
}: ManualConfigurationPanelProps) {
  const platforms = customizations.platforms || { web: false, playStore: false, appStore: false };
  
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Configure Release Settings
        </Text>
        <Text size="sm" c="dimmed">
          Configure all settings for this release manually
        </Text>
      </div>
      
      <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
        <Text size="sm">
          Manual mode: You're creating a release without a configuration template. 
          All settings will need to be configured individually for this release.
        </Text>
      </Alert>
      
      {/* Target Platforms */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconTarget size={20} className="text-blue-600" />
          <Text fw={600} size="sm">
            Target Platforms
          </Text>
        </Group>
        
        <Stack gap="sm">
          <Checkbox
            label="Web Platform"
            description="Deploy to web platform"
            checked={platforms.web}
            onChange={(e) =>
              onChange({
                ...customizations,
                platforms: { ...platforms, web: e.currentTarget.checked },
              })
            }
          />
          
          <Checkbox
            label="Play Store (Android)"
            description="Release to Google Play Store"
            checked={platforms.playStore}
            onChange={(e) =>
              onChange({
                ...customizations,
                platforms: { ...platforms, playStore: e.currentTarget.checked },
              })
            }
          />
          
          <Checkbox
            label="App Store (iOS)"
            description="Release to Apple App Store"
            checked={platforms.appStore}
            onChange={(e) =>
              onChange({
                ...customizations,
                platforms: { ...platforms, appStore: e.currentTarget.checked },
              })
            }
          />
          
          {!platforms.web && !platforms.playStore && !platforms.appStore && (
            <Alert color="orange" variant="light" className="mt-2">
              <Text size="xs">
                ⚠️ Please select at least one target platform
              </Text>
            </Alert>
          )}
        </Stack>
      </Card>
      
      {/* Build Pipeline Configuration */}
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
            description="Run initial sanity builds before full regression"
            checked={customizations.buildPipelines?.enablePreRegression ?? false}
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
            label="Enable Test Management"
            description="Integrate with test management tools (Checkmate, etc.)"
            checked={customizations.testManagement?.enabled ?? false}
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
          
          {customizations.testManagement?.enabled && (
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
              
              <Alert color="blue" variant="light" className="mt-3">
                <Text size="xs">
                  Test management provider and project will need to be configured in integrations.
                </Text>
              </Alert>
            </div>
          )}
        </Stack>
      </Card>
      
      {/* Communication Settings */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconBell size={20} className="text-orange-600" />
          <Text fw={600} size="sm">
            Communication
          </Text>
        </Group>
        
        <Stack gap="sm">
          <Switch
            label="Enable Slack Notifications"
            description="Send release updates to Slack channels"
            checked={customizations.communication?.enableSlack ?? false}
            onChange={(e) =>
              onChange({
                ...customizations,
                communication: {
                  ...customizations.communication,
                  enableSlack: e.currentTarget.checked,
                  enableEmail: customizations.communication?.enableEmail ?? false,
                },
              })
            }
          />
          
          <Switch
            label="Enable Email Notifications"
            description="Send release updates via email"
            checked={customizations.communication?.enableEmail ?? false}
            onChange={(e) =>
              onChange({
                ...customizations,
                communication: {
                  ...customizations.communication,
                  enableEmail: e.currentTarget.checked,
                  enableSlack: customizations.communication?.enableSlack ?? false,
                },
              })
            }
          />
          
          {(customizations.communication?.enableSlack || customizations.communication?.enableEmail) && (
            <Alert color="blue" variant="light" className="mt-2">
              <Text size="xs">
                Notification channels and recipients will need to be configured in the release dashboard.
              </Text>
            </Alert>
          )}
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
          <li>Set up notification channels (if enabled)</li>
        </ul>
        <Text size="xs" className="mt-2" c="dimmed">
          💡 Tip: Create a Release Configuration to streamline future releases!
        </Text>
      </Alert>
    </Stack>
  );
}

