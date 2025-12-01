/**
 * Release Scheduling Panel Component
 * 
 * Backend-compatible scheduling panel for release creation.
 * Handles dates, times, and regression slots in backend format.
 * 
 * Follows cursor rules: No 'any' or 'unknown' types, uses constants
 */

import { useEffect } from 'react';
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
} from '@mantine/core';
import {
  IconCalendar,
  IconClock,
  IconInfoCircle,
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

interface ReleaseSchedulingPanelProps {
  state: Partial<ReleaseCreationState>;
  onChange: (state: Partial<ReleaseCreationState>) => void;
  config?: ReleaseConfiguration; // For showing default times
  errors?: Record<string, string>;
}

export function ReleaseSchedulingPanel({
  state,
  onChange,
  config,
  errors = {},
}: ReleaseSchedulingPanelProps) {
  const {
    targetReleaseDate,
    targetReleaseTime,
    kickOffDate,
    kickOffTime,
    regressionBuildSlots,
    hasManualBuildUpload,
  } = state;

  // Ensure times have default values if not set
  const targetReleaseTimeValue = targetReleaseTime || DEFAULT_RELEASE_TIME;
  const kickOffTimeValue = kickOffTime || DEFAULT_KICKOFF_TIME;

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

      if (Object.keys(updates).length > 0) {
        onChange({
          ...state,
          ...updates,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, targetReleaseDate]);

  // Handle release date change - auto-update kickoff date
  const handleReleaseDateChange = (date: string) => {
    const rd = new Date(date);
    const kd = new Date(rd);
    kd.setDate(kd.getDate() - DEFAULT_KICKOFF_OFFSET_DAYS);

    onChange({
      ...state,
      targetReleaseDate: date,
      kickOffDate: kd.toISOString().split('T')[0] || '',
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
          Configure release timeline and regression build slots
        </Text>
      </div>

      {/* Kickoff Date & Time (Branch Fork off) */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="md">
          <DateTimeInput
            dateLabel="Kickoff Date"
            timeLabel="Kickoff Time"
            dateValue={kickOffDate || ''}
            timeValue={kickOffTimeValue}
            onDateChange={(date) =>
              onChange({
                ...state,
                kickOffDate: date,
              })
            }
            onTimeChange={(time) =>
              onChange({
                ...state,
                kickOffTime: time,
              })
            }
            dateError={errors.kickOffDate}
            dateDescription="Date when the release branch will be forked"
            timeDescription="Time when the branch fork will occur"
            dateMax={targetReleaseDate || undefined}
            required
          />

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

      {/* Target Release Date & Time */}
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

      {/* Regression Build Slots */}
      {kickOffDate && targetReleaseDate && (
        <RegressionSlotsManager
          regressionBuildSlots={regressionBuildSlots || []}
          kickOffDate={kickOffDate}
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

    </Stack>
  );
}
