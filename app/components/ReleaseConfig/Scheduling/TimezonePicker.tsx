/**
 * Timezone Picker Component
 * Select timezone for release scheduling
 */

import { Select, Card, Text, Group } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { TIMEZONES } from '../release-config-constants';

interface TimezonePickerProps {
  timezone: string;
  onChange: (timezone: string) => void;
}

export function TimezonePicker({ timezone, onChange }: TimezonePickerProps) {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" className="mb-3">
        <IconClock size={20} className="text-blue-600" />
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

