/**
 * Release Frequency Selector Component
 * Select release cadence (Weekly, Biweekly, Monthly, Custom)
 */

import { Stack, Select, NumberInput, Text, Group, Card } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import type { ReleaseFrequency } from '~/types/release-config';
import type { ReleaseFrequencySelectorProps } from '~/types/release-config-props';
import { RELEASE_FREQUENCY_OPTIONS } from '~/constants/release-config';
import { RELEASE_FREQUENCIES } from '~/types/release-config-constants';
import { SCHEDULING_LABELS, ICON_SIZES } from '~/constants/release-config-ui';

export function ReleaseFrequencySelector({
  frequency,
  customDays,
  onChange,
}: ReleaseFrequencySelectorProps) {
  const selectedOption = RELEASE_FREQUENCY_OPTIONS.find(opt => opt.value === frequency);
  
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" className="mb-3">
        <IconCalendar size={ICON_SIZES.MEDIUM} className="text-blue-600" />
        <Text fw={600} size="sm">
          {SCHEDULING_LABELS.FREQUENCY_TITLE}
        </Text>
      </Group>
      
      <Stack gap="md">
        <Select
          label={SCHEDULING_LABELS.FREQUENCY_LABEL}
          placeholder={SCHEDULING_LABELS.FREQUENCY_PLACEHOLDER}
          data={RELEASE_FREQUENCY_OPTIONS.map(opt => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={frequency}
          onChange={(val) => onChange(val as any)}
          required
          description={SCHEDULING_LABELS.FREQUENCY_DESCRIPTION}
        />
        
        {selectedOption && (
          <Text size="sm" c="dimmed" className="italic">
            {selectedOption.description}
          </Text>
        )}
        
        {frequency === RELEASE_FREQUENCIES.CUSTOM && (
          <NumberInput
            label={SCHEDULING_LABELS.CUSTOM_FREQUENCY_LABEL}
            placeholder={SCHEDULING_LABELS.CUSTOM_FREQUENCY_PLACEHOLDER}
            value={customDays}
            onChange={(val) => onChange(RELEASE_FREQUENCIES.CUSTOM, Number(val) || undefined)}
            required
            min={1}
            max={365}
            description={SCHEDULING_LABELS.CUSTOM_FREQUENCY_DESCRIPTION}
          />
        )}
        
        {frequency !== RELEASE_FREQUENCIES.CUSTOM && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <Text size="sm" fw={500} className="text-blue-900">
              {SCHEDULING_LABELS.ESTIMATED_DAYS}: {selectedOption?.days || 0}
            </Text>
          </div>
        )}
      </Stack>
    </Card>
  );
}

