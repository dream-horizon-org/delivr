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
  Card,
  Group,
  Text,
  Button,
  Alert,
  Badge,
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

interface RegressionSlotsManagerProps {
  regressionBuildSlots: RegressionBuildSlotBackend[];
  kickOffDate: string; // Date string (YYYY-MM-DD)
  kickOffTime?: string; // Time string (HH:MM)
  targetReleaseDate: string; // Date string (YYYY-MM-DD)
  targetReleaseTime?: string; // Time string (HH:MM)
  onChange: (slots: RegressionBuildSlotBackend[]) => void;
  config?: ReleaseConfiguration; // For pre-filling
  errors?: Record<string, string>;
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
}: RegressionSlotsManagerProps) {
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Convert backend slots to config format for editing
  const configSlots = useMemo(() => {
    if (!kickOffDate || regressionBuildSlots.length === 0) {
      return [];
    }
    const kickOffISO = combineDateAndTime(kickOffDate, kickOffTime);
    return convertBackendSlotsToConfig(regressionBuildSlots, kickOffISO);
  }, [regressionBuildSlots, kickOffDate, kickOffTime]);

  // Calculate target release offset from kickoff (for validation)
  const targetReleaseOffset = useMemo(() => {
    if (!kickOffDate || !targetReleaseDate) {
      return 0;
    }

    const kickOff = new Date(kickOffDate);
    const targetRelease = new Date(targetReleaseDate);
    console.log('targetReleaseOffset', kickOffDate, targetReleaseDate, daysBetween(kickOff, targetRelease));
    return daysBetween(kickOff, targetRelease);
  }, [kickOffDate, targetReleaseDate]);

  // Note: Regression slots are no longer auto-generated from config
  // Users must manually add slots, but validation ensures they are within kickoff and target release date

  // Handle adding a new slot
  const handleAddSlot = () => {
    if (!kickOffDate) {
      return; // Can't add slot without kickoff date
    }

    // Create new slot in config format (offset-based)
    const newConfigSlot: RegressionSlot = {
      id: `slot-${Date.now()}`,
      name: `Slot ${configSlots.length + 1}`,
      regressionSlotOffsetFromKickoff: DEFAULT_REGRESSION_OFFSET_DAYS,
      time: DEFAULT_REGRESSION_SLOT_TIME,
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
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            Please set kickoff date and target release date first to configure regression slots.
          </Text>
        </Alert>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Group gap="sm">
              <IconClock size={20} className="text-purple-600" />
              <Text fw={600} size="sm">
                Regression Build Slots
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              Schedule regression builds between kickoff and release
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={18} />}
            variant="light"
            size="sm"
            onClick={handleAddSlot}
            className="bg-blue-50 hover:bg-blue-100"
          >
            Add Slot
          </Button>
        </Group>

        {errors.regressionBuildSlots && (
          <Alert icon={<IconInfoCircle size={16} />} color="red" variant="light">
            <Text size="xs">{errors.regressionBuildSlots}</Text>
          </Alert>
        )}

        {regressionBuildSlots.length === 0 ? (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            <Text size="sm">
              No regression slots configured. Click "Add Slot" to schedule builds.
            </Text>
          </Alert>
        ) : (
          <Stack gap="sm">
            {configSlots.map((slot, index) => {
              // Calculate absolute date for display
              const slotBackend = regressionBuildSlots[index];
              const slotDate = slotBackend ? new Date(slotBackend.date) : null;
              const displayDate = slotDate
                ? slotDate.toLocaleDateString()
                : 'Invalid date';

              return (
                <div key={slot.id || `slot-${index}`}>
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
                  />
                </div>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

