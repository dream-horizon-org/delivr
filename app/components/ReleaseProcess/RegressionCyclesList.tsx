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

  // Determine actual current cycle (exclude DONE cycles - they should be in past)
  const actualCurrentCycle = useMemo(() => {
    if (!currentCycle) return null;
    // If current cycle is DONE, it should be moved to past cycles
    if (currentCycle.status === RegressionCycleStatus.DONE || 
        currentCycle.status === RegressionCycleStatus.ABANDONED) {
      return null;
    }
    return currentCycle;
  }, [currentCycle]);

  // Separate past cycles - include all DONE/ABANDONED cycles (including the one that was currentCycle if it's done)
  const pastCycles = useMemo(() => {
    const doneCycles = cycles.filter(
      (cycle) =>
        cycle.status === RegressionCycleStatus.DONE ||
        cycle.status === RegressionCycleStatus.ABANDONED
    );
    
    // Sort by date: latest first (descending order)
    // Use completedAt if available, otherwise use createdAt
    return doneCycles.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (latest first)
    });
  }, [cycles]);

  // Determine if we should show upload widgets
  // Show ONLY when:
  // 1. Current cycle is DONE (completed) AND upcoming slot exists
  // 2. OR no cycles exist yet (first cycle after kickoff) AND upcoming slot exists
  // Do NOT show when cycle is IN_PROGRESS (cycle has started, builds are consumed)
  const shouldShowUploadWidgets = useMemo(() => {
    if (!isManualMode) return false;
    
    // Never show if there's an active cycle (IN_PROGRESS)
    if (actualCurrentCycle && actualCurrentCycle.status === RegressionCycleStatus.IN_PROGRESS) {
      return false;
    }
    
    // Must have an upcoming slot
    const hasUpcomingSlot = upcomingSlot && upcomingSlot.length > 0;
    if (!hasUpcomingSlot) return false;
    
    // Show if no active cycle (current cycle is DONE or null) and upcoming slot exists
    // Also show if no cycles exist yet (first cycle after kickoff)
    const noCyclesYet = cycles.length === 0;
    const noActiveCycle = !actualCurrentCycle;
    
    return (noActiveCycle && hasUpcomingSlot) || (noCyclesYet && hasUpcomingSlot);
  }, [isManualMode, actualCurrentCycle, upcomingSlot, cycles.length]);

  // Get required platforms from release
  const requiredPlatforms = useMemo(() => {
    if (!release?.platformTargetMappings) return [];
    return release.platformTargetMappings
      .map((m) => m.platform)
      .filter((p, i, arr) => arr.indexOf(p) === i); // Get unique platforms
  }, [release?.platformTargetMappings]);

  // Widget will determine which platforms need builds internally
  // We pass all required platforms - widget checks uploadedBuilds to see which have builds

  // Format upcoming slot date - filter future slots, sort by date, pick first
  // If no future slots, show most recent past slot
  const { upcomingSlotDate, isPastSlot } = useMemo(() => {
    if (!upcomingSlot || upcomingSlot.length === 0) {
      return { upcomingSlotDate: null, isPastSlot: false };
    }
    
    const now = new Date();
    const nowTime = now.getTime();
    
    // Map all valid slots with their times
    const validSlots = upcomingSlot
      .map(slot => {
        if (!slot.date) return null;
        const slotTime = new Date(slot.date).getTime();
        if (isNaN(slotTime)) return null;
        return { slot, slotTime };
      })
      .filter((item): item is { slot: typeof upcomingSlot[0]; slotTime: number } => item !== null);
    
    if (validSlots.length === 0) {
      return { upcomingSlotDate: null, isPastSlot: false };
    }
    
    // Filter future slots and sort by date (earliest first)
    const futureSlots = validSlots
      .filter(item => item.slotTime > nowTime)
      .sort((a, b) => a.slotTime - b.slotTime); // Sort: earliest first
    
    // If we have future slots, use the first one
    if (futureSlots.length > 0) {
      const nextSlot = futureSlots[0].slot;
      if (!nextSlot || !nextSlot.date) {
        return { upcomingSlotDate: null, isPastSlot: false };
      }
      return {
        upcomingSlotDate: formatReleaseDateTime(nextSlot.date),
        isPastSlot: false
      };
    }
    
    // No future slots - find most recent past slot (latest first)
    const pastSlots = validSlots
      .filter(item => item.slotTime <= nowTime)
      .sort((a, b) => b.slotTime - a.slotTime); // Sort: latest first (most recent)
    
    if (pastSlots.length > 0) {
      const pastSlot = pastSlots[0].slot;
      if (!pastSlot || !pastSlot.date) {
        return { upcomingSlotDate: null, isPastSlot: false };
      }
      return {
        upcomingSlotDate: formatReleaseDateTime(pastSlot.date),
        isPastSlot: true
      };
    }
    
    return { upcomingSlotDate: null, isPastSlot: false };
  }, [upcomingSlot]);

  // Type guard for platform validation
  const isValidPlatform = (platform: string): platform is Platform => {
    return Object.values(Platform).includes(platform as Platform);
  };

  return (
    <Stack gap="lg" className={className}>
      {/* Current Active Cycle */}
      {actualCurrentCycle && (
        <Stack gap="md">
          <Text fw={600} size="lg">
            Current Cycle
          </Text>
          <RegressionCycleCard
            cycle={actualCurrentCycle}
            tasks={tasksByCycle[actualCurrentCycle.id] || []}
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
      {!actualCurrentCycle && upcomingSlot && upcomingSlot.length > 0 && upcomingSlotDate && (
        <Alert
          icon={<IconCalendar size={16} />}
          color="blue"
          variant="light"
          title="Next Regression Slot"
        >
          <Text size="sm">
            {isPastSlot ? (
              <>
                Next Slot was scheduled at:{' '}
                <Text component="span" fw={500}>
                  {upcomingSlotDate}
                </Text>
              </>
            ) : (
              <>
                Next regression cycle scheduled for:{' '}
                <Text component="span" fw={500}>
                  {upcomingSlotDate}
                </Text>
              </>
            )}
          </Text>
          {!shouldShowUploadWidgets && isManualMode && (
            <Text size="xs" c="dimmed" mt="xs">
              Upload builds when the upload window opens.
            </Text>
          )}
        </Alert>
      )}

      {/* No Active Cycle and No Upcoming Slot */}
      {!actualCurrentCycle && (!upcomingSlot || upcomingSlot.length === 0) && (
        <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
          No upcoming regression cycles scheduled.
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

