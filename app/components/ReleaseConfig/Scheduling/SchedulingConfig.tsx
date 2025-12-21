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
import type { SchedulingConfigProps, RegressionSlotCardProps } from '~/types/release-config-props';
import { ReleaseFrequencySelector } from './ReleaseFrequencySelector';
import { WorkingDaysSelector } from './WorkingDaysSelector';
import { TimezonePicker } from './TimezonePicker';
import { RegressionSlotCard } from './RegressionSlotCard';
import { PLATFORM_METADATA } from '~/constants/release-config';
import { validateScheduling, formatValidationErrors } from './scheduling-validation';
import { SCHEDULING_LABELS, ICON_SIZES } from '~/constants/release-config-ui';
import { timeToMinutes } from '~/utils/time-utils';
import { useConfig } from '~/contexts/ConfigContext';
import { canEnableKickoffReminder } from '~/utils/communication-helpers';
import type { CommunicationConfig } from '~/types/release-config';

export function SchedulingConfig({ 
  config, 
  onChange, 
  selectedPlatforms, 
  showValidation = false,
  communicationConfig,
}: SchedulingConfigProps & { communicationConfig?: CommunicationConfig }) {
  const { getConnectedIntegrations } = useConfig();
  
  const shouldShowKickoffReminder = canEnableKickoffReminder(
    communicationConfig,
    getConnectedIntegrations('COMMUNICATION')
  );
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Comprehensive validation matching backend
  const validationErrors = useMemo(() => {
    const backendValidationErrors = validateScheduling(config);
    return formatValidationErrors(backendValidationErrors);
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
        regressionBuilds: true,
        postReleaseNotes: false,
        automationBuilds: false,
        automationRuns: false,
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
          {SCHEDULING_LABELS.SECTION_TITLE}
        </Text>
        <Text size="sm" c="dimmed">
          {SCHEDULING_LABELS.SECTION_DESCRIPTION}
        </Text>
      </div>
      
      {showValidation && validationErrors.length > 0 && (
        <Alert icon={<IconAlertCircle size={ICON_SIZES.SMALL} />} color="red" title={SCHEDULING_LABELS.VALIDATION_ERRORS}>
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
              {SCHEDULING_LABELS.FIRST_KICKOFF_TITLE}
            </Text>
            <Text size="xs" c="dimmed">
              {SCHEDULING_LABELS.FIRST_KICKOFF_DESCRIPTION}
            </Text>
          </div>

          <TextInput
            label={SCHEDULING_LABELS.KICKOFF_DATE_LABEL}
            type="date"
            placeholder={SCHEDULING_LABELS.KICKOFF_DATE_PLACEHOLDER}
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
            leftSection={<IconCalendar size={ICON_SIZES.SMALL} />}
          />
        </Stack>
      </Card>

      {/* Initial Release Versions - Only for selected platforms */}
      {selectedPlatforms.length > 0 && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm" className="mb-1">
                {SCHEDULING_LABELS.INITIAL_VERSIONS_TITLE}
              </Text>
              <Text size="xs" c="dimmed">
                {SCHEDULING_LABELS.INITIAL_VERSIONS_DESCRIPTION}
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
                        <Text size="sm">{SCHEDULING_LABELS.INITIAL_VERSION_LABEL}</Text>
                      </Group>
                    }
                    placeholder={SCHEDULING_LABELS.INITIAL_VERSION_PLACEHOLDER}
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
                    description={SCHEDULING_LABELS.SEMANTIC_VERSION_DESCRIPTION.replace('{platform}', metadata.label)}
                  />
                );
              })}
            </Group>

            <Alert color="blue" variant="light" icon={<IconInfoCircle size={ICON_SIZES.SMALL} />}>
              <Text size="xs">
                {SCHEDULING_LABELS.INITIAL_VERSION_HINT}
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
            
          {/* Kickoff Reminder - Only show if communication is enabled */}
          {shouldShowKickoffReminder ? (
            <>
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
            </>
          ) : (
            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
              title="Kickoff Reminder"
            >
              <Text size="sm">
                {getConnectedIntegrations('COMMUNICATION').length === 0
                  ? 'Connect a communication integration (Slack, Email) to enable kickoff reminders.'
                  : 'Enable communication notifications in the Communication step to use kickoff reminders.'}
              </Text>
            </Alert>
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
                {SCHEDULING_LABELS.REGRESSION_SLOTS_TITLE}
              </Text>
              <Text size="xs" c="dimmed">
                {SCHEDULING_LABELS.REGRESSION_SLOTS_DESCRIPTION}
              </Text>
            </div>
            <Button
              leftSection={<IconPlus size={ICON_SIZES.SMALL} />}
              variant="light"
              size="xs"
              onClick={handleAddSlot}
            >
              {SCHEDULING_LABELS.ADD_SLOT}
            </Button>
          </Group>

          {config.regressionSlots.length === 0 ? (
            <Alert icon={<IconInfoCircle size={ICON_SIZES.SMALL} />} color="blue" variant="light">
              <Text size="sm">{SCHEDULING_LABELS.NO_SLOTS_MESSAGE}</Text>
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

