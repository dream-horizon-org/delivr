/**
 * Release Review Summary Component
 * Final review before creating the release
 */

import { Card, Text, Stack, Group, Badge, Divider } from '@mantine/core';
import { IconCheck, IconX, IconCalendar, IconSettings } from '@tabler/icons-react';
import type { ReleaseBasicDetails, ReleaseCustomizations } from '~/types/release-creation';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ReleaseReviewSummaryProps {
  config?: ReleaseConfiguration;
  details: Partial<ReleaseBasicDetails>;
  customizations: Partial<ReleaseCustomizations>;
}

export function ReleaseReviewSummary({
  config,
  details,
  customizations,
}: ReleaseReviewSummaryProps) {
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Review Release
        </Text>
        <Text size="sm" c="dimmed">
          Review all details before creating the release
        </Text>
      </div>
      
      {/* Basic Details */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Text fw={600} size="sm" className="mb-3">
          Release Information
        </Text>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Text size="xs" c="dimmed">Version</Text>
            <Text fw={500}>{details.version || 'Not set'}</Text>
          </div>
          
          <div>
            <Text size="xs" c="dimmed">Release Type</Text>
            <Badge variant="light" size="sm">
              {details.releaseType || 'PLANNED'}
            </Badge>
          </div>
          
          <div>
            <Text size="xs" c="dimmed">Kickoff Date</Text>
            <Text fw={500}>{details.kickoffDate || 'Not set'}</Text>
          </div>
          
          <div>
            <Text size="xs" c="dimmed">Release Date</Text>
            <Text fw={500}>{details.releaseDate || 'Not set'}</Text>
          </div>
          
          {details.baseVersion && (
            <div>
              <Text size="xs" c="dimmed">Base Version</Text>
              <Text fw={500}>{details.baseVersion}</Text>
            </div>
          )}
        </div>
        
        {details.description && (
          <>
            <Divider className="my-3" />
            <div>
              <Text size="xs" c="dimmed" className="mb-1">Description</Text>
              <Text size="sm">{details.description}</Text>
            </div>
          </>
        )}
      </Card>
      
      {/* Configuration Info */}
      {config && (
        <Card shadow="sm" padding="md" radius="md" withBorder className="bg-blue-50">
          <Group gap="sm" className="mb-3">
            <IconSettings size={20} className="text-blue-600" />
            <Text fw={600} size="sm">
              Configuration Applied
            </Text>
          </Group>
          
          <div className="space-y-2 text-sm">
            <div>
              <Text fw={500} className="text-blue-900">{config.name}</Text>
              {config.description && (
                <Text size="xs" c="dimmed">{config.description}</Text>
              )}
            </div>
            
            <Group gap="md" className="text-xs">
              <div>
                <span className="font-medium">{config.buildPipelines.length}</span> build pipelines
              </div>
              <div>
                <span className="font-medium">{config.defaultTargets.length}</span> target platforms
              </div>
              <div>
                <span className="font-medium">{config.scheduling.regressionSlots.length}</span> regression slots
              </div>
            </Group>
          </div>
        </Card>
      )}
      
      {/* Customizations Summary */}
      {config && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text fw={600} size="sm" className="mb-3">
            Customizations for This Release
          </Text>
          
          <Stack gap="sm">
            {/* Pre-Regression Builds */}
            {customizations.buildPipelines?.enablePreRegression !== undefined && (
              <Group gap="xs">
                {customizations.buildPipelines.enablePreRegression ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <Text size="sm">
                  Pre-Regression Builds: {
                    customizations.buildPipelines.enablePreRegression ? 'Enabled' : 'Disabled'
                  }
                </Text>
              </Group>
            )}
            
            {/* Test Management */}
            {customizations.testManagement?.enabled !== undefined && (
              <Group gap="xs">
                {customizations.testManagement.enabled ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <Text size="sm">
                  Test Management: {
                    customizations.testManagement.enabled ? 'Enabled' : 'Disabled'
                  }
                </Text>
                {customizations.testManagement.enabled && customizations.testManagement.createTestRuns !== undefined && (
                  <Text size="xs" c="dimmed">
                    ({customizations.testManagement.createTestRuns ? 'Auto-create runs' : 'Manual runs'})
                  </Text>
                )}
              </Group>
            )}
            
            {/* Communication */}
            {(customizations.communication?.enableSlack !== undefined || 
              customizations.communication?.enableEmail !== undefined) && (
              <>
                {customizations.communication.enableSlack !== undefined && (
                  <Group gap="xs">
                    {customizations.communication.enableSlack ? (
                      <IconCheck size={16} className="text-green-600" />
                    ) : (
                      <IconX size={16} className="text-red-600" />
                    )}
                    <Text size="sm">
                      Slack Notifications: {
                        customizations.communication.enableSlack ? 'Enabled' : 'Disabled'
                      }
                    </Text>
                  </Group>
                )}
                
                {customizations.communication.enableEmail !== undefined && (
                  <Group gap="xs">
                    {customizations.communication.enableEmail ? (
                      <IconCheck size={16} className="text-green-600" />
                    ) : (
                      <IconX size={16} className="text-red-600" />
                    )}
                    <Text size="sm">
                      Email Notifications: {
                        customizations.communication.enableEmail ? 'Enabled' : 'Disabled'
                      }
                    </Text>
                  </Group>
                )}
              </>
            )}
            
            {/* If no customizations */}
            {!customizations.buildPipelines?.enablePreRegression &&
             !customizations.testManagement?.enabled &&
             !customizations.communication && (
              <Text size="sm" c="dimmed" className="italic">
                Using all defaults from configuration
              </Text>
            )}
          </Stack>
        </Card>
      )}
      
      {/* Manual Mode Info */}
      {!config && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text fw={600} size="sm" className="mb-2">
            Manual Release
          </Text>
          <Text size="sm" c="dimmed">
            This release is being created manually without a configuration template.
            You'll need to configure pipelines and schedules separately.
          </Text>
        </Card>
      )}
    </Stack>
  );
}

