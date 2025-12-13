/**
 * Regression Slot Card Component
 * 
 * Reusable component for displaying and editing regression slots.
 * Used in both Release Config and Release Creation flows.
 * 
 * Follows cursor rules: No 'any' types, explicit TypeScript types
 */

import { useMemo } from 'react';
import {
  Box,
  Paper,
  Group,
  Text,
  Badge,
  ActionIcon,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Divider,
  Switch,
  useMantineTheme,
} from '@mantine/core';
import { IconEdit, IconTrash, IconCheck } from '@tabler/icons-react';
import type { RegressionSlot } from '~/types/release-config';
import type { RegressionSlotCardProps } from '~/types/release-config-props';
import { timeToMinutes, normalizeTime } from '~/utils/time-utils';

/**
 * Regression Slot Card Component
 * 
 * Displays a regression slot with edit/delete actions.
 * Supports inline editing mode.
 */
export function RegressionSlotCard({
  slot,
  index,
  isEditing,
  onEdit,
  onDelete,
  onUpdate,
  onCollapse,
  targetReleaseOffset,
  targetReleaseTime,
  kickoffTime,
  allSlots = [],
}: RegressionSlotCardProps) {
  const theme = useMantineTheme();
  
  // Validation for time range (kickoff to release)
  const timeValidation = useMemo(() => {
    if (!slot.time || !kickoffTime || !targetReleaseTime) {
      return { hasError: false, message: '' };
    }

    // Calculate chronological timestamps (offset in days * 1440 minutes + time in minutes)
    const slotTimestamp = slot.regressionSlotOffsetFromKickoff * 1440 + timeToMinutes(slot.time);
    const kickoffTimestamp = 0 * 1440 + timeToMinutes(kickoffTime);
    const releaseTimestamp = targetReleaseOffset * 1440 + timeToMinutes(targetReleaseTime);

    // Check if slot is before kickoff chronologically
    if (slotTimestamp < kickoffTimestamp) {
      return {
        hasError: true,
        message: `Slot is before kickoff (Day 0 at ${kickoffTime})`,
      };
    }

    // Check if slot is after release chronologically
    if (slotTimestamp > releaseTimestamp) {
      return {
        hasError: true,
        message: `Slot is after release (Day ${targetReleaseOffset} at ${targetReleaseTime})`,
      };
    }

    return { hasError: false, message: '' };
  }, [slot, targetReleaseOffset, targetReleaseTime, kickoffTime]);

  // Validation for duplicate slots
  const duplicateValidation = useMemo(() => {
    if (!slot.time) {
      return { hasError: false, message: '' };
    }

    // Check for duplicate slots (same day and time)
    const duplicateSlot = allSlots.find((s, i) => 
      i !== index && 
      s.regressionSlotOffsetFromKickoff === slot.regressionSlotOffsetFromKickoff &&
      s.time === slot.time
    );

    if (duplicateSlot) {
      return {
        hasError: true,
        message: 'Another slot already exists with the same day and time',
      };
    }

    return { hasError: false, message: '' };
  }, [slot, allSlots, index]);

  // Validation for chronological ordering (must be after previous slot)
  const chronologicalValidation = useMemo(() => {
    if (index === 0) {
      return { hasError: false, message: '' }; // First slot doesn't need to be after anything
    }

    if (!slot.time) {
      return { hasError: false, message: '' };
    }

    // Get previous slot
    const previousSlot = allSlots[index - 1];
    if (!previousSlot || !previousSlot.time) {
      return { hasError: false, message: '' };
    }

    // Calculate timestamps
    const currentSlotTimestamp = slot.regressionSlotOffsetFromKickoff * 1440 + timeToMinutes(slot.time);
    const previousSlotTimestamp = previousSlot.regressionSlotOffsetFromKickoff * 1440 + timeToMinutes(previousSlot.time);

    // Current slot must be after previous slot
    if (currentSlotTimestamp <= previousSlotTimestamp) {
      return {
        hasError: true,
        message: `This slot must be chronologically after the previous slot (Day ${previousSlot.regressionSlotOffsetFromKickoff} at ${previousSlot.time})`,
      };
    }

    return { hasError: false, message: '' };
  }, [slot, allSlots, index]);

  // Combine all validations
  const combinedValidation = useMemo(() => {
    if (timeValidation.hasError) return timeValidation;
    if (duplicateValidation.hasError) return duplicateValidation;
    if (chronologicalValidation.hasError) return chronologicalValidation;
    return { hasError: false, message: '' };
  }, [timeValidation, duplicateValidation, chronologicalValidation]);

  const hasOffsetError =
    slot.regressionSlotOffsetFromKickoff < 0 ||
    slot.regressionSlotOffsetFromKickoff > targetReleaseOffset;

  const hasAnyError = combinedValidation.hasError || hasOffsetError;

  // Display mode (not editing)
  if (!isEditing) {
    return (
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{
          borderColor: hasAnyError ? theme.colors.red[3] : theme.colors.slate[2],
          backgroundColor: hasAnyError ? theme.colors.red[0] : 'transparent',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap="xs" align="center" mb={4}>
              <Badge size="sm" variant="light" color="grape">
                Slot {index + 1}
              </Badge>
              {slot.name && (
                <Text size="sm" fw={500}>
                  {slot.name}
                </Text>
              )}
            </Group>
            <Text size="xs" c={theme.colors.slate[5]} mb={slot.config.regressionBuilds ? 8 : 0}>
              Day {slot.regressionSlotOffsetFromKickoff} at {slot.time}
            </Text>
            {slot.config.regressionBuilds && (
              <Badge size="xs" variant="light" color="brand" mt={4}>
                Regression Builds Enabled
              </Badge>
            )}
          </Box>
          <Group gap="xs">
            <ActionIcon variant="subtle" color="brand" onClick={onEdit} radius="sm">
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" onClick={onDelete} radius="sm">
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>
    );
  }

  // Edit mode
  return (
    <Paper 
      p="lg" 
      radius="md" 
      withBorder 
      style={{ 
        borderColor: theme.colors.brand[3],
        backgroundColor: theme.white,
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={600} size="md" c={theme.colors.slate[8]}>
            {slot.id?.includes('slot-') && !slot.name ? 'New Slot' : `Edit Slot ${index + 1}`}
          </Text>
          <Group gap="xs">
            <Button
              size="sm"
              variant="filled"
              leftSection={<IconCheck size={16} />}
              onClick={onCollapse}
              color="brand"
            >
              Save
            </Button>
            <Button 
              size="sm" 
              variant="subtle" 
              onClick={onCollapse}
              color="gray"
            >
              Cancel
            </Button>
          </Group>
        </Group>

        <Stack gap="md">
          <TextInput
            label="Slot Name (Optional)"
            placeholder="e.g., Morning Regression, Slot 1"
            value={slot.name || ''}
            onChange={(e) => onUpdate({ ...slot, name: e.target.value })}
            size="sm"
            description="Optional descriptive name for this regression slot"
            styles={{
              label: { fontWeight: 500, marginBottom: 6 },
            }}
          />

          <Group grow align="flex-start">
          <NumberInput
            label="Days from Kickoff"
            value={typeof slot.regressionSlotOffsetFromKickoff === 'number' ? slot.regressionSlotOffsetFromKickoff : 0}
            onChange={(val) => {
              // Convert to number - Mantine NumberInput onChange provides string | number | undefined
              const numValue = typeof val === 'number' ? val : (typeof val === 'string' ? parseInt(val, 10) : 0);
              
              // Handle NaN case
              const validValue = isNaN(numValue) ? 0 : numValue;
              
              // Clamp to valid range (0 to targetReleaseOffset)
              const maxValue = targetReleaseOffset > 0 ? targetReleaseOffset : Infinity;
              const clampedValue = Math.max(0, Math.min(validValue, maxValue));
              
              // Update the slot with the new value
              onUpdate({
                ...slot,
                regressionSlotOffsetFromKickoff: clampedValue,
              });
            }}
            required
            withAsterisk
            min={0}
            max={targetReleaseOffset > 0 ? targetReleaseOffset : undefined}
            allowDecimal={false}
            allowNegative={false}
            size="sm"
            description={
              targetReleaseOffset > 0
                ? `Must be between 0 and ${targetReleaseOffset} (target release is ${targetReleaseOffset} days from kickoff)`
                : 'Must be 0 or greater (target release date must be after kickoff)'
            }
            error={
              hasOffsetError
                ? slot.regressionSlotOffsetFromKickoff < 0
                  ? 'Cannot be negative'
                  : `Must be ≤ ${targetReleaseOffset} (cannot be after target release date)`
                : undefined
            }
            styles={{
              label: { fontWeight: 500, marginBottom: 6 },
            }}
          />

            <TextInput
              label="Time"
              type="time"
              value={slot.time}
              onChange={(e) => {
                const newTime = e.target.value;
                // Normalize time format (time input returns HH:MM format, but normalize just in case)
                const normalizedTime = normalizeTime(newTime);
                
                // If time wraps to next day (e.g., previous was 22:00, new is 04:00), increment day
                if (index > 0 && allSlots[index - 1]) {
                  const previousSlot = allSlots[index - 1];
                  // Normalize previous time
                  const prevTime = normalizeTime(previousSlot.time);
                  
                  const previousMinutes = timeToMinutes(prevTime);
                  const newMinutes = timeToMinutes(normalizedTime);
                  
                  // If new time is before previous time (and not 00:00), it likely wrapped to next day
                  // Also check if we're on the same day offset - if so, definitely need to increment
                  const isOnSameDay = slot.regressionSlotOffsetFromKickoff === previousSlot.regressionSlotOffsetFromKickoff;
                  
                  if (isOnSameDay && newMinutes < previousMinutes && normalizedTime !== '00:00') {
                    // Time wrapped to next day - increment day offset
                    const newOffsetDays = Math.min(
                      slot.regressionSlotOffsetFromKickoff + 1,
                      targetReleaseOffset
                    );
                    onUpdate({
                      ...slot,
                      time: normalizedTime,
                      regressionSlotOffsetFromKickoff: newOffsetDays,
                    });
                    return;
                  }
                }
                
                onUpdate({ ...slot, time: normalizedTime });
              }}
              required
              withAsterisk
              size="sm"
              description="Time when this regression build will run. Must be chronologically after the previous slot."
              error={combinedValidation.hasError ? combinedValidation.message : undefined}
              styles={{
                label: { fontWeight: 500, marginBottom: 6 },
              }}
            />
          </Group>
        </Stack>

        <Divider 
          label={
            <Text size="xs" fw={500} c={theme.colors.slate[5]} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Slot Configuration
            </Text>
          } 
          labelPosition="center"
          my="xs"
        />

        <Box
          p="md"
          style={{
            backgroundColor: theme.colors.slate[0],
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.slate[2]}`,
          }}
        >
          <Switch
            label="Enable Regression Builds"
            description="Trigger regression builds in this slot. When enabled, automated regression tests will run at the scheduled time."
            checked={slot.config.regressionBuilds}
            onChange={(e) =>
              onUpdate({
                ...slot,
                config: { ...slot.config, regressionBuilds: e.currentTarget.checked },
              })
            }
            size="sm"
            color="brand"
          />
        </Box>
      </Stack>
    </Paper>
  );
}

