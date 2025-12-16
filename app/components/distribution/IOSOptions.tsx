/**
 * IOSOptions - iOS-specific submission options
 * 
 * Note: iOS release type is always "AFTER_APPROVAL" per API spec (display-only, non-editable)
 */

import { Badge, Checkbox, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { IconBrandApple } from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  DIST_BADGE_PROPS,
  DIST_CARD_PROPS,
  DS_COLORS,
  DS_TYPOGRAPHY,
  DIST_FONT_WEIGHTS,
  DIST_ICON_SIZES,
  DIST_INPUT_PROPS,
  DS_SPACING,
} from '~/constants/distribution-design.constants';
import { DISTRIBUTION_UI_LABELS, FORM_ICON_SIZES } from '~/constants/distribution.constants';

type IOSOptionsProps = {
  phasedRelease: boolean;
  resetRating: boolean;
  onPhasedReleaseChange: (value: boolean) => void;
  onResetRatingChange: (value: boolean) => void;
  disabled?: boolean;
};

export function IOSOptions({ 
  phasedRelease,
  resetRating,
  onPhasedReleaseChange,
  onResetRatingChange,
  disabled,
}: IOSOptionsProps) {
  const handlePhasedReleaseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onPhasedReleaseChange(e.currentTarget.checked);
  }, [onPhasedReleaseChange]);

  const handleResetRatingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onResetRatingChange(e.currentTarget.checked);
  }, [onResetRatingChange]);

  return (
    <Paper {...DIST_CARD_PROPS.COMPACT} bg={DS_COLORS.BACKGROUND.INFO} p={DS_SPACING.MD}>
      <Group gap={DS_SPACING.XS} mb={DS_SPACING.MD}>
        <IconBrandApple size={DIST_ICON_SIZES.LG} className="text-blue-600" />
        <Text fw={DIST_FONT_WEIGHTS.MEDIUM} size={DS_TYPOGRAPHY.SIZE.SM}>{DISTRIBUTION_UI_LABELS.IOS_OPTIONS}</Text>
      </Group>
      
      <Stack gap={DS_SPACING.MD}>
        {/* Release Type - Display only (always AFTER_APPROVAL per API spec) */}
        <TextInput
          label={DISTRIBUTION_UI_LABELS.IOS_RELEASE_TYPE}
          description="Release type is always AFTER_APPROVAL for App Store submissions"
          value="AFTER_APPROVAL"
          readOnly
          disabled
          rightSection={<Badge {...DIST_BADGE_PROPS.DEFAULT} color={DS_COLORS.STATUS.INFO}>Default</Badge>}
          {...DIST_INPUT_PROPS.DEFAULT}
        />

        <Checkbox
          label={DISTRIBUTION_UI_LABELS.IOS_PHASED_RELEASE}
          description={DISTRIBUTION_UI_LABELS.IOS_PHASED_RELEASE_DESC}
          checked={phasedRelease}
          onChange={handlePhasedReleaseChange}
          disabled={disabled}
        />

        <Checkbox
          label={DISTRIBUTION_UI_LABELS.IOS_RESET_RATING}
          description={DISTRIBUTION_UI_LABELS.IOS_RESET_RATING_DESC}
          checked={resetRating}
          onChange={handleResetRatingChange}
          disabled={disabled}
        />
      </Stack>
    </Paper>
  );
}

