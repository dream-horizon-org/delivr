/**
 * RolloutControls - Controls for managing rollout (update, pause, resume)
 * 
 * Features:
 * - Update rollout percentage with presets
 * - Pause/resume rollout
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
  IconCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrendingUp
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  BUTTON_LABELS,
  MAX_ROLLOUT_PERCENT,
  ROLLOUT_COMPLETE_PERCENT,
  ROLLOUT_CONTROLS_ICON_SIZES,
  ROLLOUT_CONTROLS_UI,
} from '~/constants/distribution/distribution.constants';
import { useRolloutState } from '~/hooks/distribution';
import type { RolloutControlsProps } from '~/types/distribution/distribution-component.types';
import { Platform } from '~/types/distribution/distribution.types';
import { deriveActionAvailability } from '~/utils/distribution';
import { getPlatformRolloutLabel, getRolloutStatus } from '~/utils/distribution/distribution-ui.utils';
import {
  getIOSPhasedReleaseDay,
  getPlatformRolloutDescription,
  getPlatformRules,
  getRolloutControlType,
} from '~/utils/platform-rules';
import { ActionButton } from './ActionButton';
import { CompleteEarlyDialog } from './CompleteEarlyDialog';
import { IOSPhasedReleaseSchedule } from './IOSPhasedReleaseSchedule';
import { PauseConfirmationDialog } from './PauseConfirmationDialog';
import { PresetButtons } from './PresetButtons';
import { ResumeConfirmationDialog } from './ResumeConfirmationDialog';
import { RolloutProgressBar } from './RolloutProgressBar';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RolloutControls({
  submissionId,
  currentPercentage,
  status,
  platform,
  phasedRelease,
  isLoading,
  onUpdateRollout,
  onPause,
  onResume,
  className,
}: RolloutControlsProps) {
  // Dialog state
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
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
    updateReason,
    pauseReason,
    resumeReason,
    supportsRollout,
    isComplete,
  } = deriveActionAvailability(status, platform, currentPercentage, phasedRelease);

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
      { value: MAX_ROLLOUT_PERCENT, label: ROLLOUT_CONTROLS_UI.COMPLETE_MARK },
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
      radius={DS_SPACING.BORDER_RADIUS} 
      withBorder 
      className={className}
      data-testid="rollout-controls"
    >
      {/* Header */}
      <Group justify="space-between" mb={DS_SPACING.MD}>
        <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>{ROLLOUT_CONTROLS_UI.TITLE}</Text>
        <Badge 
          color={supportsRollout ? 'blue' : 'gray'} 
          variant="light"
          size={DS_TYPOGRAPHY.SIZE.SM}
        >
          {platformLabel}
        </Badge>
      </Group>

      <Stack gap={DS_SPACING.MD}>
        {/* Progress Bar */}
        <RolloutProgressBar
          percentage={currentPercentage}
          {...(hasChanges && { targetPercentage })}
          status={rolloutStatus}
          showLabel
          size={DS_TYPOGRAPHY.SIZE.MD}
        />

        {/* Android Slider - Decimal support */}
        {controlType === 'slider' && canUpdate && !isComplete && (
          <div>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} mb={DS_SPACING.XS}>
              {ROLLOUT_CONTROLS_UI.ADJUST_LABEL}
            </Text>
            
            <Slider
              value={targetPercentage}
              onChange={handleSliderChange}
              min={currentPercentage}
              max={MAX_ROLLOUT_PERCENT}
              step={platformRules.sliderStep}
              disabled={isLoading}
              marks={sliderMarks}
              precision={platformRules.allowsDecimals ? 1 : 0}
            />

            <Group justify="space-between" mt={DS_SPACING.MD}>
              <PresetButtons
                currentPercentage={currentPercentage}
                targetPercentage={targetPercentage}
                onSelect={selectPreset}
                disabled={isLoading}
              />

              {hasChanges && (
                <Group gap={DS_SPACING.XS}>
                  <Button
                    variant="subtle"
                    size={DS_TYPOGRAPHY.SIZE.XS}
                    onClick={resetChanges}
                    disabled={isLoading}
                  >
                    {BUTTON_LABELS.CANCEL}
                  </Button>
                  <Button
                    size={DS_TYPOGRAPHY.SIZE.XS}
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
          <Stack gap={DS_SPACING.MD}>
            <Group justify="space-between">
              <div>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                  iOS Phased Release
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                  Day {iosPhasedDay} of 7-day automatic rollout
                </Text>
              </div>
              <Button
                size={DS_TYPOGRAPHY.SIZE.SM}
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
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} mb={DS_SPACING.XS}>
              iOS Manual Release
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
              {platformDescription}
            </Text>
          </div>
        )}

        {/* Action Buttons */}
        {!isComplete && (
          <>
            <Divider mt={DS_SPACING.SM} />
            
            <Group gap={DS_SPACING.SM}>
              {canPause && (
                <ActionButton
                  icon={
                    <IconPlayerPause size={ROLLOUT_CONTROLS_ICON_SIZES.ACTION_BUTTON} />
                  }
                  label={BUTTON_LABELS.PAUSE}
                  color={DS_COLORS.STATUS.WARNING}
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
                  color={DS_COLORS.STATUS.SUCCESS}
                  onClick={handleResumeClick}
                  disabled={isLoading}
                  loading={isLoading}
                  tooltip={resumeReason}
                />
              )}
            </Group>
          </>
        )}

        {/* Complete State */}
        {isComplete && (
          <Paper
            p={DS_SPACING.MD}
            radius={DS_SPACING.BORDER_RADIUS}
            withBorder
            style={{
              backgroundColor: 'var(--mantine-color-green-0)',
              borderColor: 'var(--mantine-color-green-3)',
            }}
          >
            <Group gap={DS_SPACING.SM}>
              <IconCheck
                size={ROLLOUT_CONTROLS_ICON_SIZES.COMPLETE_BADGE}
                style={{ color: DS_COLORS.STATUS.SUCCESS }}
              />
              <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.STATUS.SUCCESS}>
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

