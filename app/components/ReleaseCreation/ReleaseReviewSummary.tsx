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
            <Text size="xs" c="dimmed">Base Branch</Text>
            <Text fw={500}>{details.baseBranch || 'Not set'}</Text>
          </div>
          
          <div>
            <Text size="xs" c="dimmed">Release Targets</Text>
            <Group gap="xs">
              {details.releaseTargets?.web && <Badge size="xs">Web</Badge>}
              {details.releaseTargets?.playStore && <Badge size="xs">Play Store</Badge>}
              {details.releaseTargets?.appStore && <Badge size="xs">App Store</Badge>}
              {!details.releaseTargets?.web && !details.releaseTargets?.playStore && !details.releaseTargets?.appStore && (
                <Text size="xs" c="dimmed">None selected</Text>
              )}
            </Group>
          </div>
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
      
      {/* Scheduling Details */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconCalendar size={20} className="text-blue-600" />
          <Text fw={600} size="sm">
            Schedule
          </Text>
        </Group>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Text size="xs" c="dimmed">Release Date</Text>
            <Text fw={500}>
              {details.releaseDate ? new Date(details.releaseDate).toLocaleDateString() : 'Not set'}
              {details.releaseTime && ` at ${details.releaseTime}`}
            </Text>
          </div>
          
          <div>
            <Text size="xs" c="dimmed">Kickoff Date</Text>
            <Text fw={500}>
              {details.kickoffDate ? new Date(details.kickoffDate).toLocaleDateString() : 'Not set'}
              {details.kickoffTime && ` at ${details.kickoffTime}`}
            </Text>
          </div>
          
          <div className="col-span-2">
            <Text size="xs" c="dimmed" className="mb-2">Regression Builds</Text>
            {details.hasRegressionBuilds ? (
              <div className="space-y-2">
                <Badge variant="light" color="green">Scheduled</Badge>
                {details.regressionBuildSlots && details.regressionBuildSlots.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {details.regressionBuildSlots.map((slot) => {
                      const slotDate = new Date(details.releaseDate!);
                      slotDate.setDate(slotDate.getDate() - slot.offsetDays);
                      return (
                        <div key={slot.id} className="text-xs bg-gray-50 p-2 rounded">
                          <Text size="xs" fw={500}>{slot.name}</Text>
                          <Text size="xs" c="dimmed">
                            {slotDate.toLocaleDateString()} at {slot.time} (RD-{slot.offsetDays} days)
                          </Text>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <Badge variant="light" color="orange">Manual Upload</Badge>
            )}
          </div>
        </div>
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
            Configuration Overrides
          </Text>
          
          <Stack gap="sm">
            {/* Check if config has pre-regression builds */}
            {config.buildPipelines.some(p => p.environment === 'PRE_REGRESSION') && (
              <Group gap="xs">
                {customizations.enablePreRegressionBuilds !== false ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <Text size="sm">
                  Pre-Regression Builds: {
                    customizations.enablePreRegressionBuilds !== false ? 'Enabled' : 'Disabled'
                  }
                </Text>
              </Group>
            )}
            
            {/* Check if config has Checkmate */}
            {config.testManagement.enabled && config.testManagement.provider === 'CHECKMATE' && (
              <Group gap="xs">
                {customizations.enableCheckmate !== false ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <Text size="sm">
                  Checkmate Integration: {
                    customizations.enableCheckmate !== false ? 'Enabled' : 'Disabled'
                  }
                </Text>
              </Group>
            )}
            
            {/* If no customizations available */}
            {!config.buildPipelines.some(p => p.environment === 'PRE_REGRESSION') &&
             !(config.testManagement.enabled && config.testManagement.provider === 'CHECKMATE') && (
              <Text size="sm" c="dimmed" className="italic">
                No configuration overrides available for this release configuration
              </Text>
            )}
            
            {/* Show defaults if everything is enabled */}
            {customizations.enablePreRegressionBuilds !== false && 
             customizations.enableCheckmate !== false &&
             (config.buildPipelines.some(p => p.environment === 'PRE_REGRESSION') ||
              (config.testManagement.enabled && config.testManagement.provider === 'CHECKMATE')) && (
              <Text size="xs" c="dimmed" className="mt-2">
                All features from configuration are enabled for this release
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

