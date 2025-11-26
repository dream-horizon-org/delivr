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
  Card,
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
} from '@mantine/core';
import { IconEdit, IconTrash, IconCheck } from '@tabler/icons-react';
import type { RegressionSlot } from '~/types/release-config';
import type { RegressionSlotCardProps } from '~/types/release-config-props';
import { timeToMinutes } from '~/utils/time-utils';

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
}: RegressionSlotCardProps) {
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

  const hasOffsetError =
    slot.regressionSlotOffsetFromKickoff < 0 ||
    slot.regressionSlotOffsetFromKickoff > targetReleaseOffset;

  // Display mode (not editing)
  if (!isEditing) {
    return (
      <Card
        padding="sm"
        withBorder
        className={timeValidation.hasError || hasOffsetError ? 'border-red-300' : ''}
      >
        <Group justify="space-between" align="flex-start">
          <div className="flex-1">
            <Group gap="xs" align="center">
              <Badge size="sm" variant="light">
                Slot {index + 1}
              </Badge>
              {slot.name && (
                <Text size="sm" fw={500}>
                  {slot.name}
                </Text>
              )}
            </Group>
            <Text size="xs" c="dimmed" className="mt-1">
              Day {slot.regressionSlotOffsetFromKickoff} at {slot.time}
            </Text>
            {slot.config.regressionBuilds && (
              <Group gap="xs" className="mt-2">
                <Badge size="xs" color="blue">
                  Regression Builds Enabled
                </Badge>
              </Group>
            )}
          </div>
          <Group gap="xs">
            <ActionIcon variant="subtle" color="blue" onClick={onEdit}>
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" onClick={onDelete}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card padding="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600} size="sm">
            {slot.id?.includes('slot-') && !slot.name ? 'New Slot' : `Edit Slot ${index + 1}`}
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant="filled"
              leftSection={<IconCheck size={14} />}
              onClick={onCollapse}
              className="bg-green-600 hover:bg-green-700"
            >
              Save
            </Button>
            <Button size="xs" variant="subtle" onClick={onCollapse}>
              Cancel
            </Button>
          </Group>
        </Group>

        <TextInput
          label="Slot Name (Optional)"
          placeholder="e.g., Morning Regression"
          value={slot.name || ''}
          onChange={(e) => onUpdate({ ...slot, name: e.target.value })}
        />

        <Group grow>
          <NumberInput
            label="Days from Kickoff"
            value={slot.regressionSlotOffsetFromKickoff}
            onChange={(val) =>
              onUpdate({
                ...slot,
                regressionSlotOffsetFromKickoff: Number(val) || 0,
              })
            }
            required
            min={0}
            max={targetReleaseOffset}
            description={`Must be between 0 and ${targetReleaseOffset}`}
            error={
              hasOffsetError
                ? slot.regressionSlotOffsetFromKickoff < 0
                  ? 'Cannot be negative'
                  : `Must be ≤ ${targetReleaseOffset}`
                : undefined
            }
          />

          <TextInput
            label="Time"
            type="time"
            value={slot.time}
            onChange={(e) => onUpdate({ ...slot, time: e.target.value })}
            required
            description="Must be chronologically between kickoff and release"
            error={timeValidation.hasError ? timeValidation.message : undefined}
          />
        </Group>

        <Divider label="Slot Configuration" labelPosition="center" />

        <Switch
          label="Enable Regression Builds"
          description="Trigger regression builds in this slot"
          checked={slot.config.regressionBuilds}
          onChange={(e) =>
            onUpdate({
              ...slot,
              config: { ...slot.config, regressionBuilds: e.currentTarget.checked },
            })
          }
        />
      </Stack>
    </Card>
  );
}

