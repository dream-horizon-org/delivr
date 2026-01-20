/**
 * VerifyTestFlightForm - Form to verify iOS TestFlight builds
 * 
 * Features:
 * - Input for TestFlight build number
 * - Version validation
 * - Verification status feedback
 */

import {
  Alert,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconBrandApple, IconCheck } from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  BUTTON_LABELS,
  VALIDATION_RULES,
} from '~/constants/distribution/distribution.constants';
import { useVerifyState } from '~/hooks/distribution';
import type { VerifyTestFlightFormProps } from '~/types/distribution/distribution-component.types';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

export type VerificationSuccessProps = {
  buildNumber: string;
};

function VerificationSuccess({ buildNumber }: VerificationSuccessProps) {
  return (
    <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} className="border-green-500 bg-green-50">
      <Group gap={DS_SPACING.SM}>
        <IconCheck size={24} className="text-green-600" />
        <div>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} c={DS_COLORS.STATUS.SUCCESS}>TestFlight Build Verified</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
            Build #{buildNumber} is ready for App Store submission.
          </Text>
        </div>
      </Group>
    </Paper>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VerifyTestFlightForm({ 
  releaseId, 
  onVerifyComplete, 
  onVerifyError, 
  onClose,
  className,
}: VerifyTestFlightFormProps) {

  const {
    buildNumber,
    setBuildNumber,
    validationErrors,
    isVerifying,
    verifyError,
    verifySuccess,
    fetcher,
    validate,
  } = useVerifyState();

  const handleBuildNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBuildNumber(e.target.value);
  }, [setBuildNumber]);

  // Handle verification submission
  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const formData = new FormData();
    formData.append('_action', 'verify-testflight');
    formData.append('testflightNumber', buildNumber);

    fetcher.submit(formData, { method: 'post' });
  }, [buildNumber, fetcher, validate]);

  // Handle success/error callbacks
  if (verifySuccess && onVerifyComplete && fetcher.data?.data) {
    onVerifyComplete(fetcher.data.data);
  }

  if (verifyError && onVerifyError) {
    onVerifyError(verifyError);
  }

  return (
    <Stack gap={DS_SPACING.MD} className={className}>
      {/* Header Info */}
      <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.INFO_LIGHT}>
        <Group gap={DS_SPACING.SM}>
          <IconBrandApple size={24} className="text-blue-600" />
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>Verify TestFlight Build</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
              Enter the TestFlight build number to verify it exists and is ready for App Store submission.
            </Text>
          </div>
        </Group>
      </Paper>

      {/* Error Alert */}
      {verifyError && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color={DS_COLORS.STATUS.ERROR} 
          title="Verification Failed"
          variant="light"
        >
          {verifyError}
        </Alert>
      )}

      {/* Success State */}
      {verifySuccess && (
        <VerificationSuccess buildNumber={buildNumber} />
      )}

      {/* Form Fields */}
      {!verifySuccess && (
        <>
          <TextInput
            label="TestFlight Build Number"
            description="The build number shown in App Store Connect / TestFlight"
            placeholder="e.g., 17965"
            value={buildNumber}
            onChange={handleBuildNumberChange}
            error={validationErrors.buildNumber}
            disabled={isVerifying}
            required
            data-autofocus
          />

          {/* Action Buttons */}
          <Group justify="flex-end" mt={DS_SPACING.LG}>
            {onClose && (
              <Button 
                variant="subtle" 
                onClick={onClose}
                disabled={isVerifying}
              >
                {BUTTON_LABELS.CANCEL}
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              loading={isVerifying}
              leftSection={<IconCheck size={16} />}
            >
              {BUTTON_LABELS.VERIFY}
            </Button>
          </Group>
        </>
      )}

      {/* Close button after success */}
      {verifySuccess && onClose && (
        <Group justify="flex-end">
          <Button onClick={onClose}>{BUTTON_LABELS.CLOSE}</Button>
        </Group>
      )}
    </Stack>
  );
}

