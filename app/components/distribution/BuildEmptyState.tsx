/**
 * BuildEmptyState - Shown when no build exists yet
 */

import { Badge, Button, Group, Loader, Stack, Text } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';
import {
  DIST_BADGE_PROPS,
  DIST_BUTTON_PROPS,
  DS_COLORS,
  DS_TYPOGRAPHY,
  DIST_ICON_SIZES,
  DS_SPACING,
} from '~/constants/distribution/distribution-design.constants';
import { BUTTON_LABELS, DISTRIBUTION_UI_LABELS, PLATFORM_LABELS } from '~/constants/distribution/distribution.constants';
import { Platform } from '~/types/distribution/distribution.types';

export type BuildEmptyStateProps = {
  platform: Platform;
  isManualMode: boolean;
  onUpload?: () => void;
  onVerify?: () => void;
};

export function BuildEmptyState({ 
  platform, 
  isManualMode, 
  onUpload, 
  onVerify,
}: BuildEmptyStateProps) {
  const isAndroid = platform === Platform.ANDROID;
  
  return (
    <Stack gap={DS_SPACING.MD} align="center" py={DS_SPACING.MD}>
      <Text c={DS_COLORS.TEXT.SECONDARY} size={DS_TYPOGRAPHY.SIZE.SM} ta="center">
        {isManualMode 
          ? DISTRIBUTION_UI_LABELS.NO_BUILD_UPLOADED(PLATFORM_LABELS[platform])
          : DISTRIBUTION_UI_LABELS.WAITING_FOR_CICD(PLATFORM_LABELS[platform])
        }
      </Text>
      
      {isManualMode ? (
        <Button
          {...DIST_BUTTON_PROPS.SECONDARY}
          leftSection={<IconUpload size={DIST_ICON_SIZES.MD} />}
          onClick={isAndroid ? onUpload : onVerify}
        >
          {isAndroid ? BUTTON_LABELS.UPLOAD : BUTTON_LABELS.VERIFY}
        </Button>
      ) : (
        // CICD mode: Builds are auto-triggered by Release Orchestrator
        // Frontend just tracks status - no trigger button needed
        <Badge color={DS_COLORS.STATUS.INFO} {...DIST_BADGE_PROPS.LARGE}>
          <Group gap={DS_SPACING.XS}>
            <Loader size={DIST_ICON_SIZES.XS} />
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>{DISTRIBUTION_UI_LABELS.CI_BUILD_AUTO_START}</Text>
          </Group>
        </Badge>
      )}
    </Stack>
  );
}

