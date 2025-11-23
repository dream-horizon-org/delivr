/**
 * Scheduling Step Wrapper
 * Provides opt-in toggle for scheduling configuration
 */

import { useState } from 'react';
import { Stack, Switch, Text, Alert, Card } from '@mantine/core';
import { IconInfoCircle, IconCalendar } from '@tabler/icons-react';
import type { SchedulingConfig as SchedulingConfigType, Platform } from '~/types/release-config';
import { SchedulingConfig } from './SchedulingConfig';

interface SchedulingStepWrapperProps {
  scheduling: SchedulingConfigType | undefined;
  onChange: (scheduling: SchedulingConfigType | undefined) => void;
  selectedPlatforms: Platform[];
}

/**
 * Create default scheduling config when user opts in
 */
const createDefaultSchedulingConfig = (platforms: Platform[]): SchedulingConfigType => {
  const initialVersions: Partial<Record<Platform, string>> = {};
  platforms.forEach(platform => {
    initialVersions[platform] = '1.0.0'; // Default version
  });

  return {
    releaseFrequency: 'WEEKLY',
    customFrequencyDays: undefined,
    firstReleaseKickoffDate: '', // To be set by user
    initialVersions,
    kickoffTime: '10:00',
    kickoffReminderEnabled: true,
    kickoffReminderTime: '09:00',
    targetReleaseTime: '18:00',
    targetReleaseDateOffsetFromKickoff: 5,
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
    timezone: 'Asia/Kolkata',
    regressionSlots: [],
  };
};

export function SchedulingStepWrapper({ 
  scheduling, 
  onChange, 
  selectedPlatforms 
}: SchedulingStepWrapperProps) {
  const isEnabled = scheduling !== undefined && scheduling !== null;

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      // User opted in - create default config
      onChange(createDefaultSchedulingConfig(selectedPlatforms));
    } else {
      // User opted out - set to undefined (will send null to backend)
      onChange(undefined);
    }
  };

  return (
    <Stack spacing="md">
      {/* Opt-In Toggle */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack spacing="sm">
          <Switch
            label={
              <Text size="md" weight={500}>
                Enable Release Train Scheduling
              </Text>
            }
            description="Automate release cycles with predefined schedules, regression slots, and working days"
            checked={isEnabled}
            onChange={(e) => handleToggle(e.currentTarget.checked)}
            size="md"
          />

          {!isEnabled && (
            <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
              <Text size="sm">
                <strong>Release train scheduling is optional.</strong> Enable it if you want to automate recurring releases
                with predefined cycles, kickoff times, regression slots, and working days.
              </Text>
              <Text size="sm" mt="xs" color="dimmed">
                Without scheduling, you'll create releases manually when needed.
              </Text>
            </Alert>
          )}
        </Stack>
      </Card>

      {/* Full Scheduling Form (only shown when enabled) */}
      {isEnabled && scheduling && (
        <>
          <Alert icon={<IconCalendar size={18} />} color="teal" variant="light">
            <Text size="sm">
              Configure your release train schedule below. All fields are required for automated release cycles.
            </Text>
          </Alert>

          <SchedulingConfig
            config={scheduling}
            onChange={onChange}
            selectedPlatforms={selectedPlatforms}
          />
        </>
      )}
    </Stack>
  );
}

