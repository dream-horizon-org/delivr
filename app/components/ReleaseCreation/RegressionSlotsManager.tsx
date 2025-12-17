/**
 * Regression Slots Manager Component
 * 
 * Manages regression build slots in backend-compatible format (absolute dates).
 * Slots are only added when "Save" is clicked, not on "Add Slot".
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
  useMantineTheme,
  ThemeIcon,
} from '@mantine/core';
import { IconPlus, IconInfoCircle, IconClock } from '@tabler/icons-react';
import type { RegressionBuildSlotBackend } from '~/types/release-creation-backend';
import type { ReleaseConfiguration } from '~/types/release-config';
import { RegressionSlotCardForRelease } from './RegressionSlotCardForRelease';
import { combineDateAndTime } from '~/utils/release-creation-converter';
import { DEFAULT_REGRESSION_OFFSET_DAYS } from '~/constants/release-creation';
import { validateSlot } from '~/utils/regression-slot-validation';

interface RegressionSlotsManagerProps {
  regressionBuildSlots: RegressionBuildSlotBackend[];
  kickOffDate: string; // Date string (YYYY-MM-DD)
  kickOffTime?: string; // Time string (HH:MM)
  targetReleaseDate: string; // Date string (YYYY-MM-DD)
  targetReleaseTime?: string; // Time string (HH:MM)
  onChange: (slots: RegressionBuildSlotBackend[]) => void;
  config?: ReleaseConfiguration; // For pre-filling
  errors?: Record<string, string>;
  isAfterKickoff?: boolean; // Whether release has already kicked off
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
  isAfterKickoff = false,
}: RegressionSlotsManagerProps) {
  const theme = useMantineTheme();
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  
  // Track pending slot (slot being added/edited but not yet saved)
  const [pendingSlot, setPendingSlot] = useState<RegressionBuildSlotBackend | null>(null);
  const [isPendingNew, setIsPendingNew] = useState(false);
  
  // Committed slots (already saved)
  const committedSlots = regressionBuildSlots;
  
  // Get ISO strings for validation
  const kickOffISO = useMemo(() => {
    return combineDateAndTime(kickOffDate, kickOffTime || '00:00');
  }, [kickOffDate, kickOffTime]);
  
  const targetReleaseISO = useMemo(() => {
    return combineDateAndTime(targetReleaseDate, targetReleaseTime || '23:59');
  }, [targetReleaseDate, targetReleaseTime]);
  
  // One-time conversion when config has slots (only if no slots exist yet)
  useEffect(() => {
    if (config?.releaseSchedule?.regressionSlots && kickOffDate && committedSlots.length === 0) {
      const convertedSlots: RegressionBuildSlotBackend[] = config.releaseSchedule.regressionSlots.map(slot => {
        const slotDate = new Date(kickOffISO);
        slotDate.setDate(slotDate.getDate() + slot.regressionSlotOffsetFromKickoff);
        const [hours, minutes] = slot.time.split(':');
        slotDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        
        return {
          date: slotDate.toISOString(),
          config: {
            regressionBuilds: slot.config.regressionBuilds,
            postReleaseNotes: slot.config.postReleaseNotes ?? false,
            automationBuilds: slot.config.automationBuilds ?? false,
            automationRuns: slot.config.automationRuns ?? false,
          },
        };
      });
      
      onChange(convertedSlots);
    }
  }, [config, kickOffDate, kickOffISO]); // Only run once when config/kickoff changes
  
  // Handle adding a new slot (creates pending slot, doesn't add to array yet)
  const handleAddSlot = () => {
    if (!kickOffDate || !targetReleaseDate) {
      return;
    }

    const now = new Date();
    
    // Calculate next slot date
    const lastSlot = committedSlots.length > 0 
      ? committedSlots[committedSlots.length - 1] 
      : null;
    
    let nextSlotDate: Date;
    if (lastSlot) {
      // 6 hours after last slot
      nextSlotDate = new Date(new Date(lastSlot.date).getTime() + 6 * 60 * 60 * 1000);
    } else {
      // Default: DEFAULT_REGRESSION_OFFSET_DAYS after kickoff at 09:00
      nextSlotDate = new Date(kickOffISO);
      nextSlotDate.setDate(nextSlotDate.getDate() + DEFAULT_REGRESSION_OFFSET_DAYS);
      nextSlotDate.setHours(9, 0, 0, 0);
    }
    
    // Clamp to target release date
    const targetDate = new Date(targetReleaseISO);
    if (nextSlotDate > targetDate) {
      nextSlotDate = new Date(targetDate);
    }
    
    // Ensure it's in the future
    if (nextSlotDate <= now) {
      nextSlotDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    }
    
    // Create pending slot (not yet committed)
    const newPendingSlot: RegressionBuildSlotBackend = {
      date: nextSlotDate.toISOString(),
      config: {
        regressionBuilds: true,
        postReleaseNotes: false,
        automationBuilds: false,
        automationRuns: false,
      },
    };
    
    setPendingSlot(newPendingSlot);
    setIsPendingNew(true);
    setEditingSlotIndex(-1); // Use -1 to indicate pending slot
  };

  // Handle saving pending slot (commits it to the array)
  const handleSavePendingSlot = (updatedSlot: RegressionBuildSlotBackend) => {
    // Validate before saving
    const validation = validateSlot(
      updatedSlot,
      committedSlots,
      -1, // pending slot index
      kickOffISO,
      targetReleaseISO,
      isAfterKickoff
    );
    
    if (!validation.isValid) {
      // Validation errors are shown in the card component
      return;
    }
    
    // Commit the slot
    onChange([...committedSlots, updatedSlot]);
    
    // Clear pending state
    setPendingSlot(null);
    setIsPendingNew(false);
    setEditingSlotIndex(null);
  };

  // Handle canceling pending slot
  const handleCancelPendingSlot = () => {
    setPendingSlot(null);
    setIsPendingNew(false);
    setEditingSlotIndex(null);
  };

  // Handle updating existing slot
  const handleUpdateSlot = (index: number, updatedSlot: RegressionBuildSlotBackend) => {
    // Validate before updating
    const validation = validateSlot(
      updatedSlot,
      committedSlots,
      index,
      kickOffISO,
      targetReleaseISO,
      isAfterKickoff
    );
    
    if (!validation.isValid) {
      // Validation errors are shown in the card component
      return;
    }
    
    const updated = [...committedSlots];
    updated[index] = updatedSlot;
    onChange(updated);
    setEditingSlotIndex(null);
  };

  // Handle deleting a slot
  const handleDeleteSlot = (index: number) => {
    const updated = committedSlots.filter((_, i) => i !== index);
    onChange(updated);
    if (editingSlotIndex === index) {
      setEditingSlotIndex(null);
    }
  };

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
            disabled={!!pendingSlot} // Disable if there's a pending slot
          >
            Add Slot
          </Button>
        </Group>

        {errors.regressionBuildSlots && (
          <Alert icon={<IconInfoCircle size={16} />} color="red" variant="light" radius="md">
            <Text size="sm">{errors.regressionBuildSlots}</Text>
          </Alert>
        )}

        {/* Committed slots */}
        {committedSlots.length > 0 && (
          <Stack gap="md">
            {committedSlots.map((slot, index) => (
              <RegressionSlotCardForRelease
                key={`slot-${index}-${slot.date}`}
                slot={slot}
                index={index}
                isEditing={editingSlotIndex === index}
                onEdit={() => setEditingSlotIndex(index)}
                onDelete={() => handleDeleteSlot(index)}
                onSave={(updated) => handleUpdateSlot(index, updated)}
                onCancel={() => setEditingSlotIndex(null)}
                kickOffISO={kickOffISO}
                targetReleaseISO={targetReleaseISO}
                allSlots={committedSlots}
                isAfterKickoff={isAfterKickoff}
              />
            ))}
          </Stack>
        )}

        {/* Pending slot (being added) */}
        {pendingSlot && (
          <RegressionSlotCardForRelease
            slot={pendingSlot}
            index={-1}
            isEditing={true}
            isPending={true}
            onSave={handleSavePendingSlot}
            onCancel={handleCancelPendingSlot}
            kickOffISO={kickOffISO}
            targetReleaseISO={targetReleaseISO}
            allSlots={committedSlots}
            isAfterKickoff={isAfterKickoff}
          />
        )}

        {/* Empty state */}
        {committedSlots.length === 0 && !pendingSlot && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
            <Text size="sm">
              No regression slots configured. Click "Add Slot" to schedule builds between kickoff and release.
            </Text>
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
