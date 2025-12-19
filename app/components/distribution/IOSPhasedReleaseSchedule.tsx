/**
 * IOSPhasedReleaseSchedule - Visual representation of iOS 7-day phased release schedule
 * 
 * Features:
 * - 7-segment progress bar (one segment per day)
 * - Highlights current day
 * - Shows expected percentage for each day
 * - Schedule table with all 7 days
 */

import {
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconCheck, IconClock } from '@tabler/icons-react';
import { useMemo } from 'react';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { IOS_PHASED_RELEASE_SCHEDULE } from '~/constants/distribution/distribution.constants';

// ============================================================================
// TYPES
// ============================================================================

export type IOSPhasedReleaseScheduleProps = {
  currentDay: number; // 1-7
  currentPercentage: number; // Actual current percentage
  className?: string;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function IOSPhasedReleaseSchedule({
  currentDay,
  currentPercentage,
  className,
}: IOSPhasedReleaseScheduleProps) {
  // Calculate progress for visual
  const progressPercent = useMemo(() => {
    return (currentDay / 7) * 100;
  }, [currentDay]);

  return (
    <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.INFO_LIGHT} className={className}>
      <Stack gap={DS_SPACING.MD}>
        {/* Header */}
        <div>
          <Group justify="space-between" mb={DS_SPACING.XS}>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size={DS_TYPOGRAPHY.SIZE.SM}>
              iOS Phased Release Schedule
            </Text>
            <Badge size={DS_TYPOGRAPHY.SIZE.SM} variant="light" color={DS_COLORS.ACTION.PRIMARY}>
              Day {currentDay} of 7
            </Badge>
          </Group>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
            Apple automatically increases rollout over 7 days
          </Text>
        </div>

        {/* 7-Segment Progress Bar */}
        <Box>
          <Progress.Root size={DS_TYPOGRAPHY.SIZE.XL} radius={DS_SPACING.BORDER_RADIUS}>
            {IOS_PHASED_RELEASE_SCHEDULE.map((day, index) => {
              const isComplete = day.day < currentDay;
              const isCurrent = day.day === currentDay;
              const segmentWidth = (1 / 7) * 100;
              
              let color: string;
              if (isComplete) {
                color = 'green';
              } else if (isCurrent) {
                color = 'blue';
              } else {
                color = 'gray';
              }

              return (
                <Progress.Section
                  key={day.day}
                  value={segmentWidth}
                  color={color}
                  style={{
                    opacity: isComplete || isCurrent ? 1 : 0.3,
                  }}
                >
                  {isCurrent && (
                    <Progress.Label
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                      }}
                    >
                      Day {day.day}
                    </Progress.Label>
                  )}
                </Progress.Section>
              );
            })}
          </Progress.Root>
          
          {/* Day Labels */}
          <Group justify="space-between" mt={DS_SPACING.XS}>
            {IOS_PHASED_RELEASE_SCHEDULE.map((day) => (
              <Text
                key={day.day}
                size={DS_TYPOGRAPHY.SIZE.XS}
                c={day.day === currentDay ? 'blue.9' : 'dimmed'}
                fw={day.day === currentDay ? 600 : 400}
                style={{ width: `${(1/7) * 100}%`, textAlign: 'center' }}
              >
                D{day.day}
              </Text>
            ))}
          </Group>
        </Box>

        {/* Current Status */}
        <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} bg="white" withBorder>
          <Group justify="space-between">
            <div>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} mb={DS_SPACING.XS}>Current Rollout</Text>
              <Text size={DS_TYPOGRAPHY.SIZE.LG} fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c={DS_COLORS.STATUS.INFO}>
                {currentPercentage.toFixed(1)}%
              </Text>
            </div>
            <ThemeIcon size={DS_TYPOGRAPHY.SIZE.XL} radius={DS_SPACING.BORDER_RADIUS} variant="light" color={DS_COLORS.ACTION.PRIMARY}>
              <IconClock size={24} />
            </ThemeIcon>
          </Group>
        </Paper>

        {/* Schedule Table */}
        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
            Complete Schedule
          </Text>
          <Table
            striped
            highlightOnHover
            withTableBorder
            withColumnBorders
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>Day</Text>
                </Table.Th>
                <Table.Th>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>Rollout %</Text>
                </Table.Th>
                <Table.Th>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>Status</Text>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {IOS_PHASED_RELEASE_SCHEDULE.map((day) => {
                const isComplete = day.day < currentDay;
                const isCurrent = day.day === currentDay;
                const isPending = day.day > currentDay;

                return (
                  <Table.Tr
                    key={day.day}
                    {...(isCurrent && { style: { backgroundColor: 'var(--mantine-color-blue-0)' } })}
                  >
                    <Table.Td>
                      <Text
                        size={DS_TYPOGRAPHY.SIZE.SM}
                        fw={isCurrent ? 600 : 400}
                        {...(isCurrent && { c: 'blue.9' })}
                      >
                        {day.label}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={DS_SPACING.XS}>
                        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                          {day.description}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {isComplete && (
                        <Badge
                          size={DS_TYPOGRAPHY.SIZE.SM}
                          variant="light"
                          color={DS_COLORS.STATUS.SUCCESS}
                          leftSection={<IconCheck size={12} />}
                        >
                          Complete
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge size={DS_TYPOGRAPHY.SIZE.SM} variant="filled" color={DS_COLORS.ACTION.PRIMARY}>
                          Active
                        </Badge>
                      )}
                      {isPending && (
                        <Badge size={DS_TYPOGRAPHY.SIZE.SM} variant="light" color={DS_COLORS.STATUS.MUTED}>
                          Pending
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </div>

        {/* Info Note */}
        <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} fs="italic">
          💡 You can complete early at any time to immediately release to 100%, 
          or pause the rollout if issues arise.
        </Text>
      </Stack>
    </Paper>
  );
}

