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
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconCalendar, IconCheck, IconClock, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import {
  CYCLE_STATUS_COLORS,
  CYCLE_STATUS_LABELS,
  getCycleStatusColor,
  getCycleStatusLabel,
} from '~/constants/release-process-ui';
import type { RegressionCycle, Task, BuildInfo } from '~/types/release-process.types';
import { RegressionCycleStatus } from '~/types/release-process-enums';
import { formatReleaseDateTime } from '~/utils/release-process-date';
import { TaskCard } from './TaskCard';

interface RegressionCycleCardProps {
  cycle: RegressionCycle;
  tasks: Task[]; // Tasks for this cycle (filtered by releaseCycleId)
  builds?: BuildInfo[]; // Builds associated with this cycle
  tenantId: string;
  releaseId: string;
  onRetryTask?: (taskId: string) => void;
  onViewTaskDetails?: (task: Task) => void;
  isExpanded?: boolean; // For past cycles - whether to show expanded by default
  className?: string;
}

export function RegressionCycleCard({
  cycle,
  tasks,
  builds = [],
  tenantId,
  releaseId,
  onRetryTask,
  onViewTaskDetails,
  isExpanded = false,
  className,
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

  // Group builds by platform
  const buildsByPlatform = useMemo(() => {
    const grouped: Record<string, BuildInfo[]> = {};
    builds.forEach((build) => {
      if (!grouped[build.platform]) {
        grouped[build.platform] = [];
      }
      grouped[build.platform].push(build);
    });
    return grouped;
  }, [builds]);

  // For past cycles, use accordion for collapsible display
  const isPastCycle = cycle.status === RegressionCycleStatus.DONE || cycle.status === RegressionCycleStatus.ABANDONED;

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

      {/* Build Info by Platform */}
      {Object.keys(buildsByPlatform).length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={500} c="dimmed">
            Builds
          </Text>
          <Group gap="md">
            {Object.entries(buildsByPlatform).map(([platform, platformBuilds]) => (
              <Group key={platform} gap="xs">
                <Badge variant="light" size="sm">
                  {platform}
                </Badge>
                <Text size="xs" c="dimmed">
                  {platformBuilds.length} build{platformBuilds.length !== 1 ? 's' : ''}
                </Text>
              </Group>
            ))}
          </Group>
        </Stack>
      )}

      {/* Cycle Tasks */}
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
                onViewDetails={onViewTaskDetails}
              />
            ))}
          </Stack>
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
          No tasks for this cycle
        </Text>
      )}
    </Stack>
  );

  // For past cycles, wrap in accordion
  if (isPastCycle) {
    return (
      <Accordion.Item value={cycle.id} className={className}>
        <Accordion.Control>
          <Group justify="space-between" style={{ width: '100%' }}>
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
              <Text size="sm" c="dimmed">
                {cycleDateTime}
              </Text>
              <Badge color={statusColor} size="sm">
                {statusLabel}
              </Badge>
            </Group>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            {cycleContent}
          </Card>
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

