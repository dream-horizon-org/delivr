/**
 * IOSOptions - iOS-specific submission options
 * 
 * Note: iOS release type is always "AUTOMATIC" per API spec (display-only, non-editable)
 */

import { Badge, Checkbox, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { IconBrandApple } from '@tabler/icons-react';
import { useCallback } from 'react';
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
    <Paper p="md" withBorder radius="md" bg="blue.0">
      <Group gap="xs" mb="md">
        <IconBrandApple size={FORM_ICON_SIZES.INPUT} className="text-blue-600" />
        <Text fw={500} size="sm">{DISTRIBUTION_UI_LABELS.IOS_OPTIONS}</Text>
      </Group>
      
      <Stack gap="md">
        {/* Release Type - Display only (always AUTOMATIC per API spec) */}
        <TextInput
          label={DISTRIBUTION_UI_LABELS.IOS_RELEASE_TYPE}
          description="Release type is always AUTOMATIC for App Store submissions"
          value="AUTOMATIC"
          readOnly
          disabled
          rightSection={<Badge size="xs" variant="light" color="blue">Default</Badge>}
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

