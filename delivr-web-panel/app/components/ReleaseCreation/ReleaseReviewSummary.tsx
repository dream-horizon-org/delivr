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

import { Card, Text, Stack, Group, Divider } from '@mantine/core';
import { IconCheck, IconX, IconCalendar, IconSettings } from '@tabler/icons-react';
import type { ReleaseCreationState, CronConfig } from '~/types/release-creation-backend';
import type { ReleaseConfiguration } from '~/types/release-config';
import { PLATFORM_LABELS, TARGET_PLATFORM_LABELS } from '~/constants/release-config-ui';
import { PLATFORMS, TARGET_PLATFORMS, RELEASE_TYPES } from '~/types/release-config-constants';
import { RELEASE_REVIEW_SUMMARY } from '~/constants/release-creation-ui';
import { PlatformTargetBadge, AppBadge } from '~/components/Common/AppBadge';

interface ReleaseReviewSummaryProps {
  config?: ReleaseConfiguration; // Configuration template (for reference only)
  state: Partial<ReleaseCreationState>; // Actual form data entered by user
  cronConfig?: Partial<CronConfig>;
}

/**
 * Format date and time in readable format
 * Format: "January 2, 2026 at 1:03 PM"
 * Uses native Date API with Intl for reliable formatting
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format (optional)
 */
function formatReadableDateTime(dateStr: string, timeStr?: string): string {
  if (!dateStr) return RELEASE_REVIEW_SUMMARY.NOT_SET;
  
  try {
    // Parse YYYY-MM-DD format
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return RELEASE_REVIEW_SUMMARY.INVALID_DATE;
    }
    
    // Create date object (month is 0-indexed in Date constructor)
    const date = new Date(year, month - 1, day);
    
    // Validate date
    if (isNaN(date.getTime())) {
      return RELEASE_REVIEW_SUMMARY.INVALID_DATE;
    }
    
    // Format date part: "January 2, 2026"
    const datePart = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    
    // Format time part if provided
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const timeDate = new Date(year, month - 1, day, hours, minutes, 0);
        const timePart = timeDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        return `${datePart} at ${timePart}`;
      }
    }
    
    return datePart;
  } catch (error) {
    console.error('[formatReadableDateTime] Error formatting date:', error, { dateStr, timeStr });
    return RELEASE_REVIEW_SUMMARY.INVALID_DATE;
  }
}

/**
 * Format date and time from ISO string
 * Format: "January 2, 2026 at 1:03 PM"
 * Uses native Date API with Intl for reliable formatting
 * @param isoString - ISO date string (e.g., "2026-01-02T13:03:00.000Z")
 */
function formatReadableDateTimeFromISO(isoString: string): string {
  if (!isoString) return RELEASE_REVIEW_SUMMARY.NOT_SET;
  
  try {
    const date = new Date(isoString);
    
    // Validate date
    if (isNaN(date.getTime())) {
      return RELEASE_REVIEW_SUMMARY.INVALID_DATE;
    }
    
    // Format: "January 2, 2026 at 1:03 PM"
    const datePart = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    return `${datePart} at ${timePart}`;
  } catch (error) {
    console.error('[formatReadableDateTimeFromISO] Error formatting date:', error, { isoString });
    return RELEASE_REVIEW_SUMMARY.INVALID_DATE;
  }
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
          {RELEASE_REVIEW_SUMMARY.RELEASE_INFORMATION}
        </Text>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Text size="xs" c="dimmed">
              {RELEASE_REVIEW_SUMMARY.RELEASE_TYPE}
            </Text>
            <AppBadge
              type="release-type"
              value={state.type || RELEASE_TYPES.MINOR}
              title={state.type || RELEASE_TYPES.MINOR}
              size="sm"
            />
          </div>

          <div>
            <Text size="xs" c="dimmed">
              {RELEASE_REVIEW_SUMMARY.BASE_BRANCH}
            </Text>
            <Text fw={500}>{state.baseBranch || RELEASE_REVIEW_SUMMARY.NOT_SET}</Text>
          </div>

          <div className="col-span-2">
            <Text size="xs" c="dimmed" className="mb-2">
              {RELEASE_REVIEW_SUMMARY.PLATFORM_TARGETS}
            </Text>
            <Group gap="xs">
              {/* Show actual platform targets selected in the form (state.platformTargets) */}
              {state.platformTargets && state.platformTargets.length > 0 ? (
                state.platformTargets.map((pt, index) => (
                  <PlatformTargetBadge
                    key={`${pt.platform}-${pt.target}-${index}`}
                    platform={pt.platform}
                    target={pt.target}
                    version={pt.version}
                    size="xs"
                  />
                ))
              ) : (
                <Text size="xs" c="dimmed">
                  {RELEASE_REVIEW_SUMMARY.NONE_SELECTED}
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
                {RELEASE_REVIEW_SUMMARY.DESCRIPTION}
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
            {RELEASE_REVIEW_SUMMARY.SCHEDULE}
          </Text>
        </Group>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Text size="xs" c="dimmed">
              {RELEASE_REVIEW_SUMMARY.TARGET_RELEASE_DATE}
            </Text>
            <Text fw={500}>
              {formatReadableDateTime(state.targetReleaseDate || '', state.targetReleaseTime)}
            </Text>
          </div>

          <div>
            <Text size="xs" c="dimmed">
              {RELEASE_REVIEW_SUMMARY.KICKOFF_DATE}
            </Text>
            <Text fw={500}>
              {formatReadableDateTime(state.kickOffDate || '', state.kickOffTime)}
            </Text>
          </div>

          <div className="col-span-2">
            <Text size="xs" c="dimmed" className="mb-2">
              {RELEASE_REVIEW_SUMMARY.REGRESSION_BUILDS}
            </Text>
            {state.regressionBuildSlots && state.regressionBuildSlots.length > 0 ? (
              <div className="space-y-2">
                <AppBadge
                  type="status"
                  value="success"
                  title={RELEASE_REVIEW_SUMMARY.SCHEDULED(state.regressionBuildSlots.length)}
                />
                <div className="mt-2 space-y-1">
                  {state.regressionBuildSlots.map((slot, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                      <Text size="xs" fw={500}>
                        {RELEASE_REVIEW_SUMMARY.SLOT_NUMBER(index)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatReadableDateTimeFromISO(slot.date)}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <AppBadge
                type="status"
                value="warning"
                title={RELEASE_REVIEW_SUMMARY.MANUAL_UPLOAD}
              />
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
              {RELEASE_REVIEW_SUMMARY.CONFIGURATION_APPLIED}
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
                <span className="font-medium">{RELEASE_REVIEW_SUMMARY.BUILD_PIPELINES(config.ciConfig?.workflows?.length || 0)}</span>
              </div>
              <div>
                <span className="font-medium">{RELEASE_REVIEW_SUMMARY.TARGET_PLATFORMS(config.platformTargets?.length || 0)}</span>
              </div>
              <div>
                <span className="font-medium">
                  {RELEASE_REVIEW_SUMMARY.REGRESSION_SLOTS(state.regressionBuildSlots?.length || 0)}
                </span>
              </div>
            </Group>
          </div>
        </Card>
      )}

      {/* Cron Config Summary */}
      {cronConfig && Object.keys(cronConfig).length > 0 && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text fw={600} size="sm" className="mb-3">
            {RELEASE_REVIEW_SUMMARY.RELEASE_PREFERENCES}
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
                  {RELEASE_REVIEW_SUMMARY.PRE_REGRESSION_BUILDS}{' '}
                  {cronConfig.preRegressionBuilds ? RELEASE_REVIEW_SUMMARY.ENABLED : RELEASE_REVIEW_SUMMARY.DISABLED}
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
                  {RELEASE_REVIEW_SUMMARY.KICKOFF_REMINDER} {cronConfig.kickOffReminder ? RELEASE_REVIEW_SUMMARY.ENABLED : RELEASE_REVIEW_SUMMARY.DISABLED}
                </Text>
              </Group>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
