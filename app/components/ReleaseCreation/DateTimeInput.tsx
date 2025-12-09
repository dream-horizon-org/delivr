/**
 * Date and Time Input Component
 * 
 * Reusable component for date + time inputs matching release config format.
 * Both date and time are required.
 * 
 * Follows cursor rules: No 'any' or 'unknown' types
 */

import { Group, TextInput } from '@mantine/core';

interface DateTimeInputProps {
  dateLabel: string;
  timeLabel: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  dateError?: string;
  timeError?: string;
  dateDescription?: string;
  timeDescription?: string;
  dateMin?: string;
  dateMax?: string;
  required?: boolean;
}

export function DateTimeInput({
  dateLabel,
  timeLabel,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateError,
  timeError,
  dateDescription,
  timeDescription,
  dateMin,
  dateMax,
  required = true,
}: DateTimeInputProps) {
  return (
    <Group grow align="flex-start">
      <TextInput
        label={dateLabel}
        type="date"
        value={dateValue}
        onChange={(e) => onDateChange(e.target.value)}
        error={dateError}
        required={required}
        withAsterisk={required}
        min={dateMin}
        max={dateMax}
        description={dateDescription}
        styles={{
          label: { fontWeight: 500, marginBottom: 6 },
        }}
      />

      <TextInput
        label={timeLabel}
        type="time"
        value={timeValue}
        onChange={(e) => onTimeChange(e.target.value)}
        error={timeError}
        required={required}
        withAsterisk={required}
        description={timeDescription}
        styles={{
          label: { fontWeight: 500, marginBottom: 6 },
        }}
      />
    </Group>
  );
}

