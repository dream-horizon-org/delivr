/**
 * Timezone Picker Component
 * Select timezone for release scheduling
 */

import { Select, Card, Text, Group } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import type { TimezonePickerProps } from '~/types/release-config-props';
import { TIMEZONES } from '~/constants/release-config';
import { ICON_SIZES } from '~/constants/release-config-ui';

export function TimezonePicker({ timezone, onChange }: TimezonePickerProps) {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" className="mb-3">
        <IconClock size={ICON_SIZES.SMALL} className="text-blue-600" />
        <Text fw={600} size="sm">
          Timezone
        </Text>
      </Group>
      
      <Select
        label="Select Timezone"
        placeholder="Choose your timezone"
        data={TIMEZONES}
        value={timezone}
        onChange={(val) => onChange(val || 'UTC')}
        required
        searchable
        description="All release timings will be calculated based on this timezone"
      />
    </Card>
  );
}

