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
  getDefaultKickoffTime,
} from '~/constants/release-creation';
import { showInfoToast } from '~/utils/toast';
import { validateAllSlots } from '~/utils/regression-slot-validation';
import { combineDateAndTime, extractDateAndTime } from '~/utils/release-creation-converter';
import { useConfig } from '~/contexts/ConfigContext';
import { canEnableKickoffReminder } from '~/utils/communication-helpers';
import { StageStatus } from '~/types/release-process-enums';
import { SCHEDULING_PANEL } from '~/constants/release-creation-ui';
import { BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import { getReleaseActiveStatus, isPreReleaseInProgress as checkPreReleaseInProgress } from '~/utils/release-utils';
import { RELEASE_ACTIVE_STATUS } from '~/constants/release-ui';

interface ReleaseSchedulingPanelProps {
  state: Partial<ReleaseCreationState>;
  onChange: (state: Partial<ReleaseCreationState>) => void;
  config?: ReleaseConfiguration; // For showing default times
  errors?: Record<string, string>;
  showOnlyTargetDateAndSlots?: boolean; // For edit mode after kickoff
  isEditMode?: boolean; // Whether this is edit mode
  existingRelease?: any; // Existing release data for comparison
  onFieldBlur?: (fieldName: string) => void; // Callback for field blur validation
  onEditingSlotChange?: (slot: any | null, index: number) => void; // Callback when editing slot changes
}

export function ReleaseSchedulingPanel({
  state,
  onChange,
  config,
  errors = {},
  showOnlyTargetDateAndSlots = false,
  isEditMode = false,
  existingRelease,
  onFieldBlur,
  onEditingSlotChange,
}: ReleaseSchedulingPanelProps) {
  const theme = useMantineTheme();
  const { getConnectedIntegrations } = useConfig();
  const [enableKickoffDateChange, setEnableKickoffDateChange] = useState(false);
  
  // Check if kickoff reminder should be shown
  const shouldShowKickoffReminder = canEnableKickoffReminder(
    config?.communicationConfig,
    getConnectedIntegrations('COMMUNICATION')
  );
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
  const kickOffTimeValue = kickOffTime || getDefaultKickoffTime();
  
  // Pre-fill kickoff reminder time from config if available
  const kickOffReminderTimeValue = kickOffReminderTime || config?.releaseSchedule?.kickoffReminderTime || '';

  // Check if pre-release stage or later stages have started
  // Disable adding regression slots once pre-release has started or any later stage is active
  const isPreReleaseInProgress = checkPreReleaseInProgress(isEditMode, existingRelease);

  // Check if reminder date has passed (for upcoming releases in edit mode)
  // Only disable if the ORIGINAL reminder date from existingRelease was in the past
  // Don't disable based on current state (user might be correcting a mistake)
  const isReminderDatePassed = useMemo(() => {
    if (!isEditMode || !existingRelease) {
      return false;
    }
    
    // Only check for upcoming releases
    const activeStatus = getReleaseActiveStatus(existingRelease);
    const isUpcoming = activeStatus === RELEASE_ACTIVE_STATUS.UPCOMING;
    
    if (!isUpcoming) {
      return false;
    }
    
    // Check if the ORIGINAL reminder date/time from existingRelease has passed
    // Use existingRelease.kickOffReminderDate (the original value), not current state
    const originalReminderDate = existingRelease.kickOffReminderDate;
    if (!originalReminderDate) {
      return false; // No original reminder date, don't disable
    }
    
    // Extract date and time from the original reminder date (it's in ISO format)
    const { date: originalDate, time: originalTime } = extractDateAndTime(originalReminderDate);
    if (!originalDate || !originalTime) {
      return false;
    }
    
    // Check if original reminder date/time has passed
    const originalReminderDateTime = combineDateAndTime(originalDate, originalTime);
    const originalReminder = new Date(originalReminderDateTime);
    const now = new Date();
    
    return originalReminder <= now;
  }, [isEditMode, existingRelease]);

  // Check if kickoff reminder is enabled
  const isKickoffReminderEnabled = !!(
    (kickOffReminderDate && kickOffReminderTime) ||
    (state.cronConfig?.kickOffReminder ?? config?.releaseSchedule?.kickoffReminderEnabled ?? false)
  );

  // Validate kickoff reminder date/time is before kickoff date/time
  // Only validate if kickoff reminder is enabled
  const reminderValidation = useMemo(() => {
    // Skip validation if kickoff reminder is not enabled
    if (!isKickoffReminderEnabled) {
      return { hasError: false, message: '' };
    }
    
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
      return { hasError: true, message: SCHEDULING_PANEL.INVALID_REMINDER_FORMAT };
    }

    if (reminderDateTime >= kickOffDateTime) {
      return { 
        hasError: true, 
        message: SCHEDULING_PANEL.REMINDER_MUST_BE_BEFORE_KICKOFF 
      };
    }

    return { hasError: false, message: '' };
  }, [isKickoffReminderEnabled, kickOffReminderDate, kickOffReminderTime, kickOffReminderTimeValue, kickOffDate, kickOffTimeValue, state.cronConfig?.kickOffReminder, config?.releaseSchedule?.kickoffReminderEnabled]);

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
  // Compare full datetimes (date + time) to match backend validation logic
  const isExtendingTargetDate = useMemo(() => {
    if (!isEditMode || !existingRelease?.targetReleaseDate || !targetReleaseDate) {
      return false;
    }
    // Backend compares full datetimes, so we need to compare date + time here too
    const oldDateTime = new Date(existingRelease.targetReleaseDate);
    const newDateTime = new Date(combineDateAndTime(targetReleaseDate, targetReleaseTimeValue));
    return newDateTime > oldDateTime;
  }, [isEditMode, existingRelease, targetReleaseDate, targetReleaseTimeValue]);

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

    // Mark both date and time as touched when date changes to trigger validation
    if (onFieldBlur) {
      onFieldBlur('targetReleaseDate');
      onFieldBlur('targetReleaseTime');
    }
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
          {SCHEDULING_PANEL.TITLE}
        </Text>
        <Text size="sm" c={theme.colors.slate[5]}>
          {showOnlyTargetDateAndSlots 
            ? SCHEDULING_PANEL.DESCRIPTION_EDIT_MODE
            : SCHEDULING_PANEL.DESCRIPTION_CREATE_MODE}
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
                <Text fw={500} size="sm" mb={4}>{SCHEDULING_PANEL.ENABLE_KICKOFF_DATE_CHANGE}</Text>
                <Text size="xs" c="dimmed">
                  {SCHEDULING_PANEL.ENABLE_KICKOFF_DATE_CHANGE_DESC}
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
                {SCHEDULING_PANEL.KICKOFF_DATE_CHANGE_WARNING}
              </Text>
            </Alert>
          ) : (
            <DateTimeInput
              dateLabel={SCHEDULING_PANEL.KICKOFF_DATE_LABEL}
              timeLabel={SCHEDULING_PANEL.KICKOFF_TIME_LABEL}
              dateValue={kickOffDate || ''}
              timeValue={kickOffTimeValue}
              onDateChange={(date) => {
                onChange({
                  ...state,
                  kickOffDate: date,
                });
                // Mark both date and time as touched when date changes to trigger validation
                if (onFieldBlur) {
                  onFieldBlur('kickOffDate');
                  onFieldBlur('kickOffTime');
                }
              }}
              onTimeChange={(time) => {
                onChange({
                  ...state,
                  kickOffTime: time,
                });
              }}
              onDateBlur={() => {
                if (onFieldBlur) {
                  onFieldBlur('kickOffDate');
                }
              }}
              onTimeBlur={() => {
                if (onFieldBlur) {
                  onFieldBlur('kickOffTime');
                }
              }}
              dateError={errors.kickOffDateTime || errors.kickOffDate}
              timeError={errors.kickOffDateTime || errors.kickOffTime}
              dateDescription={SCHEDULING_PANEL.KICKOFF_DATE_DESCRIPTION}
              timeDescription={SCHEDULING_PANEL.KICKOFF_TIME_DESCRIPTION}
              dateMin={new Date().toISOString().split('T')[0]}
              dateMax={targetReleaseDate || undefined}
              required
            />
          )}

          {/* Hide "Branch will fork off" message in edit mode */}
          {!isEditMode && kickOffDate && targetReleaseDate && (() => {
            const daysDiff = Math.ceil(
              (new Date(targetReleaseDate).getTime() -
                new Date(kickOffDate).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const isSameDay = daysDiff === 0;
            
            return (
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="xs">
                  {SCHEDULING_PANEL.BRANCH_FORK_MESSAGE_PREFIX}
                  <strong>
                    {new Date(kickOffDate).toLocaleDateString()}{SCHEDULING_PANEL.AT}{kickOffTimeValue}
                  </strong>
                  {', '}
                  {isSameDay ? (
                    <strong>{SCHEDULING_PANEL.BRANCH_FORK_SAME_DAY}</strong>
                  ) : (
                    <>
                      <strong>{daysDiff}</strong>
                      {SCHEDULING_PANEL.BRANCH_FORK_MESSAGE_SUFFIX}
                    </>
                  )}
                </Text>
              </Alert>
            );
          })()}
        </Stack>
      </Box>
      )}

      {/* Kickoff Reminder Configuration - Only show if communication is enabled */}
      {!showOnlyTargetDateAndSlots && kickOffDate && shouldShowKickoffReminder && (
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
                    {SCHEDULING_PANEL.KICKOFF_REMINDER_TITLE}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {config?.releaseSchedule?.kickoffReminderEnabled
                      ? SCHEDULING_PANEL.KICKOFF_REMINDER_ENABLED_DESC
                      : SCHEDULING_PANEL.KICKOFF_REMINDER_DISABLED_DESC}
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
            
            {/* Show date/time fields only when reminder toggle is enabled */}
            {isKickoffReminderEnabled && (
              <DateTimeInput
                dateLabel={SCHEDULING_PANEL.KICKOFF_REMINDER_DATE_LABEL}
                timeLabel={SCHEDULING_PANEL.KICKOFF_REMINDER_TIME_LABEL}
                dateValue={kickOffReminderDate || ''}
                timeValue={kickOffReminderTimeValue}
                onDateChange={(date) => {
                  onChange({
                    ...state,
                    kickOffReminderDate: date,
                    cronConfig: {
                      ...(state.cronConfig || {}),
                      kickOffReminder: true,
                    },
                  });
                  // Mark both date and time as touched when date changes to trigger validation
                  if (onFieldBlur) {
                    onFieldBlur('kickOffReminderDate');
                    onFieldBlur('kickOffReminderTime');
                  }
                }}
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
                onDateBlur={() => {
                  if (onFieldBlur) {
                    onFieldBlur('kickOffReminderDate');
                  }
                }}
                onTimeBlur={() => {
                  if (onFieldBlur) {
                    onFieldBlur('kickOffReminderTime');
                  }
                }}
                dateError={
                  errors.kickOffReminderDate || 
                  (reminderValidation.hasError && kickOffReminderDate ? reminderValidation.message : undefined)
                }
                timeError={
                  errors.kickOffReminderTime || 
                  (reminderValidation.hasError && kickOffReminderTime ? reminderValidation.message : undefined)
                }
                dateDescription={SCHEDULING_PANEL.KICKOFF_REMINDER_DATE_DESCRIPTION}
                timeDescription={SCHEDULING_PANEL.KICKOFF_REMINDER_TIME_DESCRIPTION}
                dateMax={kickOffDate || undefined}
                dateMin={new Date().toISOString().split('T')[0]}
                required={false}
                disabled={isReminderDatePassed}
              />
            )}
            
            {kickOffReminderDate && kickOffDate && (
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="xs">
                  {SCHEDULING_PANEL.REMINDER_SENT_MESSAGE_PREFIX}{' '}
                  <strong>
                    {new Date(kickOffReminderDate).toLocaleDateString()} {SCHEDULING_PANEL.AT} {kickOffReminderTimeValue || SCHEDULING_PANEL.DEFAULT_TIME}
                  </strong>
                  {`, ${SCHEDULING_PANEL.REMINDER_SENT_MESSAGE_BEFORE} `}
                  <strong>
                    {new Date(kickOffDate).toLocaleDateString()} {SCHEDULING_PANEL.AT} {kickOffTimeValue}
                  </strong>
                </Text>
              </Alert>
            )}
          </Stack>
        </Box>
      )}

      {/* Show message if communication is not enabled */}
      {!showOnlyTargetDateAndSlots && kickOffDate && !shouldShowKickoffReminder && (
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="blue"
          variant="light"
          title={SCHEDULING_PANEL.KICKOFF_REMINDER_TITLE}
        >
          <Text size="sm">
            {getConnectedIntegrations('COMMUNICATION').length === 0
              ? SCHEDULING_PANEL.NO_COMMUNICATION_INTEGRATION
              : SCHEDULING_PANEL.COMMUNICATION_NOT_ENABLED}
          </Text>
        </Alert>
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
              dateLabel={SCHEDULING_PANEL.RELEASE_DATE_LABEL}
              timeLabel={SCHEDULING_PANEL.RELEASE_TIME_LABEL}
              dateValue={targetReleaseDate || ''}
              timeValue={targetReleaseTimeValue}
              onDateChange={(date) => handleReleaseDateChange(date)}
              onTimeChange={(time) =>
                onChange({
                  ...state,
                  targetReleaseTime: time,
                })
              }
              onDateBlur={() => {
                if (onFieldBlur) {
                  onFieldBlur('targetReleaseDate');
                }
              }}
              onTimeBlur={() => {
                if (onFieldBlur) {
                  onFieldBlur('targetReleaseTime');
                }
              }}
              dateError={errors.targetReleaseDateTime || errors.targetReleaseDate}
              timeError={errors.targetReleaseDateTime || errors.targetReleaseTime}
              dateDescription={SCHEDULING_PANEL.RELEASE_DATE_DESCRIPTION}
              timeDescription={SCHEDULING_PANEL.RELEASE_TIME_DESCRIPTION}
              dateMin={kickOffDate ? new Date(kickOffDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
              required
            />
            
            {/* Delay Reason - Required when extending target release date */}
            {isExtendingTargetDate && (
              <Textarea
                label={SCHEDULING_PANEL.DELAY_REASON_LABEL}
                placeholder={SCHEDULING_PANEL.DELAY_REASON_PLACEHOLDER}
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
                description={SCHEDULING_PANEL.DELAY_REASON_DESCRIPTION}
                error={errors.delayReason}
                styles={{
                  label: { fontWeight: 500, marginBottom: 6 },
                }}
              />
            )}
        </Stack>
      </Box>

      {/* Pre-Regression Builds Configuration - Hidden after kickoff and in edit mode */}
      {!showOnlyTargetDateAndSlots && !isEditMode && (
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
                  {SCHEDULING_PANEL.PRE_REGRESSION_BUILDS_TITLE}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {config?.ciConfig?.workflows?.some((w: any) => w.environment === BUILD_ENVIRONMENTS.PRE_REGRESSION)
                  ? SCHEDULING_PANEL.PRE_REGRESSION_ENABLED_DESC
                  : SCHEDULING_PANEL.PRE_REGRESSION_DISABLED_DESC}
              </Text>
            </Box>
            <Switch
              checked={state.cronConfig?.preRegressionBuilds ?? 
                (config?.ciConfig?.workflows || []).some((w: any) => w.environment === BUILD_ENVIRONMENTS.PRE_REGRESSION)}
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
              disabled={(() => {
                // Always enabled for manual build upload
                if (state.hasManualBuildUpload === true) {
                  return false;
                }
                
                // For CI/CD mode: check if all platforms in config have pre-regression workflows
                if (state.hasManualBuildUpload === false && config?.platformTargets) {
                  // Get unique platforms from config
                  const platforms = [...new Set(config.platformTargets.map((pt: any) => pt.platform))];
                  
                  // Check if each platform has an enabled pre-regression workflow
                  const workflows = config.ciConfig?.workflows || [];
                  const allPlatformsHavePreRegression = platforms.every((platform: string) => {
                    return workflows.some(
                      (w: any) => 
                        w.platform === platform && 
                        w.environment === BUILD_ENVIRONMENTS.PRE_REGRESSION && 
                        w.enabled === true
                    );
                  });
                  
                  // Disable if not all platforms have pre-regression workflows
                  return !allPlatformsHavePreRegression;
                }
                
                // Default: enable if no config or workflows exist
                return false;
              })()}
            />
          </Group>
          
          {state.cronConfig?.preRegressionBuilds === false && (
            <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
              <Text size="xs">
                {SCHEDULING_PANEL.PRE_REGRESSION_DISABLED_WARNING}
              </Text>
            </Alert>
          )}
        </Stack>
      </Box>
      )}

      {/* Regression Build Slots - Only shown if dates are available and slots can be added */}
      {targetReleaseDate && !isPreReleaseInProgress && (
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
              // Use hasManualBuildUpload from selected config (not derived from slots)
              // If config is not available, keep existing state value
              hasManualBuildUpload: config?.hasManualBuildUpload ?? state.hasManualBuildUpload,
            })
          }
          config={config}
          errors={errors}
          isAfterKickoff={showOnlyTargetDateAndSlots}
          disableAddSlot={false}
          isEditMode={isEditMode}
          onEditingSlotChange={onEditingSlotChange}
        />
      )}


    </Stack>
  );
}
