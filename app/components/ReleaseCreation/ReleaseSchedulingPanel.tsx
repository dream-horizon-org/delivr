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
  Card,
  Group,
  TextInput,
  Switch,
  Button,
  Badge,
  Alert,
  Modal,
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
  const [enableKickoffDateChange, setEnableKickoffDateChange] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingKickoffDate, setPendingKickoffDate] = useState<string>('');
  const [pendingKickoffTime, setPendingKickoffTime] = useState<string>('');
  const {
    targetReleaseDate,
    targetReleaseTime,
    kickOffDate,
    kickOffTime,
    kickOffReminderDate,
    kickOffReminderTime,
    regressionBuildSlots,
    hasManualBuildUpload,
  } = state;

  // Ensure times have default values if not set
  const targetReleaseTimeValue = targetReleaseTime || DEFAULT_RELEASE_TIME;
  const kickOffTimeValue = kickOffTime || DEFAULT_KICKOFF_TIME;
  
  // Pre-fill kickoff reminder time from config if available
  const kickOffReminderTimeValue = kickOffReminderTime || config?.scheduling?.kickoffReminderTime || '';

  // Validate kickoff reminder date/time is before kickoff date/time
  const reminderValidation = useMemo(() => {
    if (!kickOffReminderDate || !kickOffReminderTime || !kickOffDate || !kickOffTime) {
      return { hasError: false, message: '' };
    }

    // Combine date and time for accurate comparison
    const reminderDateTime = new Date(`${kickOffReminderDate}T${kickOffReminderTime}`);
    const kickOffDateTime = new Date(`${kickOffDate}T${kickOffTimeValue}`);

    if (isNaN(reminderDateTime.getTime())) {
      return { hasError: true, message: 'Invalid reminder date or time format' };
    }

    if (reminderDateTime >= kickOffDateTime) {
      return { 
        hasError: true, 
        message: 'Kickoff reminder date and time must be before kickoff date and time' 
      };
    }

    return { hasError: false, message: '' };
  }, [kickOffReminderDate, kickOffReminderTime, kickOffDate, kickOffTime, kickOffTimeValue]);

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
    if (config?.scheduling) {
      const updates: Partial<ReleaseCreationState> = {};
      
      if (config.scheduling.kickoffTime && !kickOffTime) {
        updates.kickOffTime = config.scheduling.kickoffTime;
      }
      
      if (config.scheduling.targetReleaseTime && !targetReleaseTime) {
        updates.targetReleaseTime = config.scheduling.targetReleaseTime;
      }

      // Pre-fill kickoff reminder time from config if available and not already set
      if (config.scheduling.kickoffReminderTime && !kickOffReminderTime && config.scheduling.kickoffReminderEnabled) {
        updates.kickOffReminderTime = config.scheduling.kickoffReminderTime;
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

    onChange({
      ...state,
      ...updates,
    });
  };

  // Check if regression builds are enabled
  const hasRegressionBuilds = regressionBuildSlots && regressionBuildSlots.length > 0;

  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Release Scheduling
        </Text>
        <Text size="sm" c="dimmed">
          {showOnlyTargetDateAndSlots 
            ? "Update target release date and add regression slots"
            : "Configure release timeline and regression build slots"}
        </Text>
      </div>

      {/* Kickoff Date & Time (Branch Fork off) - Hidden after kickoff */}
      {!showOnlyTargetDateAndSlots && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="md">
          {/* Toggle to enable kickoff date change in edit mode (only for UPCOMING releases) */}
          {isEditMode && existingRelease && (
            <Group justify="space-between" align="center">
              <div>
                <Text fw={500} size="sm">Enable Kickoff Date Change</Text>
                <Text size="xs" c="dimmed">
                Enable "Kickoff Date Change" toggle above to modify the kickoff date and time
                </Text>
              </div>
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
                Changing kickoff date will remove all regression slots. You will need to manually add them back.
              </Text>
            </Alert>
          ) : (
            <DateTimeInput
              dateLabel="Kickoff Date"
              timeLabel="Kickoff Time"
              dateValue={kickOffDate || ''}
              timeValue={kickOffTimeValue}
              onDateChange={(date) => {
                // Check if kickoff date is actually changing
                const originalKickoffDate = existingRelease?.kickOffDate 
                  ? new Date(existingRelease.kickOffDate).toISOString().split('T')[0]
                  : null;
                
                if (isEditMode && existingRelease && originalKickoffDate && date !== originalKickoffDate) {
                  // Kickoff date is changing - show confirmation
                  setPendingKickoffDate(date);
                  setPendingKickoffTime(kickOffTimeValue);
                  setShowConfirmDialog(true);
                } else {
                  onChange({
                    ...state,
                    kickOffDate: date,
                  });
                }
              }}
              onTimeChange={(time) => {
                // Check if kickoff time is actually changing
                const originalKickoffTime = existingRelease?.kickOffDate
                  ? new Date(existingRelease.kickOffDate).toTimeString().slice(0, 5)
                  : null;
                
                if (isEditMode && existingRelease && originalKickoffTime && time !== originalKickoffTime) {
                  // Kickoff time is changing - show confirmation
                  setPendingKickoffTime(time);
                  setPendingKickoffDate(kickOffDate || '');
                  setShowConfirmDialog(true);
                } else {
                  onChange({
                    ...state,
                    kickOffTime: time,
                  });
                }
              }}
              dateError={errors.kickOffDate}
              dateDescription="Date when the release branch will be forked"
              timeDescription="Time when the branch fork will occur"
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
      </Card>
      )}

      {/* Kickoff Reminder Configuration - Hidden after kickoff */}
      {!showOnlyTargetDateAndSlots && kickOffDate && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Group>
                <IconCalendar size={20} />
                <div>
                  <Text fw={600} size="sm">
                    Kickoff Reminder
                  </Text>
                  <Text size="xs" c="dimmed">
                    {config?.scheduling?.kickoffReminderEnabled
                      ? "Kickoff reminder is enabled in your release config"
                      : "Send a reminder before the release kickoff"}
                  </Text>
                </div>
              </Group>
              <Switch
                checked={
                  !!(kickOffReminderDate && kickOffReminderTime) ||
                  (state.cronConfig?.kickOffReminder ?? config?.scheduling?.kickoffReminderEnabled ?? false)
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
               (kickOffReminderDate || config?.scheduling?.kickoffReminderEnabled))) && (
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
                dateDescription="Date when to send reminder before kickoff"
                timeDescription="Time when to send the reminder (must be before kickoff time)"
                dateMax={kickOffDate || undefined}
                dateMin={new Date().toISOString().split('T')[0]}
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
        </Card>
      )}

      {/* Target Release Date & Time - Always shown */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
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
            dateDescription="Date when the release will be deployed"
            timeDescription="Time when the release will be deployed"
            dateMin={new Date().toISOString().split('T')[0]}
            required
          />
        </Stack>
      </Card>

      {/* Pre-Regression Builds Configuration - Hidden after kickoff */}
      {!showOnlyTargetDateAndSlots && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group>
              <IconSettings size={20} />
              <div>
                <Text fw={600} size="sm">
                  Pre-Regression Builds
                </Text>
                <Text size="xs" c="dimmed">
                  {config?.ciConfig?.workflows?.some((w: any) => w.environment === 'PRE_REGRESSION')
                    ? "Pre-regression workflows are configured in your release config"
                    : "No pre-regression workflows found in your release config"}
                </Text>
              </div>
            </Group>
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
      </Card>
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
        />
      )}

      {/* Confirmation Modal for Kickoff Date Change */}
      <Modal
        opened={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingKickoffDate('');
          setPendingKickoffTime('');
        }}
        title="Confirm Kickoff Date Change"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
            <Text size="sm" fw={500} className="mb-1">
              Changing kickoff date will remove all regression slots
            </Text>
            <Text size="xs">
              You will need to manually add regression slots for this release after the kickoff date is updated.
            </Text>
          </Alert>
          
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingKickoffDate('');
                setPendingKickoffTime('');
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                // Update kickoff date/time
                onChange({
                  ...state,
                  kickOffDate: pendingKickoffDate,
                  kickOffTime: pendingKickoffTime,
                  // Clear regression slots
                  regressionBuildSlots: [],
                });
                
                // Show notification
                showInfoToast({
                  title: 'Regression Slots Removed',
                  message: 'All regression slots have been removed. You will need to manually add regression slots for this release.',
                });
                
                setShowConfirmDialog(false);
                setPendingKickoffDate('');
                setPendingKickoffTime('');
              }}
            >
              Confirm & Remove Slots
            </Button>
          </Group>
        </Stack>
      </Modal>

    </Stack>
  );
}
