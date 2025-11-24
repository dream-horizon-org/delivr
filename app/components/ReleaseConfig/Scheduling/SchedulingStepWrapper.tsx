import { Stack, Switch, Text, Alert, Card } from '@mantine/core';
import { IconInfoCircle, IconCalendar } from '@tabler/icons-react';
import type { SchedulingConfig as SchedulingConfigType, Platform } from '~/types/release-config';
import type { SchedulingStepWrapperProps } from '~/types/release-config-props';
import { SchedulingConfig } from './SchedulingConfig';
import { SCHEDULING_LABELS, ICON_SIZES, DEFAULT_SCHEDULING_CONFIG } from '~/constants/release-config-ui';

/**
 * Create default scheduling config when user opts in
 */
const createDefaultSchedulingConfig = (platforms: Platform[]): SchedulingConfigType => {
  const initialVersions: Partial<Record<Platform, string>> = {};
  platforms.forEach(platform => {
    initialVersions[platform] = DEFAULT_SCHEDULING_CONFIG.INITIAL_VERSION;
  });

  return {
    releaseFrequency: DEFAULT_SCHEDULING_CONFIG.RELEASE_FREQUENCY,
    customFrequencyDays: undefined,
    firstReleaseKickoffDate: '', // To be set by user
    initialVersions,
    kickoffTime: DEFAULT_SCHEDULING_CONFIG.KICKOFF_TIME,
    kickoffReminderEnabled: DEFAULT_SCHEDULING_CONFIG.KICKOFF_REMINDER_ENABLED,
    kickoffReminderTime: DEFAULT_SCHEDULING_CONFIG.KICKOFF_REMINDER_TIME,
    targetReleaseTime: DEFAULT_SCHEDULING_CONFIG.TARGET_RELEASE_TIME,
    targetReleaseDateOffsetFromKickoff: DEFAULT_SCHEDULING_CONFIG.TARGET_RELEASE_OFFSET_DAYS,
    workingDays: [...DEFAULT_SCHEDULING_CONFIG.WORKING_DAYS], // Clone array
    timezone: DEFAULT_SCHEDULING_CONFIG.DEFAULT_TIMEZONE,
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
    <Stack gap="md">
      {/* Opt-In Toggle */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="sm">
          <Switch
            label={
              <Text size="md" fw={500}>
                {SCHEDULING_LABELS.ENABLE_RELEASE_TRAIN}
              </Text>
            }
            description={SCHEDULING_LABELS.ENABLE_DESCRIPTION}
            checked={isEnabled}
            onChange={(e) => handleToggle(e.currentTarget.checked)}
            size="md"
          />

          {!isEnabled && (
            <Alert icon={<IconInfoCircle size={ICON_SIZES.SMALL} />} color="blue" variant="light">
              <Text size="sm">
                <strong>{SCHEDULING_LABELS.OPTIONAL_INFO}</strong> {SCHEDULING_LABELS.OPTIONAL_DETAIL}
              </Text>
              <Text size="sm" mt="xs" color="dimmed">
                {SCHEDULING_LABELS.WITHOUT_SCHEDULING}
              </Text>
            </Alert>
          )}
        </Stack>
      </Card>

      {/* Full Scheduling Form (only shown when enabled) */}
      {isEnabled && scheduling && (
        <>
          <Alert icon={<IconCalendar size={ICON_SIZES.SMALL} />} color="teal" variant="light">
            <Text size="sm">
              {SCHEDULING_LABELS.CONFIGURE_BELOW}
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

