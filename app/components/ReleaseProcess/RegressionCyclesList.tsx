/**
 * RegressionCyclesList Component
 * Displays all regression cycles (current, past, and upcoming)
 * Handles manual build upload widgets for regression stage
 */

import {
  Accordion,
  Alert,
  Grid,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconInfoCircle, IconCalendar } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useRelease } from '~/hooks/useRelease';
import type {
  RegressionCycle,
  RegressionSlot,
  Task,
  BuildInfo,
} from '~/types/release-process.types';
import { RegressionCycleStatus, BuildUploadStage, Platform } from '~/types/release-process-enums';
import { TaskType } from '~/types/release-process-enums';
import { ManualBuildUploadWidget } from './ManualBuildUploadWidget';
import { RegressionCycleCard } from './RegressionCycleCard';

interface RegressionCyclesListProps {
  cycles: RegressionCycle[];
  currentCycle: RegressionCycle | null;
  tasks: Task[]; // All regression tasks (will be grouped by releaseCycleId)
  availableBuilds: BuildInfo[];
  upcomingSlot: RegressionSlot[] | null;
  tenantId: string;
  releaseId: string;
  onRetryTask?: (taskId: string) => void;
  onViewTaskDetails?: (task: Task) => void;
  className?: string;
}

export function RegressionCyclesList({
  cycles,
  currentCycle,
  tasks,
  availableBuilds,
  upcomingSlot,
  tenantId,
  releaseId,
  onRetryTask,
  onViewTaskDetails,
  className,
}: RegressionCyclesListProps) {
  const { release } = useRelease(tenantId, releaseId);
  const isManualMode = release?.hasManualBuildUpload === true;

  // Group tasks by cycle ID
  const tasksByCycle = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      // Regression tasks have regressionId field (maps to cycle.id)
      const cycleId = task.regressionId || 'no-cycle';
      if (!grouped[cycleId]) {
        grouped[cycleId] = [];
      }
      grouped[cycleId].push(task);
    });
    return grouped;
  }, [tasks]);

  // Get builds for each cycle
  const buildsByCycle = useMemo(() => {
    const grouped: Record<string, BuildInfo[]> = {};
    availableBuilds.forEach((build) => {
      if (build.regressionId) {
        if (!grouped[build.regressionId]) {
          grouped[build.regressionId] = [];
        }
        grouped[build.regressionId].push(build);
      }
    });
    return grouped;
  }, [availableBuilds]);

  // Separate past cycles from current
  const pastCycles = useMemo(() => {
    return cycles.filter(
      (cycle) =>
        cycle.id !== currentCycle?.id &&
        (cycle.status === RegressionCycleStatus.DONE ||
          cycle.status === RegressionCycleStatus.ABANDONED)
    );
  }, [cycles, currentCycle]);

  // Determine if we should show upload widgets
  // Show when: current cycle is completed AND upcoming slot exists (including first cycle after kickoff)
  const shouldShowUploadWidgets = useMemo(() => {
    if (!isManualMode) return false;
    
    // If there's an active cycle, don't show upload widgets
    if (currentCycle && currentCycle.status === RegressionCycleStatus.IN_PROGRESS) {
      return false;
    }
    
    // Show if current cycle is completed and there's an upcoming slot
    const currentCycleCompleted =
      currentCycle?.status === RegressionCycleStatus.DONE;
    const hasUpcomingSlot = upcomingSlot && upcomingSlot.length > 0;
    
    // Also show if no cycles exist yet (first cycle after kickoff)
    const noCyclesYet = cycles.length === 0;
    
    return (currentCycleCompleted && hasUpcomingSlot) || (noCyclesYet && hasUpcomingSlot);
  }, [isManualMode, currentCycle, upcomingSlot, cycles.length]);

  // Get required platforms from release
  const requiredPlatforms = useMemo(() => {
    if (!release?.platformTargetMappings) return [];
    return release.platformTargetMappings
      .map((m) => m.platform)
      .filter((p, i, arr) => arr.indexOf(p) === i); // Get unique platforms
  }, [release?.platformTargetMappings]);

  // Check which platforms still need builds
  const platformsNeedingBuilds = useMemo(() => {
    if (!shouldShowUploadWidgets) return [];
    
    const uploadedPlatforms = new Set(
      availableBuilds
        .filter((b) => !b.regressionId) // Only unused builds
        .map((b) => b.platform)
    );
    
    return requiredPlatforms.filter((p) => !uploadedPlatforms.has(p));
  }, [shouldShowUploadWidgets, availableBuilds, requiredPlatforms]);

  // Format upcoming slot date
  const upcomingSlotDate = useMemo(() => {
    if (!upcomingSlot || upcomingSlot.length === 0) return null;
    const slot = upcomingSlot[0];
    if (!slot.date) return null;
    const date = new Date(slot.date);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [upcomingSlot]);

  return (
    <Stack gap="lg" className={className}>
      {/* Current Active Cycle */}
      {currentCycle && (
        <Stack gap="md">
          <Text fw={600} size="lg">
            Current Cycle
          </Text>
          <RegressionCycleCard
            cycle={currentCycle}
            tasks={tasksByCycle[currentCycle.id] || []}
            builds={buildsByCycle[currentCycle.id] || []}
            tenantId={tenantId}
            releaseId={releaseId}
            onRetryTask={onRetryTask}
            onViewTaskDetails={onViewTaskDetails}
          />
        </Stack>
      )}

      {/* Manual Build Upload Section */}
      {shouldShowUploadWidgets && (
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600} size="lg">
                Upload Builds for Next Cycle
              </Text>
              <Text size="sm" c="dimmed">
                {upcomingSlotDate
                  ? `Next regression slot: ${upcomingSlotDate}`
                  : 'Upload builds to prepare for the next regression cycle'}
              </Text>
            </div>
          </Group>

          {platformsNeedingBuilds.length > 0 ? (
            <Grid>
              {platformsNeedingBuilds.map((platform) => (
                <Grid.Col key={platform} span={{ base: 12, sm: 6 }}>
                  <ManualBuildUploadWidget
                    tenantId={tenantId}
                    releaseId={releaseId}
                    stage={BuildUploadStage.REGRESSION}
                    taskType={TaskType.TRIGGER_REGRESSION_BUILDS}
                    platform={platform as Platform}
                    onUploadComplete={() => {
                      // Refetch will be handled by query invalidation in hook
                    }}
                  />
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <Alert icon={<IconInfoCircle size={16} />} color="green" variant="light">
              All required builds have been uploaded. Builds are ready for the next cycle.
            </Alert>
          )}
        </Stack>
      )}

      {/* Upcoming Slot (when no active cycle) */}
      {!currentCycle && upcomingSlot && upcomingSlot.length > 0 && (
        <Alert
          icon={<IconCalendar size={16} />}
          color="blue"
          variant="light"
          title="Next Regression Slot"
        >
          <Text size="sm">
            Next regression cycle scheduled for:{' '}
            <Text component="span" fw={500}>
              {upcomingSlotDate || 'TBD'}
            </Text>
          </Text>
          {!shouldShowUploadWidgets && isManualMode && (
            <Text size="xs" c="dimmed" mt="xs">
              Upload builds when the upload window opens.
            </Text>
          )}
        </Alert>
      )}

      {/* No Active Cycle and No Upcoming Slot */}
      {!currentCycle && (!upcomingSlot || upcomingSlot.length === 0) && (
        <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
          No regression cycles scheduled.
        </Alert>
      )}

      {/* Past Cycles */}
      {pastCycles.length > 0 && (
        <Stack gap="md">
          <Text fw={600} size="lg">
            Past Cycles ({pastCycles.length})
          </Text>
          <Accordion defaultValue={pastCycles[0]?.id} variant="separated">
            {pastCycles.map((cycle) => (
              <RegressionCycleCard
                key={cycle.id}
                cycle={cycle}
                tasks={tasksByCycle[cycle.id] || []}
                builds={buildsByCycle[cycle.id] || []}
                tenantId={tenantId}
                releaseId={releaseId}
                onRetryTask={onRetryTask}
                onViewTaskDetails={onViewTaskDetails}
                isExpanded={false}
              />
            ))}
          </Accordion>
        </Stack>
      )}
    </Stack>
  );
}

