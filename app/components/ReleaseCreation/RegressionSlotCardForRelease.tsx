/**
 * Regression Slot Card Component for Release Creation
 * 
 * Displays and edits regression slots using absolute dates (not offsets).
 * Only commits changes when "Save" is clicked.
 * 
 * This is separate from RegressionSlotCard used in Release Config,
 * which uses offset-based format.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Group,
  Text,
  ActionIcon,
  Stack,
  Button,
  useMantineTheme,
  Alert,
  TextInput,
} from '@mantine/core';
import { extractDateAndTime, combineDateAndTime } from '~/utils/release-creation-converter';
import { IconEdit, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import type { RegressionBuildSlotBackend } from '~/types/release-creation-backend';
import { validateSlot } from '~/utils/regression-slot-validation';
import { REGRESSION_SLOT_CARD } from '~/constants/release-creation-ui';
import { AppBadge } from '~/components/Common/AppBadge';

/**
 * Format slot error message by splitting on delimiter and bolding the label part
 * Message format: "Slot X:|error message" where | is the delimiter
 */
function formatSlotErrorMessage(message: string) {
  const [boldPart, ...restParts] = message.split('|');
  if (restParts.length > 0) {
    return (
      <>
        <Text component="span" fw={600}>{boldPart}{" "}</Text>
        {restParts.join('|')}
      </>
    );
  }
  return message;
}

interface RegressionSlotCardForReleaseProps {
  slot: RegressionBuildSlotBackend;
  index: number; // -1 if pending (new slot not yet saved)
  isEditing: boolean;
  isPending?: boolean; // true if this is a pending (new) slot
  onEdit?: () => void;
  onDelete?: () => void;
  onSave: (updated: RegressionBuildSlotBackend) => void;
  onCancel: () => void;
  kickOffISO: string;
  targetReleaseISO: string;
  allSlots: RegressionBuildSlotBackend[];
  isAfterKickoff: boolean;
  onEditingSlotChange?: (slot: RegressionBuildSlotBackend | null, index: number) => void;
  slotError?: string; // Validation error for this slot
}

export function RegressionSlotCardForRelease({
  slot,
  index,
  isEditing,
  isPending = false,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  kickOffISO,
  targetReleaseISO,
  allSlots,
  isAfterKickoff,
  onEditingSlotChange,
  slotError,
}: RegressionSlotCardForReleaseProps) {
  const theme = useMantineTheme();
  const [localSlot, setLocalSlot] = useState<RegressionBuildSlotBackend>(slot);
  const originalSlotRef = useRef<RegressionBuildSlotBackend | null>(null);
  
  const { date: slotDateStr, time: slotTimeStr } = extractDateAndTime(localSlot.date);
  const [localDate, setLocalDate] = useState(slotDateStr);
  const [localTime, setLocalTime] = useState(slotTimeStr);
  
  useEffect(() => {
    setLocalSlot(slot);
    const { date, time } = extractDateAndTime(slot.date);
    setLocalDate(date);
    setLocalTime(time);
  }, [slot]);
  
  useEffect(() => {
    if (localDate && localTime) {
      const newISO = combineDateAndTime(localDate, localTime);
      setLocalSlot((prev) => ({ ...prev, date: newISO }));
    }
  }, [localDate, localTime]);

  // Reset local state to original slot when canceling edit
  useEffect(() => {
    if (isEditing) {
      originalSlotRef.current = { ...slot };
    } else if (originalSlotRef.current && originalSlotRef.current.date === slot.date) {
      setLocalSlot(originalSlotRef.current);
      const { date, time } = extractDateAndTime(originalSlotRef.current.date);
      setLocalDate(date);
      setLocalTime(time);
      originalSlotRef.current = null;
    }
  }, [isEditing, slot]);

  // Notify parent when editing slot changes
  useEffect(() => {
    if (isEditing && onEditingSlotChange) {
      onEditingSlotChange(localSlot, index);
    } else if (!isEditing && onEditingSlotChange) {
      onEditingSlotChange(null, -1);
    }
  }, [isEditing, localSlot, index, onEditingSlotChange]);
  
  // Validation
  const validation = useMemo(() => {
    return validateSlot(
      localSlot,
      allSlots,
      index,
      kickOffISO,
      targetReleaseISO,
      isAfterKickoff
    );
  }, [localSlot, allSlots, index, kickOffISO, targetReleaseISO, isAfterKickoff]);
  
  const slotDate = new Date(localSlot.date);
  const isPastSlot = slotDate <= new Date();
  
  // Extract min/max dates from ISO strings
  const { date: kickoffDateStr } = extractDateAndTime(kickOffISO);
  const { date: targetDateStr } = extractDateAndTime(targetReleaseISO);
  
  // Handle save
  const handleSave = () => {
    if (validation.isValid) {
      onSave(localSlot);
    }
  };
  
  // Display mode (not editing)
  if (!isEditing) {
    return (
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{
          borderColor: slotError 
            ? theme.colors.red[3]
            : (isPastSlot && isAfterKickoff 
              ? theme.colors.orange[3] 
              : theme.colors.slate[2]),
          backgroundColor: slotError
            ? theme.colors.red[0]
            : (isPastSlot && isAfterKickoff 
              ? theme.colors.orange[0] 
              : 'transparent'),
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap="xs" align="center" mb={4}>
              <AppBadge
                type="status"
                value="info"
                title={index === -1 ? REGRESSION_SLOT_CARD.NEW_SLOT : REGRESSION_SLOT_CARD.SLOT_NUMBER(index)}
                size="sm"
                color="grape"
              />
              {isPastSlot && isAfterKickoff && !slotError && (
                <AppBadge
                  type="status"
                  value="warning"
                  title={REGRESSION_SLOT_CARD.PAST_SLOT}
                  size="sm"
                />
              )}
            </Group>
            <Text size="sm" fw={500} mb={4}>
              {slotDate.toLocaleString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {slotError && (
              <Alert icon={<IconX size={14} />} color="red" variant="light" mt="xs">
                <Text size="xs">
                  {slotError.includes('|') ? formatSlotErrorMessage(slotError) : slotError}
                </Text>
              </Alert>
            )}
            {isPastSlot && isAfterKickoff && !slotError && (
              <Alert icon={<IconX size={14} />} color="orange" variant="light" mt="xs">
                <Text size="xs">
                  {REGRESSION_SLOT_CARD.PAST_SLOT_MESSAGE}
                </Text>
              </Alert>
            )}
          </Box>
          {!isPending && (
            <Group gap="xs">
              {onEdit && (
                <ActionIcon variant="subtle" color="brand" onClick={onEdit} radius="sm">
                  <IconEdit size={16} />
                </ActionIcon>
              )}
              {onDelete && (
                <ActionIcon variant="subtle" color="red" onClick={onDelete} radius="sm">
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
          )}
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
        borderColor: validation.isValid 
          ? theme.colors.brand[3] 
          : theme.colors.red[3],
        backgroundColor: theme.white,
      }}
    >
      <Stack gap="md">
        <Text fw={600} size="md" c={theme.colors.slate[8]}>
          {isPending ? REGRESSION_SLOT_CARD.NEW_SLOT_TITLE : REGRESSION_SLOT_CARD.EDIT_SLOT_TITLE(index)}
        </Text>

        {/* Validation errors */}
        {!validation.isValid && (
          <Alert icon={<IconX size={16} />} color="red" variant="light" radius="md">
            <Text size="sm" fw={500} mb={4}>
              {REGRESSION_SLOT_CARD.VALIDATION_ERRORS_TITLE}
            </Text>
            <Stack gap={2}>
              {validation.errors.map((error, i) => (
                <Text key={i} size="xs">
                  • {error}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput
              label={REGRESSION_SLOT_CARD.DATE_LABEL}
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              min={kickoffDateStr}
              max={targetDateStr}
              required
              withAsterisk
              error={validation.errors.length > 0 ? validation.errors[0] : undefined}
              description={REGRESSION_SLOT_CARD.DATE_DESCRIPTION}
              styles={{
                label: { fontWeight: 500, marginBottom: 6 },
              }}
            />
            <TextInput
              label={REGRESSION_SLOT_CARD.TIME_LABEL}
              type="time"
              value={localTime}
              onChange={(e) => setLocalTime(e.target.value)}
              required
              withAsterisk
              error={validation.errors.length > 0 ? validation.errors[0] : undefined}
              description={REGRESSION_SLOT_CARD.TIME_DESCRIPTION}
              styles={{
                label: { fontWeight: 500, marginBottom: 6 },
              }}
            />
          </Group>
        </Stack>

        {/* Save/Cancel buttons */}
        <Group justify="flex-end" mt="md">
          <Button 
            variant="subtle" 
            onClick={onCancel}
            color="gray"
          >
            {REGRESSION_SLOT_CARD.CANCEL}
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={handleSave}
            disabled={!validation.isValid}
            color="brand"
          >
            {REGRESSION_SLOT_CARD.SAVE}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

