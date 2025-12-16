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
    MAX_ROLLOUT_PERCENTAGE,
    MIN_ROLLOUT_PERCENTAGE,
    PLATFORM_LABELS,
    ROLLOUT_COMPLETE_PERCENT,
    ROLLOUT_PRESETS
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

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
    if (!isNaN(parsed) && parsed >= MIN_ROLLOUT_PERCENTAGE && parsed <= MAX_ROLLOUT_PERCENTAGE) {
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

    if (parsed < MIN_ROLLOUT_PERCENTAGE || parsed > MAX_ROLLOUT_PERCENTAGE) {
      setValidationError(`Rollout must be between ${MIN_ROLLOUT_PERCENTAGE}% and ${MAX_ROLLOUT_PERCENTAGE}%`);
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
        <Group gap="sm">
          <ThemeIcon color="cyan" variant="light" size="lg">
            <IconRocket size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>{DIALOG_TITLES.UPDATE_ROLLOUT}</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="lg">
        {/* Warning Alert - FIRST (matching Emergency Halt pattern) */}
        {!cannotUpdate && (
          <Alert icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />} color="orange" variant="light">
            <Stack gap="xs">
              <Text size="sm" fw={600}>{DIALOG_UI.UPDATE_ROLLOUT.WARNING_TITLE}</Text>
              <Text size="sm">{DIALOG_UI.UPDATE_ROLLOUT.WARNING_MESSAGE}</Text>
            </Stack>
          </Alert>
        )}

        {/* Cannot Update Warning (iOS Manual Release) */}
        {cannotUpdate && (
          <Alert icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />} color="yellow" variant="light">
            <Text size="sm">
              iOS manual releases are deployed at 100% immediately. No rollout control available.
            </Text>
          </Alert>
        )}

        {/* iOS Phased Release Info */}
        {isIOSPhasedRelease && (
          <Alert icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />} color="blue" variant="light">
            <Text size="sm">
              iOS phased releases can only be updated to <strong>100%</strong> to complete rollout early.
              Apple automatically manages the 7-day phased rollout.
            </Text>
          </Alert>
        )}

        {/* Platform & Current Rollout - SECOND (matching Emergency Halt pattern) */}
        <Paper p="sm" withBorder className="bg-white">
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={2}>
                Platform
              </Text>
              <Text size="sm" fw={500}>{platformLabel}</Text>
            </div>
            <div className="text-right">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={2}>
                Current Rollout
              </Text>
              <Text size="xl" fw={700} c="cyan">
                {currentPercentage}%
              </Text>
            </div>
          </Group>
        </Paper>

        {!cannotUpdate && (
          <>

            {/* Preset Buttons (Android) or 100% Confirmation (iOS Phased) */}
            <div>
              <Text size="sm" fw={600} mb="xs">
                {isAndroid ? 'Quick Presets' : 'Complete Rollout'}
              </Text>
              {isAndroid && (
                <Group gap="xs">
                  {ROLLOUT_PRESETS.filter(p => p > currentPercentage).map((preset) => (
                    <Button
                      key={preset}
                      variant={rolloutPercentage === preset ? 'filled' : 'light'}
                      color="cyan"
                      onClick={() => handlePresetClick(preset)}
                      disabled={isLoading}
                    >
                      {preset}%
                    </Button>
                  ))}
                </Group>
              )}
              {isIOSPhasedRelease && (
                <Paper p="md" withBorder className="bg-cyan-50">
                  <Checkbox
                    checked={confirmComplete}
                    onChange={(e) => {
                      setConfirmComplete(e.currentTarget.checked);
                      if (e.currentTarget.checked) {
                        handlePresetClick(ROLLOUT_COMPLETE_PERCENT);
                      }
                    }}
                    label={
                      <Stack gap={4}>
                        <Text size="sm" fw={600}>
                          Release to 100% of users immediately
                        </Text>
                        <Text size="xs" c="dimmed">
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
                rightSection={<Text size="sm" c="dimmed">%</Text>}
                type="text"
                inputMode="decimal"
                min={0}
                max={100}
              />
            )}

            {/* Slider (Android only) - Moved to bottom */}
            {isAndroid && (
              <div>
                <Text size="sm" fw={600} mb="xs">
                  Adjust Rollout Percentage
                </Text>
                <div style={{ paddingLeft: '4px', paddingRight: '4px' }}>
                  <Slider
                    value={rolloutPercentage}
                    onChange={handleSliderChange}
                    min={currentPercentage}
                    max={MAX_ROLLOUT_PERCENTAGE}
                    step={isAndroid ? 0.1 : 1}
                    marks={ROLLOUT_PRESETS.filter(p => p > currentPercentage).map(p => ({ value: p, label: `${p}%` }))}
                    label={(value) => `${value}%`}
                    disabled={isLoading}
                    color="cyan"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" mt="xl">
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          {!cannotUpdate && (
            <Button
              color="cyan"
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

