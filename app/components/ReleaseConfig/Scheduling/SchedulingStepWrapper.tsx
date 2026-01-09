/**
 * Scheduling Step Wrapper
 * Optional step for configuring release train scheduling
 */

import {
  Stack,
  Switch,
  Text,
  Paper,
  Group,
  Box,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core';
import {
  IconCalendar,
  IconCheck,
  IconInfoCircle,
} from '@tabler/icons-react';
import type { SchedulingConfig as SchedulingConfigType, Platform, CommunicationConfig, InitialVersion } from '~/types/release-config';
import type { PlatformTarget } from '~/utils/platform-mapper';
import type { SchedulingStepWrapperProps } from '~/types/release-config-props';
import { SchedulingConfig } from './SchedulingConfig';
import { DEFAULT_SCHEDULING_CONFIG } from '~/constants/release-config-ui';
import { PLATFORMS, TARGET_PLATFORMS } from '~/types/release-config-constants';

const createDefaultSchedulingConfig = (platformTargets: PlatformTarget[]): SchedulingConfigType => {
  // Create array format: one entry per platform-target combination
  const initialVersions: InitialVersion[] = platformTargets.map((pt) => ({
    platform: pt.platform,
    target: pt.target,
    version: DEFAULT_SCHEDULING_CONFIG.INITIAL_VERSION,
  }));

  return {
    releaseFrequency: DEFAULT_SCHEDULING_CONFIG.RELEASE_FREQUENCY,
    firstReleaseKickoffDate: '',
    initialVersions,
    kickoffTime: DEFAULT_SCHEDULING_CONFIG.KICKOFF_TIME,
    kickoffReminderEnabled: DEFAULT_SCHEDULING_CONFIG.KICKOFF_REMINDER_ENABLED,
    kickoffReminderTime: DEFAULT_SCHEDULING_CONFIG.KICKOFF_REMINDER_TIME,
    targetReleaseTime: DEFAULT_SCHEDULING_CONFIG.TARGET_RELEASE_TIME,
    targetReleaseDateOffsetFromKickoff: DEFAULT_SCHEDULING_CONFIG.TARGET_RELEASE_OFFSET_DAYS,
    workingDays: [...DEFAULT_SCHEDULING_CONFIG.WORKING_DAYS],
    timezone: DEFAULT_SCHEDULING_CONFIG.DEFAULT_TIMEZONE,
    regressionSlots: [],
  };
};

export function SchedulingStepWrapper({
  scheduling,
  onChange,
  selectedPlatforms,
  showValidation = false,
  communicationConfig,
  platformTargets = [],
  isEditMode = false,
}: SchedulingStepWrapperProps & { communicationConfig?: CommunicationConfig; platformTargets?: PlatformTarget[] }) {
  const theme = useMantineTheme();
  const isEnabled = scheduling !== undefined && scheduling !== null;

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      // Use platformTargets if available, otherwise derive from selectedPlatforms
      const targets = platformTargets.length > 0 
        ? platformTargets 
        : selectedPlatforms.map((platform) => ({
            platform,
            target: platform === PLATFORMS.ANDROID ? TARGET_PLATFORMS.PLAY_STORE : platform === PLATFORMS.IOS ? TARGET_PLATFORMS.APP_STORE : TARGET_PLATFORMS.WEB,
          } as PlatformTarget));
      onChange(createDefaultSchedulingConfig(targets));
    } else {
      onChange(undefined);
    }
  };

  return (
    <Stack gap="lg">
      {/* Info Header */}
      <Paper
        p="md"
        radius="md"
        style={{
          backgroundColor: theme.colors.cyan[0],
          border: `1px solid ${theme.colors.cyan[2]}`,
        }}
      >
        <Group gap="sm">
          <ThemeIcon size={32} radius="md" variant="light" color="cyan">
            <IconCalendar size={18} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={600} c={theme.colors.cyan[8]} mb={2}>
              Release Train Scheduling
            </Text>
            <Text size="xs" c={theme.colors.cyan[7]}>
              Optional: Automate release scheduling with a release train model
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* Enable Toggle */}
      <Paper p="lg" radius="md" withBorder>
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <ThemeIcon
              size={40}
              radius="md"
              variant={isEnabled ? 'filled' : 'light'}
              color={isEnabled ? 'cyan' : 'gray'}
            >
              <IconCalendar size={22} />
            </ThemeIcon>
            <Box>
              <Group gap="xs" mb={4}>
                <Text fw={600} size="md" c={theme.colors.slate[8]}>
                  Enable Release Train Scheduling
                </Text>
                {isEnabled && (
                  <ThemeIcon size={20} radius="xl" color="cyan">
                    <IconCheck size={12} />
                  </ThemeIcon>
                )}
              </Group>
              <Text size="sm" c={theme.colors.slate[5]}>
                Automate release cycles with scheduled kickoff and release dates
              </Text>
            </Box>
          </Group>
          <Switch
            checked={isEnabled}
            onChange={(e) => handleToggle(e.currentTarget.checked)}
            size="md"
            color="cyan"
          />
        </Group>
      </Paper>

      {/* Disabled State */}
      {!isEnabled && (
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.slate[0],
            border: `1px solid ${theme.colors.slate[2]}`,
          }}
        >
          <Group gap="sm">
            <ThemeIcon size={28} radius="md" variant="light" color="gray">
              <IconInfoCircle size={16} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500} c={theme.colors.slate[7]} mb={2}>
                Scheduling is optional
              </Text>
              <Text size="xs" c={theme.colors.slate[5]}>
                You can create releases manually without a release train schedule.
                Enable scheduling to automate release cycles.
              </Text>
            </Box>
          </Group>
        </Paper>
      )}

      {/* Full Scheduling Form */}
      {isEnabled && scheduling && (
        <SchedulingConfig
          config={scheduling}
          onChange={onChange}
          selectedPlatforms={selectedPlatforms}
          showValidation={showValidation}
          communicationConfig={communicationConfig}
          platformTargets={platformTargets.length > 0 ? platformTargets : selectedPlatforms.map((platform) => ({
            platform,
            target: platform === PLATFORMS.ANDROID ? TARGET_PLATFORMS.PLAY_STORE : platform === PLATFORMS.IOS ? TARGET_PLATFORMS.APP_STORE : TARGET_PLATFORMS.WEB,
          } as PlatformTarget))}
          isEditMode={isEditMode}
        />
      )}
    </Stack>
  );
}
