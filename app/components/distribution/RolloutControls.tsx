/**
 * RolloutControls - Controls for managing rollout (update, pause, resume, halt)
 * 
 * Features:
 * - Update rollout percentage with presets
 * - Pause/resume rollout
 * - Emergency halt with confirmation
 * - Action availability based on platform/status
 */

import {
  Badge,
  Button,
  Card,
  Group,
  Slider,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertOctagon,
  IconCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrendingUp,
} from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  BUTTON_LABELS,
  MAX_ROLLOUT_PERCENTAGE,
  ROLLOUT_COMPLETE_PERCENT,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';
import { ActionButton } from './ActionButton';
import { PresetButtons } from './PresetButtons';
import { RolloutProgressBar } from './RolloutProgressBar';
import type { RolloutControlsProps } from './distribution.types';
import { deriveActionAvailability } from './distribution.utils';
import { useRolloutState } from './useRolloutState';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RolloutControls({
  submissionId,
  currentPercentage,
  status,
  platform,
  availableActions,
  isLoading,
  onUpdateRollout,
  onPause,
  onResume,
  onHalt,
  className,
}: RolloutControlsProps) {
  const {
    targetPercentage,
    hasChanges,
    handleSliderChange,
    selectPreset,
    resetChanges,
  } = useRolloutState(currentPercentage);

  const {
    canUpdate,
    canPause,
    canResume,
    canHalt,
    updateReason,
    pauseReason,
    resumeReason,
    haltReason,
    supportsRollout,
    isComplete,
  } = deriveActionAvailability(availableActions, status, platform, currentPercentage);

  const handleUpdateClick = useCallback(() => {
    if (onUpdateRollout && hasChanges) {
      onUpdateRollout(targetPercentage);
      resetChanges();
    }
  }, [onUpdateRollout, hasChanges, targetPercentage, resetChanges]);

  // Get rollout status for progress bar
  const getRolloutStatus = () => {
    if (isComplete || currentPercentage === ROLLOUT_COMPLETE_PERCENT) return 'complete';
    if (canResume) return 'paused';
    return 'active';
  };

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder 
      className={className}
      data-testid="rollout-controls"
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Text fw={600}>Rollout Controls</Text>
        <Badge 
          color={supportsRollout ? 'blue' : 'gray'} 
          variant="light"
          size="sm"
        >
          {platform === Platform.ANDROID ? 'Staged Rollout' : 'Phased Release'}
        </Badge>
      </Group>

      <Stack gap="md">
        {/* Progress Bar */}
        <RolloutProgressBar
          percentage={currentPercentage}
          {...(hasChanges && { targetPercentage })}
          status={getRolloutStatus()}
          showLabel
          size="md"
        />

        {/* Rollout Slider (Android only) */}
        {supportsRollout && canUpdate && !isComplete && (
          <div>
            <Text size="sm" fw={500} mb="xs">Adjust Rollout</Text>
            
            <Slider
              value={targetPercentage}
              onChange={handleSliderChange}
              min={currentPercentage}
              max={MAX_ROLLOUT_PERCENTAGE}
              step={1}
              disabled={isLoading}
              marks={[
                { value: currentPercentage, label: 'Current' },
                { value: 100, label: '100%' },
              ]}
            />

            <Group justify="space-between" mt="md">
              <PresetButtons
                currentPercentage={currentPercentage}
                targetPercentage={targetPercentage}
                onSelect={selectPreset}
                disabled={isLoading}
              />

              {hasChanges && (
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={resetChanges}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    leftSection={<IconTrendingUp size={14} />}
                    onClick={handleUpdateClick}
                    loading={isLoading}
                  >
                    Update to {targetPercentage}%
                  </Button>
                </Group>
              )}
            </Group>
          </div>
        )}

        {/* iOS phased release note */}
        {!supportsRollout && (
          <Text size="sm" c="dimmed">
            iOS phased release is managed automatically by Apple over 7 days.
          </Text>
        )}

        {/* Action Buttons */}
        {!isComplete && (
          <>
            <div className="border-t pt-4 mt-2" />
            
            <Group gap="sm">
              {canPause && (
                <ActionButton
                  icon={<IconPlayerPause size={16} />}
                  label={BUTTON_LABELS.PAUSE}
                  color="yellow"
                  onClick={onPause}
                  disabled={isLoading}
                  loading={isLoading}
                  tooltip={pauseReason}
                />
              )}

              {canResume && (
                <ActionButton
                  icon={<IconPlayerPlay size={16} />}
                  label={BUTTON_LABELS.RESUME}
                  color="green"
                  onClick={onResume}
                  disabled={isLoading}
                  loading={isLoading}
                  tooltip={resumeReason}
                />
              )}

              {canHalt && (
                <ActionButton
                  icon={<IconAlertOctagon size={16} />}
                  label={BUTTON_LABELS.HALT}
                  color="red"
                  onClick={onHalt}
                  disabled={isLoading}
                  tooltip={haltReason}
                />
              )}
            </Group>
          </>
        )}

        {/* Complete State */}
        {isComplete && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <Group gap="sm">
              <IconCheck size={16} className="text-green-600" />
              <Text size="sm" c="green.7">
                Rollout complete - 100% of users can now access this version.
              </Text>
            </Group>
          </div>
        )}
      </Stack>
    </Card>
  );
}

