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
import { useCallback, useMemo, useState } from 'react';
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
    getIOSPhasedReleaseDay,
    getPlatformRolloutDescription,
    getPlatformRules,
    getRolloutControlType,
} from '~/utils/platform-rules';
import { ActionButton } from './ActionButton';
import { CompleteEarlyDialog } from './CompleteEarlyDialog';
import { HaltConfirmationDialog } from './HaltConfirmationDialog';
import { IOSPhasedReleaseSchedule } from './IOSPhasedReleaseSchedule';
import { PauseConfirmationDialog } from './PauseConfirmationDialog';
import { PresetButtons } from './PresetButtons';
import { ResumeConfirmationDialog } from './ResumeConfirmationDialog';
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
  // Dialog state
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showHaltDialog, setShowHaltDialog] = useState(false);
  const [showCompleteEarlyDialog, setShowCompleteEarlyDialog] = useState(false);

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

  // Dialog Handlers
  const handlePauseClick = useCallback(() => {
    setShowPauseDialog(true);
  }, []);

  const handlePauseConfirm = useCallback((reason?: string) => {
    if (onPause) {
      onPause(reason);
    }
    setShowPauseDialog(false);
  }, [onPause]);

  const handleResumeClick = useCallback(() => {
    setShowResumeDialog(true);
  }, []);

  const handleResumeConfirm = useCallback(() => {
    if (onResume) {
      onResume();
    }
    setShowResumeDialog(false);
  }, [onResume]);

  const handleHaltClick = useCallback(() => {
    setShowHaltDialog(true);
  }, []);

  const handleHaltConfirm = useCallback((reason: string) => {
    if (onHalt) {
      onHalt(reason);
    }
    setShowHaltDialog(false);
  }, [onHalt]);

  const handleCompleteEarlyClick = useCallback(() => {
    setShowCompleteEarlyDialog(true);
  }, []);

  const handleCompleteEarlyConfirm = useCallback(() => {
    if (onUpdateRollout) {
      onUpdateRollout(100);
    }
    setShowCompleteEarlyDialog(false);
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
          <Stack gap="md">
            <Group justify="space-between">
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
                onClick={handleCompleteEarlyClick}
                loading={isLoading}
                disabled={isLoading}
              >
                Complete Early (100%)
              </Button>
            </Group>
            
            {/* 7-Day Schedule Component */}
            <IOSPhasedReleaseSchedule
              currentDay={iosPhasedDay || 1}
              currentPercentage={currentPercentage}
            />
          </Stack>
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
                  onClick={handlePauseClick}
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
                  onClick={handleResumeClick}
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
                  onClick={handleHaltClick}
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

      {/* Confirmation Dialogs */}
      <PauseConfirmationDialog
        opened={showPauseDialog}
        onClose={() => setShowPauseDialog(false)}
        onConfirm={handlePauseConfirm}
        platform={platformLabel}
        currentPercentage={currentPercentage}
        isLoading={isLoading}
      />

      <ResumeConfirmationDialog
        opened={showResumeDialog}
        onClose={() => setShowResumeDialog(false)}
        onConfirm={handleResumeConfirm}
        platform={platformLabel}
        currentPercentage={currentPercentage}
        isLoading={isLoading}
      />

      <HaltConfirmationDialog
        opened={showHaltDialog}
        onClose={() => setShowHaltDialog(false)}
        onConfirm={handleHaltConfirm}
        platform={platformLabel}
        version={submissionId}
        isLoading={isLoading}
      />

      <CompleteEarlyDialog
        opened={showCompleteEarlyDialog}
        onClose={() => setShowCompleteEarlyDialog(false)}
        onConfirm={handleCompleteEarlyConfirm}
        currentDay={iosPhasedDay || 1}
        currentPercentage={currentPercentage}
        isLoading={isLoading}
      />
    </Card>
  );
}

