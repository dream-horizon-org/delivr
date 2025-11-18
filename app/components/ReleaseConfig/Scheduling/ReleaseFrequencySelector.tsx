/**
 * Release Frequency Selector Component
 * Select release cadence (Weekly, Biweekly, Monthly, Custom)
 */

import { Stack, Select, NumberInput, Text, Group, Card } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';

interface ReleaseFrequencySelectorProps {
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  customDays?: number;
  onChange: (frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM', customDays?: number) => void;
}

const frequencyOptions = [
  { value: 'WEEKLY', label: 'Weekly', description: 'Release every 7 days' },
  { value: 'BIWEEKLY', label: 'Biweekly', description: 'Release every 14 days' },
  { value: 'MONTHLY', label: 'Monthly', description: 'Release every 30 days' },
  { value: 'CUSTOM', label: 'Custom', description: 'Define custom frequency' },
];

export function ReleaseFrequencySelector({
  frequency,
  customDays,
  onChange,
}: ReleaseFrequencySelectorProps) {
  const selectedOption = frequencyOptions.find(opt => opt.value === frequency);
  
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" className="mb-3">
        <IconCalendar size={20} className="text-blue-600" />
        <Text fw={600} size="sm">
          Release Frequency
        </Text>
      </Group>
      
      <Stack gap="md">
        <Select
          label="Frequency"
          placeholder="Select release frequency"
          data={frequencyOptions.map(opt => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={frequency}
          onChange={(val) => onChange(val as any)}
          required
          description="How often do you want to create releases?"
        />
        
        {selectedOption && (
          <Text size="sm" c="dimmed" className="italic">
            {selectedOption.description}
          </Text>
        )}
        
        {frequency === 'CUSTOM' && (
          <NumberInput
            label="Custom Frequency (Days)"
            placeholder="21"
            value={customDays}
            onChange={(val) => onChange('CUSTOM', Number(val) || undefined)}
            required
            min={1}
            max={365}
            description="Number of days between releases"
          />
        )}
        
        {frequency !== 'CUSTOM' && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <Text size="sm" fw={500} className="text-blue-900">
              Estimated Days: {
                frequency === 'WEEKLY' ? '7' :
                frequency === 'BIWEEKLY' ? '14' :
                frequency === 'MONTHLY' ? '30' : ''
              }
            </Text>
          </div>
        )}
      </Stack>
    </Card>
  );
}

