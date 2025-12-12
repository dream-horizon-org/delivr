/**
 * Regression Slots Manager Component
 * 
 * Manages regression build slots in backend-compatible format (date-based).
 * Converts between backend format (absolute dates) and config format (offset-based) for editing.
 * Pre-fills from config when user provides kickoff and target release dates.
 * 
 * Follows cursor rules: No 'any' or 'unknown' types, uses constants
 */

import { useEffect, useState, useMemo } from 'react';
import {
  Stack,
  Box,
  Group,
  Text,
  Button,
  Alert,
  Badge,
  useMantineTheme,
  ThemeIcon,
} from '@mantine/core';
import { IconPlus, IconInfoCircle, IconClock } from '@tabler/icons-react';
import type { RegressionBuildSlotBackend } from '~/types/release-creation-backend';
import type { ReleaseConfiguration, RegressionSlot } from '~/types/release-config';
import { RegressionSlotCard } from '~/components/ReleaseConfig/Scheduling/RegressionSlotCard';
import {
  convertConfigSlotsToBackend,
  convertBackendSlotsToConfig,
  extractDateAndTime,
  combineDateAndTime,
} from '~/utils/release-creation-converter';
import { DEFAULT_REGRESSION_OFFSET_DAYS, DEFAULT_REGRESSION_SLOT_TIME } from '~/constants/release-creation';
import { calculateNextSlotTime } from '~/utils/time-utils';

interface RegressionSlotsManagerProps {
  regressionBuildSlots: RegressionBuildSlotBackend[];
  kickOffDate: string; // Date string (YYYY-MM-DD)
  kickOffTime?: string; // Time string (HH:MM)
  targetReleaseDate: string; // Date string (YYYY-MM-DD)
  targetReleaseTime?: string; // Time string (HH:MM)
  onChange: (slots: RegressionBuildSlotBackend[]) => void;
  config?: ReleaseConfiguration; // For pre-filling
  errors?: Record<string, string>;
  disableExistingSlots?: boolean; // Disable edit/delete for existing slots (for post-kickoff edit mode)
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function RegressionSlotsManager({
  regressionBuildSlots,
  kickOffDate,
  kickOffTime,
  targetReleaseDate,
  targetReleaseTime,
  onChange,
  config,
  errors = {},
  disableExistingSlots = false,
}: RegressionSlotsManagerProps) {
  const theme = useMantineTheme();
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Convert backend slots to config format for editing
  const configSlots = useMemo(() => {
    if (!kickOffDate || regressionBuildSlots.length === 0) {
      return [];
    }
    const kickOffISO = combineDateAndTime(kickOffDate, kickOffTime || '00:00');
    return convertBackendSlotsToConfig(regressionBuildSlots, kickOffISO);
  }, [regressionBuildSlots, kickOffDate, kickOffTime]);

  // Calculate target release offset from kickoff (for validation)
  const targetReleaseOffset = useMemo(() => {
    if (!kickOffDate || !targetReleaseDate) {
      return 0;
    }

    const kickOff = new Date(kickOffDate);
    const targetRelease = new Date(targetReleaseDate);
    return daysBetween(kickOff, targetRelease);
  }, [kickOffDate, targetReleaseDate]);

  // Note: Regression slots are no longer auto-generated from config
  // Users must manually add slots, but validation ensures they are within kickoff and target release date

  // Handle adding a new slot
  const handleAddSlot = () => {
    if (!kickOffDate) {
      return; // Can't add slot without kickoff date
    }

    // Calculate next slot time (6 hours after last slot, or default)
    const lastSlot = configSlots.length > 0 ? configSlots[configSlots.length - 1] : undefined;
    const nextSlot = calculateNextSlotTime(
      lastSlot,
      DEFAULT_REGRESSION_OFFSET_DAYS,
      DEFAULT_REGRESSION_SLOT_TIME
    );

    // Ensure the new slot doesn't exceed target release date
    // If calculated offset exceeds target, use target offset and adjust time if needed
    let finalOffsetDays = Math.min(nextSlot.offsetDays, targetReleaseOffset);
    let finalTime = nextSlot.time;
    
    // If we had to clamp the offset, make sure the time is still valid
    if (nextSlot.offsetDays > targetReleaseOffset && targetReleaseOffset > 0) {
      // Use the target release time or a time before it
      finalTime = targetReleaseTimeForValidation || '23:59';
    }

    // Create new slot in config format (offset-based)
    const newConfigSlot: RegressionSlot = {
      id: `slot-${Date.now()}`,
      name: `Slot ${configSlots.length + 1}`,
      regressionSlotOffsetFromKickoff: finalOffsetDays,
      time: finalTime,
      config: {
        regressionBuilds: true,
        postReleaseNotes: false,
        automationBuilds: false,
        automationRuns: false,
      },
    };

    // Convert to backend format and add
    const kickOffISO = combineDateAndTime(kickOffDate, kickOffTime);
    const targetReleaseISO = combineDateAndTime(targetReleaseDate, targetReleaseTime);
    const newBackendSlot = convertConfigSlotsToBackend(
      [newConfigSlot],
      kickOffISO,
      targetReleaseISO
    )[0];

    onChange([...regressionBuildSlots, newBackendSlot]);
    setEditingSlotIndex(regressionBuildSlots.length);
  };

  // Handle updating a slot
  const handleUpdateSlot = (index: number, updatedConfigSlot: RegressionSlot) => {
    // Convert updated config slot to backend format
    const kickOffISO = combineDateAndTime(kickOffDate, kickOffTime);
    const targetReleaseISO = combineDateAndTime(targetReleaseDate, targetReleaseTime);
    const updatedBackendSlot = convertConfigSlotsToBackend(
      [updatedConfigSlot],
      kickOffISO,
      targetReleaseISO
    )[0];

    const updated = [...regressionBuildSlots];
    updated[index] = updatedBackendSlot;
    onChange(updated);
  };

  // Handle deleting a slot
  const handleDeleteSlot = (index: number) => {
    const updated = regressionBuildSlots.filter((_, i) => i !== index);
    onChange(updated);
    if (editingSlotIndex === index) {
      setEditingSlotIndex(null);
    }
  };

  // Get kickoff time for validation (default to 00:00 if not provided)
  const kickoffTimeForValidation = kickOffTime || '00:00';
  // Get target release time for validation (default to 23:59 if not provided)
  const targetReleaseTimeForValidation = targetReleaseTime || '23:59';

  if (!kickOffDate || !targetReleaseDate) {
    return (
      <Box
        p="md"
        style={{
          border: `1px solid ${theme.colors.slate[2]}`,
          borderRadius: theme.radius.md,
        }}
      >
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
          <Text size="sm">
            Please set kickoff date and target release date first to configure regression slots.
          </Text>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      p="md"
      style={{
        border: `1px solid ${theme.colors.slate[2]}`,
        borderRadius: theme.radius.md,
      }}
    >
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap="sm" mb={4}>
              <ThemeIcon size={32} radius="md" variant="light" color="grape">
                <IconClock size={18} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                Regression Build Slots
              </Text>
            </Group>
            <Text size="sm" c={theme.colors.slate[5]} ml={42}>
              Schedule regression builds between kickoff and release dates for testing.
            </Text>
          </Box>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            size="sm"
            onClick={handleAddSlot}
            color="brand"
          >
            Add Slot
          </Button>
        </Group>

        {errors.regressionBuildSlots && (
          <Alert icon={<IconInfoCircle size={16} />} color="red" variant="light" radius="md">
            <Text size="sm">{errors.regressionBuildSlots}</Text>
          </Alert>
        )}

        {regressionBuildSlots.length === 0 ? (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
            <Text size="sm">
              No regression slots configured. Click "Add Slot" to schedule builds between kickoff and release.
            </Text>
          </Alert>
        ) : (
          <Stack gap="md">
            {configSlots.map((slot, index) => {
              // Calculate absolute date for display
              const slotBackend = regressionBuildSlots[index];
              const slotDate = slotBackend ? new Date(slotBackend.date) : null;
              const displayDate = slotDate
                ? slotDate.toLocaleDateString()
                : 'Invalid date';

              return (
                <Box key={`${slot.id || `slot-${index}`}-${slot.regressionSlotOffsetFromKickoff}-${slot.time}`}>
                  <RegressionSlotCard
                    slot={slot}
                    index={index}
                    isEditing={editingSlotIndex === index}
                    onEdit={() => setEditingSlotIndex(index)}
                    onDelete={() => handleDeleteSlot(index)}
                    onUpdate={(updated) => handleUpdateSlot(index, updated)}
                    onCollapse={() => setEditingSlotIndex(null)}
                    targetReleaseOffset={targetReleaseOffset}
                    targetReleaseTime={targetReleaseTimeForValidation}
                    kickoffTime={kickoffTimeForValidation}
                    allSlots={configSlots}
                  />
                </Box>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

