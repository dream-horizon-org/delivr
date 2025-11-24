/**
 * Release Scheduling Panel Component
 * Handles all scheduling-related fields for release creation
 */

import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Card,
  Group,
  TextInput,
  Switch,
  Button,
  Badge,
  Alert,
  Divider,
  ActionIcon,
} from '@mantine/core';
import {
  IconCalendar,
  IconClock,
  IconPlus,
  IconTrash,
  IconInfoCircle,
  IconAlertCircle,
} from '@tabler/icons-react';
import type { RegressionSlot, ReleaseConfiguration } from '~/types/release-config';
import {
  DEFAULT_KICKOFF_OFFSET_DAYS,
  DEFAULT_REGRESSION_OFFSET_DAYS,
  DEFAULT_REGRESSION_SLOT_TIME,
} from '~/constants/release-creation';

interface ReleaseSchedulingPanelProps {
  releaseDate: string;
  releaseTime?: string;
  kickoffDate: string;
  kickoffTime?: string;
  hasRegressionBuilds: boolean;
  regressionBuildSlots?: RegressionSlot[];
  config?: ReleaseConfiguration; // For showing default times
  onChange: (data: {
    releaseDate: string;
    releaseTime?: string;
    kickoffDate: string;
    kickoffTime?: string;
    hasRegressionBuilds: boolean;
    regressionBuildSlots?: RegressionSlot[];
  }) => void;
  errors?: Record<string, string>;
}

export function ReleaseSchedulingPanel({
  releaseDate,
  releaseTime,
  kickoffDate,
  kickoffTime,
  hasRegressionBuilds,
  regressionBuildSlots = [],
  config,
  onChange,
  errors = {},
}: ReleaseSchedulingPanelProps) {
  // Calculate default kickoff date (RD - DEFAULT_KICKOFF_OFFSET_DAYS)
  useEffect(() => {
    if (releaseDate && !kickoffDate) {
      const rd = new Date(releaseDate);
      rd.setDate(rd.getDate() - DEFAULT_KICKOFF_OFFSET_DAYS);
      onChange({
        releaseDate,
        releaseTime,
        kickoffDate: rd.toISOString().split('T')[0],
        kickoffTime,
        hasRegressionBuilds,
        regressionBuildSlots,
      });
    }
  }, [releaseDate]);

  const handleReleaseDateChange = (date: string) => {
    // Auto-update kickoff date to RD - DEFAULT_KICKOFF_OFFSET_DAYS
    const rd = new Date(date);
    const kd = new Date(rd);
    kd.setDate(kd.getDate() - DEFAULT_KICKOFF_OFFSET_DAYS);

    onChange({
      releaseDate: date,
      releaseTime,
      kickoffDate: kd.toISOString().split('T')[0],
      kickoffTime,
      hasRegressionBuilds,
      regressionBuildSlots,
    });
  };

  const handleAddSlot = () => {
    const newSlot: RegressionSlot = {
      id: `slot-${Date.now()}`,
      name: `Slot ${regressionBuildSlots.length + 1}`,
      regressionSlotOffsetFromKickoff: DEFAULT_REGRESSION_OFFSET_DAYS,
      time: DEFAULT_REGRESSION_SLOT_TIME,
      config: {
        regressionBuilds: true,
      },
    };

    onChange({
      releaseDate,
      releaseTime,
      kickoffDate,
      kickoffTime,
      hasRegressionBuilds,
      regressionBuildSlots: [...regressionBuildSlots, newSlot],
    });
  };

  const handleUpdateSlot = (index: number, updates: Partial<RegressionSlot>) => {
    const updated = [...regressionBuildSlots];
    updated[index] = { ...updated[index], ...updates };

    onChange({
      releaseDate,
      releaseTime,
      kickoffDate,
      kickoffTime,
      hasRegressionBuilds,
      regressionBuildSlots: updated,
    });
  };

  const handleRemoveSlot = (index: number) => {
    const updated = regressionBuildSlots.filter((_, i) => i !== index);
    onChange({
      releaseDate,
      releaseTime,
      kickoffDate,
      kickoffTime,
      hasRegressionBuilds,
      regressionBuildSlots: updated,
    });
  };

  const calculateSlotDateTime = (slot: RegressionSlot): string => {
    if (!kickoffDate) return '-';
    const kd = new Date(kickoffDate);
    kd.setDate(kd.getDate() + slot.regressionSlotOffsetFromKickoff);
    return `${kd.toLocaleDateString()} at ${slot.time}`;
  };

  const validateSlotTiming = (slot: RegressionSlot): string | null => {
    if (!releaseDate || !kickoffDate) return null;

    // Create full datetime for release (date + time)
    const rdDate = new Date(releaseDate);
    const rdTime = releaseTime || '23:59'; // Default to end of day if no time specified
    const [rdHours, rdMinutes] = rdTime.split(':').map(Number);
    rdDate.setHours(rdHours, rdMinutes, 0, 0);

    // Create full datetime for kickoff (date + time)
    const kdDate = new Date(kickoffDate);
    const kdTime = kickoffTime || '00:00'; // Default to start of day if no time specified
    const [kdHours, kdMinutes] = kdTime.split(':').map(Number);
    kdDate.setHours(kdHours, kdMinutes, 0, 0);

    // Create full datetime for slot (date + time)
    const slotDateTime = new Date(kickoffDate);
    slotDateTime.setDate(slotDateTime.getDate() + slot.regressionSlotOffsetFromKickoff);
    const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
    slotDateTime.setHours(slotHours, slotMinutes, 0, 0);

    // Validate: slot must be >= kickoff AND <= release (inclusive on both ends)
    if (slotDateTime < kdDate) {
      return 'Slot time is before kickoff time';
    }
    if (slotDateTime > rdDate) {
      return 'Slot time is after release time';
    }
    
    return null;
  };

  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Release Scheduling
        </Text>
        <Text size="sm" c="dimmed">
          Configure release timeline and regression build slots
        </Text>
      </div>

      {/* Release DateTime */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconCalendar size={20} className="text-blue-600" />
          <Text fw={600} size="sm">
            Release Date & Time
          </Text>
        </Group>

        <Stack gap="md">
          <TextInput
            label="Release Date"
            type="date"
            value={releaseDate}
            onChange={(e) => handleReleaseDateChange(e.target.value)}
            error={errors.releaseDate}
            required
            min={new Date().toISOString().split('T')[0]}
          />

          <div>
            <Group gap="sm" className="mb-2">
              <Text size="sm" fw={500}>
                Specify Release Time
              </Text>
              <Badge size="xs" variant="light">
                Optional
              </Badge>
            </Group>

            {releaseTime !== undefined ? (
              <Group gap="sm">
                <TextInput
                  type="time"
                  value={releaseTime || ''}
                  onChange={(e) =>
                    onChange({
                      releaseDate,
                      releaseTime: e.target.value,
                      kickoffDate,
                      kickoffTime,
                      hasRegressionBuilds,
                      regressionBuildSlots,
                    })
                  }
                  className="flex-1"
                />
                <Button
                  variant="subtle"
                  size="xs"
                  color="red"
                  onClick={() =>
                    onChange({
                      releaseDate,
                      releaseTime: undefined,
                      kickoffDate,
                      kickoffTime,
                      hasRegressionBuilds,
                      regressionBuildSlots,
                    })
                  }
                >
                  Remove Time
                </Button>
              </Group>
            ) : (
              <>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() =>
                    onChange({
                      releaseDate,
                      releaseTime: config?.scheduling.targetReleaseTime || '18:00',
                      kickoffDate,
                      kickoffTime,
                      hasRegressionBuilds,
                      regressionBuildSlots,
                    })
                  }
                >
                  Add Release Time
                </Button>
                {config?.scheduling.targetReleaseTime && (
                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" className="mt-2">
                    <Text size="xs">
                      Default release time from configuration: <strong>{config.scheduling.targetReleaseTime}</strong>
                    </Text>
                  </Alert>
                )}
              </>
            )}
          </div>
        </Stack>
      </Card>

      {/* Kickoff DateTime (Branch Fork off) */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconClock size={20} className="text-green-600" />
          <Text fw={600} size="sm">
            Branch Fork Off (Kickoff)
          </Text>
          <Badge size="xs" variant="light">
            Default: RD-2 days
          </Badge>
        </Group>

        <Stack gap="md">
          <TextInput
            label="Kickoff Date"
            type="date"
            value={kickoffDate}
            onChange={(e) =>
              onChange({
                releaseDate,
                releaseTime,
                kickoffDate: e.target.value,
                kickoffTime,
                hasRegressionBuilds,
                regressionBuildSlots,
              })
            }
            error={errors.kickoffDate}
            required
            max={releaseDate}
          />

          <TextInput
            label="Kickoff Time (Optional)"
            type="time"
            value={kickoffTime || ''}
            onChange={(e) =>
              onChange({
                releaseDate,
                releaseTime,
                kickoffDate,
                kickoffTime: e.target.value || undefined,
                hasRegressionBuilds,
                regressionBuildSlots,
              })
            }
          />

          {kickoffDate && releaseDate && (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="xs">
                Branch will fork off on{' '}
                <strong>
                  {new Date(kickoffDate).toLocaleDateString()}
                  {kickoffTime && ` at ${kickoffTime}`}
                </strong>
                {', '}
                {Math.ceil(
                  (new Date(releaseDate).getTime() - new Date(kickoffDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days before release
              </Text>
            </Alert>
          )}
        </Stack>
      </Card>

      {/* Regression Build DateTime */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconClock size={20} className="text-purple-600" />
          <Text fw={600} size="sm">
            Regression Build Schedule
          </Text>
        </Group>

        <Stack gap="md">
          <Switch
            label="Schedule Regression Builds"
            description="Add specific time slots for regression builds"
            checked={hasRegressionBuilds}
            onChange={(e) => {
              const enabled = e.currentTarget.checked;
              onChange({
                releaseDate,
                releaseTime,
                kickoffDate,
                kickoffTime,
                hasRegressionBuilds: enabled,
                regressionBuildSlots: enabled ? regressionBuildSlots : [],
              });
            }}
          />

          {!hasRegressionBuilds && (
            <Alert color="yellow" variant="light">
              <Text size="xs">
                <strong>Manual Build Upload:</strong> Builds will need to be uploaded manually.
                No automated regression builds will be scheduled.
              </Text>
            </Alert>
          )}

          {hasRegressionBuilds && (
            <>
              <Divider />

              {regressionBuildSlots.length === 0 && (
                <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
                  <Text size="xs">
                    No regression slots configured. Click "Add Slot" to schedule builds.
                  </Text>
                </Alert>
              )}

              {regressionBuildSlots.map((slot, index) => {
                const timingError = validateSlotTiming(slot);
                return (
                  <Card
                    key={slot.id}
                    shadow="xs"
                    padding="sm"
                    radius="md"
                    withBorder
                    className={timingError ? 'border-red-300' : ''}
                  >
                    <Group justify="space-between" className="mb-2">
                      <Text size="sm" fw={500}>
                        {slot.name}
                      </Text>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemoveSlot(index)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>

                    <Stack gap="sm">
                      <TextInput
                        label="Slot Name"
                        value={slot.name}
                        onChange={(e) =>
                          handleUpdateSlot(index, { name: e.target.value })
                        }
                        size="xs"
                      />

                      <Group grow>
                        <TextInput
                          label="Days After Kickoff"
                          type="number"
                          value={slot.regressionSlotOffsetFromKickoff}
                          onChange={(e) =>
                            handleUpdateSlot(index, {
                              regressionSlotOffsetFromKickoff: parseInt(e.target.value) || 0,
                            })
                          }
                          min={0}
                          size="xs"
                        />

                        <TextInput
                          label="Time"
                          type="time"
                          value={slot.time}
                          onChange={(e) =>
                            handleUpdateSlot(index, { time: e.target.value })
                          }
                          size="xs"
                        />
                      </Group>

                      <Alert
                        color={timingError ? 'red' : 'blue'}
                        variant="light"
                        p="xs"
                      >
                        <Text size="xs">
                          {timingError ? (
                            <>
                              <IconAlertCircle size={14} className="inline mr-1" />
                              {timingError}
                            </>
                          ) : (
                            <>
                              Build scheduled for:{' '}
                              <strong>{calculateSlotDateTime(slot)}</strong>
                            </>
                          )}
                        </Text>
                      </Alert>
                    </Stack>
                  </Card>
                );
              })}

              <Button
                leftSection={<IconPlus size={16} />}
                variant="light"
                onClick={handleAddSlot}
              >
                Add Regression Slot
              </Button>
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

