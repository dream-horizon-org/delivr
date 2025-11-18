/**
 * Timezone Picker Component
 * Select timezone for release scheduling
 */

import { Select, Card, Text, Group } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

interface TimezonePickerProps {
  timezone: string;
  onChange: (timezone: string) => void;
}

// Common timezones
const timezones = [
  { value: 'Asia/Kolkata', label: 'IST - Asia/Kolkata (GMT+5:30)' },
  { value: 'America/New_York', label: 'EST - America/New_York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'PST - America/Los_Angeles (GMT-8)' },
  { value: 'America/Chicago', label: 'CST - America/Chicago (GMT-6)' },
  { value: 'Europe/London', label: 'GMT - Europe/London (GMT+0)' },
  { value: 'Europe/Paris', label: 'CET - Europe/Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'JST - Asia/Tokyo (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'CST - Asia/Shanghai (GMT+8)' },
  { value: 'Australia/Sydney', label: 'AEST - Australia/Sydney (GMT+10)' },
  { value: 'Pacific/Auckland', label: 'NZST - Pacific/Auckland (GMT+12)' },
  { value: 'UTC', label: 'UTC - Coordinated Universal Time (GMT+0)' },
];

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
        data={timezones}
        value={timezone}
        onChange={(val) => onChange(val || 'UTC')}
        required
        searchable
        description="All release timings will be calculated based on this timezone"
      />
    </Card>
  );
}

