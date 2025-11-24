/**
 * Working Days Selector Component
 * Select working days of the week
 */

import { Stack, Text, Checkbox, Group, Card } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import type { WorkingDaysSelectorProps } from '~/types/release-config-props';
import { DAYS_OF_WEEK } from '~/constants/release-config';
import { ICON_SIZES } from '~/constants/release-config-ui';

export function WorkingDaysSelector({ workingDays, onChange }: WorkingDaysSelectorProps) {
  const handleToggle = (day: number) => {
    if (workingDays.includes(day)) {
      onChange(workingDays.filter(d => d !== day));
    } else {
      onChange([...workingDays, day].sort());
    }
  };
  
  const handleSelectAll = () => {
    onChange([1, 2, 3, 4, 5, 6, 0]);
  };
  
  const handleSelectWeekdays = () => {
    onChange([1, 2, 3, 4, 5]);
  };
  
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" className="mb-3">
        <IconCalendarEvent size={ICON_SIZES.SMALL} className="text-blue-600" />
        <Text fw={600} size="sm">
          Working Days
        </Text>
      </Group>
      
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select the days when your team works on releases
        </Text>
        
        <Group gap="xs" className="mb-2">
          <Text
            size="xs"
            className="text-blue-600 cursor-pointer hover:underline"
            onClick={handleSelectWeekdays}
          >
            Weekdays Only
          </Text>
          <Text size="xs" c="dimmed">
            •
          </Text>
          <Text
            size="xs"
            className="text-blue-600 cursor-pointer hover:underline"
            onClick={handleSelectAll}
          >
            All Days
          </Text>
        </Group>
        
        <div className="grid grid-cols-2 gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day.value}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                workingDays.includes(day.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleToggle(day.value)}
            >
              <Checkbox
                checked={workingDays.includes(day.value)}
                onChange={() => handleToggle(day.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <div>
                <Text size="sm" fw={500}>
                  {day.label}
                </Text>
              </div>
            </div>
          ))}
        </div>
        
        {workingDays.length === 0 && (
          <Text size="xs" c="red" className="mt-2">
            Please select at least one working day
          </Text>
        )}
        
        {workingDays.length > 0 && (
          <div className="bg-green-50 p-3 rounded-lg mt-2">
            <Text size="sm" fw={500} className="text-green-900">
              {workingDays.length} day{workingDays.length > 1 ? 's' : ''} selected
            </Text>
          </div>
        )}
      </Stack>
    </Card>
  );
}

