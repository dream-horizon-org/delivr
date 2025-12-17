/**
 * ReleaseProcessSidebar Component
 * Right sidebar containing vertical stage stepper (beside tasks)
 * 
 * Displays:
 * - Vertical stage stepper
 */

import { Paper, Stack, Stepper, Text, Tooltip } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import {
  IconCheck,
  IconGitBranch,
  IconLock,
  IconRocket,
  IconTestPipe,
} from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import {
  STAGE_LABELS,
} from '~/constants/release-process-ui';
import type { TaskStage } from '~/types/release-process-enums';
import { TaskStage as TaskStageEnum } from '~/types/release-process-enums';

interface ReleaseProcessSidebarProps {
  currentStage: TaskStage | null;
  selectedStage?: TaskStage | null;
  onStageSelect?: (stage: TaskStage | null) => void;
  className?: string;
}

// Stage definition type
interface ReleaseStage {
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
  distribution: IconRocket,
};

// Release Process Stages
const RELEASE_PROCESS_STAGES: ReleaseStage[] = [
  {
    key: TaskStageEnum.KICKOFF,
    label: STAGE_LABELS.KICKOFF,
    description: 'Initial setup and branch creation',
    iconName: 'branch',
    isNavigable: true,
  },
  {
    key: TaskStageEnum.REGRESSION,
    label: STAGE_LABELS.REGRESSION,
    description: 'Testing and regression cycles',
    iconName: 'test',
    isNavigable: true,
  },
  {
    key: TaskStageEnum.PRE_RELEASE,
    label: STAGE_LABELS.PRE_RELEASE,
    description: 'Final preparation and submission',
    iconName: 'rocket',
    isNavigable: true,
  },
  {
    key: TaskStageEnum.DISTRIBUTION,
    label: STAGE_LABELS.DISTRIBUTION,
    description: 'Release to app stores',
    iconName: 'distribution',
    isNavigable: true,
  },
];

// Map TaskStage to stage index
function getStageIndex(stage: TaskStage | null | undefined): number {
  if (!stage) return -1;

  switch (stage) {
    case TaskStageEnum.KICKOFF:
      return 0;
    case TaskStageEnum.REGRESSION:
      return 1;
    case TaskStageEnum.PRE_RELEASE:
      return 2;
    case TaskStageEnum.DISTRIBUTION:
      return 3;
    default:
      return -1;
  }
}

export function ReleaseProcessSidebar({
  currentStage,
  selectedStage,
  onStageSelect,
  className,
}: ReleaseProcessSidebarProps) {
  // All stages are always visible
  const stages = RELEASE_PROCESS_STAGES;

  // Determine current stage index
  const currentStageIndex = useMemo(() => {
    return getStageIndex(currentStage);
  }, [currentStage]);

  // Determine selected stage index (for highlighting)
  const selectedStageIndex = useMemo(() => {
    const index = getStageIndex(selectedStage);
    return index === -1 ? 0 : index;
  }, [selectedStage]);

  // Handle step click
  const handleStepClick = useCallback(
    (stepIndex: number) => {
      const stage = stages[stepIndex];

      // Standard progression: can only access stages up to current stage
      const isAccessible = currentStageIndex === -1 || stepIndex <= currentStageIndex;

      if (isAccessible && stage.isNavigable && onStageSelect) {
        onStageSelect(stage.key as TaskStage);
      }
    },
    [stages, currentStageIndex, onStageSelect]
  );

  return (
    <Paper
      shadow="sm"
      p="lg"
      radius="md"
      withBorder
      className={className}
      style={{
        width: '280px',
        height: '100%',
      }}
    >
      <Stack gap="md">
        <Text fw={600} size="sm" c="dimmed">
          Stages
        </Text>
        <Stepper
          active={selectedStageIndex}
          onStepClick={handleStepClick}
          orientation="vertical"
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

            if (!isAccessible) {
              return (
                <Tooltip key={stage.key} label="Complete previous stages first" position="left" withArrow>
                  {stepContent}
                </Tooltip>
              );
            }

            return stepContent;
          })}
        </Stepper>
      </Stack>
    </Paper>
  );
}
