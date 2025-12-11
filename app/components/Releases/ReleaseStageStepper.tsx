/**
 * Release Stage Stepper Component
 * Shows the current stage of a release in a stepper UI
 * Steps are directly clickable for navigation
 * 
 * NOTE: Stage configuration and current stage index should come from API
 * This component is a pure UI component that renders based on props
 */

import { Group, Paper, Stepper, Text, Tooltip } from '@mantine/core';
import { useNavigate } from '@remix-run/react';
import type { Icon } from '@tabler/icons-react';
import {
    IconCheck,
    IconCode,
    IconGitBranch,
    IconLock,
    IconPackage,
    IconRocket,
    IconTestPipe,
} from '@tabler/icons-react';
import { memo, useCallback, useMemo } from 'react';

// Stage definition type - can be extended from API
export interface ReleaseStage {
  key: string;
  label: string;
  description: string;
  iconName: string;
  isNavigable: boolean;
  navigationPath?: string; // Where to navigate when clicked
}

// Default icon mapping - icons are not serializable from API
const ICON_MAP: Record<string, Icon> = {
  code: IconCode,
  test: IconTestPipe,
  branch: IconGitBranch,
  package: IconPackage,
  rocket: IconRocket,
};

// Simplified stages for Pre-Release/Distribution testing
// Full stages (Development → QA → Regression → Pre-Release → Distribution) 
// will be implemented by colleague working on release process
const DEFAULT_STAGES: ReleaseStage[] = [
  { key: 'PENDING', label: 'Pending', description: 'Prior stages complete', iconName: 'code', isNavigable: false },
  { key: 'PRE_RELEASE', label: 'Pre-Release', description: 'Build preparation & PM approval', iconName: 'package', isNavigable: true, navigationPath: 'distribution?tab=pre-release' },
  { key: 'DISTRIBUTION', label: 'Distribution', description: 'Store submission & rollout', iconName: 'rocket', isNavigable: true, navigationPath: 'distribution?tab=distribution' },
];

// Simplified status mapping for testing
// Maps release statuses to simplified 3-stage UI
const STATUS_TO_STAGE_INDEX: Record<string, number> = {
  // All prior stages map to "Pending" (index 0)
  'IN_PROGRESS': 0,
  'REGRESSION': 0,
  // Pre-Release stage (index 1)
  'PRE_RELEASE': 1,
  // Distribution stage (index 2)
  'READY_FOR_SUBMISSION': 2,
  'COMPLETED': 3, // Completed (beyond last step)
  'ARCHIVED': 3,
};

function getStageIndexFromStatus(status: string): number {
  return STATUS_TO_STAGE_INDEX[status] ?? 0;
}

interface ReleaseStageStepperProps {
  releaseId: string;
  org: string;
  releaseBranch?: string;
  // API-driven props
  releaseStatus?: string;           // Current status from API
  currentStageIndex?: number;       // Direct stage index (preferred, from API)
  stages?: ReleaseStage[];          // Custom stages from API (optional)
}

export const ReleaseStageStepper = memo(function ReleaseStageStepper({
  releaseId,
  org,
  releaseBranch,
  releaseStatus,
  currentStageIndex: providedStageIndex,
  stages: providedStages,
}: ReleaseStageStepperProps) {
  const navigate = useNavigate();
  
  // Use provided stages or default
  const stages = providedStages ?? DEFAULT_STAGES;
  
  // Determine current stage index
  // Prefer explicit index, then derive from status, then default to 0
  const currentStageIndex = useMemo(() => {
    if (providedStageIndex !== undefined) return providedStageIndex;
    if (releaseStatus) return getStageIndexFromStatus(releaseStatus);
    return 0;
  }, [providedStageIndex, releaseStatus]);

  // Handle step click - navigate to the step's path if accessible
  const handleStepClick = useCallback((stepIndex: number) => {
    const stage = stages[stepIndex];
    
    // Only navigate if:
    // 1. The step is accessible (current or past)
    // 2. The stage is navigable (has a navigation path)
    const isAccessible = stepIndex <= currentStageIndex;
    
    if (isAccessible && stage.isNavigable && stage.navigationPath) {
      navigate(`/dashboard/${org}/releases/${releaseId}/${stage.navigationPath}`);
    }
  }, [stages, currentStageIndex, navigate, org, releaseId]);

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder className="mb-6">
      <Group justify="space-between" align="center" mb="md">
        <Text fw={600} size="lg">Release Progress</Text>
        {releaseBranch && (
          <Text size="sm" c="dimmed" className="font-mono">
            {releaseBranch}
          </Text>
        )}
      </Group>

      <Stepper
        active={currentStageIndex}
        onStepClick={handleStepClick}
        size="sm"
        styles={{
          step: {
            cursor: 'pointer',
          },
          stepIcon: {
            cursor: 'pointer',
          },
        }}
      >
        {stages.map((stage, index) => {
          const isComplete = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isAccessible = index <= currentStageIndex;
          const canNavigate = isAccessible && stage.isNavigable && stage.navigationPath;
          const StageIcon = ICON_MAP[stage.iconName] ?? IconCode;

          const stepContent = (
            <Stepper.Step
              key={stage.key}
              label={stage.label}
              description={stage.description}
              icon={
                isComplete ? (
                  <IconCheck size={16} />
                ) : !isAccessible ? (
                  <IconLock size={16} />
                ) : (
                  <StageIcon size={16} />
                )
              }
              color={isComplete ? 'green' : isCurrent ? 'blue' : 'gray'}
              completedIcon={<IconCheck size={16} />}
              style={{
                cursor: canNavigate ? 'pointer' : 'default',
              }}
            />
          );

          // Wrap with tooltip for clickable steps
          if (canNavigate) {
            return (
              <Tooltip 
                key={stage.key} 
                label={`Click to view ${stage.label}`}
                position="bottom"
                withArrow
              >
                {stepContent}
              </Tooltip>
            );
          }

          // For non-navigable steps, show why
          if (!isAccessible) {
            return (
              <Tooltip 
                key={stage.key} 
                label="Complete previous stages first"
                position="bottom"
                withArrow
              >
                {stepContent}
              </Tooltip>
            );
          }

          return stepContent;
        })}
      </Stepper>

      {/* Hint text for user */}
      {currentStageIndex >= 1 && (
        <Text size="xs" c="dimmed" ta="center" mt="md">
          Click on a stage above to view its details
        </Text>
      )}
    </Paper>
  );
});
