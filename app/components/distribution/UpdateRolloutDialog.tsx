/**
 * Update Rollout Dialog - Adjust rollout percentage for active submissions
 * 
 * ✅ Correct iOS Behavior:
 * ┌───────────────┬───────────┬──────────────┬────────────┐
 * │ phasedRelease │ Rollout % │ Can Update?  │ Can Pause? │
 * ├───────────────┼───────────┼──────────────┼────────────┤
 * │ true          │ 1-99%     │ ✅ Yes       │ ✅ Yes     │
 * │               │           │ (to 100%)    │            │
 * │ true          │ 100%      │ ❌ No        │ ❌ No      │
 * │ false         │ 100%      │ ❌ No        │ ❌ No      │
 * │ false         │ <100%     │ ❌ INVALID   │ ❌ INVALID │
 * └───────────────┴───────────┴──────────────┴────────────┘
 * 
 * Platform-specific rules:
 * - Android: Any percentage 0-100 (supports decimals)
 * - iOS Phased: Can only update to 100% (to complete early)
 * - iOS Manual: Already at 100%, cannot update
 * 
 * See: platform-rules.ts, LIVE_STATE_VERIFICATION.md
 */

import {
    Alert,
    Button,
    Checkbox,
    Group,
    Modal,
    Paper,
    Slider,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
} from '@mantine/core';
import { IconAlertCircle, IconRocket } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
    BUTTON_LABELS,
    DIALOG_ICON_SIZES,
    DIALOG_TITLES,
    DIALOG_UI,
    MAX_ROLLOUT_PERCENT,
    MIN_ROLLOUT_PERCENT,
    PLATFORM_LABELS,
    ROLLOUT_COMPLETE_PERCENT,
    ROLLOUT_PRESETS
} from '~/constants/distribution/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { Platform } from '~/types/distribution/distribution.types';

export interface UpdateRolloutDialogProps {
  opened: boolean;
  onClose: () => void;
  platform: Platform;
  currentPercentage: number;
  phasedRelease?: boolean;
  onConfirm: (rolloutPercentage: number) => void;
  isLoading?: boolean;
}

export function UpdateRolloutDialog({
  opened,
  onClose,
  platform,
  currentPercentage,
  phasedRelease,
  onConfirm,
  isLoading,
}: UpdateRolloutDialogProps) {
  const [rolloutPercentage, setRolloutPercent] = useState(currentPercentage);
  const [customValue, setCustomValue] = useState(currentPercentage.toString());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const platformLabel = useMemo(() => PLATFORM_LABELS[platform], [platform]);
  const isIOS = platform === Platform.IOS;
  const isAndroid = platform === Platform.ANDROID;

  // iOS Phased Release can only update to 100%
  const isIOSPhasedRelease = isIOS && phasedRelease;
  const canOnlyUpdateTo100 = isIOSPhasedRelease;

  // iOS Manual Release is already at 100%
  const isIOSManualRelease = isIOS && !phasedRelease;
  const cannotUpdate = isIOSManualRelease;

  const handleSliderChange = useCallback((value: number) => {
    setRolloutPercent(value);
    setCustomValue(value.toString());
    setValidationError(null);
  }, []);

  const handleCustomValueChange = useCallback((value: string) => {
    // Only allow numbers and one decimal point
    // Regex: optional digits, optional decimal point with digits after
    const validInputPattern = /^(\d*\.?\d*)$/;
    
    if (!validInputPattern.test(value)) {
      // Invalid input, don't update
      return;
    }
    
    setCustomValue(value);
    setValidationError(null);

    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= MIN_ROLLOUT_PERCENT && parsed <= MAX_ROLLOUT_PERCENT) {
      setRolloutPercent(parsed);
    }
  }, []);

  const handlePresetClick = useCallback((preset: number) => {
    setRolloutPercent(preset);
    setCustomValue(preset.toString());
    setValidationError(null);
  }, []);

  const handleConfirm = useCallback(() => {
    const parsed = parseFloat(customValue);

    // Validation
    if (isNaN(parsed)) {
      setValidationError('Please enter a valid number');
      return;
    }

    if (parsed < MIN_ROLLOUT_PERCENT || parsed > MAX_ROLLOUT_PERCENT) {
      setValidationError(`Rollout must be between ${MIN_ROLLOUT_PERCENT}% and ${MAX_ROLLOUT_PERCENT}%`);
      return;
    }

    if (isIOSPhasedRelease && parsed !== ROLLOUT_COMPLETE_PERCENT) {
      setValidationError('iOS phased release can only be updated to 100% (to complete early)');
      return;
    }

    if (parsed <= currentPercentage) {
      setValidationError('New rollout percentage must be greater than current percentage');
      return;
    }

    setValidationError(null);
    onConfirm(parsed);
  }, [customValue, currentPercentage, isIOSPhasedRelease, onConfirm]);

  const handleClose = useCallback(() => {
    setRolloutPercent(currentPercentage);
    setCustomValue(currentPercentage.toString());
    setValidationError(null);
    setConfirmComplete(false);
    onClose();
  }, [currentPercentage, onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.ACTION.PRIMARY} variant="light" size="lg" radius={DS_SPACING.BORDER_RADIUS}>
            <IconRocket size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>{BUTTON_LABELS.UPDATE_ROLLOUT}</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap={DS_SPACING.MD}>
        {/* Warning Alert - FIRST (matching Emergency Halt pattern) */}
        {!cannotUpdate && (
          <Alert icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />} color={DS_COLORS.STATUS.WARNING} variant="light" radius={DS_SPACING.BORDER_RADIUS}>
            <Stack gap={DS_SPACING.XS}>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>{DIALOG_UI.UPDATE_ROLLOUT.WARNING_TITLE}</Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM}>{DIALOG_UI.UPDATE_ROLLOUT.WARNING_MESSAGE}</Text>
            </Stack>
          </Alert>
        )}

        {/* Cannot Update Warning (iOS Manual Release) */}
        {cannotUpdate && (
          <Alert icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />} color={DS_COLORS.STATUS.WARNING} variant="light" radius={DS_SPACING.BORDER_RADIUS}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>
              iOS manual releases are deployed at 100% immediately. No rollout control available.
            </Text>
          </Alert>
        )}

        {/* iOS Phased Release Info */}
        {isIOSPhasedRelease && (
          <Alert icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />} color={DS_COLORS.ACTION.PRIMARY} variant="light" radius={DS_SPACING.BORDER_RADIUS}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>
              iOS phased releases can only be updated to <strong>100%</strong> to complete rollout early.
              Apple automatically manages the 7-day phased rollout.
            </Text>
          </Alert>
        )}

        {/* Platform & Current Rollout - SECOND (matching Emergency Halt pattern) */}
        <Paper p={DS_SPACING.SM} withBorder bg={DS_COLORS.BACKGROUND.SURFACE} radius={DS_SPACING.BORDER_RADIUS}>
          <Group justify="space-between" align="center">
            <div>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XXS}>
                Platform
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>{platformLabel}</Text>
            </div>
            <div className="text-right">
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XXS}>
                Current Rollout
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.XL} fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c={DS_COLORS.ACTION.PRIMARY}>
                {currentPercentage}%
              </Text>
            </div>
          </Group>
        </Paper>

        {!cannotUpdate && (
          <>

            {/* Preset Buttons (Android) or 100% Confirmation (iOS Phased) */}
            <div>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
                {isAndroid ? 'Quick Presets' : 'Complete Rollout'}
              </Text>
              {isAndroid && (
                <Group gap={DS_SPACING.XS}>
                  {ROLLOUT_PRESETS.filter(p => p > currentPercentage).map((preset) => (
                    <Button
                      key={preset}
                      variant={rolloutPercentage === preset ? 'filled' : 'light'}
                      color={DS_COLORS.ACTION.PRIMARY}
                      radius={DS_SPACING.BORDER_RADIUS}
                      onClick={() => handlePresetClick(preset)}
                      disabled={isLoading}
                    >
                      {preset}%
                    </Button>
                  ))}
                </Group>
              )}
              {isIOSPhasedRelease && (
                <Paper p={DS_SPACING.MD} withBorder className="bg-cyan-50">
                  <Checkbox
                    checked={confirmComplete}
                    onChange={(e) => {
                      setConfirmComplete(e.currentTarget.checked);
                      if (e.currentTarget.checked) {
                        handlePresetClick(ROLLOUT_COMPLETE_PERCENT);
                      }
                    }}
                    label={
                      <Stack gap={DS_SPACING.XXS}>
                        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
                          Release to 100% of users immediately
                        </Text>
                        <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                          This will make the app available to all users and cannot be undone.
                        </Text>
                      </Stack>
                    }
                    disabled={isLoading}
                  />
                </Paper>
              )}
            </div>

            {/* Custom Value Input (Android only) */}
            {isAndroid && (
              <TextInput
                label="Custom Percentage"
                placeholder="Enter percentage (e.g., 25.5)"
                value={customValue}
                onChange={(e) => handleCustomValueChange(e.target.value)}
                error={validationError}
                disabled={isLoading}
                rightSection={<Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>%</Text>}
                type="text"
                inputMode="decimal"
                min={0}
                max={100}
              />
            )}

            {/* Slider (Android only) - Moved to bottom */}
            {isAndroid && (
              <div>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
                  Adjust Rollout Percentage
                </Text>
                <div style={{ paddingLeft: '4px', paddingRight: '4px' }}>
                  <Slider
                    value={rolloutPercentage}
                    onChange={handleSliderChange}
                    min={currentPercentage}
                    max={MAX_ROLLOUT_PERCENT}
                    step={isAndroid ? 0.1 : 1}
                    marks={ROLLOUT_PRESETS.filter(p => p > currentPercentage).map(p => ({ value: p, label: `${p}%` }))}
                    label={(value) => `${value}%`}
                    disabled={isLoading}
                    color={DS_COLORS.ACTION.PRIMARY}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" mt={DS_SPACING.LG}>
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          {!cannotUpdate && (
            <Button
              color={DS_COLORS.ACTION.PRIMARY}
              onClick={handleConfirm}
              loading={isLoading}
              disabled={isIOSPhasedRelease && !confirmComplete}
              leftSection={<IconRocket size={DIALOG_ICON_SIZES.ACTION} />}
            >
              {BUTTON_LABELS.UPDATE_ROLLOUT}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}

