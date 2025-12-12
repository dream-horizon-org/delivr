/**
 * IOSOptions - iOS-specific submission options
 */

import { useCallback } from 'react';
import { Checkbox, Group, Paper, Select, Stack, Text } from '@mantine/core';
import { IconBrandApple } from '@tabler/icons-react';
import { DISTRIBUTION_UI_LABELS, IOS_RELEASE_TYPES } from '~/constants/distribution.constants';

type IOSOptionsProps = {
  releaseType: string;
  phasedRelease: boolean;
  onReleaseTypeChange: (value: string) => void;
  onPhasedReleaseChange: (value: boolean) => void;
  disabled?: boolean;
};

// Memoized data transformation (computed once)
const IOS_RELEASE_TYPES_DATA = IOS_RELEASE_TYPES.map(t => ({ value: t.value, label: t.label }));

export function IOSOptions({ 
  releaseType, 
  phasedRelease,
  onReleaseTypeChange,
  onPhasedReleaseChange,
  disabled,
}: IOSOptionsProps) {
  const handleReleaseTypeChange = useCallback((v: string | null) => {
    if (v) onReleaseTypeChange(v);
  }, [onReleaseTypeChange]);

  const handlePhasedReleaseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onPhasedReleaseChange(e.currentTarget.checked);
  }, [onPhasedReleaseChange]);

  return (
    <Paper p="md" withBorder radius="md" bg="blue.0">
      <Group gap="xs" mb="md">
        <IconBrandApple size={18} className="text-blue-600" />
        <Text fw={500} size="sm">{DISTRIBUTION_UI_LABELS.IOS_OPTIONS}</Text>
      </Group>
      
      <Stack gap="md">
        <Select
          label={DISTRIBUTION_UI_LABELS.IOS_RELEASE_TYPE}
          description={DISTRIBUTION_UI_LABELS.IOS_RELEASE_TYPE_DESC}
          value={releaseType}
          onChange={handleReleaseTypeChange}
          data={IOS_RELEASE_TYPES_DATA}
          disabled={disabled}
        />

        <Checkbox
          label={DISTRIBUTION_UI_LABELS.IOS_PHASED_RELEASE}
          description={DISTRIBUTION_UI_LABELS.IOS_PHASED_RELEASE_DESC}
          checked={phasedRelease}
          onChange={handlePhasedReleaseChange}
          disabled={disabled}
        />
      </Stack>
    </Paper>
  );
}

