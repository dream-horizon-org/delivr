/**
 * Regression Slot Card Component for Release Creation
 * 
 * Displays and edits regression slots using absolute dates (not offsets).
 * Only commits changes when "Save" is clicked.
 * 
 * This is separate from RegressionSlotCard used in Release Config,
 * which uses offset-based format.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Group,
  Text,
  Badge,
  ActionIcon,
  Stack,
  Button,
  Divider,
  Switch,
  useMantineTheme,
  Alert,
  TextInput,
} from '@mantine/core';
import { extractDateAndTime, combineDateAndTime } from '~/utils/release-creation-converter';
import { IconEdit, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import type { RegressionBuildSlotBackend } from '~/types/release-creation-backend';
import { validateSlot } from '~/utils/regression-slot-validation';
import { REGRESSION_SLOT_CARD } from '~/constants/release-creation-ui';

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
}: RegressionSlotCardForReleaseProps) {
  const theme = useMantineTheme();
  const [localSlot, setLocalSlot] = useState<RegressionBuildSlotBackend>(slot);
  
  // Extract date and time from ISO string for editing
  const { date: slotDateStr, time: slotTimeStr } = extractDateAndTime(localSlot.date);
  const [localDate, setLocalDate] = useState(slotDateStr);
  const [localTime, setLocalTime] = useState(slotTimeStr);
  
  // Update local slot when prop changes
  useEffect(() => {
    setLocalSlot(slot);
    const { date, time } = extractDateAndTime(slot.date);
    setLocalDate(date);
    setLocalTime(time);
  }, [slot]);
  
  // Update slot date when date/time changes
  useEffect(() => {
    if (localDate && localTime) {
      const newISO = combineDateAndTime(localDate, localTime);
      setLocalSlot((prev) => ({ ...prev, date: newISO }));
    }
  }, [localDate, localTime]);
  
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
          borderColor: isPastSlot && isAfterKickoff 
            ? theme.colors.orange[3] 
            : theme.colors.slate[2],
          backgroundColor: isPastSlot && isAfterKickoff 
            ? theme.colors.orange[0] 
            : 'transparent',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap="xs" align="center" mb={4}>
              <Badge size="sm" variant="light" color="grape">
                {index === -1 ? REGRESSION_SLOT_CARD.NEW_SLOT : REGRESSION_SLOT_CARD.SLOT_NUMBER(index)}
              </Badge>
              {isPastSlot && isAfterKickoff && (
                <Badge size="sm" variant="light" color="orange">
                  {REGRESSION_SLOT_CARD.PAST_SLOT}
                </Badge>
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
            {localSlot.config.regressionBuilds && (
              <Badge size="xs" variant="light" color="brand" mt={4}>
                {REGRESSION_SLOT_CARD.REGRESSION_BUILDS_ENABLED}
              </Badge>
            )}
            {isPastSlot && isAfterKickoff && (
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
        <Group justify="space-between" align="center">
          <Text fw={600} size="md" c={theme.colors.slate[8]}>
            {isPending ? REGRESSION_SLOT_CARD.NEW_SLOT_TITLE : REGRESSION_SLOT_CARD.EDIT_SLOT_TITLE(index)}
          </Text>
          {!isPending && (
            <Button 
              size="sm" 
              variant="subtle" 
              onClick={onCancel}
              color="gray"
            >
              {REGRESSION_SLOT_CARD.CANCEL}
            </Button>
          )}
        </Group>

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
              description={REGRESSION_SLOT_CARD.TIME_DESCRIPTION}
              styles={{
                label: { fontWeight: 500, marginBottom: 6 },
              }}
            />
          </Group>
        </Stack>

        <Divider 
          label={
            <Text size="xs" fw={500} c={theme.colors.slate[5]} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              {REGRESSION_SLOT_CARD.SLOT_CONFIGURATION_LABEL}
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
            label={REGRESSION_SLOT_CARD.ENABLE_REGRESSION_BUILDS}
            description={REGRESSION_SLOT_CARD.ENABLE_REGRESSION_BUILDS_DESC}
            checked={localSlot.config.regressionBuilds}
            onChange={(e) =>
              setLocalSlot({
                ...localSlot,
                config: { ...localSlot.config, regressionBuilds: e.currentTarget.checked },
              })
            }
            size="sm"
            color="brand"
          />
        </Box>

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

