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

// ============================================================================
// TYPES
// ============================================================================

export type IOSPhasedReleaseScheduleProps = {
  currentDay: number; // 1-7
  currentPercentage: number; // Actual current percentage
  className?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

// Apple's phased release schedule (approximate percentages)
const PHASED_SCHEDULE = [
  { day: 1, percentage: 1, label: 'Day 1', description: '~1% of users' },
  { day: 2, percentage: 2, label: 'Day 2', description: '~2% of users' },
  { day: 3, percentage: 5, label: 'Day 3', description: '~5% of users' },
  { day: 4, percentage: 10, label: 'Day 4', description: '~10% of users' },
  { day: 5, percentage: 20, label: 'Day 5', description: '~20% of users' },
  { day: 6, percentage: 50, label: 'Day 6', description: '~50% of users' },
  { day: 7, percentage: 100, label: 'Day 7', description: '100% of users' },
] as const;

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
    <Paper p="md" withBorder radius="md" bg="blue.0" className={className}>
      <Stack gap="md">
        {/* Header */}
        <div>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="sm">
              iOS Phased Release Schedule
            </Text>
            <Badge size="sm" variant="light" color="blue">
              Day {currentDay} of 7
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            Apple automatically increases rollout over 7 days
          </Text>
        </div>

        {/* 7-Segment Progress Bar */}
        <Box>
          <Progress.Root size="xl" radius="md">
            {PHASED_SCHEDULE.map((day, index) => {
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
          <Group justify="space-between" mt="xs">
            {PHASED_SCHEDULE.map((day) => (
              <Text
                key={day.day}
                size="xs"
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
        <Paper p="sm" radius="md" bg="white" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" mb={4}>Current Rollout</Text>
              <Text size="lg" fw={700} c="blue.9">
                {currentPercentage.toFixed(1)}%
              </Text>
            </div>
            <ThemeIcon size="xl" radius="md" variant="light" color="blue">
              <IconClock size={24} />
            </ThemeIcon>
          </Group>
        </Paper>

        {/* Schedule Table */}
        <div>
          <Text size="sm" fw={600} mb="xs">
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
                  <Text size="xs" fw={600}>Day</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600}>Rollout %</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600}>Status</Text>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {PHASED_SCHEDULE.map((day) => {
                const isComplete = day.day < currentDay;
                const isCurrent = day.day === currentDay;
                const isPending = day.day > currentDay;

                return (
                  <Table.Tr
                    key={day.day}
                    style={{
                      backgroundColor: isCurrent
                        ? 'var(--mantine-color-blue-0)'
                        : undefined,
                    }}
                  >
                    <Table.Td>
                      <Text
                        size="sm"
                        fw={isCurrent ? 600 : 400}
                        c={isCurrent ? 'blue.9' : undefined}
                      >
                        {day.label}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {day.description}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {isComplete && (
                        <Badge
                          size="sm"
                          variant="light"
                          color="green"
                          leftSection={<IconCheck size={12} />}
                        >
                          Complete
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge size="sm" variant="filled" color="blue">
                          Active
                        </Badge>
                      )}
                      {isPending && (
                        <Badge size="sm" variant="light" color="gray">
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
        <Text size="xs" c="dimmed" fs="italic">
          💡 You can complete early at any time to immediately release to 100%, 
          or pause the rollout if issues arise.
        </Text>
      </Stack>
    </Paper>
  );
}

