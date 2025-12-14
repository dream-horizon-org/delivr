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
  Divider,
  Group,
  Paper,
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
import { useCallback, useMemo } from 'react';
import {
  BUTTON_LABELS,
  MAX_ROLLOUT_PERCENTAGE,
  ROLLOUT_COMPLETE_PERCENT,
  ROLLOUT_CONTROLS_ICON_SIZES,
  ROLLOUT_CONTROLS_UI,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';
import { getPlatformRolloutLabel, getRolloutStatus } from '~/utils/distribution-ui.utils';
import {
  getPlatformRules,
  getRolloutControlType,
  getPlatformRolloutDescription,
  getIOSPhasedReleaseDay,
} from '~/utils/platform-rules';
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
  phasedRelease,
  availableActions,
  isLoading,
  onUpdateRollout,
  onPause,
  onResume,
  onHalt,
  className,
}: RolloutControlsProps) {
  // Get platform-specific rules
  const platformRules = useMemo(
    () => getPlatformRules(platform, phasedRelease),
    [platform, phasedRelease]
  );

  const controlType = useMemo(
    () => getRolloutControlType(platform, phasedRelease),
    [platform, phasedRelease]
  );

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

  // Memoized derived values
  const platformLabel = useMemo(() => getPlatformRolloutLabel(platform), [platform]);
  
  const platformDescription = useMemo(
    () => getPlatformRolloutDescription(platform, phasedRelease),
    [platform, phasedRelease]
  );

  const iosPhasedDay = useMemo(
    () => platform === Platform.IOS && phasedRelease
      ? getIOSPhasedReleaseDay(currentPercentage)
      : null,
    [platform, phasedRelease, currentPercentage]
  );
  
  const rolloutStatus = useMemo(
    () => getRolloutStatus(currentPercentage, isComplete, canResume, ROLLOUT_COMPLETE_PERCENT),
    [currentPercentage, isComplete, canResume]
  );

  const sliderMarks = useMemo(
    () => [
      { value: currentPercentage, label: ROLLOUT_CONTROLS_UI.CURRENT_MARK },
      { value: MAX_ROLLOUT_PERCENTAGE, label: ROLLOUT_CONTROLS_UI.COMPLETE_MARK },
    ],
    [currentPercentage]
  );

  const updateButtonLabel = useMemo(
    () => ROLLOUT_CONTROLS_UI.UPDATE_BUTTON(targetPercentage),
    [targetPercentage]
  );

  // Handlers
  const handleUpdateClick = useCallback(() => {
    if (onUpdateRollout && hasChanges) {
      onUpdateRollout(targetPercentage);
      resetChanges();
    }
  }, [onUpdateRollout, hasChanges, targetPercentage, resetChanges]);

  const handleCompleteEarly = useCallback(() => {
    if (onUpdateRollout) {
      onUpdateRollout(100);
    }
  }, [onUpdateRollout]);

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
        <Text fw={600}>{ROLLOUT_CONTROLS_UI.TITLE}</Text>
        <Badge 
          color={supportsRollout ? 'blue' : 'gray'} 
          variant="light"
          size="sm"
        >
          {platformLabel}
        </Badge>
      </Group>

      <Stack gap="md">
        {/* Progress Bar */}
        <RolloutProgressBar
          percentage={currentPercentage}
          {...(hasChanges && { targetPercentage })}
          status={rolloutStatus}
          showLabel
          size="md"
        />

        {/* Android Slider - Decimal support */}
        {controlType === 'slider' && canUpdate && !isComplete && (
          <div>
            <Text size="sm" fw={500} mb="xs">
              {ROLLOUT_CONTROLS_UI.ADJUST_LABEL}
            </Text>
            
            <Slider
              value={targetPercentage}
              onChange={handleSliderChange}
              min={currentPercentage}
              max={MAX_ROLLOUT_PERCENTAGE}
              step={platformRules.sliderStep}
              disabled={isLoading}
              marks={sliderMarks}
              precision={platformRules.allowsDecimals ? 1 : 0}
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
                    {BUTTON_LABELS.CANCEL}
                  </Button>
                  <Button
                    size="xs"
                    leftSection={
                      <IconTrendingUp size={ROLLOUT_CONTROLS_ICON_SIZES.UPDATE_BUTTON} />
                    }
                    onClick={handleUpdateClick}
                    loading={isLoading}
                  >
                    {updateButtonLabel}
                  </Button>
                </Group>
              )}
            </Group>
          </div>
        )}

        {/* iOS Phased Release - Complete Early (100% only) */}
        {controlType === 'complete-early' && canUpdate && !isComplete && (
          <div>
            <Group justify="space-between" mb="xs">
              <div>
                <Text size="sm" fw={500}>
                  iOS Phased Release
                </Text>
                <Text size="xs" c="dimmed">
                  Day {iosPhasedDay} of 7-day automatic rollout
                </Text>
              </div>
              <Button
                size="sm"
                leftSection={<IconCheck size={16} />}
                onClick={handleCompleteEarly}
                loading={isLoading}
                disabled={isLoading}
              >
                Complete Early (100%)
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              {platformDescription}
            </Text>
          </div>
        )}

        {/* iOS Manual Release - Read-only */}
        {controlType === 'readonly' && (
          <div>
            <Text size="sm" fw={500} mb="xs">
              iOS Manual Release
            </Text>
            <Text size="xs" c="dimmed">
              {platformDescription}
            </Text>
          </div>
        )}

        {/* Action Buttons */}
        {!isComplete && (
          <>
            <Divider mt="sm" />
            
            <Group gap="sm">
              {canPause && (
                <ActionButton
                  icon={
                    <IconPlayerPause size={ROLLOUT_CONTROLS_ICON_SIZES.ACTION_BUTTON} />
                  }
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
                  icon={
                    <IconPlayerPlay size={ROLLOUT_CONTROLS_ICON_SIZES.ACTION_BUTTON} />
                  }
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
                  icon={
                    <IconAlertOctagon size={ROLLOUT_CONTROLS_ICON_SIZES.ACTION_BUTTON} />
                  }
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
          <Paper
            p="md"
            radius="md"
            withBorder
            style={{
              backgroundColor: 'var(--mantine-color-green-0)',
              borderColor: 'var(--mantine-color-green-3)',
            }}
          >
            <Group gap="sm">
              <IconCheck
                size={ROLLOUT_CONTROLS_ICON_SIZES.COMPLETE_BADGE}
                color="var(--mantine-color-green-7)"
              />
              <Text size="sm" c="green.7">
                {ROLLOUT_CONTROLS_UI.COMPLETE_MESSAGE}
              </Text>
            </Group>
          </Paper>
        )}
      </Stack>
    </Card>
  );
}

