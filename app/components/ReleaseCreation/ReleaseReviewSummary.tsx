/**
 * Release Review Summary Component
 * Final review before creating the release
 * 
 * The `state` parameter represents the actual form data entered by the user:
 * - state.platformTargets: Array of platform-target-version combinations selected in the form
 * - state.type: Release type selected/configured
 * - state.baseBranch: Base branch selected
 * - state.kickOffDate/Time: Dates and times entered by user
 * - state.targetReleaseDate/Time: Target release dates entered by user
 * - state.regressionBuildSlots: Regression slots added by user
 * 
 * This preview shows what will actually be sent to the backend, not config defaults.
 */

import { Card, Text, Stack, Group, Badge, Divider } from '@mantine/core';
import { IconCheck, IconX, IconCalendar, IconSettings } from '@tabler/icons-react';
import type { ReleaseCreationState, CronConfig } from '~/types/release-creation-backend';
import type { ReleaseConfiguration } from '~/types/release-config';
import { PLATFORM_LABELS, TARGET_PLATFORM_LABELS } from '~/constants/release-config-ui';

interface ReleaseReviewSummaryProps {
  config?: ReleaseConfiguration; // Configuration template (for reference only)
  state: Partial<ReleaseCreationState>; // Actual form data entered by user
  cronConfig?: Partial<CronConfig>;
}

export function ReleaseReviewSummary({
  config,
  state,
  cronConfig,
}: ReleaseReviewSummaryProps) {
  return (
    <Stack gap="lg">

      {/* Basic Details */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Text fw={600} size="sm" className="mb-3">
          Release Information
        </Text>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Text size="xs" c="dimmed">
              Release Type
            </Text>
            <Badge variant="light" size="sm">
              {state.type || 'PLANNED'}
            </Badge>
          </div>

          <div>
            <Text size="xs" c="dimmed">
              Base Branch
            </Text>
            <Text fw={500}>{state.baseBranch || 'Not set'}</Text>
          </div>

          <div className="col-span-2">
            <Text size="xs" c="dimmed" className="mb-2">
              Platform Targets
            </Text>
            <Group gap="xs">
              {/* Show actual platform targets selected in the form (state.platformTargets) */}
              {state.platformTargets && state.platformTargets.length > 0 ? (
                state.platformTargets.map((pt, index) => (
                  <Badge key={`${pt.platform}-${pt.target}-${index}`} size="xs">
                    {pt.platform === 'ANDROID'
                      ? PLATFORM_LABELS.ANDROID
                      : pt.platform === 'IOS'
                      ? PLATFORM_LABELS.IOS
                      : PLATFORM_LABELS.WEB}{' '}
                    →{' '}
                    {pt.target === 'PLAY_STORE'
                      ? TARGET_PLATFORM_LABELS.PLAY_STORE
                      : pt.target === 'APP_STORE'
                      ? TARGET_PLATFORM_LABELS.APP_STORE
                      : TARGET_PLATFORM_LABELS.WEB}{' '}
                    ({pt.version})
                  </Badge>
                ))
              ) : (
                <Text size="xs" c="dimmed">
                  None selected
                </Text>
              )}
            </Group>
          </div>
        </div>

        {state.description && (
          <>
            <Divider className="my-3" />
            <div>
              <Text size="xs" c="dimmed" className="mb-1">
                Description
              </Text>
              <Text size="sm">{state.description}</Text>
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
            <Text size="xs" c="dimmed">
              Target Release Date
            </Text>
            <Text fw={500}>
              {state.targetReleaseDate
                ? new Date(state.targetReleaseDate).toLocaleDateString()
                : 'Not set'}
              {state.targetReleaseTime && ` at ${state.targetReleaseTime}`}
            </Text>
          </div>

          <div>
            <Text size="xs" c="dimmed">
              Kickoff Date
            </Text>
            <Text fw={500}>
              {state.kickOffDate
                ? new Date(state.kickOffDate).toLocaleDateString()
                : 'Not set'}
              {state.kickOffTime && ` at ${state.kickOffTime}`}
            </Text>
          </div>

          <div className="col-span-2">
            <Text size="xs" c="dimmed" className="mb-2">
              Regression Builds
            </Text>
            {state.regressionBuildSlots && state.regressionBuildSlots.length > 0 ? (
              <div className="space-y-2">
                <Badge variant="light" color="green">
                  Scheduled ({state.regressionBuildSlots.length} slot
                  {state.regressionBuildSlots.length !== 1 ? 's' : ''})
                </Badge>
                <div className="mt-2 space-y-1">
                  {state.regressionBuildSlots.map((slot, index) => {
                    const slotDate = new Date(slot.date);
                    return (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                        <Text size="xs" fw={500}>
                          Slot {index + 1}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {slotDate.toLocaleDateString()} at{' '}
                          {slotDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Badge variant="light" color="orange">
                Manual Upload
              </Badge>
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
              <Text fw={500} className="text-blue-900">
                {config.name}
              </Text>
              {config.description && (
                <Text size="xs" c="dimmed">
                  {config.description}
                </Text>
              )}
            </div>

            <Group gap="md" className="text-xs">
              <div>
                <span className="font-medium">{config.ciConfig?.workflows?.length || 0}</span> build pipelines
              </div>
              <div>
                <span className="font-medium">{config.targets?.length || 0}</span> target platforms
              </div>
              <div>
                <span className="font-medium">
                  {config.scheduling?.regressionSlots?.length || 0}
                </span>{' '}
                regression slots
              </div>
            </Group>
          </div>
        </Card>
      )}

      {/* Cron Config Summary */}
      {cronConfig && Object.keys(cronConfig).length > 0 && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text fw={600} size="sm" className="mb-3">
            Automation Settings
          </Text>

          <Stack gap="sm">
            {cronConfig.preRegressionBuilds !== undefined && (
              <Group gap="xs">
                {cronConfig.preRegressionBuilds ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <Text size="sm">
                  Pre-Regression Builds:{' '}
                  {cronConfig.preRegressionBuilds ? 'Enabled' : 'Disabled'}
                </Text>
              </Group>
            )}

            {cronConfig.automationRuns !== undefined && (
              <Group gap="xs">
                {cronConfig.automationRuns ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <Text size="sm">
                  Automation Runs: {cronConfig.automationRuns ? 'Enabled' : 'Disabled'}
                </Text>
              </Group>
            )}

            {cronConfig.automationBuilds !== undefined && (
              <Group gap="xs">
                {cronConfig.automationBuilds ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <Text size="sm">
                  Automation Builds: {cronConfig.automationBuilds ? 'Enabled' : 'Disabled'}
                </Text>
              </Group>
            )}

            {cronConfig.kickOffReminder !== undefined && (
              <Group gap="xs">
                {cronConfig.kickOffReminder ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <Text size="sm">
                  Kickoff Reminder: {cronConfig.kickOffReminder ? 'Enabled' : 'Disabled'}
                </Text>
              </Group>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
