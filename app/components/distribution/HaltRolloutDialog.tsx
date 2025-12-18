/**
 * HaltRolloutDialog - Emergency halt confirmation dialog
 * 
 * Features:
 * - Required reason field
 * - Clear warning about consequences
 * 
 * Note: Severity field removed per API spec (only reason required)
 */

import {
  Alert,
  Badge,
  Button,
  Group,
  List,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertOctagon, IconAlertTriangle, IconBrandAndroid, IconBrandApple } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import {
  DIST_ALERT_PROPS,
  DIST_BADGE_PROPS,
  DIST_BUTTON_PROPS,
  DIST_CARD_PROPS,
  DIST_FONT_WEIGHTS,
  DIST_INPUT_PROPS,
  DIST_MODAL_PROPS,
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  DIALOG_UI,
  PLATFORM_LABELS,
} from '~/constants/distribution/distribution.constants';
import type { HaltRolloutDialogProps } from '~/types/distribution/distribution-component.types';
import { Platform } from '~/types/distribution/distribution.types';

export function HaltRolloutDialog({
  opened,
  submissionId,
  platform,
  isHalting,
  onHalt,
  onClose,
}: HaltRolloutDialogProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const platformLabel = PLATFORM_LABELS[platform];
  const isAndroid = platform === Platform.ANDROID;
  const PlatformIcon = isAndroid ? IconBrandAndroid : IconBrandApple;

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  const handleHalt = useCallback(() => {
    if (!reason.trim()) {
      setValidationError(DIALOG_UI.HALT.REASON_REQUIRED);
      return;
    }

    setValidationError(null);
    onHalt(reason.trim());
  }, [reason, onHalt]);

  const handleClose = useCallback(() => {
    setReason('');
    setValidationError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.ERROR} variant="light" size="lg">
            <IconAlertOctagon size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DIST_FONT_WEIGHTS.SEMIBOLD}>{DIALOG_TITLES.HALT_ROLLOUT}</Text>
        </Group>
      }
      {...DIST_MODAL_PROPS.DEFAULT}
    >
      <Stack gap={DS_SPACING.LG}>
        {/* Warning Alert */}
        <Alert 
          {...DIST_ALERT_PROPS.ERROR}
          icon={<IconAlertTriangle size={DIALOG_ICON_SIZES.ALERT} />}
        >
          <Stack gap={DS_SPACING.XS}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.SEMIBOLD}>{DIALOG_UI.HALT.WARNING_TITLE}</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>{DIALOG_UI.HALT.WARNING_MESSAGE}</Text>
          </Stack>
        </Alert>

        {/* Platform Info */}
        <Paper {...DIST_CARD_PROPS.COMPACT} className="bg-white" p={DS_SPACING.MD}>
          <Group justify="space-between" align="center">
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.SEMIBOLD} >Platform</Text>
            <Badge 
              {...DIST_BADGE_PROPS.LARGE}
              leftSection={<PlatformIcon size={DIALOG_ICON_SIZES.ALERT} />}
            >
              {platformLabel}
            </Badge>
          </Group>
        </Paper>

        {/* Reason Field */}
        <Textarea
          label={DIALOG_UI.HALT.REASON_LABEL}
          placeholder={DIALOG_UI.HALT.REASON_PLACEHOLDER}
          value={reason}
          onChange={handleReasonChange}
          minRows={3}
          required
          error={validationError}
          disabled={isHalting}
          {...DIST_INPUT_PROPS.DEFAULT}
        />

        {/* Consequences */}
        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.SEMIBOLD} mb={DS_SPACING.XS}>{DIALOG_UI.HALT.CONSEQUENCE_TITLE}</Text>
          <List size={DS_TYPOGRAPHY.SIZE.SM} spacing={DS_SPACING.XS}>
            {DIALOG_UI.HALT.CONSEQUENCE_ITEMS.map((item, index) => (
              <List.Item key={index}>
                <Text size={DS_TYPOGRAPHY.SIZE.SM}>{item}</Text>
              </List.Item>
            ))}
          </List>
        </div>

        {/* Action Buttons */}
        <Group justify="flex-end" mt={DS_SPACING.LG}>
          <Button 
            {...DIST_BUTTON_PROPS.SUBTLE}
            onClick={handleClose}
            disabled={isHalting}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button 
            {...DIST_BUTTON_PROPS.DANGER}
            onClick={handleHalt}
            loading={isHalting}
            leftSection={<IconAlertOctagon size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {BUTTON_LABELS.HALT_ROLLOUT}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

