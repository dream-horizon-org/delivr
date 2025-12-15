/**
 * Release Stage Stepper Component
 * Shows the current stage of a release in a stepper UI
 * Steps are directly clickable to switch between stages
 * 
 * Updated for Release Process: Kickoff → Regression → Post-Regression
 */

import { Group, Paper, Stepper, Text, Tooltip } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import {
    IconCheck,
    IconGitBranch,
    IconLock,
    IconRocket,
    IconTestPipe,
} from '@tabler/icons-react';
import { memo, useCallback, useMemo } from 'react';
import { STAGE_LABELS } from '~/constants/release-process-ui';
import type { TaskStage } from '~/types/release-process-enums';
import { TaskStage as TaskStageEnum } from '~/types/release-process-enums';

// Stage definition type
export interface ReleaseStage {
  key: TaskStage;
  label: string;
  description: string;
  iconName: string;
  isNavigable: boolean;
}

// Icon mapping
const ICON_MAP: Record<string, Icon> = {
  branch: IconGitBranch,
  test: IconTestPipe,
  rocket: IconRocket,
};

// Release Process Stages (PreKickoff is NOT in stepper - shown separately when NOT_STARTED)
const RELEASE_PROCESS_STAGES: ReleaseStage[] = [
  { 
    key: TaskStageEnum.KICKOFF, 
    label: STAGE_LABELS.KICKOFF, 
    description: 'Initial setup and branch creation', 
    iconName: 'branch', 
    isNavigable: true 
  },
  { 
    key: TaskStageEnum.REGRESSION, 
    label: STAGE_LABELS.REGRESSION, 
    description: 'Testing and regression cycles', 
    iconName: 'test', 
    isNavigable: true 
  },
  { 
    key: TaskStageEnum.POST_REGRESSION, 
    label: STAGE_LABELS.POST_REGRESSION, 
    description: 'Final preparation before submission', 
    iconName: 'rocket', 
    isNavigable: true 
  },
  { 
    key: TaskStageEnum.DISTRIBUTION, 
    label: STAGE_LABELS.DISTRIBUTION, 
    description: 'Submit to stores and manage distribution', 
    iconName: 'rocket', 
    isNavigable: true 
  },
];

// Map TaskStage to stage index
function getStageIndex(stage: TaskStage | null | undefined): number {
  if (!stage) return -1; // NOT_STARTED (not in stepper)
  
  switch (stage) {
    case TaskStageEnum.KICKOFF:
      return 0;
    case TaskStageEnum.REGRESSION:
      return 1;
    case TaskStageEnum.POST_REGRESSION:
      return 2;
    case TaskStageEnum.DISTRIBUTION:
      return 3;
    default:
      return -1;
  }
}

interface ReleaseStageStepperProps {
  releaseId: string;
  org: string;
  releaseBranch?: string;
  currentStage: TaskStage | null;        // Current stage from phase determination
  selectedStage?: TaskStage | null;      // Currently selected/viewing stage
  onStageSelect?: (stage: TaskStage | null) => void; // Callback when stage is clicked
}

export const ReleaseStageStepper = memo(function ReleaseStageStepper({
  releaseId,
  org,
  releaseBranch,
  currentStage,
  selectedStage,
  onStageSelect,
}: ReleaseStageStepperProps) {
  const stages = RELEASE_PROCESS_STAGES;
  
  // Determine current stage index based on actual current stage
  const currentStageIndex = useMemo(() => {
    return getStageIndex(currentStage);
  }, [currentStage]);

  // Determine selected stage index (for highlighting)
  const selectedStageIndex = useMemo(() => {
    if (selectedStage === null) return -1; // NOT_STARTED (not in stepper)
    return getStageIndex(selectedStage);
  }, [selectedStage]);

  // Handle step click - call onStageSelect callback
  const handleStepClick = useCallback((stepIndex: number) => {
    const stage = stages[stepIndex];
    
    // Only allow navigation if:
    // 1. The step is accessible (current or past)
    // 2. The stage is navigable
    const isAccessible = stepIndex <= currentStageIndex || currentStageIndex === -1;
    
    if (isAccessible && stage.isNavigable && onStageSelect) {
      // All stages in stepper are TaskStage enum values
      onStageSelect(stage.key as TaskStage);
    }
  }, [stages, currentStageIndex, onStageSelect]);

  console.log('stages', stages, currentStageIndex, selectedStageIndex);

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder className="mb-6">
      {/* <Group justify="space-between" align="center" mb="md">
        <Text fw={600} size="lg">Release Progress</Text>
        {releaseBranch && (
          <Text size="sm" c="dimmed" className="font-mono">
            {releaseBranch}
          </Text>
        )}
      </Group> */}

      <Stepper
        active={selectedStageIndex >= 0 ? selectedStageIndex : 0}
        onStepClick={onStageSelect ? handleStepClick : undefined}
        size="sm"
        styles={{
          step: {
            cursor: onStageSelect ? 'pointer' : 'default',
          },
          stepIcon: {
            cursor: onStageSelect ? 'pointer' : 'default',
          },
        }}
      >
        {stages.map((stage, index) => {
          // Handle NOT_STARTED case (currentStageIndex === -1)
          const isComplete = currentStageIndex >= 0 && index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isSelected = index === selectedStageIndex;
          const isAccessible = currentStageIndex === -1 || index <= currentStageIndex;
          const canNavigate = isAccessible && stage.isNavigable && onStageSelect;
          const StageIcon = ICON_MAP[stage.iconName] ?? IconGitBranch;

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
              color={isComplete ? 'green' : isSelected ? 'blue' : isCurrent ? 'blue' : 'gray'}
              completedIcon={<IconCheck size={16} />}
              style={{
                cursor: canNavigate ? 'pointer' : 'default',
              }}
            />
          );


          // For non-navigable steps, show why
          if (!isAccessible) {
            return (
              <Tooltip 
                key={stage.key} 
                label="Complete previous stages first"
                position="bottom"
                withArrow
              >
                <span>{stepContent}</span>
              </Tooltip>
            );
          }

          return stepContent;
        })}
      </Stepper>

    </Paper>
  );
});
