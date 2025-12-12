/**
 * HaltRolloutDialog - Emergency halt confirmation dialog
 * 
 * Features:
 * - Severity selection (Critical, High, Medium)
 * - Required reason field
 * - Clear warning about consequences
 */

import {
  Alert,
  Button,
  Group,
  Modal,
  Radio,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertOctagon, IconAlertTriangle } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_TITLES,
  HALT_SEVERITY_LEVELS,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { HaltSeverity } from '~/types/distribution.types';
import type { HaltRolloutDialogProps } from './distribution.types';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HaltRolloutDialog(props: HaltRolloutDialogProps) {
  const { 
    opened, 
    submissionId,
    platform,
    isHalting,
    onHalt, 
    onClose,
  } = props;

  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<HaltSeverity>(HaltSeverity.HIGH);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  }, []);

  const handleSeverityChange = useCallback((value: string | null) => {
    if (value && (value === HaltSeverity.CRITICAL || value === HaltSeverity.HIGH || value === HaltSeverity.MEDIUM)) {
      setSeverity(value as HaltSeverity);
    }
  }, []);

  const handleHalt = useCallback(() => {
    if (!reason.trim()) {
      setValidationError('Please provide a reason for halting the rollout.');
      return;
    }

    setValidationError(null);
    onHalt(reason.trim(), severity);
  }, [reason, severity, onHalt]);

  const handleClose = useCallback(() => {
    setReason('');
    setSeverity(HaltSeverity.HIGH);
    setValidationError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="red" variant="light" size="lg">
            <IconAlertOctagon size={20} />
          </ThemeIcon>
          <Text fw={600}>{DIALOG_TITLES.HALT_ROLLOUT}</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Warning Alert */}
        <Alert 
          icon={<IconAlertTriangle size={16} />} 
          color="red" 
          variant="light"
        >
          <Stack gap="xs">
            <Text size="sm" fw={500}>Emergency Halt - Irreversible Action</Text>
            <Text size="sm">
              Halting the rollout will immediately stop all new installations and updates 
              for {PLATFORM_LABELS[platform]}. Users who already have this version will 
              not be affected. This action cannot be undone - you will need to submit 
              a new version to replace this release.
            </Text>
          </Stack>
        </Alert>

        {/* Severity Selection */}
        <div>
          <Text fw={500} size="sm" mb="sm">Severity Level</Text>
          <Radio.Group
            value={severity}
            onChange={handleSeverityChange}
          >
            <Stack gap="sm">
              {HALT_SEVERITY_LEVELS.map((level) => (
                <Radio
                  key={level.value}
                  value={level.value}
                  label={
                    <Group gap="xs">
                      <Text size="sm" fw={500} c={level.color}>{level.label}</Text>
                      <Text size="xs" c="dimmed">
                        {level.value === HaltSeverity.CRITICAL && '- App crashes, data loss, security issue'}
                        {level.value === HaltSeverity.HIGH && '- Major bug affecting core functionality'}
                        {level.value === HaltSeverity.MEDIUM && '- Significant issue but not critical'}
                      </Text>
                    </Group>
                  }
                  disabled={isHalting}
                />
              ))}
            </Stack>
          </Radio.Group>
        </div>

        {/* Reason Field */}
        <Textarea
          label="Reason for Halt"
          description="Describe the issue that requires halting this rollout"
          placeholder="e.g., Critical crash affecting login flow for users on Android 12+"
          value={reason}
          onChange={handleReasonChange}
          error={validationError}
          minRows={3}
          required
          disabled={isHalting}
        />

        {/* Submission Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <Group gap="xs">
            <Text size="xs" c="dimmed">Submission ID:</Text>
            <Text size="xs" ff="monospace">{submissionId}</Text>
          </Group>
        </div>

        {/* Acknowledgment Text */}
        <Text size="xs" c="dimmed" fs="italic">
          By halting this rollout, you acknowledge that this is an emergency action 
          and a hotfix release will be required to resume distribution.
        </Text>

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button 
            variant="subtle" 
            onClick={handleClose}
            disabled={isHalting}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          
          <Button
            color="red"
            onClick={handleHalt}
            loading={isHalting}
            leftSection={<IconAlertOctagon size={16} />}
          >
            Halt Rollout
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

