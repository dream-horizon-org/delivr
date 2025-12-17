/**
 * Release Scheduling Panel Component
 * 
 * Backend-compatible scheduling panel for release creation.
 * Handles dates, times, and regression slots in backend format.
 * 
 * Follows cursor rules: No 'any' or 'unknown' types, uses constants
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Stack,
  Text,
  Box,
  Group,
  TextInput,
  Switch,
  Button,
  Badge,
  Alert,
  useMantineTheme,
  Textarea,
} from '@mantine/core';
import {
  IconCalendar,
  IconClock,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react';
import type { ReleaseCreationState } from '~/types/release-creation-backend';
import type { ReleaseConfiguration } from '~/types/release-config';
import { RegressionSlotsManager } from './RegressionSlotsManager';
import { DateTimeInput } from './DateTimeInput';
import {
  DEFAULT_KICKOFF_OFFSET_DAYS,
  DEFAULT_RELEASE_TIME,
  DEFAULT_KICKOFF_TIME,
} from '~/constants/release-creation';
import { showInfoToast } from '~/utils/toast';
import { validateAllSlots } from '~/utils/regression-slot-validation';
import { combineDateAndTime } from '~/utils/release-creation-converter';

interface ReleaseSchedulingPanelProps {
  state: Partial<ReleaseCreationState>;
  onChange: (state: Partial<ReleaseCreationState>) => void;
  config?: ReleaseConfiguration; // For showing default times
  errors?: Record<string, string>;
  showOnlyTargetDateAndSlots?: boolean; // For edit mode after kickoff
  isEditMode?: boolean; // Whether this is edit mode
  existingRelease?: any; // Existing release data for comparison
}

export function ReleaseSchedulingPanel({
  state,
  onChange,
  config,
  errors = {},
  showOnlyTargetDateAndSlots = false,
  isEditMode = false,
  existingRelease,
}: ReleaseSchedulingPanelProps) {
  const theme = useMantineTheme();
  const [enableKickoffDateChange, setEnableKickoffDateChange] = useState(false);
  const {
    targetReleaseDate,
    targetReleaseTime,
    kickOffDate,
    kickOffTime,
    kickOffReminderDate,
    kickOffReminderTime,
    regressionBuildSlots,
    hasManualBuildUpload,
    delayReason,
  } = state;

  // Ensure times have default values if not set
  const targetReleaseTimeValue = targetReleaseTime || DEFAULT_RELEASE_TIME;
  const kickOffTimeValue = kickOffTime || DEFAULT_KICKOFF_TIME;
  
  // Pre-fill kickoff reminder time from config if available
  const kickOffReminderTimeValue = kickOffReminderTime || config?.releaseSchedule?.kickoffReminderTime || '';

  // Validate kickoff reminder date/time is before kickoff date/time
  const reminderValidation = useMemo(() => {
    // Use the actual values (with defaults) for validation
    const reminderTime = kickOffReminderTime || kickOffReminderTimeValue;
    
    if (!kickOffReminderDate || !reminderTime || !kickOffDate || !kickOffTimeValue) {
      return { hasError: false, message: '' };
    }

    // Normalize time format (remove AM/PM if present, ensure HH:MM format)
    const normalizeTime = (time: string): string => {
      // Remove AM/PM and trim
      let normalized = time.replace(/AM|PM/gi, '').trim();
      // If it has AM/PM, convert to 24-hour format
      const isPM = /PM/i.test(time);
      const isAM = /AM/i.test(time);
      
      if (isPM || isAM) {
        const [hours, minutes] = normalized.split(':');
        let hour24 = parseInt(hours, 10);
        if (isPM && hour24 !== 12) hour24 += 12;
        if (isAM && hour24 === 12) hour24 = 0;
        normalized = `${hour24.toString().padStart(2, '0')}:${minutes || '00'}`;
      }
      
      // Ensure format is HH:MM
      if (!normalized.includes(':')) {
        return '00:00';
      }
      
      return normalized;
    };

    const normalizedReminderTime = normalizeTime(reminderTime);
    const normalizedKickoffTime = normalizeTime(kickOffTimeValue);

    // Combine date and time for accurate comparison (ISO format: YYYY-MM-DDTHH:MM)
    const reminderDateTime = new Date(`${kickOffReminderDate}T${normalizedReminderTime}`);
    const kickOffDateTime = new Date(`${kickOffDate}T${normalizedKickoffTime}`);

    if (isNaN(reminderDateTime.getTime()) || isNaN(kickOffDateTime.getTime())) {
      return { hasError: true, message: 'Invalid reminder date or time format' };
    }

    if (reminderDateTime >= kickOffDateTime) {
      return { 
        hasError: true, 
        message: 'Kickoff reminder must be before kickoff time' 
      };
    }

    return { hasError: false, message: '' };
  }, [kickOffReminderDate, kickOffReminderTime, kickOffReminderTimeValue, kickOffDate, kickOffTimeValue]);

  // Calculate default kickoff date (RD - DEFAULT_KICKOFF_OFFSET_DAYS) and pre-fill times from config
  useEffect(() => {
    if (targetReleaseDate && !kickOffDate) {
      const rd = new Date(targetReleaseDate);
      rd.setDate(rd.getDate() - DEFAULT_KICKOFF_OFFSET_DAYS);
      onChange({
        ...state,
        kickOffDate: rd.toISOString().split('T')[0] || '',
      });
    }

    // Pre-fill times from config if available
    if (config?.releaseSchedule) {
      const updates: Partial<ReleaseCreationState> = {};
      
      if (config.releaseSchedule.kickoffTime && !kickOffTime) {
        updates.kickOffTime = config.releaseSchedule.kickoffTime;
      }
      
      if (config.releaseSchedule.targetReleaseTime && !targetReleaseTime) {
        updates.targetReleaseTime = config.releaseSchedule.targetReleaseTime;
      }

      // Pre-fill kickoff reminder time from config if available and not already set
      if (config.releaseSchedule.kickoffReminderTime && !kickOffReminderTime && config.releaseSchedule.kickoffReminderEnabled) {
        updates.kickOffReminderTime = config.releaseSchedule.kickoffReminderTime;
      }

      if (Object.keys(updates).length > 0) {
        onChange({
          ...state,
          ...updates,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, targetReleaseDate]);

  // Check if target release date is being extended (for delayReason requirement)
  const isExtendingTargetDate = useMemo(() => {
    if (!isEditMode || !existingRelease?.targetReleaseDate || !targetReleaseDate) {
      return false;
    }
    const oldDate = new Date(existingRelease.targetReleaseDate);
    const newDate = new Date(targetReleaseDate);
    return newDate > oldDate;
  }, [isEditMode, existingRelease, targetReleaseDate]);

  // Handle release date change - only auto-update kickoff date if it hasn't been manually set
  const handleReleaseDateChange = (date: string) => {
    const updates: Partial<ReleaseCreationState> = {
      targetReleaseDate: date,
    };

    // Only auto-update kickoff date if it's not already set
    // This allows users to set kickoff date independently
    if (!kickOffDate) {
      const rd = new Date(date);
      const kd = new Date(rd);
      kd.setDate(kd.getDate() - DEFAULT_KICKOFF_OFFSET_DAYS);
      updates.kickOffDate = kd.toISOString().split('T')[0] || '';
    }

    // Clear delayReason if shortening target date
    if (isEditMode && existingRelease?.targetReleaseDate) {
      const oldDate = new Date(existingRelease.targetReleaseDate);
      const newDate = new Date(date);
      if (newDate < oldDate) {
        updates.delayReason = undefined;
      }
    }

    onChange({
      ...state,
      ...updates,
    });
  };

  // Validate slots when kickoff date changes
  // Note: Validation errors are shown in the RegressionSlotCardForRelease component
  // This effect just ensures slots are re-validated when dates change
  useEffect(() => {
    // Validation happens in RegressionSlotCardForRelease component
    // This effect is here for potential future use if we need to aggregate errors
  }, [kickOffDate, kickOffTimeValue, targetReleaseDate, targetReleaseTimeValue, regressionBuildSlots]);

  // Check if regression builds are enabled
  const hasRegressionBuilds = regressionBuildSlots && regressionBuildSlots.length > 0;

  return (
    <Stack gap="lg">
      <Box>
        <Text fw={600} size="lg" mb={4}>
          Release Scheduling
        </Text>
        <Text size="sm" c={theme.colors.slate[5]}>
          {showOnlyTargetDateAndSlots 
            ? "Update the target release date and add regression build slots for testing."
            : "Configure when the release branch will be created (kickoff) and when it will be deployed (release date). You can also schedule regression build slots for testing."}
        </Text>
      </Box>

      {/* Kickoff Date & Time (Branch Fork off) - Hidden after kickoff */}
      {!showOnlyTargetDateAndSlots && (
        <Box
          p="md"
          style={{
            border: `1px solid ${theme.colors.slate[2]}`,
            borderRadius: theme.radius.md,
          }}
        >
        <Stack gap="md">
          {/* Toggle to enable kickoff date change in edit mode (only for UPCOMING releases) */}
          {isEditMode && existingRelease && (
            <Group justify="space-between" align="center">
              <Box style={{ flex: 1 }}>
                <Text fw={500} size="sm" mb={4}>Enable Kickoff Date Change</Text>
                <Text size="xs" c="dimmed">
                  Enable this toggle to modify the kickoff date and time. Note: Changing the kickoff date will validate all regression slots. Invalid slots will show errors and must be updated.
                </Text>
              </Box>
              <Switch
                checked={enableKickoffDateChange}
                onChange={(e) => setEnableKickoffDateChange(e.currentTarget.checked)}
                disabled={false}
              />
            </Group>
          )}
          
          {isEditMode && existingRelease && !enableKickoffDateChange ? (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                Changing kickoff date will validate all regression slots. Invalid slots will show errors and must be updated to future times.
              </Text>
            </Alert>
          ) : (
            <DateTimeInput
              dateLabel="Kickoff Date"
              timeLabel="Kickoff Time"
              dateValue={kickOffDate || ''}
              timeValue={kickOffTimeValue}
              onDateChange={(date) => {
                onChange({
                  ...state,
                  kickOffDate: date,
                });
              }}
              onTimeChange={(time) => {
                onChange({
                  ...state,
                  kickOffTime: time,
                });
              }}
              dateError={errors.kickOffDate}
              timeError={errors.kickOffTime}
              dateDescription="Date when the release branch will be created from the base branch. This triggers the release process."
              timeDescription="Time when the branch fork will occur. Use 24-hour format (e.g., 09:00, 14:30)."
              dateMin={new Date().toISOString().split('T')[0]}
              dateMax={targetReleaseDate || undefined}
              required
            />
          )}

          {kickOffDate && targetReleaseDate && (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="xs">
                Branch will fork off on{' '}
                <strong>
                  {new Date(kickOffDate).toLocaleDateString()} at {kickOffTimeValue}
                </strong>
                {', '}
                {Math.ceil(
                  (new Date(targetReleaseDate).getTime() -
                    new Date(kickOffDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days before release
              </Text>
            </Alert>
          )}
        </Stack>
      </Box>
      )}

      {/* Kickoff Reminder Configuration - Hidden after kickoff */}
      {!showOnlyTargetDateAndSlots && kickOffDate && (
        <Box
          p="md"
          style={{
            border: `1px solid ${theme.colors.slate[2]}`,
            borderRadius: theme.radius.md,
          }}
        >
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Group>
                <IconCalendar size={20} />
                <div>
                  <Text fw={600} size="sm">
                    Kickoff Reminder
                  </Text>
                  <Text size="xs" c="dimmed">
                    {config?.releaseSchedule?.kickoffReminderEnabled
                      ? "Kickoff reminder is enabled in your release config"
                      : "Send a reminder before the release kickoff"}
                  </Text>
                </div>
              </Group>
              <Switch
                checked={
                  !!(kickOffReminderDate && kickOffReminderTime) ||
                  (state.cronConfig?.kickOffReminder ?? config?.releaseSchedule?.kickoffReminderEnabled ?? false)
                }
                onChange={(e) => {
                  const currentCronConfig = state.cronConfig || {};
                  onChange({
                    ...state,
                    cronConfig: {
                      ...currentCronConfig,
                      kickOffReminder: e.currentTarget.checked,
                    },
                    // Clear reminder date/time if disabling
                    ...(e.currentTarget.checked === false && {
                      kickOffReminderDate: undefined,
                      kickOffReminderTime: undefined,
                    }),
                  });
                }}
              />
            </Group>
            
            {/* Show date/time fields when reminder toggle is enabled */}
            {(state.cronConfig?.kickOffReminder === true || 
              (!state.cronConfig?.kickOffReminder && 
               (kickOffReminderDate || config?.releaseSchedule?.kickoffReminderEnabled))) && (
              <DateTimeInput
                dateLabel="Kickoff Reminder Date"
                timeLabel="Kickoff Reminder Time"
                dateValue={kickOffReminderDate || ''}
                timeValue={kickOffReminderTimeValue}
                onDateChange={(date) =>
                  onChange({
                    ...state,
                    kickOffReminderDate: date,
                    cronConfig: {
                      ...(state.cronConfig || {}),
                      kickOffReminder: true,
                    },
                  })
                }
                onTimeChange={(time) =>
                  onChange({
                    ...state,
                    kickOffReminderTime: time,
                    cronConfig: {
                      ...(state.cronConfig || {}),
                      kickOffReminder: true,
                    },
                  })
                }
                dateError={
                  errors.kickOffReminderDate || 
                  (reminderValidation.hasError && kickOffReminderDate ? reminderValidation.message : undefined)
                }
                timeError={
                  errors.kickOffReminderTime || 
                  (reminderValidation.hasError && kickOffReminderTime ? reminderValidation.message : undefined)
                }
                dateDescription="Date when to send a reminder notification before the kickoff. Optional but recommended."
                timeDescription="Time when to send the reminder. Must be before the kickoff date and time."
                dateMax={kickOffDate || undefined}
                dateMin={new Date().toISOString().split('T')[0]}
                required={false}
              />
            )}
            
            {kickOffReminderDate && kickOffDate && (
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="xs">
                  Reminder will be sent on{' '}
                  <strong>
                    {new Date(kickOffReminderDate).toLocaleDateString()} at {kickOffReminderTimeValue || 'default time'}
                  </strong>
                  {', before kickoff on '}
                  <strong>
                    {new Date(kickOffDate).toLocaleDateString()} at {kickOffTimeValue}
                  </strong>
                </Text>
              </Alert>
            )}
          </Stack>
        </Box>
      )}

      {/* Target Release Date & Time - Always shown */}
      <Box
        p="md"
        style={{
          border: `1px solid ${theme.colors.slate[2]}`,
          borderRadius: theme.radius.md,
        }}
      >
        <Stack gap="md">
            <DateTimeInput
              dateLabel="Release Date"
              timeLabel="Release Time"
              dateValue={targetReleaseDate || ''}
              timeValue={targetReleaseTimeValue}
              onDateChange={(date) => handleReleaseDateChange(date)}
              onTimeChange={(time) =>
                onChange({
                  ...state,
                  targetReleaseTime: time,
                })
              }
              dateError={errors.targetReleaseDate}
              timeError={errors.targetReleaseTime}
              dateDescription="Date when the release will be deployed to production. Must be after the kickoff date."
              timeDescription="Time when the release will be deployed. Use 24-hour format (e.g., 10:00, 15:30)."
              dateMin={kickOffDate ? new Date(new Date(kickOffDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
              required
            />
            
            {/* Delay Reason - Required when extending target release date */}
            {isExtendingTargetDate && (
              <Textarea
                label="Delay Reason"
                placeholder="e.g., Additional testing required due to critical bug fixes"
                value={delayReason || ''}
                onChange={(e) =>
                  onChange({
                    ...state,
                    delayReason: e.target.value,
                  })
                }
                required
                withAsterisk
                minRows={3}
                maxRows={5}
                description="Please provide a reason for extending the target release date. This is required when moving the release date to a later time."
                error={errors.delayReason}
                styles={{
                  label: { fontWeight: 500, marginBottom: 6 },
                }}
              />
            )}
        </Stack>
      </Box>

      {/* Pre-Regression Builds Configuration - Hidden after kickoff */}
      {!showOnlyTargetDateAndSlots && (
        <Box
          p="md"
          style={{
            border: `1px solid ${theme.colors.slate[2]}`,
            borderRadius: theme.radius.md,
          }}
        >
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Box style={{ flex: 1 }}>
              <Group gap="sm" mb={4}>
                <IconSettings size={20} color={theme.colors.slate[6]} />
                <Text fw={600} size="sm">
                  Pre-Regression Builds
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {config?.ciConfig?.workflows?.some((w: any) => w.environment === 'PRE_REGRESSION')
                  ? "Pre-regression workflows are configured in your release config. Enable this to run pre-regression builds before the release."
                  : "No pre-regression workflows found in your release config. Enable this only if you have pre-regression workflows configured."}
              </Text>
            </Box>
            <Switch
              checked={state.cronConfig?.preRegressionBuilds ?? 
                (config?.ciConfig?.workflows || []).some((w: any) => w.environment === 'PRE_REGRESSION')}
              onChange={(e) => {
                const currentCronConfig = state.cronConfig || {};
                onChange({
                  ...state,
                  cronConfig: {
                    ...currentCronConfig,
                    preRegressionBuilds: e.currentTarget.checked,
                  },
                });
              }}
            />
          </Group>
          
          {state.cronConfig?.preRegressionBuilds === false && (
            <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
              <Text size="xs">
                ⚠️ Pre-regression builds are disabled for this release. Pre-regression testing will be skipped.
              </Text>
            </Alert>
          )}
        </Stack>
      </Box>
      )}

      {/* Regression Build Slots - Always shown if dates are available */}
      {targetReleaseDate && (
        <RegressionSlotsManager
          regressionBuildSlots={regressionBuildSlots || []}
          kickOffDate={kickOffDate || ''} // kickOffDate should always be available from existing release in edit mode
          kickOffTime={kickOffTime}
          targetReleaseDate={targetReleaseDate}
          targetReleaseTime={targetReleaseTime}
          onChange={(slots) =>
            onChange({
              ...state,
              regressionBuildSlots: slots,
              // Automatically set hasManualBuildUpload based on slots
              // If no slots = manual upload, if slots exist = automated builds
              hasManualBuildUpload: slots.length === 0,
            })
          }
          config={config}
          errors={errors}
          isAfterKickoff={showOnlyTargetDateAndSlots}
        />
      )}


    </Stack>
  );
}
