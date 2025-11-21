/**
 * Complete Scheduling Configuration Component
 * Supports all scheduling fields with validation
 */

import { useState, useMemo } from 'react';
import {
  Stack,
  Text,
  Card,
  Group,
  TextInput,
  NumberInput,
  Alert,
  Switch,
  Button,
  ActionIcon,
  Badge,
  Divider,
} from '@mantine/core';
import { IconInfoCircle, IconPlus, IconTrash, IconEdit, IconCalendar, IconAlertCircle } from '@tabler/icons-react';
import type {
  SchedulingConfig as SchedulingConfigType,
  RegressionSlot,
  ReleaseFrequency,
  Platform,
} from '~/types/release-config';
import { ReleaseFrequencySelector } from './ReleaseFrequencySelector';
import { WorkingDaysSelector } from './WorkingDaysSelector';
import { TimezonePicker } from './TimezonePicker';

interface SchedulingConfigProps {
  config: SchedulingConfigType;
  onChange: (config: SchedulingConfigType) => void;
  selectedPlatforms: Platform[]; // Platforms configured in the release
}

// Platform enum constants
const PLATFORMS: Record<Platform, Platform> = {
  ANDROID: 'ANDROID',
  IOS: 'IOS',
} as const;

// Platform display metadata
const PLATFORM_METADATA: Record<Platform, { label: string; color: string }> = {
  ANDROID: { label: 'Android', color: 'green' },
  IOS: { label: 'iOS', color: 'blue' },
};

export function SchedulingConfig({ config, onChange, selectedPlatforms }: SchedulingConfigProps) {
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Validation logic
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // kickoffReminderTime must be <= kickoffTime
    if (config.kickoffReminderEnabled && config.kickoffReminderTime && config.kickoffTime) {
      const reminderTime = timeToMinutes(config.kickoffReminderTime);
      const kickoffTime = timeToMinutes(config.kickoffTime);
      if (reminderTime > kickoffTime) {
        errors.push('Kickoff reminder time must be before or equal to kickoff time');
      }
    }

    // targetReleaseDateOffsetFromKickoff must be >= 0
    if (config.targetReleaseDateOffsetFromKickoff < 0) {
      errors.push('Target release date offset must be 0 or greater');
    }

    // Regression slot validations
    config.regressionSlots.forEach((slot, index) => {
      const slotNumber = index + 1;
      
      // Offset must be >= 0
      if (slot.regressionSlotOffsetFromKickoff < 0) {
        errors.push(
          `Regression slot ${slotNumber}: Offset cannot be negative`
        );
      }
      
      // regressionSlotOffsetFromKickoff must be <= targetReleaseDateOffsetFromKickoff
      if (slot.regressionSlotOffsetFromKickoff > config.targetReleaseDateOffsetFromKickoff) {
        errors.push(
          `Regression slot ${slotNumber}: Offset (${slot.regressionSlotOffsetFromKickoff}) cannot be greater than target release offset (${config.targetReleaseDateOffsetFromKickoff})`
        );
      }

      // Time is required
      if (!slot.time) {
        errors.push(
          `Regression slot ${slotNumber}: Time is required`
        );
      }

      // Regression slot must be BETWEEN kickoff and release (chronologically)
      if (slot.time && config.kickoffTime && config.targetReleaseTime) {
        // Calculate chronological timestamps (offset in days + time in minutes)
        const slotTimestamp = (slot.regressionSlotOffsetFromKickoff * 1440) + timeToMinutes(slot.time);
        const kickoffTimestamp = (0 * 1440) + timeToMinutes(config.kickoffTime);
        const releaseTimestamp = (config.targetReleaseDateOffsetFromKickoff * 1440) + timeToMinutes(config.targetReleaseTime);

        // Slot must be >= kickoff time
        if (slotTimestamp < kickoffTimestamp) {
          errors.push(
            `Regression slot ${slotNumber}: Slot (Day ${slot.regressionSlotOffsetFromKickoff} at ${slot.time}) is before kickoff (Day 0 at ${config.kickoffTime})`
          );
        }

        // Slot must be <= release time
        if (slotTimestamp > releaseTimestamp) {
          errors.push(
            `Regression slot ${slotNumber}: Slot (Day ${slot.regressionSlotOffsetFromKickoff} at ${slot.time}) is after release (Day ${config.targetReleaseDateOffsetFromKickoff} at ${config.targetReleaseTime})`
          );
        }
      }
      
      // Check for duplicate slots (same offset and time)
      const duplicates = config.regressionSlots.filter(
        (s, i) => 
          i !== index && 
          s.regressionSlotOffsetFromKickoff === slot.regressionSlotOffsetFromKickoff && 
          s.time === slot.time
      );
      
      if (duplicates.length > 0) {
        errors.push(
          `Regression slot ${slotNumber}: Duplicate slot detected (Day ${slot.regressionSlotOffsetFromKickoff} at ${slot.time})`
        );
      }
    });

    return errors;
  }, [config]);
  
  const handleFrequencyChange = (frequency: ReleaseFrequency, customDays?: number) => {
    onChange({
      ...config,
      releaseFrequency: frequency,
      customFrequencyDays: customDays,
    });
  };
  
  const handleAddSlot = () => {
    const newSlot: RegressionSlot = {
      id: `slot-${Date.now()}`,
      name: '',
      regressionSlotOffsetFromKickoff: 0,
      time: '09:00',
      config: {
        regressionBuilds: false,
      },
    };
    onChange({
      ...config,
      regressionSlots: [...config.regressionSlots, newSlot],
    });
    setEditingSlotIndex(config.regressionSlots.length);
  };
  
  const handleDeleteSlot = (index: number) => {
      onChange({
        ...config,
      regressionSlots: config.regressionSlots.filter((_, i) => i !== index),
    });
    if (editingSlotIndex === index) {
      setEditingSlotIndex(null);
    }
  };

  const handleUpdateSlot = (index: number, updatedSlot: RegressionSlot) => {
      onChange({
        ...config,
      regressionSlots: config.regressionSlots.map((slot, i) => (i === index ? updatedSlot : slot)),
      });
  };
  
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Release Scheduling
        </Text>
        <Text size="sm" c="dimmed">
          Configure release cadence, timing, and regression test slots
        </Text>
      </div>
      
      {validationErrors.length > 0 && (
        <Alert icon={<IconAlertCircle size={18} />} color="red" title="Validation Errors">
          <Stack gap="xs">
            {validationErrors.map((error, i) => (
              <Text key={i} size="sm">
                • {error}
        </Text>
            ))}
          </Stack>
      </Alert>
      )}
      
      {/* Release Frequency */}
      <ReleaseFrequencySelector
        frequency={config.releaseFrequency}
        customDays={config.customFrequencyDays}
        onChange={handleFrequencyChange}
      />

      {/* First Release Kickoff Date */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="md">
          <div>
            <Text fw={600} size="sm" className="mb-1">
              First Release Kickoff Date
            </Text>
            <Text size="xs" c="dimmed">
              The date when the first release cycle will start
            </Text>
          </div>

          <TextInput
            label="Kickoff Date"
            type="date"
            placeholder="Select date"
            value={
              config.firstReleaseKickoffDate
                ? config.firstReleaseKickoffDate.split('T')[0]
                : ''
            }
            onChange={(e) => {
              const dateValue = e.target.value;
              if (dateValue) {
                // Convert date string to ISO format
                const isoDate = new Date(dateValue).toISOString();
                onChange({ ...config, firstReleaseKickoffDate: isoDate });
              }
            }}
            required
            min={new Date().toISOString().split('T')[0]}
            leftSection={<IconCalendar size={16} />}
          />
        </Stack>
      </Card>

      {/* Initial Release Versions - Only for selected platforms */}
      {selectedPlatforms.length > 0 && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm" className="mb-1">
                Initial Release Versions
              </Text>
              <Text size="xs" c="dimmed">
                Starting version numbers for configured platforms (e.g., 1.0.0)
              </Text>
            </div>

            <Group grow={selectedPlatforms.length === 2}>
              {selectedPlatforms.map((platform) => {
                const metadata = PLATFORM_METADATA[platform];
                return (
                  <TextInput
                    key={platform}
                    label={
                      <Group gap="xs">
                        <Badge color={metadata.color} size="sm" variant="filled">
                          {metadata.label}
                        </Badge>
                        <Text size="sm">Initial Version</Text>
                      </Group>
                    }
                    placeholder="1.0.0"
                    value={config.initialVersions?.[platform] || ''}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        initialVersions: {
                          ...config.initialVersions,
                          [platform]: e.target.value,
                        },
                      })
                    }
                    required
                    description={`Semantic version for ${metadata.label} (e.g., 1.0.0)`}
                  />
                );
              })}
            </Group>

            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
              <Text size="xs">
                These versions will be used as the starting point for auto-incrementing release versions.
                Use semantic versioning format (MAJOR.MINOR.PATCH).
              </Text>
            </Alert>
          </Stack>
        </Card>
      )}
      
      {/* Timezone */}
      <TimezonePicker timezone={config.timezone} onChange={(tz) => onChange({ ...config, timezone: tz })} />
      
      {/* Working Days */}
      <WorkingDaysSelector
        workingDays={config.workingDays}
        onChange={(days) => onChange({ ...config, workingDays: days })}
      />
      
      {/* Kickoff Settings */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="md">
          <div>
            <Text fw={600} size="sm" className="mb-1">
              Kickoff Settings
            </Text>
            <Text size="xs" c="dimmed">
              When the release cycle begins
            </Text>
          </div>

            <TextInput
            label="Kickoff Time"
              type="time"
            value={config.kickoffTime}
            onChange={(e) => onChange({ ...config, kickoffTime: e.target.value })}
              required
            description="Time when release kickoff happens"
            />
            
          <Divider label="Kickoff Reminder" labelPosition="center" />

          <Switch
            label="Enable Kickoff Reminder"
            description="Send a reminder before the kickoff"
            checked={config.kickoffReminderEnabled}
              onChange={(e) =>
              onChange({
                ...config,
                kickoffReminderEnabled: e.currentTarget.checked,
              })
            }
          />
      
          {config.kickoffReminderEnabled && (
            <TextInput
              label="Reminder Time"
              type="time"
              value={config.kickoffReminderTime}
              onChange={(e) =>
                onChange({ ...config, kickoffReminderTime: e.target.value })
              }
              required
              description="Must be before or equal to kickoff time"
              error={
                config.kickoffReminderTime && config.kickoffTime && 
                timeToMinutes(config.kickoffReminderTime) > timeToMinutes(config.kickoffTime)
                  ? 'Must be before or equal to kickoff time'
                  : undefined
              }
            />
          )}
        </Stack>
      </Card>

      {/* Target Release Settings */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="md">
          <div>
            <Text fw={600} size="sm" className="mb-1">
              Target Release Settings
            </Text>
            <Text size="xs" c="dimmed">
              When the release is scheduled to go live
            </Text>
          </div>

          <Group grow>
            <NumberInput
              label="Days from Kickoff"
              placeholder="5"
              value={config.targetReleaseDateOffsetFromKickoff}
              onChange={(val) =>
                onChange({
                  ...config,
                  targetReleaseDateOffsetFromKickoff: Number(val) || 0,
                })
              }
              required
              min={0}
              max={30}
              description="Days between kickoff and release"
              error={
                config.targetReleaseDateOffsetFromKickoff < 0
                  ? 'Must be 0 or greater'
                  : undefined
              }
            />

            <TextInput
              label="Target Release Time"
              type="time"
              value={config.targetReleaseTime}
              onChange={(e) =>
                onChange({ ...config, targetReleaseTime: e.target.value })
              }
              required
              description="Time for the release"
            />
          </Group>
        </Stack>
      </Card>
      
      {/* Regression Slots */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600} size="sm">
                Regression Slots
              </Text>
              <Text size="xs" c="dimmed">
                Scheduled regression testing windows
              </Text>
            </div>
            <Button
              leftSection={<IconPlus size={16} />}
              variant="light"
              size="xs"
              onClick={handleAddSlot}
            >
              Add Slot
            </Button>
          </Group>

          {config.regressionSlots.length === 0 ? (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">No regression slots configured yet. Click "Add Slot" to create one.</Text>
            </Alert>
          ) : (
            <Stack gap="sm">
              {config.regressionSlots.map((slot, index) => (
                <RegressionSlotCard
                  key={slot.id}
                  slot={slot}
                  index={index}
                  isEditing={editingSlotIndex === index}
                  onEdit={() => setEditingSlotIndex(index)}
                  onDelete={() => handleDeleteSlot(index)}
                  onUpdate={(updated) => handleUpdateSlot(index, updated)}
                  onCollapse={() => setEditingSlotIndex(null)}
                  targetReleaseOffset={config.targetReleaseDateOffsetFromKickoff}
                  targetReleaseTime={config.targetReleaseTime}
                  kickoffTime={config.kickoffTime}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

// Helper: Convert HH:MM to minutes for comparison
function timeToMinutes(time: string | undefined): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Sub-component for Regression Slot Card
interface RegressionSlotCardProps {
  slot: RegressionSlot;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (slot: RegressionSlot) => void;
  onCollapse: () => void;
  targetReleaseOffset: number;
  targetReleaseTime: string;
  kickoffTime: string;
}

function RegressionSlotCard({
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
    const slotTimestamp = (slot.regressionSlotOffsetFromKickoff * 1440) + timeToMinutes(slot.time);
    const kickoffTimestamp = (0 * 1440) + timeToMinutes(kickoffTime);
    const releaseTimestamp = (targetReleaseOffset * 1440) + timeToMinutes(targetReleaseTime);
    
    // Check if slot is before kickoff chronologically
    if (slotTimestamp < kickoffTimestamp) {
      return {
        hasError: true,
        message: `Slot is before kickoff (Day 0 at ${kickoffTime})`
      };
    }
    
    // Check if slot is after release chronologically
    if (slotTimestamp > releaseTimestamp) {
      return {
        hasError: true,
        message: `Slot is after release (Day ${targetReleaseOffset} at ${targetReleaseTime})`
      };
    }
    
    return { hasError: false, message: '' };
  }, [slot, targetReleaseOffset, targetReleaseTime, kickoffTime]);

  const hasOffsetError = 
    slot.regressionSlotOffsetFromKickoff < 0 || 
    slot.regressionSlotOffsetFromKickoff > targetReleaseOffset;

  if (!isEditing) {
    return (
      <Card padding="sm" withBorder className={timeValidation.hasError || hasOffsetError ? 'border-red-300' : ''}>
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
                <Badge size="xs" color="blue">Regression Builds Enabled</Badge>
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

  return (
    <Card padding="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600} size="sm">
            Edit Slot {index + 1}
          </Text>
          <Button size="xs" variant="subtle" onClick={onCollapse}>
            Collapse
          </Button>
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
              config: { regressionBuilds: e.currentTarget.checked },
            })
          }
        />
      </Stack>
    </Card>
  );
}
