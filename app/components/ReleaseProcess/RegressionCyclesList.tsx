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
import { formatReleaseDateTime } from '~/utils/release-process-date';
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
  uploadedBuilds: BuildInfo[];  // Builds uploaded for upcoming slot (not yet consumed)
  upcomingSlot: RegressionSlot[] | null;
  tenantId: string;
  releaseId: string;
  onRetryTask?: (taskId: string) => void;
  className?: string;
}

export function RegressionCyclesList({
  cycles,
  currentCycle,
  tasks,
  uploadedBuilds,
  upcomingSlot,
  tenantId,
  releaseId,
  onRetryTask,
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

  // Note: Builds are displayed inside task cards via BuildTaskDetails component
  // No need to extract builds separately - tasks already have builds in task.builds when consumed

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
  // Show ONLY when:
  // 1. Current cycle is DONE (completed) AND upcoming slot exists
  // 2. OR no cycles exist yet (first cycle after kickoff) AND upcoming slot exists
  // Do NOT show when cycle is IN_PROGRESS (cycle has started, builds are consumed)
  const shouldShowUploadWidgets = useMemo(() => {
    if (!isManualMode) return false;
    
    // Never show if there's an active cycle (IN_PROGRESS)
    if (currentCycle && currentCycle.status === RegressionCycleStatus.IN_PROGRESS) {
      return false;
    }
    
    // Must have an upcoming slot
    const hasUpcomingSlot = upcomingSlot && upcomingSlot.length > 0;
    if (!hasUpcomingSlot) return false;
    
    // Show if current cycle is DONE (completed)
    const currentCycleCompleted = currentCycle?.status === RegressionCycleStatus.DONE;
    
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

  // Widget will determine which platforms need builds internally
  // We pass all required platforms - widget checks uploadedBuilds to see which have builds

  // Format upcoming slot date
  const upcomingSlotDate = useMemo(() => {
    if (!upcomingSlot || upcomingSlot.length === 0) return null;
    const slot = upcomingSlot[0];
    if (!slot.date) return null;
    return formatReleaseDateTime(slot.date);
  }, [upcomingSlot]);

  // Type guard for platform validation
  const isValidPlatform = (platform: string): platform is Platform => {
    return Object.values(Platform).includes(platform as Platform);
  };

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
            tenantId={tenantId}
            releaseId={releaseId}
            onRetryTask={onRetryTask}
            uploadedBuilds={uploadedBuilds}
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

          {requiredPlatforms.length > 0 ? (
            <ManualBuildUploadWidget
              tenantId={tenantId}
              releaseId={releaseId}
              stage={BuildUploadStage.REGRESSION}
              taskType={TaskType.TRIGGER_REGRESSION_BUILDS}
              platforms={requiredPlatforms.filter(isValidPlatform)}
              onUploadComplete={() => {
                // Refetch will be handled by query invalidation in hook
              }}
              uploadedBuilds={uploadedBuilds}
            />
          ) : (
            <Alert icon={<IconInfoCircle size={16} />} color="green" variant="light">
              No platforms configured for this release.
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
          <>
            <style>{`
              [data-expanded="true"] .accordion-chevron {
                transform: rotate(180deg);
              }
            `}</style>
            <Accordion
              defaultValue={pastCycles[0]?.id}
              variant="separated"
              styles={{
                item: {
                  border: 'none',
                  '& + &': {
                    marginTop: 'var(--mantine-spacing-md)',
                  },
                },
                panel: {
                  paddingTop: 'var(--mantine-spacing-md)',
                },
              }}
            >
              {pastCycles.map((cycle) => (
                <RegressionCycleCard
                  key={cycle.id}
                  cycle={cycle}
                  tasks={tasksByCycle[cycle.id] || []}
                  tenantId={tenantId}
                  releaseId={releaseId}
                  onRetryTask={onRetryTask}
                  uploadedBuilds={uploadedBuilds}
                  isExpanded={false}
                  isInsideAccordion={true}
                />
              ))}
            </Accordion>
          </>
        </Stack>
      )}
    </Stack>
  );
}

