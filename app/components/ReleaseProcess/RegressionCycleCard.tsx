/**
 * RegressionCycleCard Component
 * Displays individual regression cycle details with tasks and build info
 * Used in RegressionCyclesList to show current and past cycles
 */

import {
  Accordion,
  Badge,
  Card,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconCalendar, IconChevronDown, IconCheck, IconClock, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import {
  CYCLE_STATUS_COLORS,
  CYCLE_STATUS_LABELS,
  getCycleStatusColor,
  getCycleStatusLabel,
} from '~/constants/release-process-ui';
import type { RegressionCycle, Task } from '~/types/release-process.types';
import { RegressionCycleStatus } from '~/types/release-process-enums';
import { formatReleaseDateTime } from '~/utils/release-process-date';
import { TaskCard } from './TaskCard';

interface RegressionCycleCardProps {
  cycle: RegressionCycle;
  tasks: Task[]; // Tasks for this cycle (filtered by releaseCycleId)
  // Note: Builds are displayed inside task cards via BuildTaskDetails, not here
  tenantId: string;
  releaseId: string;
  onRetryTask?: (taskId: string) => void;
  isExpanded?: boolean; // For past cycles - whether to show expanded by default
  className?: string;
  isInsideAccordion?: boolean; // Explicitly mark if this is inside an Accordion
}

export function RegressionCycleCard({
  cycle,
  tasks,
  tenantId,
  releaseId,
  onRetryTask,
  isExpanded = false,
  className,
  isInsideAccordion = false,
}: RegressionCycleCardProps) {
  const statusColor = getCycleStatusColor(cycle.status);
  const statusLabel = getCycleStatusLabel(cycle.status);

  // Format cycle date/time
  const cycleDateTime = useMemo(() => {
    return formatReleaseDateTime(cycle.createdAt);
  }, [cycle.createdAt]);

  // Format completion date if available
  const completedDateTime = useMemo(() => {
    if (!cycle.completedAt) return null;
    return formatReleaseDateTime(cycle.completedAt);
  }, [cycle.completedAt]);

  // Get status icon
  const getStatusIcon = () => {
    switch (cycle.status) {
      case RegressionCycleStatus.DONE:
        return <IconCheck size={16} />;
      case RegressionCycleStatus.IN_PROGRESS:
        return <IconClock size={16} />;
      case RegressionCycleStatus.ABANDONED:
        return <IconX size={16} />;
      default:
        return <IconClock size={16} />;
    }
  };

  // For past cycles, use accordion for collapsible display
  const isPastCycle = cycle.status === RegressionCycleStatus.DONE || cycle.status === RegressionCycleStatus.ABANDONED;

  // Tasks content (used in both accordion and non-accordion views)
  const tasksContent = (
    <>
      {/* Cycle Tasks */}
      {/* Note: Builds are displayed inside task cards via BuildTaskDetails component */}
      {/* When cycle is IN_PROGRESS: tasks use task.builds (consumed builds) */}
      {/* When cycle starts: builds are consumed and moved to task.builds, making task COMPLETED */}
      {tasks.length > 0 ? (
        <Stack gap="md">
          <Text size="sm" fw={500} c="dimmed">
            Tasks ({tasks.length})
          </Text>
          <Stack gap="sm">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                tenantId={tenantId}
                releaseId={releaseId}
                onRetry={onRetryTask}
                // Note: For regression, uploadedBuilds are for upcoming slot (next cycle)
                // Current cycle tasks use task.builds when cycle is IN_PROGRESS
                // No need to pass uploadedBuilds here - they're stage-level for upcoming slot
              />
            ))}
          </Stack>
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
          No tasks for this cycle
        </Text>
      )}
    </>
  );

  // Full cycle content with metadata (for non-accordion views)
  const cycleContent = (
    <Stack gap="md">
      {/* Cycle Metadata */}
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Group gap="sm">
            <Text fw={600} size="lg">
              {cycle.cycleTag || `Cycle ${cycle.id.slice(0, 8)}`}
            </Text>
            {cycle.isLatest && (
              <Badge size="sm" color="blue" variant="light">
                Latest
              </Badge>
            )}
          </Group>
          <Group gap="md">
            <Group gap="xs">
              <IconCalendar size={16} />
              <Text size="sm" c="dimmed">
                Started: {cycleDateTime}
              </Text>
            </Group>
            {completedDateTime && (
              <Text size="sm" c="dimmed">
                Completed: {completedDateTime}
              </Text>
            )}
          </Group>
        </Stack>
        <Badge
          color={statusColor}
          leftSection={<ThemeIcon size={16} variant="transparent" color={statusColor}>{getStatusIcon()}</ThemeIcon>}
        >
          {statusLabel}
        </Badge>
      </Group>

      {tasksContent}
    </Stack>
  );

  // For past cycles, wrap in accordion ONLY if explicitly inside an Accordion
  // This prevents rendering Accordion.Item outside of Accordion context
  if (isPastCycle && isInsideAccordion) {
    return (
      <Accordion.Item value={cycle.id} className={className}>
        <Accordion.Control
          chevron={null}
          styles={{
            control: {
              padding: 0,
              '&:hover': {
                backgroundColor: 'transparent',
              },
            },
            chevron: {
              display: 'none',
            },
            label: {
              padding: 0,
            },
          }}
        >
          <Paper
            shadow="sm"
            p="md"
            radius="md"
            withBorder
            style={{
              width: '100%',
              border: '1px solid var(--mantine-color-gray-3)',
              backgroundColor: 'var(--mantine-color-white)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Group justify="space-between" style={{ width: '100%', flex: 1 }}>
              <Group gap="sm">
                <Text fw={500}>
                  {cycle.cycleTag || `Cycle ${cycle.id.slice(0, 8)}`}
                </Text>
                {cycle.isLatest && (
                  <Badge size="xs" color="blue" variant="light">
                    Latest
                  </Badge>
                )}
              </Group>
              <Group gap="sm">
                <Group gap="xs">
                  <IconCalendar size={16} />
                  <Text size="sm" c="dimmed">
                    {cycleDateTime}
                  </Text>
                </Group>
                {completedDateTime && (
                  <Text size="sm" c="dimmed">
                    Completed: {completedDateTime}
                  </Text>
                )}
                <Badge
                  color={statusColor}
                  leftSection={<ThemeIcon size={16} variant="transparent" color={statusColor}>{getStatusIcon()}</ThemeIcon>}
                >
                  {statusLabel}
                </Badge>
                <IconChevronDown
                  size={16}
                  style={{
                    marginLeft: 'var(--mantine-spacing-xs)',
                    transition: 'transform 0.2s ease',
                  }}
                  className="accordion-chevron"
                />
              </Group>
            </Group>
          </Paper>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md" pt="md">
            {tasksContent}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  // For current/active cycles, show expanded card
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className={className}>
      {cycleContent}
    </Card>
  );
}

